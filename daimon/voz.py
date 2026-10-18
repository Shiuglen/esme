"""La voz de Esme, dentro del cerebro y sin salir del equipo: el oído (Whisper, con faster-whisper) y la voz (Piper).
Los modelos viven en ~/.local/share/esme/modelos/voz. Se cargan al usarlos y se sueltan tras `inactividad` segundos
quietos, como la Lente: Esme no ocupa memoria por oír de vez en cuando.
El audio llega ya decodificado desde la app (PCM float32, mono, 16 kHz): así no hace falta decodificar formatos aquí."""
from __future__ import annotations

import io
import os
import threading
import time
import wave
from pathlib import Path

import numpy as np

from daimon.lens import _devolver_memoria


def carpeta_voz() -> Path:
    return Path(os.environ.get("ESME_MODELOS", Path.home() / ".local/share/esme/modelos")) / "voz"


class Voz:
    def __init__(self, oido: str = "small", voz: str = "es_MX-claude-high", inactividad: float = 120):
        self.oido_nombre, self.voz_nombre, self.inactividad = oido, voz, inactividad
        self._oido = self._voz = self._reloj = None
        self._ultimo = time.monotonic()
        self._cerrojo = threading.RLock()

    def _usar(self) -> None:
        self._ultimo = time.monotonic()
        if self._reloj is not None:
            self._reloj.cancel()
        self._reloj = threading.Timer(self.inactividad, self._soltar)
        self._reloj.daemon = True
        self._reloj.start()

    def _soltar(self) -> None:
        with self._cerrojo:
            if time.monotonic() - self._ultimo < self.inactividad:
                return
            self._oido = self._voz = None
        import gc
        gc.collect()
        _devolver_memoria()

    def oir(self, pcm: np.ndarray, idioma: str = "es") -> str:
        with self._cerrojo:
            if self._oido is None:
                from faster_whisper import WhisperModel
                self._oido = WhisperModel(self.oido_nombre, device="cpu", compute_type="int8",
                                          download_root=str(carpeta_voz() / "whisper"), cpu_threads=max(1, (os.cpu_count() or 2) // 2))
            segs, _ = self._oido.transcribe(pcm.astype(np.float32), language=idioma or None, vad_filter=True, beam_size=5)
            texto = " ".join(s.text.strip() for s in segs).strip()
            self._usar()
            return texto

    def decir(self, texto: str) -> bytes:
        with self._cerrojo:
            if self._voz is None:
                from piper import PiperVoice
                self._voz = PiperVoice.load(str(carpeta_voz() / f"{self.voz_nombre}.onnx"))
            buf = io.BytesIO()
            with wave.open(buf, "wb") as w:
                self._voz.synthesize_wav(texto, w)
            self._usar()
            return buf.getvalue()
