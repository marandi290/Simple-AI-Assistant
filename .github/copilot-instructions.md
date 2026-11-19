# Repository overview

This is a React/FastAPI assistant that talks to an OpenAI-compatible chat API. The main web entry point is `app.py`; `simple_ai_assistant.py` is a separate terminal chat client.

## Working setup and commands

Use the repository-local Python environment and the frontend package scripts:

- Activate Python: `.venv\Scripts\Activate.ps1`
- Start the backend: `python -m uvicorn app:app --reload --port 8000`
- Install frontend dependencies: `cd frontend && npm install`
- Start Vite: `cd frontend && npm run dev` (port `5173`; proxies `/api` to `localhost:8000`)
- Build frontend: `cd frontend && npm run build`
- Preview the build: `cd frontend && npm run preview`

There is no requirements manifest, pytest suite, frontend test runner, or configured linter. The files named `*_test.py` are executable manual integration probes, not pytest tests:

- `python stream_test.py`
- `python stream_tools_test.py`
- `python test_embeddings.py`

Each probe calls the configured external model provider and requires `.env` values such as `BASE_URL`, `API_KEY`, and the relevant model variables.

## Environment and runtime

- `load_dotenv()` in the Python entry points reads `.env`; do not commit secrets.
- `app.py` reads `BASE_URL`, `API_KEY`, `MODEL`, `PROVIDER`, `AVAILABLE_PROVIDERS`, and `AVAILABLE_MODELS`.
- The frontend can use same-origin APIs in development through the Vite proxy, or a separate backend via `VITE_API_BASE_URL`. `frontend/src/services/api.js` also allows a runtime override in browser local storage.
- Keep provider and model selection settings consistent: backend defaults are exposed through `/api/config`, persisted settings come from `storage.py`, and the frontend config store merges both sources.

## Architecture

- `app.py` is the FastAPI application and the web API boundary. It defines Pydantic request models, non-streaming and SSE chat endpoints, conversation/memory/settings routes, and serves the built SPA or Vite source fallback.
- `storage.py` is the persistence layer. Conversations, memories, and settings are JSON files under `data/` (`conversations.json`, `memories.json`, `settings.json`); `data/` is local and ignored by Git. It provides locking and initializes missing files.
- `tools/__init__.py` is the tool registry: `TOOLS` contains OpenAI function definitions and `FUNCTION_NAME_TO_FUNCTION_MAP` maps names to implementations. Adding a usable tool requires both a `details` definition and an implementation, plus registration in this file.
- `components/stream_chat.py` contains the terminal streaming helper used by the CLI flow.
- `simple_ai_assistant.py` is the terminal application; its chat loop has a maximum of 10 model/tool steps, matching the web chat loop.
- `frontend/src/App.jsx` defines routed pages. `pages/` contains feature screens, `components/` contains reusable UI, `store/` contains Zustand state, and `services/` contains API and SSE handling.
- Chat state and persistence are coordinated in `frontend/src/store/chatStore.js`: it creates conversations on first message, parses `/api/chat/stream` SSE events, falls back to `/api/chat` only when a stream fails before content arrives, and persists completed or partial exchanges.
- `frontend/vite.config.js` is configured for port `5173`, `/api` proxying, and a `frontend/dist` production build.

## Backend conventions

- Use Pydantic models in `app.py` for API payloads and `model_dump(exclude_unset=True)` for partial updates.
- Build model messages through `build_messages()` so the system prompt and enabled memories are applied consistently to streaming and non-streaming chat.
- Preserve the 10-step tool-call limit and the assistant/tool message sequence when changing chat orchestration.
- Streaming responses are SSE events named `meta`, `delta`, `tool`, `done`, and `error`; keep the frontend SSE parser in sync with backend event shapes.
- Streamed tool calls must be reconstructed across chunks, because function name and arguments arrive as fragments.
- Storage methods should remain thread-safe: hold `_lock` and read/write through the existing JSON helpers. User-facing summaries and persisted message records follow the shapes already established in `storage.py`.

## Frontend conventions

- The frontend is JavaScript/JSX, not TypeScript.
- Use Zustand stores under `frontend/src/store/` for shared state. API calls belong in `frontend/src/services/chatService.js` and low-level request/SSE behavior belongs in `frontend/src/services/api.js`.
- Preserve AbortController cancellation and partial-stream persistence in `chatStore.sendMessage`; switching conversations aborts active streams.
- React routes are `/`, `/chat/:id`, `/memory`, and `/settings`, with SPA fallback handled by FastAPI.
- When changing API payload or response shapes, update the Pydantic model/backend route and the corresponding service/store consumer together.
