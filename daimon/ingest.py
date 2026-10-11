"""Ingesta: convierte fuentes (notas, documentos, sesiones con IAs) en eventos con procedencia."""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .immune import TRUST, clean

_SKIP = ("node_modules", "/dist/", "/.git/", "/.venv/", "/build/")


@dataclass
class Event:
    id: str
    text: str
    source: str
    kind: str          # note | doc | user_msg | ai_msg
    ts: str            # ISO 8601
    trust: float
    compartment: str = "general"
    parent: str | None = None


def _id(source: str, offset: int) -> str:
    return hashlib.sha1(f"{source}:{offset}".encode()).hexdigest()[:16]


def chunk(text: str, max_words: int = 160, overlap: int = 30) -> list[str]:
    words = text.split()
    if not words:
        return []
    step = max_words - overlap
    out = []
    for start in range(0, len(words), step):
        out.append(" ".join(words[start:start + max_words]))
        if start + max_words >= len(words):
            break
    return out


def _mtime_iso(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def from_markdown(path: Path, kind: str = "note") -> list[Event]:
    """Un evento por trozo de cada sección; la cabecera viaja con su sección."""
    text = path.read_text(encoding="utf-8", errors="replace")
    sections = re.split(r"(?m)^(?=#{1,6}\s)", text)
    ts, src, trust = _mtime_iso(path), str(path), TRUST["file"]
    events, n = [], 0
    for sec in sections:
        for part in chunk(sec):
            events.append(Event(_id(src, n), part, src, kind, ts, trust))
            n += 1
    return events


def _text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def from_claude_jsonl(path: Path) -> list[Event]:
    """Mensajes de texto del usuario y del asistente; ignora herramientas, adjuntos y subagentes."""
    src, events, n = str(path), [], 0
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if row.get("isSidechain") or row.get("type") not in ("user", "assistant"):
            continue
        content = (row.get("message") or {}).get("content")
        if row["type"] == "user":
            if not isinstance(content, str) or content.lstrip().startswith("<"):
                continue
            kind, trust, text = "user_msg", TRUST["user"], content
        else:
            kind, trust, text = "ai_msg", TRUST["ai"], _text_of(content)
        ts = row.get("timestamp") or _mtime_iso(path)
        for part in chunk(text):
            events.append(Event(_id(src, n), part, src, kind, ts, trust))
            n += 1
    return events


def _files(sources: list[Path]):
    for s in sources:
        paths = [s] if s.is_file() else sorted(p for p in s.rglob("*") if p.suffix in (".md", ".jsonl"))
        for p in paths:
            if not any(k in str(p) for k in _SKIP):
                yield p


def collect(sources: list[Path]) -> list[Event]:
    """Lee todas las fuentes, aplica el sistema inmune y deduplica por texto normalizado."""
    seen, out = set(), []
    for p in _files(sources):
        evs = from_claude_jsonl(p) if p.suffix == ".jsonl" else from_markdown(p, "note" if "Obsidian" in str(p) else "doc")
        for e in evs:
            cleaned = clean(e.text)
            if cleaned is None:
                continue
            key = " ".join(cleaned.lower().split())
            if key in seen:
                continue
            seen.add(key)
            e.text = cleaned
            out.append(e)
    return out
