import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pydantic import BaseModel, Field

from tools import TOOLS, run_tool
import storage

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"
DATA_DIR = BASE_DIR / "data"

client = OpenAI(
    base_url=os.getenv("BASE_URL"),
    api_key=os.getenv("API_KEY"),
)
MODEL = os.getenv("MODEL", "qwen3:4b")
PROVIDER = os.getenv("PROVIDER", "openai-compatible")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_default_system_prompt(settings: Optional[dict] = None) -> str:
    settings = settings or {}
    return settings.get("system_prompt") or (
        "Act as a senior software engineer. "
        "Keep your answers concise and to the point. However, you should be able to clarify the concepts."
    )


def get_enabled_memories_text() -> str:
    try:
        data = storage.list_memories()
        if not data.get("enabled", True):
            return ""
        items = [m for m in data.get("memories", []) if m.get("enabled", True) and (m.get("content") or "").strip()]
        if not items:
            return ""
        lines = []
        for m in items[:20]:
            title = (m.get("title") or "Memory").strip()
            content = (m.get("content") or "").strip()
            lines.append(f"- {title}: {content}")
        return "Relevant saved memories:\n" + "\n".join(lines)
    except Exception:
        return ""


def build_messages(user_messages: list[dict], system_prompt: Optional[str] = None, include_memories: bool = True) -> list[dict]:
    settings = storage.get_settings() if hasattr(storage, "get_settings") else {}
    base_prompt = system_prompt or get_default_system_prompt(settings)
    working = [{"role": "system", "content": base_prompt}]
    if include_memories:
        mem_text = get_enabled_memories_text()
        if mem_text:
            working.append({"role": "system", "content": mem_text})
    # sanitize incoming conversation messages
    for m in user_messages or []:
        role = m.get("role")
        content = m.get("content", "")
        if role in ("user", "assistant") and isinstance(content, str):
            working.append({"role": role, "content": content})
    return working


def normalize_model(model: Optional[str]) -> str:
    if model and isinstance(model, str) and model.strip():
        return model.strip()
    settings = storage.get_settings() if hasattr(storage, "get_settings") else {}
    return settings.get("model") or MODEL


app = FastAPI(title="Simple AI Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict] = Field(default_factory=list)
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    stream: Optional[bool] = None


class ConversationCreate(BaseModel):
    title: Optional[str] = ""
    system_prompt: Optional[str] = ""


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None


class ConversationMessagesUpdate(BaseModel):
    messages: list[dict] = Field(default_factory=list)
    title: Optional[str] = None


class MemoryCreate(BaseModel):
    title: str = ""
    content: str = ""
    enabled: bool = True


class MemoryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    enabled: Optional[bool] = None


class MemoryToggle(BaseModel):
    enabled: bool


class SettingsUpdate(BaseModel):
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    backend_url: Optional[str] = None


def chat_completion(messages: list[dict], model: Optional[str] = None, system_prompt: Optional[str] = None,
                    temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> str:
    working_messages = build_messages(messages, system_prompt=system_prompt, include_memories=True)
    selected_model = normalize_model(model)
    settings = storage.get_settings() if hasattr(storage, "get_settings") else {}

    kwargs: dict[str, Any] = {
        "model": selected_model,
        "messages": working_messages,
        "tools": TOOLS,
    }
    temp = temperature if temperature is not None else settings.get("temperature")
    mtok = max_tokens if max_tokens is not None else settings.get("max_tokens")
    if temp is not None:
        try:
            kwargs["temperature"] = float(temp)
        except Exception:
            pass
    if mtok is not None:
        try:
            kwargs["max_tokens"] = int(mtok)
        except Exception:
            pass

    for _ in range(10):
        response = client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        message = choice.message

        if message.tool_calls:
            working_messages.append(
                {
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": tc.type,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in message.tool_calls
                    ],
                }
            )
            for tc in message.tool_calls:
                tool_call = SimpleNamespace(
                    id=tc.id,
                    function=SimpleNamespace(
                        name=tc.function.name,
                        arguments=tc.function.arguments or "{}",
                    ),
                )
                result = run_tool(tool_call)
                working_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": str(result),
                    }
                )
            kwargs["messages"] = working_messages
            continue

        return message.content or ""

    return "Sorry, I couldn't provide a final answer within the allowed steps."


def sse_event(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/api/health")
def health():
    return {"status": "ok", "model": normalize_model(None), "provider": PROVIDER}


@app.get("/api/config")
def config():
    settings = storage.get_settings() if hasattr(storage, "get_settings") else {}
    providers_env = os.getenv("AVAILABLE_PROVIDERS")
    models_env = os.getenv("AVAILABLE_MODELS")
    providers = []
    models = []
    try:
        if providers_env:
            providers = json.loads(providers_env)
    except Exception:
        providers = []
    try:
        if models_env:
            models = json.loads(models_env)
    except Exception:
        models = []
    if not providers:
        providers = [{"id": PROVIDER, "name": "OpenAI-Compatible", "type": "configurable"}]
    if not models:
        models = [{"id": normalize_model(None), "name": normalize_model(None), "provider": PROVIDER}]
    return {
        "status": "ok",
        "backend": {"connected": True, "base_url_configured": bool(os.getenv("BASE_URL"))},
        "active": {
            "provider": settings.get("provider") or PROVIDER,
            "model": normalize_model(settings.get("model")),
        },
        "defaults": {
            "system_prompt": get_default_system_prompt(settings),
            "temperature": settings.get("temperature", 0.7),
            "max_tokens": settings.get("max_tokens", 1024),
        },
        "providers": providers,
        "models": models,
        "features": {
            "streaming": True,
            "conversation_persistence": True,
            "memory_persistence": True,
            "settings_persistence": True,
            "attachments": False,
            "model_discovery": bool(models_env),
        },
        "notes": {
            "memory": "Memories are stored locally in data/memories.json and injected into chat context when enabled.",
            "persistence": "Conversations, memories, and settings are persisted in local JSON files under data/.",
        },
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        reply = chat_completion(
            req.messages,
            model=req.model,
            system_prompt=req.system_prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest, request: Request):
    selected_model = normalize_model(req.model)
    settings = storage.get_settings() if hasattr(storage, "get_settings") else {}

    async def event_generator():
        message_id = str(uuid.uuid4())
        created_at = now_iso()
        accumulated = ""
        try:
            working_messages = build_messages(req.messages, system_prompt=req.system_prompt, include_memories=True)
            yield sse_event("meta", {
                "message_id": message_id,
                "model": selected_model,
                "provider": req.provider or settings.get("provider") or PROVIDER,
                "created_at": created_at,
                "conversation_id": req.conversation_id,
            })

            kwargs: dict[str, Any] = {
                "model": selected_model,
                "messages": working_messages,
                "tools": TOOLS,
                "stream": True,
            }
            temp = req.temperature if req.temperature is not None else settings.get("temperature")
            mtok = req.max_tokens if req.max_tokens is not None else settings.get("max_tokens")
            if temp is not None:
                try:
                    kwargs["temperature"] = float(temp)
                except Exception:
                    pass
            if mtok is not None:
                try:
                    kwargs["max_tokens"] = int(mtok)
                except Exception:
                    pass

            for _ in range(10):
                if await request.is_disconnected():
                    yield sse_event("error", {"message": "Client disconnected", "code": "client_disconnected"})
                    return

                kwargs["messages"] = working_messages
                kwargs["stream"] = True
                stream = client.chat.completions.create(**kwargs)

                step_content = ""
                calls: dict[int, SimpleNamespace] = {}
                for chunk in stream:
                    if await request.is_disconnected():
                        yield sse_event("error", {"message": "Generation cancelled", "code": "cancelled"})
                        return
                    if not getattr(chunk, "choices", None):
                        continue
                    delta = chunk.choices[0].delta

                    if getattr(delta, "content", None):
                        step_content += delta.content
                        accumulated += delta.content
                        yield sse_event("delta", {"content": delta.content, "message_id": message_id})

                    for tool_call in (getattr(delta, "tool_calls", None) or []):
                        idx = getattr(tool_call, "index", 0) or 0
                        obj = calls.setdefault(
                            idx,
                            SimpleNamespace(id=None, function=SimpleNamespace(name="", arguments="")),
                        )
                        if getattr(tool_call, "id", None):
                            obj.id = tool_call.id
                        fn = getattr(tool_call, "function", None)
                        if fn and getattr(fn, "name", None):
                            obj.function.name += fn.name
                        if fn and getattr(fn, "arguments", None):
                            obj.function.arguments += fn.arguments

                if calls:
                    tool_calls_payload = []
                    for _, obj in sorted(calls.items()):
                        if not obj.id:
                            obj.id = f"call_{uuid.uuid4().hex[:8]}"
                        tool_calls_payload.append({
                            "id": obj.id,
                            "type": "function",
                            "function": {"name": obj.function.name, "arguments": obj.function.arguments or "{}"},
                        })
                    working_messages.append({
                        "role": "assistant",
                        "content": step_content or "",
                        "tool_calls": tool_calls_payload,
                    })
                    for tc in sorted(calls.values(), key=lambda x: x.id or ""):
                        if await request.is_disconnected():
                            yield sse_event("error", {"message": "Generation cancelled", "code": "cancelled"})
                            return
                        yield sse_event("tool", {"name": tc.function.name, "status": "running"})
                        result = run_tool(tc)
                        yield sse_event("tool", {"name": tc.function.name, "status": "completed"})
                        working_messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": str(result),
                        })
                    continue

                # final assistant text response
                final_text = step_content
                yield sse_event("done", {"message_id": message_id, "content": final_text, "model": selected_model})
                return

            yield sse_event("error", {"message": "Sorry, I couldn't provide a final answer within the allowed steps.", "code": "max_steps"})
        except Exception as e:
            yield sse_event("error", {"message": str(e), "code": "server_error"})

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    })


# Conversation APIs
@app.get("/api/conversations")
def api_list_conversations(search: str = ""):
    return {"conversations": storage.list_conversations(search=search)}


@app.post("/api/conversations")
def api_create_conversation(payload: ConversationCreate):
    conv = storage.create_conversation(title=payload.title or "", system_prompt=payload.system_prompt or "")
    return {"conversation": conv}


@app.get("/api/conversations/{conversation_id}")
def api_get_conversation(conversation_id: str):
    conv = storage.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"conversation": conv}


@app.patch("/api/conversations/{conversation_id}")
def api_update_conversation(conversation_id: str, payload: ConversationUpdate):
    conv = storage.update_conversation(conversation_id, payload.model_dump(exclude_unset=True))
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"conversation": conv}


@app.delete("/api/conversations/{conversation_id}")
def api_delete_conversation(conversation_id: str):
    ok = storage.delete_conversation(conversation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted"}


@app.put("/api/conversations/{conversation_id}/messages")
def api_put_conversation_messages(conversation_id: str, payload: ConversationMessagesUpdate):
    conv = storage.save_conversation_messages(conversation_id, payload.messages, title_hint=payload.title or "")
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"conversation": conv}


# Memory APIs
@app.get("/api/memories")
def api_list_memories(search: str = ""):
    return storage.list_memories(search=search)


@app.post("/api/memories")
def api_create_memory(payload: MemoryCreate):
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Memory content is required")
    return {"memory": storage.create_memory(payload.model_dump())}


@app.patch("/api/memories/{memory_id}")
def api_update_memory(memory_id: str, payload: MemoryUpdate):
    mem = storage.update_memory(memory_id, payload.model_dump(exclude_unset=True))
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"memory": mem}


@app.delete("/api/memories/{memory_id}")
def api_delete_memory(memory_id: str):
    ok = storage.delete_memory(memory_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "deleted"}


@app.post("/api/memories/toggle")
def api_toggle_memories(payload: MemoryToggle):
    enabled = storage.set_memory_enabled(payload.enabled)
    return {"enabled": enabled}


# Settings APIs
@app.get("/api/settings")
def api_get_settings():
    settings = storage.get_settings()
    # ensure defaults present
    defaults = {
        "system_prompt": get_default_system_prompt(settings),
        "temperature": settings.get("temperature", 0.7),
        "max_tokens": settings.get("max_tokens", 1024),
        "provider": settings.get("provider", PROVIDER),
        "model": normalize_model(settings.get("model")),
    }
    merged = {**defaults, **settings}
    return {"settings": merged}


@app.patch("/api/settings")
def api_update_settings(payload: SettingsUpdate):
    settings = storage.update_settings(payload.model_dump(exclude_unset=True))
    return {"settings": settings}


# Frontend serving
def _frontend_index() -> Path:
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        return dist_index
    return FRONTEND_DIR / "index.html"


if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

# Keep /static mount for compatibility (Vite dev/build may not use it, but legacy paths and explicit serving)
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def index():
    idx = _frontend_index()
    if idx.exists():
        return FileResponse(idx)
    raise HTTPException(status_code=404, detail="Frontend not found")


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    # Let /api/* 404 naturally (already handled above by routes) and serve SPA for non-file app routes
    if full_path.startswith("api/") or full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not found")
    candidate = FRONTEND_DIR / full_path
    dist_candidate = DIST_DIR / full_path
    if dist_candidate.exists() and dist_candidate.is_file():
        return FileResponse(dist_candidate)
    if candidate.exists() and candidate.is_file():
        return FileResponse(candidate)
    idx = _frontend_index()
    if idx.exists():
        return FileResponse(idx)
    raise HTTPException(status_code=404, detail="Not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
