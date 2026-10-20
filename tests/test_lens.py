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


# --- Lente propia (ONNX Runtime en proceso): sin Ollama ni servidores externos ---
import os as _os
from pathlib import Path as _Path
import pytest as _pytest

_MODELO = _Path(_os.environ.get("ESME_MODELOS", _Path.home() / ".local/share/esme/modelos")) / "embeddinggemma-300m-onnx"
_hay_modelo = _pytest.mark.skipif(not (_MODELO / "tokenizer.json").exists(), reason="modelo ONNX no descargado")


@_hay_modelo
def test_onnx_encoder_normaliza_y_conserva_el_orden_aunque_agrupe_por_longitud():
    from daimon.lens import onnx_encoder
    enc, dim = onnx_encoder("embeddinggemma-300m")
    assert dim == 768
    textos = ["una frase bastante más larga que las otras para que el lote se reordene por longitud " * 3, "hola", "adiós mundo"]
    juntos = enc(textos)
    assert juntos.shape == (3, 768)
    assert np.allclose(np.linalg.norm(juntos, axis=1), 1, atol=1e-3)
    sueltos = np.vstack([enc([t]) for t in textos])
    assert np.allclose(juntos, sueltos, atol=2e-3)


@_hay_modelo
def test_config_con_ollama_usa_el_motor_propio_sin_tocar_ollama(monkeypatch):
    import daimon.home as home
    monkeypatch.setattr(home, "ollama_encoder", lambda *a, **k: (_ for _ in ()).throw(AssertionError("no debe usar Ollama")))
    enc, dim = home.encoder_from_config({"encoder": "ollama:embeddinggemma"})
    assert dim == 768 and enc(["hola"]).shape == (1, 768)


def test_ruta_de_modelos_por_entorno(monkeypatch, tmp_path):
    from daimon.lens import ruta_modelo
    monkeypatch.setenv("ESME_MODELOS", str(tmp_path))
    assert ruta_modelo("x") == tmp_path / "x-onnx"


@_hay_modelo
def test_la_lente_suelta_el_modelo_si_nadie_la_usa_y_lo_recupera_al_volver():
    # Con el modelo cargado el cerebro ocupa ~360 MB (y hasta ~1,5 GB tras absorber); cargarlo cuesta ~0,1 s.
    # Así que en reposo se suelta y se recupera al volver a usarlo, con los mismos vectores.
    import time
    from daimon.lens import onnx_encoder
    enc, dim = onnx_encoder("embeddinggemma-300m", inactividad=0.3, cache=0)
    assert dim == 768
    a = enc(["la tinta envejece con los días"])
    assert enc.cargada()
    time.sleep(1.0)
    assert not enc.cargada()
    b = enc(["la tinta envejece con los días"])
    assert enc.cargada()
    assert np.allclose(a, b, atol=1e-5)


@_hay_modelo
def test_un_texto_largo_se_recorta_pero_no_revienta_el_modelo():
    # La ventana del troceador es amplia (8192), pero el modelo manda: un texto más largo
    # se recorta a su contexto, no revienta la sesión de ONNX.
    from daimon.lens import onnx_encoder
    enc, dim = onnx_encoder("embeddinggemma-300m", inactividad=None, cache=0)
    v = enc(["palabra " * 6000])
    assert v.shape == (1, 768) and np.all(np.isfinite(v)) and abs(float(np.linalg.norm(v)) - 1) < 1e-3
