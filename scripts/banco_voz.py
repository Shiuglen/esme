#!/usr/bin/env python3
"""La bancada de voz: cuánto tarda y cuánto se equivoca la voz de Esme en esta máquina.

Palanca 10 de la tesis de escala: la voz local como infraestructura de los demás. Antes de
soñar con fuller-dúplex hay que saber **lo que hay**: el oído (faster-whisper «small») y la voz
(Piper) de `daimon/voz.py`, medidos aquí, en este equipo, con la misma configuración que usa la app.

El método es limpio: **el texto es la verdad**. Se sintetiza con la voz de Esme, se oye con el oído
de Esme y se compara palabra a palabra (WER). Así el error medido es del oído, no de quien grabó
el audio. Y el tiempo de ida y vuelta se mide igual: TTS → ASR, que es lo que espera una persona
al hablar con Esme.

Se mide en CPU (como lo usa la app hoy) y en GPU (si la hay), porque en una RTX 4050 de 6 GB la
diferencia decide si la voz puede ser de los agentes y no sólo de la app.

Uso:

    /ruta/al/venv/bin/python scripts/banco_voz.py
    /ruta/al/venv/bin/python scripts/banco_voz.py --salida docs/resultados/2026-10-20-voz.md
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import time
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Frases de verdad: números, nombres propios, acentos y la manera de hablar del creador.
FRASES = [
    "Esme, abre el Taller y mira qué tarea se quedó a medias.",
    "Ayer el proveedor devolvió dos mil cuatrocientos tokens de error.",
    "Mide la latencia en milisegundos, por favor.",
    "El jerk... no, el jerk no; diJOS por favor.",
    "¿Qué decidimos ayer sobre las pieles de la Tienda?",
    "Reencarna la tarea con otro motor, el que está en la lista.",
    "Son las once y veinte, mañana a las nueve en punto.",
    "Guarda los cambios en una rama y dime el commit.",
]


def normaliza(texto: str) -> list[str]:
    """Palabras comparables: sin mayúsculas, sin puntuación y sin acentos (el oído a veces los pone y a veces no)."""
    t = texto.lower()
    t = re.sub(r"[^\w\s]", " ", t, flags=re.UNICODE)
    t = re.sub(r"\s+", " ", t).strip()
    return [w for w in t.split(" ") if w]


def wer(referencia: list[str], hipoteis: list[str]) -> tuple[float, int, int, int, int]:
    """Tasa de error de palabras: (Sustituciones, borrados, insertados, correctos, total)."""
    m, n = len(referencia), len(hipoteis)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            coste = 0 if referencia[i - 1] == hipoteis[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + coste)
    # camino hacia atrás para contar los tres errores
    s = b = i = c = 0
    x, y = m, n
    while x > 0 or y > 0:
        if x > 0 and y > 0 and dp[x][y] == dp[x - 1][y - 1] + (0 if referencia[x - 1] == hipoteis[y - 1] else 1):
            if referencia[x - 1] == hipoteis[y - 1]:
                c += 1
            else:
                s += 1
            x -= 1; y -= 1
        elif x > 0 and dp[x][y] == dp[x - 1][y] + 1:
            b += 1; x -= 1
        else:
            i += 1; y -= 1
    return s, b, i, c, m


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--modelo", default="small", help="el oído (faster-whisper)")
    ap.add_argument("--voz", default="es_MX-claude-high", help="la voz (Piper)")
    ap.add_argument("--dispositivos", default="cpu,gpu", help="cpu y/o gpu")
    ap.add_argument("--salida", default="", help="escribir el informe en markdown")
    args = ap.parse_args()

    from daimon.voz import Voz

    print("== la voz (Piper) ==", flush=True)
    voz = Voz(voz=args.voz)
    audios = []
    t0 = time.perf_counter()
    for f in FRASES:
        t = time.perf_counter()
        wav = voz.decir(f)
        dt = time.perf_counter() - t
        with wave.open(io.BytesIO(wav), "rb") as w:
            dur = w.getnframes() / w.getframerate()
        audios.append((f, wav, dur, dt))
        print(f"  {dur:5.2f} s de audio · {dt:5.2f} s de síntesis · RTF {dt / max(dur, 1e-6):5.3f} · {f[:44]}", flush=True)
    tts_total = sum(a[3] for a in audios)
    audio_total = sum(a[2] for a in audios)
    print(f"  TTS: {tts_total:.2f} s para {audio_total:.1f} s de audio (RTF {tts_total / audio_total:.3f})")

    # el oído, primero en frío (cuánto tarda en cargar el modelo) y luego en caliente
    resultados = []
    for dispositivo in [d for d in args.dispositivos.split(",") if d]:
        print(f"\n== el oído (faster-whisper «{args.modelo}») en {dispositivo} ==", flush=True)
        try:
            import numpy as np
            from faster_whisper import WhisperModel
            from daimon.voz import carpeta_voz
            if dispositivo == "gpu":
                o = dict(device="cuda", compute_type="float16", download_root=str(carpeta_voz() / "whisper"))
            else:
                o = dict(device="cpu", compute_type="int8", download_root=str(carpeta_voz() / "whisper"),
                         cpu_threads=max(1, (os.cpu_count() or 2) // 2))
            t = time.perf_counter()
            modelo = WhisperModel(args.modelo, local_files_only=True, **o)
            carga = time.perf_counter() - t
            print(f"  carga en frío: {carga:.2f} s", flush=True)

            filas = []
            for frase, wav, dur, _ in audios:
                with wave.open(io.BytesIO(wav), "rb") as w:
                    pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
                t = time.perf_counter()
                segs, _ = modelo.transcribe(pcm, language="es", vad_filter=True, beam_size=5)
                texto = " ".join(s.text.strip() for s in segs).strip()
                dt = time.perf_counter() - t
                s, b, i, c, n = wer(normaliza(frase), normaliza(texto))
                filas.append({"frase": frase, "oido": texto, "sustituciones": s, "borrados": b, "insertados": i,
                              "correctos": c, "total": n, "segundos": dt, "audio": dur})
                print(f"  {dt:5.2f} s · RTF {dt / max(dur, 1e-6):5.3f} · err {(s + b + i)}/{n} · «{texto[:52]}»", flush=True)
            err_total = sum(f["sustituciones"] + f["borrados"] + f["insertados"] for f in filas)
            palabras = sum(f["total"] for f in filas)
            seg_total = sum(f["segundos"] for f in filas)
            rtf = seg_total / audio_total
            print(f"  ASR: {seg_total:.2f} s para {audio_total:.1f} s de audio (RTF {rtf:.3f}) · WER {err_total / max(palabras, 1):.3f}")
            resultados.append({"dispositivo": dispositivo, "carga": carga, "rtf": rtf, "wer": err_total / max(palabras, 1),
                               "segundos": seg_total, "palabras": palabras, "errores": err_total, "filas": filas})
        except Exception as e:  # la GPU puede no estar; se dice y se sigue
            print(f"  no se pudo en {dispositivo}: {e}", file=sys.stderr)

    if args.salida:
        lineas = ["# La voz de Esme, medida en esta máquina (2026-10-20)", "",
                  f"Método: {len(FRASES)} frases en español, sintetizadas con Piper ({args.voz}) y oídas con "
                  f"faster-whisper «{args.modelo}». La verdad es el texto; el error (WER) es del oído.", "",
                  "| | carga en frío | RTF del oído | WER | tiempo por audio |",
                  "|---|---|---|---|---|"]
        for r in resultados:
            lineas.append(f"| {r['dispositivo']} | {r['carga']:.2f} s | {r['rtf']:.3f} | {r['wer']:.3f} | {r['segundos']:.2f} s |")
        lineas += ["", f"TTS: {tts_total:.2f} s para {audio_total:.1f} s de audio (RTF {tts_total / audio_total:.3f}).", ""]
        Path(args.salida).parent.mkdir(parents=True, exist_ok=True)
        Path(args.salida).write_text("\n".join(lineas), encoding="utf-8")
        print(f"informe: {args.salida}")

    resumen = {"tts": {"segundos": tts_total, "audio": audio_total, "rtf": tts_total / audio_total},
               "asr": [{k: v for k, v in r.items() if k != "filas"} for r in resultados]}
    print(json.dumps(resumen, indent=1, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
