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


def remember_cmd(home_path: Path, text: str, kind: str = "note") -> str:
    """Guarda un recuerdo y devuelve su id (lo mismo que hace la herramienta `remember`)."""
    from .gate import remember_tool
    from .home import Home
    return remember_tool(Home(home_path), text, kind)


def init_cmd(home_path: Path, sin_modelo: bool = False) -> None:
    """Prepara una mente nueva: la carpeta, la lente y las primeras palabras.

    Es la primera vez de alguien que no es el creador: tiene que salir bien a la primera y
    decir la verdad (lo que baja, lo que pesa, lo que no hace).
    """
    import json

    from .modelos import DEFAULT, bajar_modelo, esta_instalado, ruta_modelo, tamano_instalado

    home_path = Path(home_path).expanduser()
    home_path.mkdir(parents=True, exist_ok=True)
    config = home_path / "config.json"
    if config.exists():
        print(f"Ya hay una mente en {home_path} (no se toca nada).")
    else:
        # La Lente buena es la ONNX local: no depende de Ollama (que en algunos equipos está
        # roto) y es la que mide mejor (la del banco de la memoria: 0,929 de acierto).
        config.write_text(json.dumps({
            "encoder": f"onnx:{DEFAULT}",
            "query_prefix": "task: search result | query: ",
            "doc_prefix": "title: none | text: ",
            "mmr_lambda": 1.0,
            "min_dense": 0.32,
            "max_drop": 2.0,
        }, indent=1), encoding="utf-8")
        print(f"Mente creada en {home_path}")

    if not sin_modelo and not esta_instalado(DEFAULT):
        try:
            bajar_modelo(DEFAULT, progreso=lambda m: print("·", m))
        except Exception as e:      # sin red o sin permiso: se dice, no se muere
            print(f"No pude bajar la lente: {e}")
            print(f"Puedes copiarla a mano a {ruta_modelo(DEFAULT)} y volver a intentarlo.")
    elif esta_instalado(DEFAULT):
        print(f"· Lente lista ({tamano_instalado(DEFAULT) / (1024 * 1024):.0f} MB)")

    print("""
Tu mente está lista. Esto es lo que puedes hacer ahora:

  daimon remember "lo que quieres que recuerde"      # guarda un recuerdo
  daimon recall "¿qué sabes de esto?"                  # te pregunta lo que sabe
  daimon serve-mcp --home %s                # la puerta para tus IAs

Para conectarla a Claude Code, Codex, OpenCode, Cline o cualquier cliente MCP, la entrada es:

  {"mcpServers": {"esme": {"command": "daimon", "args": ["serve-mcp", "--home", "%s"]}}}

La memoria es tuya y se queda en tu equipo: nadie más la ve.
""" % (home_path, home_path))


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
    p = sub.add_parser("init", help="prepara una mente nueva: la crea, baja la lente y te dice cómo usarla")
    p.add_argument("--home", default=str(Path.home() / ".esme" / "mente"))
    p.add_argument("--sin-modelo", action="store_true", help="no baja la lente (si ya la tienes en otro sitio)")
    p = sub.add_parser("modelos", help="baja o comprueba la lente (el modelo que codifica el texto)")
    p.add_argument("--nombre", default="embeddinggemma-300m")
    a = ap.parse_args(argv)

    if a.cmd == "init":
        init_cmd(Path(a.home), sin_modelo=a.sin_modelo)
    elif a.cmd == "modelos":
        from .modelos import DEFAULT, bajar_modelo, esta_instalado, tamano_instalado
        if esta_instalado(a.nombre):
            mb = tamano_instalado(a.nombre) / (1024 * 1024)
            print(f"la lente «{a.nombre}» ya está ({mb:.0f} MB)")
        else:
            print(f"bajando la lente «{a.nombre}»…")
            bajar_modelo(a.nombre, progreso=lambda m: print("·", m))
    elif a.cmd == "ingest":
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
    elif a.cmd == "bench-mine":
        from .bench.items import mine_user_questions
        cands = mine_user_questions([Path(s) for s in a.sessions])
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text("".join(json.dumps(c, ensure_ascii=False) + "\n" for c in cands), encoding="utf-8")
        print(f"preguntas minadas: {len(cands)} → {a.out}")


if __name__ == "__main__":
    main()
