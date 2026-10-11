import numpy as np

from daimon.lens import Lens
from tests.fakes import fake_encoder


def _lens():
    enc, dim = fake_encoder(32)
    return Lens(enc, dim)


def test_normalizado():
    v = _lens().encode(["hola mundo", "otra cosa distinta"])
    assert v.dtype == np.float32
    assert np.allclose(np.linalg.norm(v, axis=1), 1.0, atol=1e-5)


def test_vacio_no_rompe():
    v = _lens().encode([""])
    assert v.shape == (1, 32) and np.all(np.isfinite(v))


def test_adaptador_acerca_pares():
    lens = _lens()
    pairs = [(f"gato{i} casa{i}", f"felino{i} hogar{i}") for i in range(40)]
    a = lens.encode([p[0] for p in pairs]); b = lens.encode([p[1] for p in pairs])
    before = float(np.mean(np.sum(a * b, axis=1)))
    first = lens.train_adapter(pairs, epochs=1)
    last = lens.train_adapter(pairs, epochs=60)
    a = lens.encode([p[0] for p in pairs]); b = lens.encode([p[1] for p in pairs])
    after = float(np.mean(np.sum(a * b, axis=1)))
    assert last < first
    assert after > before + 0.1


def test_guardar_cargar(tmp_path):
    enc, dim = fake_encoder(32)
    lens = Lens(enc, dim)
    lens.train_adapter([("a b", "c d"), ("e f", "g h")], epochs=5)
    lens.save(tmp_path / "lens.npz")
    other = Lens.load(tmp_path / "lens.npz", enc)
    assert np.allclose(lens.encode(["a b"]), other.encode(["a b"]))


def test_prefijos_consulta_y_documento():
    seen = []
    enc, dim = fake_encoder(32)

    def spy(texts):
        seen.extend(texts)
        return enc(texts)
    lens = Lens(spy, dim, query_prefix="Q: ", doc_prefix="D: ")
    lens.encode(["hola"]); lens.encode(["pregunta"], role="query")
    assert seen == ["D: hola", "Q: pregunta"]


def test_ollama_encoder():
    import json, threading
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from daimon.lens import ollama_encoder
    got = {}

    class H(BaseHTTPRequestHandler):
        def do_POST(self):
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            got.setdefault("batches", []).append(len(body["input"]))
            self.send_response(200); self.end_headers()
            self.wfile.write(json.dumps({"embeddings": [[1.0, 0.0, 0.0]] * len(body["input"])}).encode())

        def log_message(self, *a):
            pass
    srv = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    enc, dim = ollama_encoder("m", host=f"http://127.0.0.1:{srv.server_port}", batch=2)
    v = enc(["a", "b", "c"])
    assert dim == 3 and v.shape == (3, 3) and got["batches"][-2:] == [2, 1]
    srv.shutdown()


def test_ollama_encoder_cae_a_cpu_si_la_gpu_no_carga():
    import json, threading
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from daimon.lens import ollama_encoder
    seen = []

    class H(BaseHTTPRequestHandler):
        def do_POST(self):
            b = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            seen.append(b.get("options", {}).get("num_gpu"))
            if b.get("options", {}).get("num_gpu") == 0:
                code, out = 200, {"embeddings": [[1.0, 0.0, 0.0] for _ in b["input"]]}
            else:
                code, out = 500, {"error": "llama-server process has terminated: vk::PhysicalDevice::createDevice: ErrorInitializationFailed"}
            self.send_response(code); self.end_headers(); self.wfile.write(json.dumps(out).encode())

        def log_message(self, *a):
            pass

    srv = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    enc, dim = ollama_encoder("m", host=f"http://127.0.0.1:{srv.server_port}")
    assert dim == 3 and enc(["a", "b"]).shape == (2, 3)
    assert seen == [None, 0, 0]     # un fallo en GPU, después todo en CPU
    srv.shutdown()
