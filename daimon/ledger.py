"""Registro reproducible: cada decisión queda en un JSONL de solo añadir."""
import json
from datetime import datetime, timezone
from pathlib import Path


def append(path: Path, record: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"ts": datetime.now(timezone.utc).isoformat(), **record}, ensure_ascii=False) + "\n")
