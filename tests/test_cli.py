from pathlib import Path

import pytest

from daimon.cli import ingest_cmd, main
from daimon.ingest import Event
from tests.fakes import fake_encoder

FIX = Path(__file__).parent / "fixtures"


def test_sueño_cli(tmp_path):
    import json
    home = tmp_path / "mente"
    home.mkdir()
    (home / "config.json").write_text('{"encoder": "hash:32"}', encoding="utf-8")
    from daimon.home import Home
    h = Home(home)
    h.add([Event("id1", "Sakai revisa la Prueba 0 con Laya", "t", "note", "2026-10-01T10:00:00Z", 0.8),
           Event("id2", "Sakai revisa la Prueba 0 con Laya otra vez", "t", "user_msg", "2026-10-02T10:00:00Z", 0.8),
           Event("id3", "Sakai revisa la Prueba 0 con Laya bien", "t", "note", "2026-10-03T10:00:00Z", 0.8)])
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        main(["sueño", "--home", str(home)])
    salida = json.loads(buf.getvalue().split("sueño: ", 1)[1])
    assert salida["personas"] >= 1 and salida["energia"] > 0


def test_ingest_x_cli(tmp_path):
    import json, io, contextlib
    homepage = tmp_path / "mente"
    cosecha = tmp_path / "x.json"
    cosecha.write_text(json.dumps({"tabs": [{"url": "https://x.com/i/bookmarks", "posts": [
        {"author": "Ana", "text": "memoria de agentes", "url": "https://x.com/a/status/1", "date": "2026-10-19T10:00:00Z"},
    ]}]}), encoding="utf-8")
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        main(["ingest-x", "--home", str(homepage), str(cosecha)])
    assert "recuerdos nuevos de X: 1" in buf.getvalue()


def test_ingest_cmd(tmp_path):
    n = ingest_cmd(tmp_path / "home", [FIX], encoder=fake_encoder(32))
    assert n >= 3
    assert ingest_cmd(tmp_path / "home", [FIX], encoder=fake_encoder(32)) == 0   # idempotente


def test_help():
    with pytest.raises(SystemExit) as e:
        main(["--help"])
    assert e.value.code == 0


def test_serve_arranca_y_responde(tmp_path):
    import json, subprocess, sys, urllib.request, os
    home = tmp_path / "home"; home.mkdir()
    (home / "config.json").write_text('{"encoder": "hash:32"}')
    env = dict(os.environ)
    p = subprocess.Popen([sys.executable, "-m", "daimon.cli", "serve", "--home", str(home), "--port", "0"],
                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env=env)
    try:
        info = json.loads(p.stdout.readline())
        req = urllib.request.Request(f"http://127.0.0.1:{info['port']}/health",
                                     headers={"Authorization": f"Bearer {info['token']}"})
        assert json.loads(urllib.request.urlopen(req, timeout=10).read())["ok"] is True
    finally:
        p.terminate(); p.wait(10)


def _arranca_serve(home, extra_env=None):
    import subprocess, sys, os
    env = dict(os.environ, **(extra_env or {}))
    return subprocess.Popen([sys.executable, "-m", "daimon.cli", "serve", "--home", str(home), "--port", "0"],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)


def _home_tmp(tmp_path):
    home = tmp_path / "home"; home.mkdir(exist_ok=True)
    (home / "config.json").write_text('{"encoder": "hash:32"}')
    return home


def test_serve_se_apaga_con_sigterm(tmp_path):
    import json, signal, socket
    p = _arranca_serve(_home_tmp(tmp_path))
    s = None
    try:
        info = json.loads(p.stdout.readline())
        s = socket.create_connection(("127.0.0.1", info["port"]), timeout=10)
        s.sendall(f"GET /events HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer {info['token']}\r\n\r\n".encode())
        assert b"200" in s.recv(4096)      # el flujo SSE queda abierto
        p.send_signal(signal.SIGTERM)
        p.wait(5)                          # TimeoutExpired si se cuelga
    finally:
        if s: s.close()
        if p.poll() is None: p.kill(); p.wait()


def test_serve_muere_si_muere_su_padre(tmp_path):
    import os, signal, subprocess, sys, time
    home = _home_tmp(tmp_path)
    codigo = (
        "import subprocess, sys, os, time\n"
        "env = dict(os.environ, DAIMON_PARENT_PID=str(os.getpid()))\n"
        f"p = subprocess.Popen([sys.executable, '-m', 'daimon.cli', 'serve', '--home', {str(home)!r}, '--port', '0'],"
        " stdout=subprocess.PIPE, env=env, text=True)\n"
        "p.stdout.readline()\n"
        "print(p.pid, flush=True)\n"
        "time.sleep(60)\n")
    padre = subprocess.Popen([sys.executable, "-c", codigo], stdout=subprocess.PIPE, text=True)
    hijo = None
    try:
        hijo = int(padre.stdout.readline().split()[0])
        padre.kill(); padre.wait()
        fin = time.time() + 5
        while time.time() < fin:
            try:
                os.kill(hijo, 0)
                if open(f"/proc/{hijo}/stat").read().rsplit(")", 1)[1].split()[0] == "Z":
                    break
            except (ProcessLookupError, FileNotFoundError):
                break
            time.sleep(0.2)
        else:
            raise AssertionError("serve sigue vivo tras morir su padre")
    finally:
        if hijo:
            try: os.kill(hijo, signal.SIGKILL)
            except ProcessLookupError: pass


def test_dos_cerebros_no_comparten_mente(tmp_path):
    import json
    home = _home_tmp(tmp_path)
    p1 = _arranca_serve(home)
    try:
        json.loads(p1.stdout.readline())
        snap = lambda: {f.name: (f.stat().st_mtime_ns, f.stat().st_size) for f in home.iterdir() if f.name != ".cerebro.lock"}
        antes = snap()
        p2 = _arranca_serve(home)
        _, err = p2.communicate(timeout=5)
        assert p2.returncode == 3
        assert "ya hay un cerebro usando esta mente" in err
        assert antes == snap()
    finally:
        p1.terminate()
        try: p1.wait(10)
        except Exception: p1.kill()


# ---- La primera vez de una mente nueva ----

def test_init_crea_la_mente_y_no_toca_nada_que_existiera(tmp_path, capsys):
    """`daimon init` deja una mente usable y, si ya había una, no la pisa."""
    import json

    from daimon.cli import init_cmd
    home = tmp_path / "mente"
    init_cmd(home, sin_modelo=True)
    cfg = json.loads((home / "config.json").read_text(encoding="utf-8"))
    # la Lente buena (la ONNX local), que es la que mide mejor y no depende de Ollama
    assert cfg["encoder"] == "onnx:embeddinggemma-300m"
    salida = capsys.readouterr().out
    assert "Mente creada" in salida
    assert "daimon serve-mcp" in salida      # dice cómo se usa
    # y si ya existe, no la toca
    antes = (home / "config.json").read_text(encoding="utf-8")
    init_cmd(home, sin_modelo=True)
    assert (home / "config.json").read_text(encoding="utf-8") == antes
    assert "Ya hay una mente" in capsys.readouterr().out
