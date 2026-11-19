# Simple AI Assistant

A personal AI assistant with a React web interface and a Python command-line client. The web app uses a FastAPI backend to connect to an OpenAI-compatible chat API, stream responses, run tools, and save conversations, memories, and settings locally.

## Features

- Streamed chat with tool calling and cancellation
- Conversation history with per-conversation system prompts
- Saved memories that can be included in chat context
- Configurable model, provider, temperature, and token limit
- Separate terminal chat client
- Knowledge-base and semantic-search utilities

## Requirements

- Python 3.10+
- Node.js 18+ and npm for the web frontend
- An API key and base URL for an OpenAI-compatible model provider

## Setup

Create and activate a Python virtual environment from the repository root, then install the backend dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install fastapi "uvicorn[standard]" openai python-dotenv requests numpy
```

Create a `.env` file in the repository root:

```dotenv
BASE_URL=https://api.openai.com/v1
API_KEY=your-api-key
MODEL=gpt-4o-mini
PROVIDER=openai-compatible
EMBEDDINGS_MODEL=text-embedding-3-small
```

Set `BASE_URL`, `API_KEY`, and model names to values supported by your provider. Keep `.env` private; it is ignored by Git.

Install the frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

## Run locally

Start the backend from the repository root:

```powershell
python -m uvicorn app:app --reload --port 8000
```

In another terminal, start the frontend:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:8000`. For a separate backend URL, set `VITE_API_BASE_URL` in `frontend/.env`; leaving it empty uses the proxy in development.

The terminal client can be run from the repository root after setting up `.env`:

```powershell
python simple_ai_assistant.py
```

## Build and checks

Build the production frontend bundle:

```powershell
cd frontend
npm run build
```

FastAPI serves the generated `frontend/dist` app when it exists. The repository has no automated test suite or configured linter. The root `stream_test.py`, `stream_tools_test.py`, and `test_embeddings.py` files are manual provider integration probes; run an individual probe with `python <file>` after configuring its required environment variables.

## Configuration and data

- Backend credentials and defaults are loaded from the root `.env`. Optional `AVAILABLE_PROVIDERS` and `AVAILABLE_MODELS` environment variables can provide JSON model/provider lists.
- Frontend options can be set in `frontend/.env` using `VITE_API_BASE_URL` and `VITE_APP_NAME`. The backend URL can also be overridden in the Settings page.
- The backend creates `data/conversations.json`, `data/memories.json`, and `data/settings.json` on first use. These files are local and ignored by Git.
- Theme, sidebar, and frontend backend-URL preferences are stored in browser local storage.

## Project layout

- `app.py` — FastAPI routes, model requests, streamed chat, and frontend serving
- `storage.py` — JSON persistence for conversations, memories, and settings
- `tools/` — model tool definitions, implementations, and dispatch
- `components/stream_chat.py` — streaming helper for the terminal client
- `utilities/` — logging, document search, and embeddings helpers
- `knowledge_base/` — sample documents for document search
- `frontend/src/` — React pages, reusable components, Zustand stores, and API services

The app is intended for personal/local use and does not implement user authentication. Do not expose it to untrusted networks without adding appropriate access controls.
