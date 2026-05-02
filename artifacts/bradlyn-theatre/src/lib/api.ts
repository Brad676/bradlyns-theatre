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
  const params = new URLSearchParams({
    keyword,
    page: String(page),
    perPage: String(perPage),
    subjectType: String(subjectType ?? 0),
  });
  const r = await fetch(`${EXTERNAL_API_BASE}/search?${params.toString()}`);
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
}

export async function directStreamFetch(subjectId: string, season?: number, episode?: number, resolution = "720", lang = "En"): Promise<string | null> {
  const query = new URLSearchParams({ resolution, lang });
  if (season && episode) {
    query.set("se", String(season));
    query.set("ep", String(episode));
  }
  return season && episode
    ? `https://movieapi.xcasper.space/api/bff/stream?subjectId=${encodeURIComponent(subjectId)}&se=${encodeURIComponent(String(season))}&ep=${encodeURIComponent(String(episode))}&resolution=${encodeURIComponent(resolution)}&lang=${encodeURIComponent(lang)}`
    : `https://movieapi.xcasper.space/api/bff/stream?subjectId=${encodeURIComponent(subjectId)}&resolution=${encodeURIComponent(resolution)}&lang=${encodeURIComponent(lang)}`;
}

export async function getStreamUrl(subjectId: string, season?: number, episode?: number, resolution = "720", lang = "En"): Promise<string | null> {
  return directStreamFetch(subjectId, season, episode, resolution, lang);
}

export async function getSeriesStreamUrl(seriesId: string, season?: number, episode?: number, resolution = "720", lang = "En"): Promise<string | null> {
  return getStreamUrl(seriesId, season, episode, resolution, lang);
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
