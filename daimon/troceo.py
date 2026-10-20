"""El troceo del conocimiento: el MISMO que el módulo esme.nucleo.troceo-pro (TypeScript).

El hallazgo del 12-oct: la búsqueda solo-semántica acertaba en unas preguntas y fallaba en otras porque
las tablas y los fragmentos largos iban enteros. La regla nueva: apartados por cabecera, párrafos aparte, y
tablas por FILAS.

Antes este troceo era una ventana de 160 palabras: la tabla entera entraba como un bloque y nunca pasaba el
presupuesto. Aquí la tabla entra POR FILAS, que es lo que el juez midió (+0,750 de recall).

ESPEJO de `core/mind/troceo.ts` (el kit): los dos tienen que sacar los MISMOS trozos, byte a byte. El test
de conformidad del kit lo comprueba (`tests/troceo-conformidad.test.ts`).

Referencia: docs/PRUEBA-0.md, el módulo esme.nucleo.troceo-pro y su bench.json.
"""
from __future__ import annotations

import math
import re
import unicodedata
from dataclasses import dataclass

CABECERA = re.compile(r"^(#{1,6})\s+(.+)$")


@dataclass
class Trozo:
    """Una unidad que la Lente sí encuentra."""

    id: str
    fuente: str  # fichero de origen + ancla de sección
    texto: str
    tokens: int  # presupuesto medido: 4 chars equivalen a ~1 token
    tipo: str  # parrafo | fila-tabla


def slug(t: str) -> str:
    """El ancla de una sección: sin acentos, sin símbolos, en minúsculas."""
    plano = unicodedata.normalize("NFD", t.lower())
    plano = re.sub(r"[̀-ͯ]", "", plano)
    plano = re.sub(r"[^a-z0-9]+", "-", plano).strip("-")
    return plano or "sin-titulo"


def _tokens(texto: str) -> int:
    return math.ceil(len(texto) / 4)


def trocea(fuente: str, markdown: str) -> list[Trozo]:
    """Trocea un documento markdown en unidades que la Lente sí encuentra."""
    trozos: list[Trozo] = []
    seccion = "inicio"
    apartado: list[str] = []
    tabla: list[str] = []

    def cierra_apartado() -> None:
        nonlocal apartado
        if apartado:
            texto = " ".join(apartado).strip()
            if texto:
                trozos.append(
                    Trozo(
                        id="",
                        fuente=f"{fuente}#{slug(seccion)}",
                        texto=texto,
                        tokens=_tokens(texto),
                        tipo="parrafo",
                    )
                )
            apartado = []

    def cierra_tabla() -> None:
        nonlocal tabla
        for i, linea in enumerate(tabla):
            texto = linea.strip()
            if not texto or texto.startswith("|---"):
                continue  # el separador de cabecera no es el oro de nadie
            trozos.append(
                Trozo(
                    id="",
                    fuente=f"{fuente}#{slug(seccion)}@fila{i}",
                    texto=texto,
                    tokens=_tokens(texto),
                    tipo="fila-tabla",
                )
            )
        tabla = []

    for linea in markdown.split("\n"):
        cabecera = CABECERA.match(linea)
        if cabecera:
            cierra_tabla()
            cierra_apartado()
            seccion = cabecera.group(2).strip()
            continue
        if linea.strip().startswith("|"):
            cierra_apartado()
            tabla.append(linea)
            continue
        if not linea.strip():
            cierra_tabla()
            cierra_apartado()
            continue
        # texto suelto fuera de tabla: se acumula para no romper sus frases
        cierra_tabla()
        apartado.append(linea)

    cierra_tabla()
    cierra_apartado()

    return [Trozo(id=f"{fuente}:{i}", fuente=t.fuente, texto=t.texto, tokens=t.tokens, tipo=t.tipo) for i, t in enumerate(trozos)]
