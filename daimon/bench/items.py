"""Examen de la Prueba 0: formato, validación, división oculta estable y minado de preguntas reales."""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path

from ..immune import REDACTED, clean, is_excluded, redact
from ..ingest import _text_of

TYPES = {"hecho", "porque", "preferencia", "multisalto", "temporal", "obsoleta"}
ORIGINS = {"real", "generada"}
_Q = re.compile(r"(?i)^\s*[¿¡]?\s*(qu[eé]|c[oó]mo|por qu[eé]|cu[aá]l|cu[aá]nt|d[oó]nde|cu[aá]ndo|qui[eé]n|"
                r"what|how|why|which|where|when|who)\b")


@dataclass
class Item:
    id: str
    question: str
    gold: str
    key_facts: list[str]
    evidence: list[str] = field(default_factory=list)
    type: str = "hecho"
    origin: str = "generada"
    validated: bool = False


def load(path: Path) -> list[Item]:
    return [Item(**json.loads(l)) for l in Path(path).read_text(encoding="utf-8").splitlines() if l.strip()]


def save(items: list[Item], path: Path) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text("".join(json.dumps(asdict(i), ensure_ascii=False) + "\n" for i in items), encoding="utf-8")


def validate(item: Item) -> list[str]:
    problems = []
    if not item.question.strip():
        problems.append("pregunta vacía")
    if not item.gold.strip():
        problems.append("oro vacío")
    if not item.key_facts:
        problems.append("sin hechos clave")
    if item.type not in TYPES:
        problems.append(f"tipo inválido: {item.type}")
    if item.origin not in ORIGINS:
        problems.append(f"origen inválido: {item.origin}")
    blob = " ".join([item.question, item.gold, *item.key_facts])
    if is_excluded(blob):
        problems.append("contenido excluido")
    if redact(blob) != blob or REDACTED in blob:
        problems.append("contiene secretos")
    return problems


def is_hidden(item_id: str) -> bool:
    return int(hashlib.sha256(item_id.encode()).hexdigest(), 16) % 10 < 3


def mine_user_questions(jsonl_paths: list[Path]) -> list[dict]:
    """Preguntas reales del usuario a las IAs, con el texto de la IA que vino después."""
    out = []
    for p in jsonl_paths:
        rows = []
        for line in Path(p).read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        for i, r in enumerate(rows):
            if r.get("type") != "user" or r.get("isSidechain"):
                continue
            q = (r.get("message") or {}).get("content")
            if not isinstance(q, str) or q.lstrip().startswith("<"):
                continue
            q = q.strip()
            if not (15 <= len(q) <= 400) or not (q.endswith("?") or _Q.match(q)):
                continue
            if clean(q) is None or clean(q) != q:
                continue
            follow = []
            for nxt in rows[i + 1:]:
                if nxt.get("type") == "user" and isinstance((nxt.get("message") or {}).get("content"), str):
                    break
                if nxt.get("type") == "assistant" and not nxt.get("isSidechain"):
                    t = _text_of((nxt.get("message") or {}).get("content"))
                    if t:
                        follow.append(t)
            text = clean("\n".join(follow))
            if text:
                out.append({"question": q, "followup_ai_text": text, "source": str(p), "ts": r.get("timestamp", "")})
    return out
