import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();
const ITUNES_BASE = "https://itunes.apple.com";
const CACHE_TTL = 10 * 60 * 1000;
const YT_CACHE_TTL = 60 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Public Invidious instance used to build browser-side download URLs.
// The server never fetches from Invidious — it only hands these URLs to the
// user's browser, which can reach Invidious directly.
const INVIDIOUS = "https://inv.tux.pizza";

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
 * Music video resolver.
 *
 * Scrapes YouTube's search-results page (no API key required) to find the
 * best matching videoId, then returns:
 *   - embedUrl          : exact YouTube embed for that video
 *   - downloadVideoUrl  : Invidious 720p download (fetched by the user's browser)
 *   - downloadAudioUrl  : Invidious m4a download  (fetched by the user's browser)
 *
 * The server never contacts Invidious — it just constructs the URLs.
 */
router.get("/music/stream", async (req, res): Promise<void> => {
  const { q } = req.query as Record<string, string>;
  if (!q) { res.status(400).json({ error: "q required" }); return; }

  const cacheKey = `yt-scrape:${q}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) { res.json(hit.data); return; }

  try {
    // YouTube embeds the full search JSON in the page's <script> tags.
    // Filter=EgIQAQ%3D%3D restricts results to videos only.
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`;
    const r = await fetch(searchUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`YouTube returned ${r.status}`);

    const html = await r.text();

    // The first "videoId" occurrence in the page JSON is the top search result.
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = videoIdMatch?.[1];
    if (!videoId) throw new Error("No videoId found in YouTube search results");

    const result = {
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
      downloadVideoUrl: `${INVIDIOUS}/latest_version?id=${videoId}&itag=22&local=true`,
      downloadAudioUrl: `${INVIDIOUS}/latest_version?id=${videoId}&itag=140&local=true`,
      audioUrl: `${INVIDIOUS}/latest_version?id=${videoId}&itag=140&local=true`,
      instance: INVIDIOUS,
      title: q,
      author: "",
    };

    cache.set(cacheKey, { data: result, expires: Date.now() + YT_CACHE_TTL });
    res.json(result);
  } catch (err) {
    logger.warn({ q, err }, "YouTube search scrape failed");
    res.status(502).json({ error: "Could not find music video" });
  }
});

export default router;
