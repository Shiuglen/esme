import numpy as np
import pytest
from starlette.testclient import TestClient

from daimon.home import Home
from daimon.server import create_app
from tests.fakes import fake_encoder

TOKEN = "t0k3n"
H = {"Authorization": f"Bearer {TOKEN}"}


class VozFalsa:
    """Oye la longitud del audio y «dice» el texto como bytes: así se prueba el camino sin cargar modelos."""
    def __init__(self):
        self.oido = None

    def oir(self, pcm: np.ndarray, idioma: str = "es") -> str:
        self.oido = (pcm.dtype, len(pcm), idioma)
        return f"oí {len(pcm)} muestras"

    def decir(self, texto: str) -> bytes:
        return b"RIFF" + texto.encode()


@pytest.fixture
def ctx(tmp_path):
    voz = VozFalsa()
    app, _ = create_app(Home(tmp_path, encoder=fake_encoder(32)), TOKEN, allowed_hosts=["testserver"], voz=voz)
    with TestClient(app) as c:
        yield c, voz


def test_oir_recibe_pcm_float32_y_devuelve_texto(ctx):
    c, voz = ctx
    pcm = np.zeros(16000, dtype="<f4")
    r = c.post("/voz/oir", content=pcm.tobytes(), headers={**H, "Content-Type": "application/octet-stream"})
    assert r.status_code == 200 and r.json() == {"texto": "oí 16000 muestras"}
    assert voz.oido == (np.float32, 16000, "es")


def test_oir_sin_audio_o_demasiado_largo_se_rechaza(ctx):
    c, _ = ctx
    assert c.post("/voz/oir", content=b"", headers=H).status_code == 400
    largo = np.zeros(16000 * 300, dtype="<f4").tobytes()   # 5 minutos: ahora entra (antes se rechazaba a los 3)
    assert c.post("/voz/oir", content=largo, headers=H).status_code == 200
    demais = np.zeros(16000 * 960, dtype="<f4").tobytes()   # 16 minutos: pasa de 15, se rechaza
    assert c.post("/voz/oir", content=demais, headers=H).status_code == 413


def test_decir_devuelve_wav(ctx):
    c, _ = ctx
    r = c.post("/voz/decir", json={"texto": "Hola, soy Esme"}, headers=H)
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav" and r.content == b"RIFFHola, soy Esme"
    assert c.post("/voz/decir", json={"texto": "  "}, headers=H).status_code == 400


def test_la_voz_exige_token(ctx):
    c, _ = ctx
    assert c.post("/voz/decir", json={"texto": "hola"}).status_code == 401
