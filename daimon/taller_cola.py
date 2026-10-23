"""La puerta del Taller: los encargos que llegan de fuera, esperando a su dueño.

La Agent Card ya promete lo que no había: *encargar tareas al Taller desde fuera*. Una IA de la
casa (un agente que heredó la mente, el creador lejos, un cliente MCP con el token) puedo abrir
esa puerta; su encargo entra aquí.

Las reglas, y son las de la casa:

- **Aquí no se crea ninguna tarea.** La cola guarda el encargo con su hora y su origen; el Taller
  lo crea el creador, aprobándolo desde la app. La tarjeta no promete lo que no va a pasar.
- **TTL de 24 horas**: lo que nadie respondió en un día caduca y se cuenta así; nadie espera un
  encargo de ayer.
- **Tope de 5 por hora**: la puerta es para trabajar, no para inundar el taller. Si se pasa, se
  avisa en vez de chocar en silencio.
- **Todo lo que entra lleva su hora y su origen**: la decisión de aceptar es del creador, y para
  eso necesita ver de dónde vino y qué pide.

Como toda la mente: el fichero es local y es JSONL (encargos-fuera.jsonl, junto a la memoria).
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

TTL_HORAS = 24
MAX_HORA = 5               # la puerta no inunda: 5 encargos por hora y a esperar
MIN_TEXTO = 20             # un encargo de fuera es una orden, no una frase suelta
MAX_TEXTO = 20_000         # el mismo tope que el Taller pide a sus encargos
MAX_TITULO = 120           # el título del Taller se corta a 120; aquí se corta antes
MAX_NAIS = 200             # la cola no crece sin fin: lo resuelto y caducado se suelta
_FICHERO = "encargos-fuera.jsonl"


class ErrPuerta(Exception):
    """La puerta dice por qué no entra: cada mensaje es para quien lo lee, no un número."""


def _fichero(home) -> Path:
    return Path(home.path) / _FICHERO


def _carga(home) -> list[str]:
    f = _fichero(home)
    if not f.exists():
        return []
    return [l for l in f.read_text(encoding="utf-8").split("\n") if l]


def _guarda(home, encargos: list[dict]) -> None:
    home.path.mkdir(parents=True, exist_ok=True)
    with _fichero(home).open("w", encoding="utf-8") as f:
        f.writelines(json.dumps(x, ensure_ascii=False) + "\n" for x in encargos)


def _todos(home) -> list[dict]:
    fuera: list[dict] = []
    for l in _carga(home):
        try:
            x = json.loads(l)
            if isinstance(x, dict):
                fuera.append(x)
        except Exception:
            pass
    return fuera


def _valida(texto, titulo) -> tuple[str, str]:
    if not isinstance(texto, str):
        raise ErrPuerta("El encargo lleva su texto: es lo que hay que hacer.")
    cuerpo = texto.strip()
    if len(cuerpo) < MIN_TEXTO:
        raise ErrPuerta(f"Con más detalle: mínimo {MIN_TEXTO} caracteres.")
    if len(cuerpo) > MAX_TEXTO:
        raise ErrPuerta(f"Encargo de más: hasta {MAX_TEXTO} caracteres (es el tope del Taller).")
    cabecera = (titulo or "").strip()
    if not cabecera:
        cabecera = next((l.strip() for l in cuerpo.split("\n") if l.strip()), "")[:MAX_TITULO]
    return cuerpo, cabecera[:MAX_TITULO]


def _pasa_cuota(lineas: list[str], ahora: float) -> None:
    if sum(1 for x in lineas if x.get("ts", 0) > ahora - 3600) >= MAX_HORA:
        raise ErrPuerta(f"La puerta está llena: {MAX_HORA} encargos en la última hora.")


def entrar(home, texto, titulo=None, origen="fuera", ahora=None) -> dict:
    """La entrada de la puerta: guarda el encargo y devuelve su ficha. Nunca crea una tarea."""
    ahora = ahora if ahora is not None else time.time()
    lineas = _todos(home)
    cuerpo, cabecera = _valida(texto, titulo)
    _pasa_cuota([x for x in lineas if x.get("estado") == "pendiente"], ahora)
    x = {
        "id": f"enc-{int(ahora * 1000):x}-{os.urandom(4).hex()}", "ts": round(ahora, 3),
        "titulo": cabecera, "texto": cuerpo, "origen": origen, "estado": "pendiente", "respondido": None,
    }
    lineas.append(x)
    _guarda(home, lineas[-MAX_NAIS:])
    return x


def pendientes(home, ahora=None) -> list[dict]:
    """Lo que sigue esperando respuesta: pendiente y dentro de las 24 h. Lo nuevo primero."""
    ahora = ahora if ahora is not None else time.time()
    fuera = [x for x in _todos(home)
             if x.get("estado") == "pendiente" and x.get("ts", 0) > ahora - TTL_HORAS * 3600]
    fuera.sort(key=lambda x: x["ts"], reverse=True)
    return fuera


def responder(home, id_: str, decision: str, ahora=None) -> dict:
    """La respuesta del creador: 'aceptado' o 'rechazado'. El encargo sale de la cola de espera."""
    ahora = ahora if ahora is not None else time.time()
    if decision not in ("aceptado", "rechazado"):
        raise ErrPuerta("La decisión es 'aceptado' o 'rechazado'.")
    fuera = _todos(home)
    for x in fuera:
        if x.get("id") == id_:
            if x.get("estado") != "pendiente":
                raise ErrPuerta(f"Ese encargo ya tiene su respuesta ({x['estado']}).")
            x["estado"] = decision
            x["respondido"] = round(ahora, 3)
            _guarda(home, fuera)
            return x
    raise ErrPuerta("No hay ningún encargo con ese id: viejo, caducado (24 h) o ya respondido.")


def limpiar(home, ahora=None) -> dict:
    """La casa de la cola: lo resuelto y lo caducado se suelta; lo pendiente queda."""
    ahora = ahora if ahora is not None else time.time()
    fuera = _todos(home)
    quedan = [x for x in fuera
              if x.get("estado") == "pendiente" and x.get("ts", 0) > ahora - TTL_HORAS * 3600]
    soltados = len(fuera) - len(quedan)
    _guarda(home, quedan)
    return {"soltados": soltados, "quedan": len(quedan)}
