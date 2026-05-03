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

/**
 * Music video stream resolver.
 * Searches Invidious for the best matching music video, then returns:
 *   - embedUrl  : YouTube native embed URL  (plays full video in an iframe, free)
 *   - downloadVideoUrl : Invidious 720p video download
 *   - downloadAudioUrl : Invidious m4a audio download
 * No YouTube Data API key is needed.
 */
router.get("/music/stream", async (req, res): Promise<void> => {
  const { q } = req.query as Record<string, string>;
  if (!q) { res.status(400).json({ error: "q required" }); return; }

  const cacheKey = `yt:${q}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) { res.json(hit.data); return; }

  type InvidiousResult = { videoId: string; title: string; author: string; lengthSeconds: number };

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=videoId,title,author,lengthSeconds`;
      const searchR = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
      if (!searchR.ok) continue;

      const searchData = await searchR.json() as InvidiousResult[];
      if (!Array.isArray(searchData) || searchData.length === 0) continue;

      const candidates = searchData.filter(v => v.lengthSeconds > 60);
      const pool = candidates.length > 0 ? candidates : searchData;

      const preferred =
        pool.find(v => /official.*music.*video|music.*video.*official/i.test(v.title)) ??
        pool.find(v => /official.*video|official.*audio|official.*lyrics/i.test(v.title)) ??
        pool.find(v => /VEVO|Topic/i.test(v.author)) ??
        pool.find(v => /official/i.test(v.title)) ??
        pool[0];

      if (!preferred?.videoId) continue;

      const { videoId, title, author } = preferred;

      const result = {
        videoId,
        instance,
        title,
        author,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
        downloadVideoUrl: `${instance}/latest_version?id=${videoId}&itag=22&local=true`,
        downloadAudioUrl: `${instance}/latest_version?id=${videoId}&itag=140&local=true`,
        audioUrl: `${instance}/latest_version?id=${videoId}&itag=140&local=true`,
      };

      cache.set(cacheKey, { data: result, expires: Date.now() + YT_CACHE_TTL });
      res.json(result);
      return;
    } catch {
      continue;
    }
  }

  logger.warn({ q }, "All Invidious instances failed for music video lookup");
  res.status(502).json({ error: "Could not find music video" });
});

export default router;
