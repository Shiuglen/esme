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


# Cuánta memoria de vídeo hace falta para que el oído vaya en la GPU: el modelo «small» en float16
# ronda 1 GB. Por debajo de este margen se oye en la CPU (que va más despacio que en tiempo real:
# medido el 20-oct, 0,64 s por segundo de audio, frente a 0,07 en la GPU).
VRAM_MINIMA = 1_500_000_000


def vram_libre() -> int:
    """Memoria de vídeo libre en bytes (0 si no se puede saber)."""
    import subprocess
    try:
        salida = subprocess.run(["nvidia-smi", "--query-gpu=memory.free", "--format=csv,noheader,nounits"],
                                capture_output=True, text=True, timeout=3).stdout.strip().splitlines()
        return int(salida[0].strip()) * 1024 * 1024
    except Exception:
        return 0


def cuda_disponible() -> bool:
    """¿Hay GPU que ctranslate2 pueda usar?"""
    try:
        import ctranslate2
        return ctranslate2.get_cuda_device_count() > 0
    except Exception:
        return False


def elige_dispositivo(vram_minima: int = VRAM_MINIMA) -> tuple[str, str]:
    """Dónde oye Esme: GPU si hay sitio de sobra, si no CPU.

    En la CPU el oído va **más despacio que en tiempo real** (medido: 0,64 s por segundo de audio),
    así que una frase de diez segundos tarda seis y medio en transcribirse. En la GPU va 8,6 veces
    más rápido que en tiempo real. Cuando no hay GPU, o no hay memoria libre (la app está pintando
    escenas), se oye en la CPU: mejor tarde que caerse.
    """
    if cuda_disponible() and vram_libre() >= vram_minima:
        return "cuda", "float16"
    return "cpu", "int8"


class Voz:
    def __init__(self, oido: str = "small", voz: str = "es_MX-claude-high", inactividad: float = 120):
        self.oido_nombre, self.voz_nombre, self.inactividad = oido, voz, inactividad
        self._oido = self._voz = self._reloj = None
        self.oido_dispositivo: str | None = None   # dónde se está oyendo ahora mismo
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
                self._oido = self._abrir_oido()
            segs, _ = self._oido.transcribe(pcm.astype(np.float32), language=idioma or None, vad_filter=True, beam_size=5)
            texto = " ".join(s.text.strip() for s in segs).strip()
            self._usar()
            return texto

    def _abrir_oido(self):
        """Carga el oído. Si la GPU falla (o no cabe), se oye en la CPU: mejor tarde que caerse."""
        from faster_whisper import WhisperModel
        base = dict(download_root=str(carpeta_voz() / "whisper"))
        for dispositivo, compute in (elige_dispositivo(), ("cpu", "int8")):
            o = dict(base, device=dispositivo, compute_type=compute)
            if dispositivo == "cpu":
                o["cpu_threads"] = max(1, (os.cpu_count() or 2) // 2)
            try:
                modelo = WhisperModel(self.oido_nombre, local_files_only=True, **o)
                self.oido_dispositivo = dispositivo
                return modelo
            except Exception:
                try:   # del disco, sin preguntar a internet; sólo si aún no está, se descarga una vez
                    modelo = WhisperModel(self.oido_nombre, **o)
                    self.oido_dispositivo = dispositivo
                    return modelo
                except Exception:
                    if dispositivo == "cpu":
                        raise

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
