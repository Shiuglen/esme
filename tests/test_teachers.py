import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from daimon.ledger import append
from daimon.teachers import Ollama, TeacherError


def _server(handler_fn):
    calls = {"n": 0, "body": None}

    class H(BaseHTTPRequestHandler):
        def do_POST(self):
            calls["n"] += 1
            calls["body"] = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            code, payload = handler_fn(calls["n"])
            self.send_response(code); self.end_headers(); self.wfile.write(json.dumps(payload).encode())

        def log_message(self, *a):
            pass

    srv = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, calls


def test_answer_ok():
    srv, calls = _server(lambda n: (200, {"message": {"content": "Laya es gratis."}}))
    o = Ollama("m", host=f"http://127.0.0.1:{srv.server_port}", backoff=0)
    assert o.answer("sis", "pregunta") == "Laya es gratis."
    b = calls["body"]
    assert b["think"] is False and b["stream"] is False and b["options"]["temperature"] == 0
    assert b["options"]["num_predict"] == 256
    srv.shutdown()


def test_quita_think():
    srv, _ = _server(lambda n: (200, {"message": {"content": "<think>pensando...</think>\nRespuesta final"}}))
    o = Ollama("m", host=f"http://127.0.0.1:{srv.server_port}", backoff=0)
    assert o.answer("s", "p") == "Respuesta final"
    srv.shutdown()


def test_reintenta_y_falla():
    srv, calls = _server(lambda n: (500, {"error": "x"}))
    o = Ollama("m", host=f"http://127.0.0.1:{srv.server_port}", retries=3, backoff=0)
    with pytest.raises(TeacherError):
        o.answer("s", "p")
    assert calls["n"] == 3
    srv.shutdown()


def test_reintenta_y_recupera():
    srv, calls = _server(lambda n: (500, {}) if n < 2 else (200, {"message": {"content": "ok"}}))
    o = Ollama("m", host=f"http://127.0.0.1:{srv.server_port}", retries=3, backoff=0)
    assert o.answer("s", "p") == "ok" and calls["n"] == 2
    srv.shutdown()


def test_ledger_append(tmp_path):
    p = tmp_path / "l.jsonl"
    append(p, {"a": 1}); append(p, {"b": 2})
    rows = [json.loads(x) for x in p.read_text().splitlines()]
    assert rows[0]["a"] == 1 and rows[1]["b"] == 2 and "ts" in rows[0]
