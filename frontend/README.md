# Simple AI Assistant Frontend

Modern React + Vite frontend for the Simple AI Assistant backend.

## Tech stack
- React 18 + Vite (JavaScript)
- Tailwind CSS
- React Router
- Zustand (chat/config state) + local UI preferences
- React Markdown + remark-gfm + react-syntax-highlighter
- Lucide React icons

## Development

```bash
cd frontend
npm install
npm run dev
```

Vite dev server runs on `http://localhost:5173` and proxies `/api` to `http://localhost:8000` (see `vite.config.js`).

Start the backend separately from project root:

```bash
python app.py
```

## Production build

```bash
cd frontend
npm run build
```

Build output is written to `frontend/dist`. When `frontend/dist/index.html` exists, `app.py` serves it at `/` and mounts built assets from `/assets`.

## Configuration

Copy `.env.example` to `.env` in `frontend/` if needed:

- `VITE_API_BASE_URL` — backend base URL. Leave empty for same-origin/proxy.
- `VITE_APP_NAME` — app display name.

The in-app Settings page also allows overriding backend URL in browser-local UI preferences.

## Backend integration (current)

The frontend integrates with these backend endpoints:

- `GET /api/health` — health/model/provider
- `GET /api/config` — runtime config, active provider/model, defaults, feature flags
- `POST /api/chat` — non-streaming fallback (`{messages,...}` -> `{reply}`)
- `POST /api/chat/stream` — SSE streaming chat (`meta`, `delta`, `tool`, `done`, `error`)
- `GET/POST /api/conversations` — list/create conversations
- `GET/PATCH/DELETE /api/conversations/{id}` — conversation operations
- `PUT /api/conversations/{id}/messages` — persist conversation messages
- `GET/POST/PATCH/DELETE /api/memories` and `POST /api/memories/toggle` — memory management
- `GET/PATCH /api/settings` — persisted backend settings

## Assumptions / notes

- **Persistence:** conversations, memories, and settings are stored locally in `data/*.json` by the backend (additive implementation). UI preferences (theme, sidebar state, backend URL override) use browser localStorage.
- **Streaming:** SSE streaming is implemented in `POST /api/chat/stream` and integrated in the UI with progressive rendering, stop/cancel (`AbortController`), cleanup on unmount/navigation, and fallback to `/api/chat` if streaming fails before output.
- **Model/provider discovery:** backend exposes configured/default models/providers via `/api/config`; if discovery is unavailable, selectors remain configurable from provided settings/config values.
- **Memory:** memory CRUD/toggle is backed by local JSON persistence and enabled memories are injected into chat context by backend. This is separate from conversation history.
- **Attachments:** composer includes an attachment button as integration-ready UI only; backend file upload/processing is not implemented.
- **System prompt:** default/system instructions can be edited in Settings and are sent with chat requests; per-conversation overrides are supported where provided.
- **Auth/multi-user:** not implemented; intended for local personal use.
- Existing CLI/backend behavior (`simple_ai_assistant.py`, tools, `/api/chat`, `/api/health`) is preserved with additive endpoints.
