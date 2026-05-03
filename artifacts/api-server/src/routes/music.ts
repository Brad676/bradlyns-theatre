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

router.get("/music/stream", async (req, res): Promise<void> => {
  const { q } = req.query as Record<string, string>;
  if (!q) { res.status(400).json({ error: "q required" }); return; }

  const cacheKey = `stream:${q}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) { res.json(hit.data); return; }

  type InvidiousResult = { videoId: string; title: string; author: string; lengthSeconds: number };
  type AdaptiveFormat = { itag: number; type: string; bitrate: number };

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      // 1. Search for the best matching video
      const searchUrl = `${instance}/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=videoId,title,author,lengthSeconds`;
      const searchR = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
      if (!searchR.ok) continue;
      const searchData = await searchR.json() as InvidiousResult[];
      if (!Array.isArray(searchData) || searchData.length === 0) continue;

      // Prefer official/audio/lyrics/topic channels, skip very short clips (<60s)
      const candidates = searchData.filter(v => v.lengthSeconds > 60);
      const preferred = (candidates.length > 0 ? candidates : searchData).find(v =>
        /official|audio|lyrics|topic/i.test(v.title) || /VEVO|Topic/i.test(v.author)
      ) ?? (candidates.length > 0 ? candidates[0] : searchData[0]);
      if (!preferred?.videoId) continue;

      // 2. Fetch adaptive formats for the video
      const videoUrl = `${instance}/api/v1/videos/${preferred.videoId}?fields=adaptiveFormats`;
      const videoR = await fetch(videoUrl, { signal: AbortSignal.timeout(8000) });
      if (!videoR.ok) continue;
      const videoData = await videoR.json() as { adaptiveFormats?: AdaptiveFormat[] };

      const audioFormats = (videoData.adaptiveFormats ?? []).filter(f => f.type?.startsWith("audio/"));
      // Prefer itag 140 (m4a/128kbps) then 251 (webm opus) then anything
      const best = audioFormats.find(f => f.itag === 140)
        ?? audioFormats.find(f => f.itag === 251)
        ?? audioFormats.find(f => f.itag === 250)
        ?? audioFormats[0];
      if (!best) continue;

      // 3. Return Invidious audio proxy URL — streams through Invidious, avoids CORS
      const audioUrl = `${instance}/latest_version?id=${preferred.videoId}&itag=${best.itag}&local=true`;
      const result = { audioUrl, title: preferred.title, videoId: preferred.videoId };
      cache.set(cacheKey, { data: result, expires: Date.now() + YT_CACHE_TTL });
      res.json(result);
      return;
    } catch {
      continue;
    }
  }

  logger.warn({ q }, "All Invidious instances failed for audio stream lookup");
  res.status(502).json({ error: "Could not find audio stream" });
});

export default router;
