# Bradlyn's Theatre

A full-stack cyberpunk-themed streaming website. Dark background (#0a0f1f), animated neon accents (cyan #00f3ff, magenta #ff00c8, purple #9d00ff).

## Architecture

**Monorepo** managed with pnpm workspaces:
- `artifacts/bradlyn-theatre/` — React + Vite frontend (PORT set by Replit env)
- `artifacts/api-server/` — Express + Socket.io backend (port 8080)
- `lib/db/` — Drizzle ORM PostgreSQL schema

## External API
- Base: `https://movieapi.xcasper.space/api/bff/`
- **MUST** send `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...` header on all calls
- Endpoints: trending, hot, ranking, browse, search, search/suggest, detail, rich-detail, recommend, staff/detail, staff/works, staff/related
- Stream URL: `https://movieapi.xcasper.space/api/bff/stream?subjectId={id}` (client-side only)
- All proxy calls go through `/api/proxy/*` backend route which adds the UA header

## Database (PostgreSQL via Drizzle)
Tables: `users`, `watchlist`, `watch_history`, `ratings`, `search_history`, `rooms`, `room_queue`, `room_requests`, `episode_cache`

## Auth
- JWT tokens (30d), stored in localStorage as `bt_token`
- bcryptjs for password hashing

## API Routes
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`, `DELETE /api/auth/account`
- `GET/POST/DELETE /api/user/watchlist`, `GET/POST/DELETE /api/user/history`, `GET/POST /api/user/ratings`, `GET/DELETE /api/user/search-history`, `GET /api/user/stats`
- `GET/POST/PUT /api/rooms`, `GET /api/rooms/my`, `POST /api/rooms/my/queue`, etc.
- `GET /api/proxy/*` — proxies all external API calls with proper UA header

## Socket.io Events
- Client emits: `join-room`, `leave-room`, `chat-message`, `notify-when-active`
- Host emits: `host-play`, `host-seek`, `host-pause`, `host-resume`, `host-idle`, `queue-updated`
- Server emits: `viewer-count`, `host-play`, `host-seek`, `host-pause`, `host-resume`, `host-idle`, `queue-update`, `new-request`, `chat-message`, `notify-active`

## Frontend Pages
- `/` — Home (hero + Netflix-style carousels)
- `/search?q=` — Search with suggestions and infinite scroll
- `/browse` — Browse with genre/country/type filters
- `/detail/:id` — Movie/series detail with cast, ratings, social sharing, trailer
- `/watch/:id` — Video player with keyboard shortcuts, playback speed, history sync
- `/staff/:id` — Actor/director profile with filmography
- `/profile` — Watch history, My List, search history, stats
- `/profile/settings` — Password change, account deletion
- `/profile/room` — Host room management, queue, requests
- `/rooms` — List of all broadcast rooms
- `/rooms/:id` — Room viewer with real-time Socket.io sync, chat, request feature

## Key Design Decisions
- All API data structures: Subject objects have `subjectId`, `subjectType` (1=movie, 2=series), `cover.url`, genre (comma-separated)
- No subtitles (captions API broken)
- Series stream falls back to main stream API
- HeroSection auto-rotates through top 5 trending titles; plays trailer video if available
- Cards auto-scroll carousel every 3.5s; pauses on hover
- Watch history saves every 10s via interval and on video end
- Room chat goes through Socket.io events (no persistence)
