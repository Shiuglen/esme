"""CLI de Daimon: ingesta, puerta MCP y utilidades del examen."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .ingest import collect


def ingest_cmd(home_path: Path, sources: list[Path], encoder=None) -> int:
    from .home import Home
    home = Home(home_path, encoder=encoder)
    return home.add(collect([Path(s) for s in sources]))


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="daimon", description="Sistema cognitivo Daimon")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("ingest", help="absorbe fuentes (.md, sesiones .jsonl) en la memoria")
    p.add_argument("--home", default="data/mente")
    p.add_argument("sources", nargs="+")
    p = sub.add_parser("serve-mcp", help="servidor MCP (stdio) para Claude Code y otros agentes")
    p.add_argument("--home", default="data/mente")
    p = sub.add_parser("bench-mine", help="mina preguntas reales de las sesiones")
    p.add_argument("--out", default="data/bench/minadas.jsonl")
    p.add_argument("sessions", nargs="+")
    a = ap.parse_args(argv)

    if a.cmd == "ingest":
        print(f"recuerdos nuevos: {ingest_cmd(Path(a.home), a.sources)}")
    elif a.cmd == "serve-mcp":
        from .gate import build_server
        from .home import Home
        build_server(Home(Path(a.home))).run("stdio")
    elif a.cmd == "bench-mine":
        from .bench.items import mine_user_questions
        cands = mine_user_questions([Path(s) for s in a.sessions])
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text("".join(json.dumps(c, ensure_ascii=False) + "\n" for c in cands), encoding="utf-8")
        print(f"preguntas minadas: {len(cands)} → {a.out}")


if __name__ == "__main__":
    main()
