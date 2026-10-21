"""CLI de Daimon: ingesta, la puerta MCP, la mente a mano y utilidades del examen."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .ingest import collect


def ingest_cmd(home_path: Path, sources: list[Path], encoder=None) -> int:
    from .home import Home
    home = Home(home_path, encoder=encoder)
    return home.ingest(collect([Path(s) for s in sources]))


def recall_cmd(home_path: Path, query: str, budget: int = 0, motor: str | None = None) -> str:
    """Lo que la mente sabe de una consulta, tal cual se lo daría a un agente.

    Es la misma puerta que usan Claude Code y el resto (por MCP), pero sin servidor: para un
    script, un cron, un `git hook` o tu propio terminal.
    """
    from .gate import recall_tool
    from .home import Home
    return recall_tool(Home(home_path), query, budget, motor)


def rea_cmd(home_path: Path, ruta: str, motivo: str = "", encoder=None) -> dict:
    """El espejo desde la terminal: REA mira un programa y la mente se queda con lo que vio.

    Es lo mismo que hace la herramienta `esme_absorbe_programa`, sin servidor: para un script, un
    cron o tu propio terminal.
    """
    from .home import Home
    from . import rea as rea_mod
    return rea_mod.absorber(Home(home_path, encoder=encoder), ruta, motivo=motivo)


def rea_compara_cmd(home_path: Path, ruta: str, contra: str | None = None, encoder=None) -> dict:
    """Qué cambió entre dos versiones de un programa: el texto y las cuentas."""
    from .home import Home
    from . import rea as rea_mod
    home = Home(home_path, encoder=encoder)
    texto, clave = rea_mod.comparar_versiones(home, ruta, contra=contra)
    r = rea_mod.ingerir_comparacion(home, texto, clave)
    return {**r, "texto": texto}


def remember_cmd(home_path: Path, text: str, kind: str = "note") -> str:
    """Guarda un recuerdo y devuelve su id (lo mismo que hace la herramienta `remember`)."""
    from .gate import remember_tool
    from .home import Home
    return remember_tool(Home(home_path), text, kind)


def serve(home_path: Path, port: int = 0, token: str | None = None) -> None:
    """Arranca el cerebro y anuncia por stdout una línea JSON {port, token} para quien lo lanzó (la app)."""
    import fcntl
    import os
    import secrets
    import socket
    import sys
    import threading
    import time

    import uvicorn

    from .home import Home
    from .server import create_app
    home_path = Path(home_path)
    home_path.mkdir(parents=True, exist_ok=True)
    lock = open(home_path / ".cerebro.lock", "a")          # se libera al salir el proceso
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("daimon: ya hay un cerebro usando esta mente", file=sys.stderr)
        raise SystemExit(3)
    token = token or secrets.token_urlsafe(24)
    app, _ = create_app(Home(home_path), token)
    sock = socket.socket()
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("127.0.0.1", port))
    sock.listen(128)                      # ya escucha: las conexiones esperan en cola, no hay carrera
    print(json.dumps({"port": sock.getsockname()[1], "token": token}), flush=True)
    sys.stdout.flush()
    server = uvicorn.Server(uvicorn.Config(app, log_level="warning", timeout_graceful_shutdown=2))
    parent = os.environ.get("DAIMON_PARENT_PID")
    if parent:
        ppid = int(parent)

        def vigila() -> None:                 # si muere quien nos lanzó, apagado ordenado
            while not server.should_exit:
                time.sleep(1)
                try:
                    os.kill(ppid, 0)
                except ProcessLookupError:
                    server.should_exit = True
                except PermissionError:
                    pass
        threading.Thread(target=vigila, daemon=True).start()
    server.run(sockets=[sock])


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
    p = sub.add_parser("sueño", help="consolida la mente: destila personas y escenas de lo que ya víviste")
    p.add_argument("--home", default="data/mente_v2")
    p = sub.add_parser("recall", help="pregunta a la mente qué sabe de una consulta (el mismo contexto que recibe un agente)")
    p.add_argument("--home", default="data/mente_v2")
    p.add_argument("--budget", type=int, default=0, help="tokens de contexto (0 = el presupuesto de la mente)")
    p.add_argument("--motor", default=None, help="el nombre de la IA: cada IA recibe el contexto a su manera")
    p.add_argument("consulta")
    p = sub.add_parser("remember", help="guarda un recuerdo en la mente y devuelve su id")
    p.add_argument("--home", default="data/mente_v2")
    p.add_argument("--kind", default="note", help="el tipo: note, doc, user_msg, ai_msg…")
    p.add_argument("texto")
    p = sub.add_parser("ingest-x", help="absorbe tu X: una cosecha json de FYP, bookmarks o búsquedas")
    p.add_argument("--home", default="data/mente_v2")
    p.add_argument("cosecha")
    p = sub.add_parser("rea-compara", help="qué cambió entre dos versiones de un programa")
    p.add_argument("--home", default="data/mente_v2")
    p.add_argument("--contra", default=None, help="el otro programa o build (por defecto: la versión anterior)")
    p.add_argument("ruta", help="la carpeta o el .asar del programa")
    p = sub.add_parser("rea", help="el espejo: REA mira un programa y la mente se queda con lo que vio")
    p.add_argument("--home", default="data/mente_v2")
    p.add_argument("--motivo", default="", help="por qué se mira: queda junto al conocimiento")
    p.add_argument("ruta", help="la carpeta o el .asar del programa")
    a = ap.parse_args(argv)

    if a.cmd == "ingest":
        print(f"recuerdos nuevos: {ingest_cmd(Path(a.home), a.sources)}")
    elif a.cmd == "serve-mcp":
        from .gate import build_server
        from .home import Home
        build_server(Home(Path(a.home))).run("stdio")
    elif a.cmd == "serve":
        serve(Path(a.home), a.port, a.token)
    elif a.cmd == "sueño":
        from .home import Home
        from .suenio import dormir
        print(f"sueño: {json.dumps(dormir(Home(Path(a.home))), ensure_ascii=False)}")
    elif a.cmd == "recall":
        print(recall_cmd(Path(a.home), a.consulta, a.budget, a.motor))
    elif a.cmd == "remember":
        print(remember_cmd(Path(a.home), a.texto, a.kind))
    elif a.cmd == "ingest-x":
        from .home import Home
        from .x import eventos_de_x
        cosecha = json.loads(Path(a.cosecha).read_text(encoding="utf-8"))
        n = Home(Path(a.home)).ingest(eventos_de_x(cosecha))
        print(f"recuerdos nuevos de X: {n}")
    elif a.cmd == "rea-compara":
        from .home import Home
        r = rea_compara_cmd(Path(a.home), a.ruta, a.contra)
        print(json.dumps(r, ensure_ascii=False, indent=1))
    elif a.cmd == "rea":
        from .home import Home
        r = rea_cmd(Path(a.home), a.ruta, a.motivo)
        print(json.dumps(r, ensure_ascii=False, indent=1))
    elif a.cmd == "bench-mine":
        from .bench.items import mine_user_questions
        cands = mine_user_questions([Path(s) for s in a.sessions])
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text("".join(json.dumps(c, ensure_ascii=False) + "\n" for c in cands), encoding="utf-8")
        print(f"preguntas minadas: {len(cands)} → {a.out}")


if __name__ == "__main__":
    main()
