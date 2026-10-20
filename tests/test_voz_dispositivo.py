"""El oído de Esme: dónde oye, según lo que hay en la máquina.

Medido el 20-oct: en la CPU el oído va más despacio que en tiempo real (0,64 s por segundo de
audio) y en la GPU 8,6 veces más rápido que en tiempo real. Por eso la GPU es lo que se busca
primero, pero sólo si hay memoria de sobra: si la app está pintando escenas, se oye en la CPU.
"""
import daimon.voz as voz


def test_sin_gpu_se_oye_en_la_cpu(monkeypatch):
    monkeypatch.setattr(voz, "cuda_disponible", lambda: False)
    monkeypatch.setattr(voz, "vram_libre", lambda: 8_000_000_000)
    assert voz.elige_dispositivo() == ("cpu", "int8")


def test_con_gpu_y_sitio_se_oye_en_la_gpu(monkeypatch):
    monkeypatch.setattr(voz, "cuda_disponible", lambda: True)
    monkeypatch.setattr(voz, "vram_libre", lambda: 4_000_000_000)
    assert voz.elige_dispositivo() == ("cuda", "float16")


def test_sin_sitio_en_la_gpu_se_oye_en_la_cpu(monkeypatch):
    monkeypatch.setattr(voz, "cuda_disponible", lambda: True)
    monkeypatch.setattr(voz, "vram_libre", lambda: 100_000_000)
    assert voz.elige_dispositivo() == ("cpu", "int8")


def test_si_no_se_pregunta_a_nvidia_smi_no_se_cae(monkeypatch):
    """La máquina sin nvidia-smi (o sin GPU) no rompe nada: se oye en la CPU."""
    monkeypatch.setattr(voz, "cuda_disponible", lambda: True)
    monkeypatch.setattr(voz, "vram_libre", lambda: 0)
    assert voz.elige_dispositivo() == ("cpu", "int8")
