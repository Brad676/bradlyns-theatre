import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

const BASE_URL = "https://movieapi.xcasper.space/api";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();
const NO_CACHE_PREFIXES = ["bff/stream", "stream"];

function shouldCache(path: string) {
  return !NO_CACHE_PREFIXES.some(p => path === p || path.startsWith(p + "?") || path.startsWith(p + "/"));
}

async function cachedFetch(url: string, path: string): Promise<{ data: unknown; status: number }> {
  const cacheable = shouldCache(path);
  if (cacheable) {
    const hit = cache.get(url);
    if (hit && hit.expires > Date.now()) return { data: hit.data, status: 200 };
    const existing = inflight.get(url);
    if (existing) return { data: await existing, status: 200 };
  }

  const fetchPromise = fetch(url, {
    headers: { "User-Agent": BROWSER_UA, "Referer": "https://movieapi.xcasper.space/", "Accept": "application/json" },
    signal: AbortSignal.timeout(15000),
  }).then(async r => {
    const ct = r.headers.get("content-type") ?? "";
    const data = ct.includes("application/json") ? await r.json() : await r.text();
    if (cacheable && r.status === 200) {
      const d = data as { data?: { items?: unknown[]; subjectList?: unknown[] } };
      const isEmptySearch = (path.startsWith("search") || path.startsWith("browse"))
        && Array.isArray(d?.data?.items ?? d?.data?.subjectList)
        && (d?.data?.items ?? d?.data?.subjectList ?? []).length === 0;
      if (!isEmptySearch) cache.set(url, { data, expires: Date.now() + CACHE_TTL });
    }
    inflight.delete(url);
    return { data, status: r.status };
  }).catch(err => { inflight.delete(url); throw err; });

  if (cacheable) inflight.set(url, fetchPromise.then(r => r.data));
  return fetchPromise;
}

const ALLOWED_PATHS = [
  "trending", "hot", "popular-search", "search", "search/suggest",
  "detail", "rich-detail", "homepage", "recommend", "browse", "ranking",
  "staff/detail", "staff/works", "staff/related", "bff/stream", "episodes", "stream",
];

function isAllowed(path: string): boolean {
  return ALLOWED_PATHS.some(allowed => path === allowed || path.startsWith(allowed + "/") || path.startsWith(allowed + "?"));
}

router.get("/proxy/*splat", async (req, res): Promise<void> => {
  const pathParam = req.params.splat;
  const path = Array.isArray(pathParam) ? pathParam.join("/") : (pathParam ?? "");

  if (!isAllowed(path)) {
    res.status(403).json({ error: "Forbidden path" });
    return;
  }

  const query = new URLSearchParams(req.query as Record<string, string>).toString();
  const url = `${BASE_URL}/${path}${query ? "?" + query : ""}`;

  try {
    const { data, status } = await cachedFetch(url, path);
    res.status(status).json(data);
  } catch (err) {
    logger.error({ err, url }, "Proxy request failed");
    res.status(502).json({ error: "Upstream API unavailable" });
  }
});

router.get("/proxy/stream/:subjectId", async (req, res): Promise<void> => {
  const subjectId = req.params.subjectId as string;
  const resolution = (req.query.resolution as string | undefined) ?? "720";
  const lang = (req.query.lang as string | undefined) ?? "En";
  const season = req.query.season as string | undefined;
  const episode = req.query.ep as string | undefined;

  const url = season && episode
    ? `${BASE_URL}/bff/stream?subjectId=${encodeURIComponent(subjectId)}&se=${encodeURIComponent(season)}&ep=${encodeURIComponent(episode)}&resolution=${encodeURIComponent(resolution)}&lang=${encodeURIComponent(lang)}`
    : `${BASE_URL}/bff/stream?subjectId=${encodeURIComponent(subjectId)}&resolution=${encodeURIComponent(resolution)}&lang=${encodeURIComponent(lang)}`;

  res.json({ url });
});

/** DELETE cached episode data so it re-fetches on next request */
router.delete("/proxy/episodes/:subjectId", async (req, res): Promise<void> => {
  const subjectId = req.params.subjectId as string;
  try {
    const { db } = await import("@workspace/db");
    const { episodeCacheTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    await db.delete(episodeCacheTable).where(eq(episodeCacheTable.subjectId, subjectId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Episode cache delete failed");
    res.status(500).json({ error: "Cache delete failed" });
  }
});

router.get("/proxy/episodes/:subjectId", async (req, res): Promise<void> => {
  const subjectIdRaw = req.params.subjectId;
  const subjectId = Array.isArray(subjectIdRaw) ? subjectIdRaw[0] : subjectIdRaw;
  const { db } = await import("@workspace/db");
  const { episodeCacheTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  // Return cached data if available
  const cached = await db.select().from(episodeCacheTable).where(eq(episodeCacheTable.subjectId, subjectId));
  if (cached.length > 0) {
    const parsed = JSON.parse(cached[0].episodeData);
    // Migrate old records that lack duration
    const needsMigration = parsed?.seasons?.[0]?.episodes?.[0]?.duration === undefined;
    if (!needsMigration) {
      res.json(parsed);
      return;
    }
    // Delete stale cache so we re-fetch with duration
    await db.delete(episodeCacheTable).where(eq(episodeCacheTable.subjectId, subjectId));
  }

  const seriesTitle = (req.query.title as string | undefined) ?? "Unknown Series";

  // Ask AI for complete episode list including duration
  const prompt = `Give me the complete episode list for the TV series "${seriesTitle}". ` +
    `Return ONLY valid JSON in this exact format with no extra text: ` +
    `{ "seasons": [ { "seasonNumber": 1, "episodes": [ { "episodeNumber": 1, "title": "Episode Title", "duration": "45m" } ] } ] }. ` +
    `Use real episode titles and real durations where known. Include all seasons and all episodes.`;

  try {
    const aiUrl = `https://apis.xwolf.space/api/gpt4?q=${encodeURIComponent(prompt)}`;
    const aiResp = await fetch(aiUrl, { signal: AbortSignal.timeout(12000) });
    if (aiResp.ok) {
      const text = await aiResp.text();
      const jsonMatch = text.match(/\{[\s\S]*"seasons"[\s\S]*\}/);
      if (jsonMatch) {
        const raw = JSON.parse(jsonMatch[0]);
        // Normalise: support both {season/episode} and {seasonNumber/episodeNumber}
        const normalized = normalizeEpisodeData(raw);
        await db.insert(episodeCacheTable).values({ subjectId, episodeData: JSON.stringify(normalized) });
        res.json(normalized);
        return;
      }
    }
  } catch (err) {
    logger.warn({ err }, "AI episode fetch failed, falling back to generic data");
  }

  // Fallback: numbered episodes with estimated durations
  const fallback = buildFallback();
  await db.insert(episodeCacheTable).values({ subjectId, episodeData: JSON.stringify(fallback) });
  res.json(fallback);
});

/** Normalise varying AI response shapes into our canonical format */
function normalizeEpisodeData(raw: unknown): { seasons: Array<{ season: number; episodes: Array<{ episode: number; title: string; duration: string }> }> } {
  const r = raw as {
    seasons?: Array<{
      season?: number; seasonNumber?: number;
      episodes?: Array<{ episode?: number; episodeNumber?: number; title?: string; duration?: string }>;
    }>;
  };

  const seasons = (r.seasons ?? []).map(s => ({
    season: s.season ?? s.seasonNumber ?? 1,
    episodes: (s.episodes ?? []).map(e => ({
      episode: e.episode ?? e.episodeNumber ?? 1,
      title: e.title ?? `Episode ${e.episode ?? e.episodeNumber ?? 1}`,
      duration: e.duration ?? "~45m",
    })),
  }));

  return { seasons };
}

function buildFallback() {
  return {
    seasons: Array.from({ length: 2 }, (_, s) => ({
      season: s + 1,
      episodes: Array.from({ length: 10 }, (_, e) => ({
        episode: e + 1,
        title: `Episode ${e + 1}`,
        duration: "~45m",
      })),
    })),
  };
}

export default router;
