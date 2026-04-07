import { Router } from "express";
import { db } from "@workspace/db";
import {
  watchlistTable,
  watchHistoryTable,
  ratingsTable,
  searchHistoryTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/user/watchlist", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(watchlistTable).where(eq(watchlistTable.userId, req.userId!)).orderBy(desc(watchlistTable.addedAt));
  res.json(items);
});

router.post("/user/watchlist", requireAuth, async (req, res): Promise<void> => {
  const { subjectId, subjectType, title, coverUrl, genre, releaseDate, imdbRating } = req.body as Record<string, string | number>;
  if (!subjectId || !subjectType || !title) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const existing = await db.select().from(watchlistTable).where(and(eq(watchlistTable.userId, req.userId!), eq(watchlistTable.subjectId, String(subjectId))));
  if (existing.length > 0) {
    res.status(409).json({ error: "Already in watchlist" });
    return;
  }
  const [item] = await db.insert(watchlistTable).values({
    userId: req.userId!,
    subjectId: String(subjectId),
    subjectType: Number(subjectType),
    title: String(title),
    coverUrl: String(coverUrl ?? ""),
    genre: String(genre ?? ""),
    releaseDate: String(releaseDate ?? ""),
    imdbRating: String(imdbRating ?? ""),
  }).returning();
  res.status(201).json(item);
});

router.delete("/user/watchlist/:subjectId", requireAuth, async (req, res): Promise<void> => {
  const subjectId = Array.isArray(req.params.subjectId) ? req.params.subjectId[0] : req.params.subjectId;
  await db.delete(watchlistTable).where(and(eq(watchlistTable.userId, req.userId!), eq(watchlistTable.subjectId, subjectId)));
  res.json({ message: "Removed from watchlist" });
});

router.get("/user/watchlist/:subjectId", requireAuth, async (req, res): Promise<void> => {
  const subjectId = Array.isArray(req.params.subjectId) ? req.params.subjectId[0] : req.params.subjectId;
  const [item] = await db.select().from(watchlistTable).where(and(eq(watchlistTable.userId, req.userId!), eq(watchlistTable.subjectId, subjectId)));
  res.json({ inWatchlist: !!item });
});

router.get("/user/history", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(watchHistoryTable).where(eq(watchHistoryTable.userId, req.userId!)).orderBy(desc(watchHistoryTable.updatedAt));
  res.json(items);
});

router.post("/user/history", requireAuth, async (req, res): Promise<void> => {
  const { subjectId, subjectType, title, coverUrl, timestampSec, durationSec, playbackSpeed } = req.body as Record<string, string | number>;
  if (!subjectId || !subjectType || !title) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const existing = await db.select().from(watchHistoryTable).where(and(eq(watchHistoryTable.userId, req.userId!), eq(watchHistoryTable.subjectId, String(subjectId))));
  if (existing.length > 0) {
    const [updated] = await db.update(watchHistoryTable)
      .set({
        timestampSec: Number(timestampSec ?? 0),
        durationSec: Number(durationSec ?? 0),
        playbackSpeed: Number(playbackSpeed ?? 1),
        updatedAt: new Date(),
      })
      .where(and(eq(watchHistoryTable.userId, req.userId!), eq(watchHistoryTable.subjectId, String(subjectId))))
      .returning();
    res.json(updated);
    return;
  }
  const [item] = await db.insert(watchHistoryTable).values({
    userId: req.userId!,
    subjectId: String(subjectId),
    subjectType: Number(subjectType),
    title: String(title),
    coverUrl: String(coverUrl ?? ""),
    timestampSec: Number(timestampSec ?? 0),
    durationSec: Number(durationSec ?? 0),
    playbackSpeed: Number(playbackSpeed ?? 1),
    updatedAt: new Date(),
  }).returning();
  res.status(201).json(item);
});

router.delete("/user/history/:subjectId", requireAuth, async (req, res): Promise<void> => {
  const subjectId = Array.isArray(req.params.subjectId) ? req.params.subjectId[0] : req.params.subjectId;
  await db.delete(watchHistoryTable).where(and(eq(watchHistoryTable.userId, req.userId!), eq(watchHistoryTable.subjectId, subjectId)));
  res.json({ message: "Removed from history" });
});

router.get("/user/ratings", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(ratingsTable).where(eq(ratingsTable.userId, req.userId!));
  res.json(items);
});

router.post("/user/ratings", requireAuth, async (req, res): Promise<void> => {
  const { subjectId, rating } = req.body as { subjectId?: string; rating?: number };
  if (!subjectId || rating == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const existing = await db.select().from(ratingsTable).where(and(eq(ratingsTable.userId, req.userId!), eq(ratingsTable.subjectId, subjectId)));
  if (existing.length > 0) {
    const [updated] = await db.update(ratingsTable).set({ rating, updatedAt: new Date() }).where(and(eq(ratingsTable.userId, req.userId!), eq(ratingsTable.subjectId, subjectId))).returning();
    res.json(updated);
    return;
  }
  const [item] = await db.insert(ratingsTable).values({ userId: req.userId!, subjectId, rating, updatedAt: new Date() }).returning();
  res.status(201).json(item);
});

router.get("/user/ratings/:subjectId", requireAuth, async (req, res): Promise<void> => {
  const subjectId = Array.isArray(req.params.subjectId) ? req.params.subjectId[0] : req.params.subjectId;
  const [item] = await db.select().from(ratingsTable).where(and(eq(ratingsTable.userId, req.userId!), eq(ratingsTable.subjectId, subjectId)));
  res.json({ rating: item?.rating ?? null });
});

router.get("/user/search-history", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(searchHistoryTable).where(eq(searchHistoryTable.userId, req.userId!)).orderBy(desc(searchHistoryTable.createdAt)).limit(50);
  res.json(items);
});

router.post("/user/search-history", requireAuth, async (req, res): Promise<void> => {
  const { keyword } = req.body as { keyword?: string };
  if (!keyword) {
    res.status(400).json({ error: "Keyword is required" });
    return;
  }
  const existing = await db.select().from(searchHistoryTable).where(and(eq(searchHistoryTable.userId, req.userId!), eq(searchHistoryTable.keyword, keyword)));
  if (existing.length > 0) {
    res.json(existing[0]);
    return;
  }
  const [item] = await db.insert(searchHistoryTable).values({ userId: req.userId!, keyword }).returning();
  res.status(201).json(item);
});

router.delete("/user/search-history/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(searchHistoryTable).where(and(eq(searchHistoryTable.userId, req.userId!), eq(searchHistoryTable.id, id)));
  res.json({ message: "Deleted" });
});

router.delete("/user/search-history", requireAuth, async (req, res): Promise<void> => {
  await db.delete(searchHistoryTable).where(eq(searchHistoryTable.userId, req.userId!));
  res.json({ message: "All search history cleared" });
});

router.get("/user/stats", requireAuth, async (req, res): Promise<void> => {
  const history = await db.select().from(watchHistoryTable).where(eq(watchHistoryTable.userId, req.userId!));
  const totalSeconds = history.reduce((sum, h) => sum + h.timestampSec, 0);
  const movies = history.filter(h => h.subjectType === 1).length;
  const series = history.filter(h => h.subjectType === 2).length;
  const watchlistCount = await db.select({ count: sql<number>`count(*)` }).from(watchlistTable).where(eq(watchlistTable.userId, req.userId!));
  res.json({
    totalWatchTimeSeconds: totalSeconds,
    moviesWatched: movies,
    seriesWatched: series,
    watchlistCount: Number(watchlistCount[0]?.count ?? 0),
  });
});

export default router;
