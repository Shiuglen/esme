"""Llamadas a Ollama que sobreviven a una GPU rota.

Tras suspender el equipo, el controlador de NVIDIA puede quedar inservible: Ollama responde 500 porque su
llama-server no logra cargar el modelo en la GPU (CUDA «out of memory» con la GPU vacía, Vulkan que no
inicializa…). En ese caso la misma petición se repite en CPU (`num_gpu: 0`) y se recuerda durante un rato
para no estrellarse contra la GPU en cada llamada. Cualquier otro error se devuelve tal cual.
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request

GPU_ROTA = re.compile(r"llama-server|cuda|vulkan|vk::|out of memory|clip model|segmentation fault", re.I)
CPU_SEGUNDOS = 600.0            # pasado este tiempo se vuelve a probar la GPU (por si ya se arregló)
_cpu_hasta: dict[str, float] = {}


def post_json(host: str, path: str, payload: dict, timeout: float) -> dict:
    host = host.rstrip("/")
    intentos = [True] if _cpu_hasta.get(host, 0.0) > time.time() else [False, True]
    for en_cpu in intentos:
        body = dict(payload)
        if en_cpu:
            body["options"] = {**payload.get("options", {}), "num_gpu": 0}
        req = urllib.request.Request(f"{host}{path}", data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            detalle = e.read().decode("utf-8", "ignore")
            if not en_cpu and e.code == 500 and GPU_ROTA.search(detalle):
                _cpu_hasta[host] = time.time() + CPU_SEGUNDOS
                continue
            raise urllib.error.URLError(f"HTTP {e.code}: {detalle[:300] or e.reason}") from e
    raise AssertionError("inalcanzable")
