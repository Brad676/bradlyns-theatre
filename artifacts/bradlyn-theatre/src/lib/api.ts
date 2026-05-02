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

export async function directStreamFetch(subjectId: string): Promise<string | null> {
  const r = await fetch(`${EXTERNAL_API_BASE}/stream/${subjectId}`);
  if (!r.ok) return null;
  const j = await r.json() as { url?: string };
  return j.url ?? null;
}

export async function getStreamUrl(subjectId: string): Promise<string | null> {
  return `${EXTERNAL_API_BASE}/stream/${subjectId}`;
}

export async function getSeriesStreamUrl(seriesId: string): Promise<string | null> {
  return `${EXTERNAL_API_BASE}/stream/${seriesId}`;
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
