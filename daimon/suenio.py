"""Sueño: consolidación offline de la mente. Nada toca pesos ni pide API: son palabras.

En la vigilia el Hipocampo guarda recuerdos crudos. Cuando Esme duerme, los destila
en dos clases de tarjetas que devuelven la memoria más lista por token:

- «persona»: qué hablas con alguien concreto (nombre detectado en tus textos, tus
  términos frecuentes con esa persona y tu cita mejor puntuada).
- «escena»: lo que pasó en un día concurrido (participantes, tema central y la
  huella: el apunte con más pesos del grupo).

El enlace con el olvido es heredado: cada tarjeta queda enlazada (deps) a los
recuentos que la produjeron; si los borras, la tarjeta muere en cascada con
certificado. Y el sueño se sincroniza por fuente: lo que ya no sale del nuevo
sueño se marca obsoleto (deleted=2) y no vuelve a pisar el recall.
"""
from __future__ import annotations

import hashlib
import re
from collections import Counter

import numpy as np

from .ingest import Event

_STOP = {w for w in """de la que el en y a los se del las un por con no una su para es al lo como
más pero sus le ya o este sí porque esta entre cuando muy sin sobre también me hasta hay donde
quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mí antes
algunos qué unos yo otro otras otra él tanto esa estos mucho quienes nada muchos cual poco ella
estar estas algunas algo nosotros the and that you for are with not this was has from they what
your have will can had said i who its our""".split()}

_NOMBRE = re.compile(r"\b[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,}\b")
_CITA = 140                     # longitud a medida de cada cita en la tarjeta
_MIN_PERSONA = 3                # a partir de cuántas apariciones un nombre es persona
_SIM_MIN = 0.6                  # pertenencia a escena por similitud del coseno
_TOPE_ESCENA = 15               # máxima de apuntes que absorbe una escena
_FUENTE = "sueño"


def _uñas(text: str) -> list[str]:
    """Palabras útiles del texto: sin stopwords ni cifras, recortadas de signos."""
    bruto = re.findall(r"[a-záéíóúñü0-9@._]{3,}", text.lower())
    return [w for w in bruto if w not in _STOP and not w.isdigit()]


def _tfidf(eventos: list[Event], corpus: list[str], tope: int = 6) -> list[str]:
    """Términos que distinguen esa pila de recuentos del resto de la mente."""
    df = Counter(w for c in corpus for w in set(_uñas(c)))
    n = max(len(corpus), 1)
    tf = Counter(w for e in eventos for w in _uñas(e.text))
    score = {w: f * float(np.log(n / (df.get(w, 1) + 0.5))) for w, f in tf.items() if f >= 2}
    return [w for w, _ in sorted(score.items(), key=lambda t: -t[1])][:tope]


def _cita(producidas: list[Event]) -> str:
    """La cita lleva el recuento con más confianza y a igualdad, el más largo: determinista."""
    mejor = max(producidas, key=lambda e: (e.trust, len(e.text)))
    limpio = " ".join(mejor.text.split())
    return (limpio[:_CITA] + "…") if len(limpio) > _CITA else limpio


def _personas(eventos: list[Event]) -> dict[str, list[Event]]:
    """Personas reconocidas: los nombres que se repiten y no son palabras corrientes."""
    apariciones: dict[str, list[Event]] = {}
    for e in eventos:
        for m in _NOMBRE.findall(e.text):
            if m.lower() not in _STOP:
                apariciones.setdefault(m, []).append(e)
    return {p: ev for p, ev in apariciones.items() if len(ev) >= _MIN_PERSONA}


def _escenas(eventos: list[Event], vectores: np.ndarray) -> list[list[int]]:
    """Agrupo por día y afinidad del sentido: una escena es una pila de apuntes parecidos del mismo día."""
    días: dict[str, list[int]] = {}
    for i, e in enumerate(eventos):
        días.setdefault(e.ts[:10], []).append(i)
    out: list[list[int]] = []
    for ls in días.values():
        if len(ls) < 3:
            continue
        restantes = list(ls)
        while restantes:
            semilla = restantes[0]
            sim = vectores[restantes] @ vectores[semilla]
            grupo = sorted(i for j, i in enumerate(restantes) if sim[j] >= _SIM_MIN)[:_TOPE_ESCENA]
            out.append(grupo)
            restantes = [i for i in restantes if i not in set(grupo)]
    return out


def _ev(texto: str, producidas: list[Event]) -> Event:
    """Tarjeta nueva: id/dedup por contenido, confianza heredada del apuntado más flojo."""
    confianza = min(e.trust for e in producidas)
    eid = hashlib.sha1(" ".join(texto.lower().split()).encode()).hexdigest()[:16]
    ts = max(e.ts for e in producidas)
    return Event(eid, texto, _FUENTE, "doc", ts, confianza, parent=producidas[0].id)


def _tarjeta_persona(persona: str, eventos: list[Event], corpus: list[str]) -> Event:
    días = [e.ts[:10] for e in eventos]
    términos = _tfidf(eventos, corpus)
    cita = _cita(eventos)
    texto = (f"persona {persona}: hablas de {', '.join(términos) or persona}; "
             f"aparece desde {min(días)} a {max(días)}; tu cita: «{cita}»")
    return _ev(texto, eventos)


def _tarjeta_escena(eventos: list[Event], corpus: list[str]) -> Event:
    día = eventos[0].ts[:10]
    quién = ", ".join(sorted(_personas(eventos))) or "sin personas reconocidas"
    términos = _tfidf(eventos, corpus)
    cita = _cita(eventos)
    texto = f"escena {día}: {quién}; tema {', '.join(términos) or 'desconocido'}; huella: «{cita}»"
    return _ev(texto, eventos)


def _informe(nacidas: list[tuple[Event, list[str]]], antes: int, después: int) -> dict:
    return {"personas": sum(1 for t, _ in nacidas if t.text.startswith("persona")),
            "escenas": sum(1 for t, _ in nacidas if t.text.startswith("escena")),
            "energia": después - antes}


def dormir(home, tope: int = 50000) -> dict:
    """Consolida la mente: destila tarjetas de personas y escenas y las sincroniza por fuente «sueño».

    Idempotente: con los mismos recuentos produce las mismas tarjetas (id por contenido)
    y no añade nada. Con recuentos nuevos, añade lo nuevo y marca obsoleto lo quemado.
    """
    eventos = [e for e in home.hippo.events() if e.source != _FUENTE]   # solo lo crudo: el sueño no se sueña a sí misma
    if not eventos:
        return {"personas": 0, "escenas": 0, "informe": "mente vacía"}
    vectores = np.stack([home.hippo.vector(e.id) for e in eventos])
    corpus = [e.text for e in eventos]
    nacidas: list[tuple[Event, list[str]]] = [
        (_tarjeta_persona(p, evs, corpus), [e.id for e in evs])
        for p, evs in sorted(_personas(eventos).items())]
    for grupo in _escenas(eventos, vectores):
        producidas = [eventos[i] for i in grupo]
        nacidas.append((_tarjeta_escena(producidas, corpus), [e.id for e in producidas]))
    nacidas.sort(key=lambda t: t[0].id)
    antes = len(home.hippo)
    home.ingest([tarjeta for tarjeta, _ in nacidas])        # el sueño anterior se sincroniza: lo quemado se obsoleta
    for tarjeta, producers in nacidas:                      # sin mentir: si mueres los datos, muere lo derivado
        for p in producers:
            home.hippo.link(tarjeta.id, p)
    informe = _informe(nacidas, antes, len(home.hippo))
    informe["ts"] = max(e.ts for e in eventos)
    informe["sha256"] = hashlib.sha256("".join(t.id for t, _ in nacidas).encode()).hexdigest()
    # Y lo que se repite: las tareas que el creador vuelve a encargar y que pueden
    # convertirse en una skill. Esto propone; la skill la escribe el usuario.
    from .repeticion import proponer
    informe["repeticiones"] = proponer(home)
    return informe
