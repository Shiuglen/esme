"""Ingesta: convierte fuentes (notas, documentos, sesiones con IAs) en eventos con procedencia."""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .immune import TRUST, clean, is_excluded, redact

_SKIP = ("node_modules", "/dist/", "/.git/", "/.venv/", "/build/")

# Extensiones que la mente sabe leer. Antes solo se ingirían .md y .jsonl, así que Esme no aprendía
# del código, de la configuración ni de los datos: aquí entra todo lo que sea texto legible.
SUFIJOS = (
    ".md", ".markdown", ".mdx", ".txt", ".text", ".rst", ".org", ".adoc",
    ".py", ".pyi", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".json", ".jsonl", ".toml", ".yaml", ".yml", ".csv", ".sql", ".sh", ".html", ".css", ".ipynb",
)

# Tope de tamaño: por encima de 2 MiB el fichero suele ser un binario o un volcado, no algo que leer.
MAX_BYTES = 2 * 1024 * 1024


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


def _id(text: str) -> str:
    """Id por CONTENIDO: lo olvidado sigue bloqueado aunque la nota se edite o se mueva."""
    return hashlib.sha1(" ".join(text.lower().split()).encode()).hexdigest()[:16]


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
    """Un evento por trozo de cada sección; la cabecera viaja con su sección.
    Vale para cualquier texto legible (código, config, datos): si no hay cabeceras, es un bloque único."""
    text = redact(path.read_text(encoding="utf-8", errors="replace"))   # redactar ANTES de trocear
    sections = re.split(r"(?m)^(?=#{1,6}\s)", text)
    ts, src, trust = _mtime_iso(path), str(path), TRUST["file"]
    events = []
    for sec in sections:
        for part in chunk(sec):
            events.append(Event(_id(part), part, src, kind, ts, trust))
    return events


def _text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def from_claude_jsonl(path: Path) -> list[Event]:
    """Mensajes de texto del usuario y del asistente; ignora herramientas, adjuntos y subagentes."""
    src, events = str(path), []
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
        for part in chunk(redact(text)):
            events.append(Event(_id(part), part, src, kind, ts, trust))
    return events


def _muy_grande(p: Path) -> bool:
    """Un fichero de más de 2 MiB (o ilegible) no se lee: se salta."""
    try:
        return p.stat().st_size > MAX_BYTES
    except OSError:
        return True


def _files(sources: list[Path]):
    for s in sources:
        paths = [s] if s.is_file() else sorted(p for p in s.rglob("*") if p.suffix in SUFIJOS)
        for p in paths:
            if not any(k in str(p) for k in _SKIP) and not is_excluded(str(p)):
                if _muy_grande(p):
                    continue          # binarios o volcados: no son conocimiento
                yield p


def collect(sources: list[Path]) -> list[Event]:
    """Lee todas las fuentes, aplica el sistema inmune y deduplica por texto normalizado."""
    seen, out = set(), []
    for p in _files(sources):
        evs = from_claude_jsonl(p) if p.suffix == ".jsonl" else from_markdown(p, "note" if "Obsidian" in str(p) else "doc")
        # Antes, un fragmento excluido tiraba la nota entera; ahora solo cae el fragmento culpable:
        # el filtro por evento (clean) deja vivo todo el resto del contenido.
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
