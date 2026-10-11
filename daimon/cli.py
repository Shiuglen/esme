"""CLI de Daimon: ingesta, puerta MCP y utilidades del examen."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .ingest import collect


def ingest_cmd(home_path: Path, sources: list[Path], encoder=None) -> int:
    from .home import Home
    home = Home(home_path, encoder=encoder)
    return home.ingest(collect([Path(s) for s in sources]))


def serve(home_path: Path, port: int = 0, token: str | None = None) -> None:
    """Arranca el cerebro y anuncia por stdout una línea JSON {port, token} para quien lo lanzó (la app)."""
    import secrets
    import socket
    import sys

    import uvicorn

    from .home import Home
    from .server import create_app
    token = token or secrets.token_urlsafe(24)
    app, _ = create_app(Home(home_path), token)
    sock = socket.socket()
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("127.0.0.1", port))
    sock.listen(128)                      # ya escucha: las conexiones esperan en cola, no hay carrera
    print(json.dumps({"port": sock.getsockname()[1], "token": token}), flush=True)
    sys.stdout.flush()
    uvicorn.Server(uvicorn.Config(app, log_level="warning")).run(sockets=[sock])


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="daimon", description="Sistema cognitivo Daimon")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("ingest", help="absorbe fuentes (.md, sesiones .jsonl) en la memoria")
    p.add_argument("--home", default="data/mente")
    p.add_argument("sources", nargs="+")
    p = sub.add_parser("serve-mcp", help="servidor MCP (stdio) para Claude Code y otros agentes")
    p.add_argument("--home", default="data/mente")
    p = sub.add_parser("serve", help="cerebro local: API para la app + MCP HTTP para agentes (solo 127.0.0.1)")
    p.add_argument("--home", default="data/mente_v2")
    p.add_argument("--port", type=int, default=0)
    p.add_argument("--token", default=None)
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
    elif a.cmd == "serve":
        serve(Path(a.home), a.port, a.token)
    elif a.cmd == "bench-mine":
        from .bench.items import mine_user_questions
        cands = mine_user_questions([Path(s) for s in a.sessions])
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text("".join(json.dumps(c, ensure_ascii=False) + "\n" for c in cands), encoding="utf-8")
        print(f"preguntas minadas: {len(cands)} → {a.out}")


if __name__ == "__main__":
    main()
