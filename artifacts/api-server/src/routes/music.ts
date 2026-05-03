import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();
const ITUNES_BASE = "https://itunes.apple.com";
const CACHE_TTL = 10 * 60 * 1000;
const YT_CACHE_TTL = 60 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

const INVIDIOUS_INSTANCES = [
  "https://inv.tux.pizza",
  "https://invidious.privacydev.net",
  "https://yt.cdaut.de",
  "https://invidious.io.lol",
  "https://invidious.fdn.fr",
];

router.get("/music/search", async (req, res): Promise<void> => {
  const { term, country, limit = "25" } = req.query as Record<string, string>;
  if (!term) { res.status(400).json({ error: "term required" }); return; }

  const params = new URLSearchParams({
    term,
    media: "music",
    entity: "musicTrack",
    limit: String(Math.min(Number(limit), 50)),
    ...(country ? { country } : {}),
  });
  const url = `${ITUNES_BASE}/search?${params.toString()}`;
  const cacheKey = url;

  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) { res.json(hit.data); return; }

  const existing = inflight.get(cacheKey);
  if (existing) { res.json(await existing); return; }

  const fetchPromise = fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible)", "Accept": "application/json" },
    signal: AbortSignal.timeout(12000),
  }).then(async r => {
    const data = await r.json();
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });
    inflight.delete(cacheKey);
    return data;
  }).catch(err => { inflight.delete(cacheKey); throw err; });

  inflight.set(cacheKey, fetchPromise);

  try {
    const data = await fetchPromise;
    res.json(data);
  } catch (err) {
    logger.error({ err, url }, "iTunes API request failed");
    res.status(502).json({ error: "Music API unavailable" });
  }
});

router.get("/music/youtube", async (req, res): Promise<void> => {
  const { q } = req.query as Record<string, string>;
  if (!q) { res.status(400).json({ error: "q required" }); return; }

  const cacheKey = `yt:${q}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) { res.json(hit.data); return; }

  type InvidiousResult = { videoId: string; title: string; author: string; lengthSeconds: number };

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=videoId,title,author,lengthSeconds`;
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const data = await r.json() as InvidiousResult[];
      if (!Array.isArray(data) || data.length === 0) continue;
      // Prefer official audio/video, then first result
      const preferred = data.find(v =>
        /official|audio|lyrics|topic/i.test(v.title) || /VEVO|Topic/i.test(v.author)
      ) ?? data[0];
      if (!preferred?.videoId) continue;
      const result = { videoId: preferred.videoId, title: preferred.title, author: preferred.author };
      cache.set(cacheKey, { data: result, expires: Date.now() + YT_CACHE_TTL });
      res.json(result);
      return;
    } catch {
      continue;
    }
  }

  logger.warn({ q }, "All Invidious instances failed for YouTube lookup");
  res.status(502).json({ error: "Could not find video" });
});

export default router;
