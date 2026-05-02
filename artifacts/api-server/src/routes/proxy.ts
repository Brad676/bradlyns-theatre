import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

const BASE_URL = "https://movieapi.xcasper.space/api";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const ALLOWED_PATHS = [
  "trending",
  "hot",
  "popular-search",
  "search",
  "search/suggest",
  "detail",
  "rich-detail",
  "homepage",
  "recommend",
  "browse",
  "ranking",
  "staff/detail",
  "staff/works",
  "staff/related",
  "bff/stream",
  "episodes",
  "stream",
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
    const response = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Referer": "https://movieapi.xcasper.space/",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
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

router.get("/proxy/episodes/:subjectId", async (req, res): Promise<void> => {
  const subjectIdRaw = req.params.subjectId;
  const subjectId = Array.isArray(subjectIdRaw) ? subjectIdRaw[0] : subjectIdRaw;
  const { db } = await import("@workspace/db");
  const { episodeCacheTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  const cached = await db.select().from(episodeCacheTable).where(eq(episodeCacheTable.subjectId, subjectId));
  if (cached.length > 0) {
    res.json(JSON.parse(cached[0].episodeData));
    return;
  }

  let seriesTitle = req.query.title as string ?? "Unknown Series";

  try {
    const aiUrl = `https://apis.xwolf.space/api/gpt4?q=${encodeURIComponent(`Give me the episode list for series "${seriesTitle}" in JSON format: { "seasons": [ { "season": 1, "episodes": [ { "episode": 1, "title": "..." } ] } ] }`)}`;
    const aiResp = await fetch(aiUrl, { signal: AbortSignal.timeout(10000) });
    if (aiResp.ok) {
      const text = await aiResp.text();
      const jsonMatch = text.match(/\{[\s\S]*"seasons"[\s\S]*\}/);
      if (jsonMatch) {
        const episodeData = JSON.parse(jsonMatch[0]);
        await db.insert(episodeCacheTable).values({ subjectId, episodeData: JSON.stringify(episodeData) });
        res.json(episodeData);
        return;
      }
    }
  } catch (err) {
    logger.warn({ err }, "AI episode fetch failed, falling back");
  }

  const fallback = {
    seasons: Array.from({ length: 3 }, (_, s) => ({
      season: s + 1,
      episodes: Array.from({ length: 10 }, (_, e) => ({
        episode: e + 1,
        title: `Episode ${e + 1}`,
      })),
    })),
  };
  await db.insert(episodeCacheTable).values({ subjectId, episodeData: JSON.stringify(fallback) });
  res.json(fallback);
});

export default router;
