import { Router } from "express";
import { db } from "@workspace/db";
import {
  roomsTable,
  roomQueueTable,
  roomRequestsTable,
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/rooms", async (req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable).orderBy(desc(roomsTable.updatedAt));
  const result = rooms.map(r => ({
    ...r,
    password: r.password ? true : false,
  }));
  res.json(result);
});

router.post("/rooms", requireAuth, async (req, res): Promise<void> => {
  const existing = await db.select().from(roomsTable).where(eq(roomsTable.hostUserId, req.userId!));
  if (existing.length > 0) {
    const r = existing[0];
    res.json({ ...r, password: r.password ? true : false });
    return;
  }
  const { name, password } = req.body as { name?: string; password?: string };
  const [room] = await db.insert(roomsTable).values({
    hostUserId: req.userId!,
    hostUsername: req.username!,
    name: name ?? `${req.username}'s Room`,
    password: password ?? null,
    state: "idle",
    updatedAt: new Date(),
  }).returning();
  res.status(201).json({ ...room, password: room.password ? true : false });
});

router.get("/rooms/my", requireAuth, async (req, res): Promise<void> => {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.hostUserId, req.userId!));
  if (!room) {
    res.json(null);
    return;
  }
  const queue = await db.select().from(roomQueueTable).where(eq(roomQueueTable.roomId, room.id)).orderBy(asc(roomQueueTable.position));
  const requests = await db.select().from(roomRequestsTable).where(and(eq(roomRequestsTable.roomId, room.id), eq(roomRequestsTable.status, "pending")));
  res.json({ ...room, password: room.password ? true : false, queue, requests });
});

router.get("/rooms/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const queue = await db.select().from(roomQueueTable).where(eq(roomQueueTable.roomId, room.id)).orderBy(asc(roomQueueTable.position));
  res.json({ ...room, password: room.password ? true : false, queue });
});

router.put("/rooms/my/settings", requireAuth, async (req, res): Promise<void> => {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.hostUserId, req.userId!));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const { name, password } = req.body as { name?: string; password?: string | null };
  await db.update(roomsTable).set({ name: name ?? room.name, password: password === "" ? null : (password ?? room.password), updatedAt: new Date() }).where(eq(roomsTable.id, room.id));
  res.json({ message: "Settings updated" });
});

router.post("/rooms/my/queue", requireAuth, async (req, res): Promise<void> => {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.hostUserId, req.userId!));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const { subjectId, subjectType, title, coverUrl, seriesSeason, seriesEpisode, scheduledAt, playNow } = req.body as Record<string, string | number | boolean | null>;

  if (playNow) {
    await db.update(roomsTable).set({
      state: "playing",
      currentSubjectId: String(subjectId),
      currentSubjectType: Number(subjectType),
      currentTitle: String(title),
      currentCoverUrl: String(coverUrl ?? ""),
      currentTimestampSec: 0,
      idleStartAt: null,
      updatedAt: new Date(),
    }).where(eq(roomsTable.id, room.id));
    res.json({ message: "Playing now" });
    return;
  }

  const existingQueue = await db.select().from(roomQueueTable).where(eq(roomQueueTable.roomId, room.id));
  const position = existingQueue.length;
  const [item] = await db.insert(roomQueueTable).values({
    roomId: room.id,
    subjectId: String(subjectId),
    subjectType: Number(subjectType),
    title: String(title),
    coverUrl: String(coverUrl ?? ""),
    position,
    seriesSeason: seriesSeason ? Number(seriesSeason) : null,
    seriesEpisode: seriesEpisode ? Number(seriesEpisode) : null,
    scheduledAt: scheduledAt ? new Date(String(scheduledAt)) : null,
  }).returning();
  res.status(201).json(item);
});

router.delete("/rooms/my/queue/:itemId", requireAuth, async (req, res): Promise<void> => {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.hostUserId, req.userId!));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const raw = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const itemId = parseInt(raw, 10);
  await db.delete(roomQueueTable).where(and(eq(roomQueueTable.id, itemId), eq(roomQueueTable.roomId, room.id)));
  res.json({ message: "Removed from queue" });
});

router.post("/rooms/my/close", requireAuth, async (req, res): Promise<void> => {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.hostUserId, req.userId!));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  await db.update(roomsTable).set({ state: "closed", updatedAt: new Date() }).where(eq(roomsTable.id, room.id));
  await db.delete(roomQueueTable).where(eq(roomQueueTable.roomId, room.id));
  res.json({ message: "Room closed" });
});

router.post("/rooms/:id/request", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const { subjectId, subjectType, title, coverUrl } = req.body as Record<string, string | number>;
  const [item] = await db.insert(roomRequestsTable).values({
    roomId: id,
    requestUserId: req.userId!,
    requestUsername: req.username!,
    subjectId: String(subjectId),
    subjectType: Number(subjectType),
    title: String(title),
    coverUrl: String(coverUrl ?? ""),
    status: "pending",
  }).returning();
  res.status(201).json(item);
});

router.post("/rooms/my/requests/:reqId/approve", requireAuth, async (req, res): Promise<void> => {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.hostUserId, req.userId!));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const raw = Array.isArray(req.params.reqId) ? req.params.reqId[0] : req.params.reqId;
  const reqId = parseInt(raw, 10);
  const [request] = await db.select().from(roomRequestsTable).where(and(eq(roomRequestsTable.id, reqId), eq(roomRequestsTable.roomId, room.id)));
  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  const existingQueue = await db.select().from(roomQueueTable).where(eq(roomQueueTable.roomId, room.id));
  await db.insert(roomQueueTable).values({
    roomId: room.id,
    subjectId: request.subjectId,
    subjectType: request.subjectType,
    title: request.title,
    coverUrl: request.coverUrl,
    position: existingQueue.length,
  });
  await db.update(roomRequestsTable).set({ status: "approved" }).where(eq(roomRequestsTable.id, reqId));
  res.json({ message: "Approved" });
});

router.post("/rooms/my/requests/:reqId/reject", requireAuth, async (req, res): Promise<void> => {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.hostUserId, req.userId!));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const raw = Array.isArray(req.params.reqId) ? req.params.reqId[0] : req.params.reqId;
  const reqId = parseInt(raw, 10);
  await db.update(roomRequestsTable).set({ status: "rejected" }).where(eq(roomRequestsTable.id, reqId));
  res.json({ message: "Rejected" });
});

export default router;
