import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CONVERSATIONS_FILE = DATA_DIR / "conversations.json"
MEMORIES_FILE = DATA_DIR / "memories.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_data_files():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CONVERSATIONS_FILE.exists():
        CONVERSATIONS_FILE.write_text(json.dumps({"conversations": []}, indent=2), encoding="utf-8")
    if not MEMORIES_FILE.exists():
        MEMORIES_FILE.write_text(json.dumps({"memories": [], "enabled": True}, indent=2), encoding="utf-8")
    if not SETTINGS_FILE.exists():
        SETTINGS_FILE.write_text(json.dumps({
            "system_prompt": "Act as a senior software engineer. Keep your answers concise and to the point. However, you should be able to clarify the concepts.",
            "temperature": 0.7,
            "max_tokens": 1024,
            "provider": "openai-compatible",
            "model": os.getenv("MODEL", "qwen3:4b"),
        }, indent=2), encoding="utf-8")


def _read_json(path: Path, default: Any) -> Any:
    _ensure_data_files()
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write_json(path: Path, data: Any):
    _ensure_data_files()
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _title_from_messages(messages: list[dict]) -> str:
    for m in messages:
        if m.get("role") == "user" and (m.get("content") or "").strip():
            text = " ".join(str(m.get("content", "")).strip().split())
            return text[:60] + ("..." if len(text) > 60 else "")
    return "New Chat"


# Conversations

def list_conversations(search: str = "") -> list[dict]:
    with _lock:
        data = _read_json(CONVERSATIONS_FILE, {"conversations": []})
        items = data.get("conversations", [])
        if search:
            q = search.lower()
            items = [c for c in items if q in (c.get("title", "").lower()) or any(q in (m.get("content", "").lower()) for m in c.get("messages", []))]
        summaries = []
        for c in sorted(items, key=lambda x: x.get("updated_at", ""), reverse=True):
            messages = c.get("messages", [])
            last_user = next((m.get("content", "") for m in reversed(messages) if m.get("role") == "user"), "")
            summaries.append({
                "id": c["id"],
                "title": c.get("title", "New Chat"),
                "created_at": c.get("created_at"),
                "updated_at": c.get("updated_at"),
                "message_count": len(messages),
                "preview": (last_user[:120] + ("..." if len(last_user) > 120 else "")),
                "system_prompt": c.get("system_prompt", ""),
            })
        return summaries


def create_conversation(title: str = "", system_prompt: str = "") -> dict:
    with _lock:
        data = _read_json(CONVERSATIONS_FILE, {"conversations": []})
        now = _now()
        conv = {
            "id": str(uuid.uuid4()),
            "title": title.strip() or "New Chat",
            "created_at": now,
            "updated_at": now,
            "system_prompt": system_prompt or "",
            "messages": [],
        }
        data.setdefault("conversations", []).append(conv)
        _write_json(CONVERSATIONS_FILE, data)
        return conv


def get_conversation(conversation_id: str) -> dict | None:
    with _lock:
        data = _read_json(CONVERSATIONS_FILE, {"conversations": []})
        for c in data.get("conversations", []):
            if c.get("id") == conversation_id:
                return c
        return None


def update_conversation(conversation_id: str, updates: dict) -> dict | None:
    with _lock:
        data = _read_json(CONVERSATIONS_FILE, {"conversations": []})
        for c in data.get("conversations", []):
            if c.get("id") == conversation_id:
                if "title" in updates and updates["title"] is not None:
                    c["title"] = str(updates["title"]).strip() or c.get("title", "New Chat")
                if "system_prompt" in updates and updates["system_prompt"] is not None:
                    c["system_prompt"] = str(updates["system_prompt"])
                c["updated_at"] = _now()
                _write_json(CONVERSATIONS_FILE, data)
                return c
        return None


def delete_conversation(conversation_id: str) -> bool:
    with _lock:
        data = _read_json(CONVERSATIONS_FILE, {"conversations": []})
        items = data.get("conversations", [])
        new_items = [c for c in items if c.get("id") != conversation_id]
        if len(new_items) == len(items):
            return False
        data["conversations"] = new_items
        _write_json(CONVERSATIONS_FILE, data)
        return True


def save_conversation_messages(conversation_id: str, messages: list[dict], title_hint: str = "") -> dict | None:
    with _lock:
        data = _read_json(CONVERSATIONS_FILE, {"conversations": []})
        for c in data.get("conversations", []):
            if c.get("id") == conversation_id:
                clean = []
                for m in messages:
                    role = m.get("role")
                    if role not in ("user", "assistant"):
                        continue
                    clean.append({
                        "id": m.get("id") or str(uuid.uuid4()),
                        "role": role,
                        "content": str(m.get("content", "")),
                        "created_at": m.get("created_at") or _now(),
                        "model": m.get("model"),
                        "provider": m.get("provider"),
                    })
                c["messages"] = clean
                if (not c.get("title") or c.get("title") == "New Chat"):
                    c["title"] = title_hint.strip() or _title_from_messages(clean)
                c["updated_at"] = _now()
                _write_json(CONVERSATIONS_FILE, data)
                return c
        return None


def append_conversation_exchange(conversation_id: str, user_message: dict, assistant_message: dict) -> dict | None:
    with _lock:
        data = _read_json(CONVERSATIONS_FILE, {"conversations": []})
        for c in data.get("conversations", []):
            if c.get("id") == conversation_id:
                msgs = c.setdefault("messages", [])
                for m in (user_message, assistant_message):
                    msgs.append({
                        "id": m.get("id") or str(uuid.uuid4()),
                        "role": m.get("role"),
                        "content": str(m.get("content", "")),
                        "created_at": m.get("created_at") or _now(),
                        "model": m.get("model"),
                        "provider": m.get("provider"),
                    })
                if (not c.get("title") or c.get("title") == "New Chat") and user_message.get("content"):
                    c["title"] = _title_from_messages(msgs)
                c["updated_at"] = _now()
                _write_json(CONVERSATIONS_FILE, data)
                return c
        return None


# Memories

def list_memories(search: str = "") -> dict:
    with _lock:
        data = _read_json(MEMORIES_FILE, {"memories": [], "enabled": True})
        items = data.get("memories", [])
        if search:
            q = search.lower()
            items = [m for m in items if q in (m.get("title", "").lower()) or q in (m.get("content", "").lower())]
        items = sorted(items, key=lambda x: x.get("updated_at", ""), reverse=True)
        return {"memories": items, "enabled": bool(data.get("enabled", True))}


def create_memory(payload: dict) -> dict:
    with _lock:
        data = _read_json(MEMORIES_FILE, {"memories": [], "enabled": True})
        now = _now()
        mem = {
            "id": str(uuid.uuid4()),
            "title": str(payload.get("title", "")).strip(),
            "content": str(payload.get("content", "")).strip(),
            "enabled": bool(payload.get("enabled", True)),
            "created_at": now,
            "updated_at": now,
        }
        data.setdefault("memories", []).append(mem)
        _write_json(MEMORIES_FILE, data)
        return mem


def update_memory(memory_id: str, payload: dict) -> dict | None:
    with _lock:
        data = _read_json(MEMORIES_FILE, {"memories": [], "enabled": True})
        for m in data.get("memories", []):
            if m.get("id") == memory_id:
                if "title" in payload and payload["title"] is not None:
                    m["title"] = str(payload["title"]).strip()
                if "content" in payload and payload["content"] is not None:
                    m["content"] = str(payload["content"]).strip()
                if "enabled" in payload and payload["enabled"] is not None:
                    m["enabled"] = bool(payload["enabled"])
                m["updated_at"] = _now()
                _write_json(MEMORIES_FILE, data)
                return m
        return None


def delete_memory(memory_id: str) -> bool:
    with _lock:
        data = _read_json(MEMORIES_FILE, {"memories": [], "enabled": True})
        items = data.get("memories", [])
        new_items = [m for m in items if m.get("id") != memory_id]
        if len(new_items) == len(items):
            return False
        data["memories"] = new_items
        _write_json(MEMORIES_FILE, data)
        return True


def set_memory_enabled(enabled: bool) -> bool:
    with _lock:
        data = _read_json(MEMORIES_FILE, {"memories": [], "enabled": True})
        data["enabled"] = bool(enabled)
        _write_json(MEMORIES_FILE, data)
        return data["enabled"]


# Settings

def get_settings() -> dict:
    with _lock:
        return _read_json(SETTINGS_FILE, {})


def update_settings(payload: dict) -> dict:
    with _lock:
        settings = _read_json(SETTINGS_FILE, {})
        for key in ("system_prompt", "temperature", "max_tokens", "provider", "model", "backend_url"):
            if key in payload and payload[key] is not None:
                settings[key] = payload[key]
        _write_json(SETTINGS_FILE, settings)
        return settings
