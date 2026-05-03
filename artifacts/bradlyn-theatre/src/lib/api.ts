const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const EXTERNAL_API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api/proxy";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let authToken: string | null = localStorage.getItem("bt_token");

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("bt_token", token);
  else localStorage.removeItem("bt_token");
}

export function getAuthToken() {
  return authToken;
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return fetch(url, { ...options, headers });
}

export async function externalFetch(path: string, params: Record<string, string | number> = {}): Promise<unknown> {
  const query = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString();
  const url = `${EXTERNAL_API_BASE}/${path}${query ? "?" + query : ""}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
}

export async function searchSubjects(keyword: string, page = 1, perPage = 20, subjectType?: number): Promise<unknown> {
  const obj: Record<string, string> = { keyword, page: String(page), perPage: String(perPage) };
  if (subjectType !== undefined && subjectType !== 0) obj.subjectType = String(subjectType);
  const params = new URLSearchParams(obj);
  const r = await fetch(`${EXTERNAL_API_BASE}/search?${params.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
}

function extractVideoUrl(json: unknown): string | null {
  const j = json as {
    code?: number;
    data?: {
      mediaUrl?: string; url?: string; playUrl?: string;
      videoUrl?: string; streamUrl?: string;
      mediaInfo?: { url?: string };
      playInfo?: { url?: string };
    };
  };
  if (j.code !== undefined && j.code !== 0) return null;
  const d = j.data;
  return d?.mediaUrl ?? d?.url ?? d?.playUrl ?? d?.videoUrl
    ?? d?.streamUrl ?? d?.mediaInfo?.url ?? d?.playInfo?.url ?? null;
}

export async function directStreamFetch(subjectId: string, season?: number, episode?: number, resolution = "720", lang = "En"): Promise<string | null> {
  const params: Record<string, string> = { subjectId, resolution, lang };
  if (season !== undefined && episode !== undefined) {
    params.se = String(season);
    params.ep = String(episode);
  }
  const query = new URLSearchParams(params).toString();
  const directUrl = `https://movieapi.xcasper.space/api/bff/stream?${query}`;

  // 1. Try direct browser fetch — the browser's Cloudflare fingerprint lets this through
  try {
    const r = await fetch(directUrl, {
      headers: { "Referer": "https://movieapi.xcasper.space/" },
    });
    if (r.ok) {
      const ct = r.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const json = await r.json();
        const extracted = extractVideoUrl(json);
        if (extracted) return extracted;
      } else {
        // API returned video/stream directly — use the URL as-is
        return directUrl;
      }
    }
  } catch {
    // CORS or network error — fall through to proxy attempt
  }

  // 2. Try proxy (works for non-CF-protected content)
  try {
    const r2 = await fetch(`${EXTERNAL_API_BASE}/bff/stream?${query}`);
    if (r2.ok) {
      const json2 = await r2.json();
      const extracted2 = extractVideoUrl(json2);
      if (extracted2) return extracted2;
    }
  } catch { /* ignore */ }

  // 3. Last resort: hand the raw URL to the <video> element; it may succeed
  //    where fetch() failed (different request context / CF cookie state)
  return directUrl;
}

export async function getStreamUrl(subjectId: string, season?: number, episode?: number, resolution = "720", lang = "En"): Promise<string | null> {
  return directStreamFetch(subjectId, season, episode, resolution, lang);
}

export async function getSeriesStreamUrl(seriesId: string, season?: number, episode?: number, resolution = "720", lang = "En"): Promise<string | null> {
  return getStreamUrl(seriesId, season, episode, resolution, lang);
}

export type MusicTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl?: string;
  trackViewUrl?: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackTimeMillis?: number;
  country?: string;
  isStreamable?: boolean;
};

export async function fetchMusicTracks(term: string, country?: string, limit = 25): Promise<MusicTrack[]> {
  const params = new URLSearchParams({ term, limit: String(limit), ...(country ? { country } : {}) });
  const r = await fetch(`${API_BASE}/music/search?${params.toString()}`, { cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json() as { results?: MusicTrack[] };
  return data.results ?? [];
}

export async function apiPost(path: string, body: unknown): Promise<Response> {
  return apiFetch(`${API_BASE}/${path}`, { method: "POST", body: JSON.stringify(body) });
}

export async function apiGet(path: string): Promise<Response> {
  return apiFetch(`${API_BASE}/${path}`);
}

export async function apiDelete(path: string): Promise<Response> {
  return apiFetch(`${API_BASE}/${path}`, { method: "DELETE" });
}

export async function apiPut(path: string, body: unknown): Promise<Response> {
  return apiFetch(`${API_BASE}/${path}`, { method: "PUT", body: JSON.stringify(body) });
}

export type Subject = {
  subjectId: string;
  subjectType: number;
  title: string;
  description?: string;
  cover: { url: string } | null;
  stills?: { url: string } | null;
  genre?: string;
  releaseDate?: string;
  imdbRatingValue?: string;
  imdbRatingCount?: number;
  countryName?: string;
  duration?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  detailPath?: string;
  trailer?: { videoAddress: { url: string } } | null;
  trailerUrl?: string;
  dubs?: Array<{ subjectId: string; lanName: string; lanCode: string; original: boolean }>;
};

export type Staff = {
  staffId: string;
  name: string;
  avatarUrl?: string;
  character?: string;
  staffType?: string[];
  born?: string;
  description?: string;
  subjectNum?: number;
  detailPath?: string;
};

export type Room = {
  id: number;
  hostUserId: number;
  hostUsername: string;
  name: string;
  password: boolean;
  state: string;
  currentSubjectId?: string;
  currentSubjectType?: number;
  currentTitle?: string;
  currentCoverUrl?: string;
  currentTimestampSec: number;
  idleStartAt?: string;
  queue?: QueueItem[];
};

export type QueueItem = {
  id: number;
  roomId: number;
  subjectId: string;
  subjectType: number;
  title: string;
  coverUrl: string;
  position: number;
  seriesSeason?: number;
  seriesEpisode?: number;
  scheduledAt?: string;
};
