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

// Public Invidious instance — only used to build download URLs the user's
// browser fetches directly. The server never contacts Invidious itself.
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
 * Music video resolver using YouTube's InnerTube API.
 *
 * InnerTube is YouTube's own internal search API — the same one their
 * web client uses. No API key or login is required for search queries.
 * It works reliably from server-side and never triggers bot-detection
 * in the user's browser (unlike the listType=search iframe embed).
 *
 * Returns a specific videoId so the client can embed:
 *   https://www.youtube.com/embed/{videoId}?autoplay=1
 * (direct embeds never show the "confirm you're not a robot" prompt)
 */
router.get("/music/stream", async (req, res): Promise<void> => {
  const { q } = req.query as Record<string, string>;
  if (!q) { res.status(400).json({ error: "q required" }); return; }

  const cacheKey = `innertube:${q}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) { res.json(hit.data); return; }

  const resolveVideoId = async (): Promise<string> => {
    // ── Strategy 1: YouTube InnerTube API (most reliable) ──────────────────
    try {
      const body = JSON.stringify({
        query: q,
        params: "EgIQAQ%3D%3D", // filter: videos only
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20231219.02.00",
            hl: "en",
            gl: "US",
          },
        },
      });
      const r = await fetch(
        "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": BROWSER_UA,
            "X-Youtube-Client-Name": "1",
            "X-Youtube-Client-Version": "2.20231219.02.00",
          },
          body,
          signal: AbortSignal.timeout(10000),
        }
      );
      if (r.ok) {
        const json = await r.text();
        const m = json.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (m?.[1]) return m[1];
      }
    } catch { /* fall through */ }

    // ── Strategy 2: YouTube search HTML scrape ─────────────────────────────
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`;
    const r2 = await fetch(searchUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (r2.ok) {
      const html = await r2.text();
      const m2 = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (m2?.[1]) return m2[1];
    }

    throw new Error("Could not find a video ID for the query");
  };

  try {
    const videoId = await resolveVideoId();

    const result = {
      videoId,
      instance: INVIDIOUS,
      title: q,
      author: "",
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
      // Download URLs are fetched by the user's browser, not this server
      downloadVideoUrl: `${INVIDIOUS}/latest_version?id=${videoId}&itag=22&local=true`,
      downloadAudioUrl: `${INVIDIOUS}/latest_version?id=${videoId}&itag=140&local=true`,
      audioUrl: `${INVIDIOUS}/latest_version?id=${videoId}&itag=140&local=true`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };

    cache.set(cacheKey, { data: result, expires: Date.now() + YT_CACHE_TTL });
    res.json(result);
  } catch (err) {
    logger.warn({ q, err }, "Music video search failed (both strategies)");
    res.status(502).json({ error: "Could not find music video" });
  }
});

export default router;
