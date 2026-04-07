import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { roomsTable, roomQueueTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
});

const roomViewers = new Map<number, Set<string>>();
const roomNotifyListeners = new Map<number, Set<string>>();

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket connected");

  socket.on("join-room", async (roomId: number) => {
    socket.join(`room:${roomId}`);
    if (!roomViewers.has(roomId)) roomViewers.set(roomId, new Set());
    roomViewers.get(roomId)!.add(socket.id);
    io.to(`room:${roomId}`).emit("viewer-count", roomViewers.get(roomId)!.size);

    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
    if (room) socket.emit("room-state", room);

    const queue = await db.select().from(roomQueueTable).where(eq(roomQueueTable.roomId, roomId)).orderBy(asc(roomQueueTable.position));
    socket.emit("queue-update", queue);
  });

  socket.on("leave-room", (roomId: number) => {
    socket.leave(`room:${roomId}`);
    if (roomViewers.has(roomId)) {
      roomViewers.get(roomId)!.delete(socket.id);
      io.to(`room:${roomId}`).emit("viewer-count", roomViewers.get(roomId)!.size);
    }
    if (roomNotifyListeners.has(roomId)) {
      roomNotifyListeners.get(roomId)!.delete(socket.id);
    }
  });

  socket.on("notify-when-active", (roomId: number) => {
    if (!roomNotifyListeners.has(roomId)) roomNotifyListeners.set(roomId, new Set());
    roomNotifyListeners.get(roomId)!.add(socket.id);
  });

  socket.on("host-play", async (data: { roomId: number; subjectId: string; subjectType: number; title: string; coverUrl: string }) => {
    await db.update(roomsTable).set({
      state: "playing",
      currentSubjectId: data.subjectId,
      currentSubjectType: data.subjectType,
      currentTitle: data.title,
      currentCoverUrl: data.coverUrl,
      currentTimestampSec: 0,
      idleStartAt: null,
      updatedAt: new Date(),
    }).where(eq(roomsTable.id, data.roomId));

    const notifyIds = roomNotifyListeners.get(data.roomId);
    if (notifyIds && notifyIds.size > 0) {
      for (const sid of notifyIds) {
        io.to(sid).emit("room-now-active", { roomId: data.roomId, title: data.title });
      }
      roomNotifyListeners.set(data.roomId, new Set());
    }

    io.to(`room:${data.roomId}`).emit("room-state", {
      state: "playing",
      currentSubjectId: data.subjectId,
      currentSubjectType: data.subjectType,
      currentTitle: data.title,
      currentCoverUrl: data.coverUrl,
      currentTimestampSec: 0,
    });
  });

  socket.on("host-seek", (data: { roomId: number; timestampSec: number }) => {
    io.to(`room:${data.roomId}`).emit("player-seek", data.timestampSec);
  });

  socket.on("host-pause", (data: { roomId: number }) => {
    io.to(`room:${data.roomId}`).emit("player-pause");
  });

  socket.on("host-resume", (data: { roomId: number }) => {
    io.to(`room:${data.roomId}`).emit("player-resume");
  });

  socket.on("host-idle", async (data: { roomId: number }) => {
    const now = new Date();
    await db.update(roomsTable).set({ state: "idle", idleStartAt: now, updatedAt: now }).where(eq(roomsTable.id, data.roomId));
    io.to(`room:${data.roomId}`).emit("room-state", { state: "idle", idleStartAt: now.toISOString() });
  });

  socket.on("queue-updated", async (roomId: number) => {
    const queue = await db.select().from(roomQueueTable).where(eq(roomQueueTable.roomId, roomId)).orderBy(asc(roomQueueTable.position));
    io.to(`room:${roomId}`).emit("queue-update", queue);
  });

  socket.on("new-request", (data: { roomId: number; username: string; title: string }) => {
    io.to(`room:${data.roomId}`).emit("room-notification", { type: "request", message: `${data.username} requested: ${data.title}` });
  });

  socket.on("disconnect", () => {
    for (const [roomId, viewers] of roomViewers.entries()) {
      if (viewers.has(socket.id)) {
        viewers.delete(socket.id);
        io.to(`room:${roomId}`).emit("viewer-count", viewers.size);
      }
    }
    for (const [roomId, listeners] of roomNotifyListeners.entries()) {
      listeners.delete(socket.id);
    }
    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
});

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
