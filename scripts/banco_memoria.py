#!/usr/bin/env python3
"""El banco de la memoria: cuánto cuesta de verdad cada turno, y cuánto de eso es caché.

Palanca: **el número de la caché** (la forma ya está puesta —el prefijo constante—; faltaba la
cifra) y, de paso, **si los números que la app enseña son los que son**.

Mide con los datos reales que la app ya escribe (`uso.jsonl`): cada turno, con sus tokens y con los
de caché. Los precios salen del mismo catálogo que usa el panel de Uso (models.dev).

Las dos rutas de la app **no hablan el mismo idioma** sobre el uso, y ahí está el número:

- **El chat** (`app/src/main/chat.ts`): `entrada` son los tokens **frescos** (los de caché van
  aparte, en `cacheLectura`/`cacheEscritura`).
- **El Taller** (ACP, `app/src/main/motores/sesion-acp.ts`): el ACP manda el **acumulado de la
  sesión** en `inputTokens`, y los leídos de caché van **dentro** de ese acumulado. El Taller resta
  lo ya anotado para sacar el delta.

Y ese delta se infla cuando el contador del motor no es de la sesión: **22 de 99 turnos** del
Taller tienen un salto imposible (más tokens de entrada que la ventana del modelo) y concentran el
**90 % de los tokens de entrada** que la app ha anotado.

Uso:
    python3 scripts/banco_memoria.py [uso.jsonl] [catalogo-modelsdev.json]
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

USO = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/sakai/.config/daimon-app/uso.jsonl")
CATALOGO = Path(sys.argv[2] if len(sys.argv) > 2 else "/home/sakai/.config/daimon-app/catalogo-modelsdev.json")


def n(x: object) -> float:
    return float(x) if isinstance(x, (int, float)) else 0.0


def _normaliza(x: str) -> str:
    return x.split("/")[-1].strip().lower()


def precios(catalogo: dict, proveedor: str, modelo: str) -> tuple[dict, int]:
    """El precio del modelo (entrada, salida, caché) y su ventana de contexto.

    Es la misma búsqueda que hace la app (proveedor+modelo, y si no, el id del modelo en cualquier
    proveedor) y además el **nombre** mostrado, que es como se guarda en el registro de uso.
    """
    def modelos_de(p: dict) -> list[dict]:
        crudos = p.get("modelos") or p.get("models") or []
        if isinstance(crudos, dict):
            crudos = list(crudos.values())
        return [x for x in crudos if isinstance(x, dict)]

    candidatos = [p for p in catalogo.values() if isinstance(p, dict)]
    exacto = next((p for p in candidatos if p.get("id") == proveedor), None)
    orden = ([exacto] if exacto else []) + [p for p in candidatos if p is not exacto]
    for p in orden:
        for m in modelos_de(p):
            if m.get("id") == modelo:
                return m.get("cost") or {}, int((m.get("limit") or {}).get("context") or 0)
    objetivo = _normaliza(modelo)
    for p in orden:
        for m in modelos_de(p):
            if _normaliza(str(m.get("name") or "")) == objetivo or _normaliza(str(m.get("id") or "")) == objetivo:
                return m.get("cost") or {}, int((m.get("limit") or {}).get("context") or 0)
    return {}, 0


def main() -> int:
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    filas = [json.loads(l) for l in USO.read_text(encoding="utf-8").splitlines() if l.strip()]

    por_ruta: dict[str, dict] = defaultdict(lambda: {"turnos": 0, "frescos": 0.0, "cacheLectura": 0.0, "cacheEscritura": 0.0,
                                                     "salida": 0.0, "bill": 0.0, "bill_sin_cache": 0.0, "imposibles": 0, "tokens_imposibles": 0.0})
    filas_detalle = []
    for f in filas:
        ruta = "taller" if f.get("origen") == "taller" else "chat"
        k, m = f.get("proveedor"), f.get("modelo")
        coste, ventana = precios(catalogo, str(k), str(m))
        ci = n(coste.get("input"))
        co = n(coste.get("output"))
        cl = n(coste.get("cache_read")) or ci
        cw = n(coste.get("cache_write")) or ci * 1.25
        entrada = n(f.get("entrada"))
        lectura = n(f.get("cacheLectura"))
        escritura = n(f.get("cacheEscritura"))
        salida = n(f.get("salida"))
        # El chat separa los frescos; el Taller (ACP) los trae dentro del acumulado.
        frescos = entrada if ruta == "chat" else max(0.0, entrada - lectura - escritura)
        a = por_ruta[ruta]
        a["turnos"] += 1
        a["frescos"] += frescos
        a["cacheLectura"] += lectura
        a["cacheEscritura"] += escritura
        a["salida"] += salida
        a["bill"] += (frescos * ci + lectura * cl + escritura * cw + salida * co) / 1e6
        a["bill_sin_cache"] += ((frescos + lectura + escritura) * ci + salida * co) / 1e6
        imposible = bool(ventana) and entrada > ventana
        if imposible:
            a["imposibles"] += 1
            a["tokens_imposibles"] += entrada
        filas_detalle.append({"ruta": ruta, "proveedor": k, "modelo": m, "entrada": entrada, "frescos": frescos,
                              "cacheLectura": lectura, "cacheEscritura": escritura, "salida": salida,
                              "ventana": ventana, "imposible": imposible, "bill": (frescos * ci + lectura * cl + salida * co) / 1e6,
                              "bill_sin_cache": ((frescos + lectura + escritura) * ci + salida * co) / 1e6})

    print("=" * 100)
    print("LA CACHÉ, POR RUTA")
    print("=" * 100)
    for ruta, a in por_ruta.items():
        total_entrada = a["frescos"] + a["cacheLectura"] + a["cacheEscritura"]
        tasa = a["cacheLectura"] / total_entrada if total_entrada else 0.0
        print(f"\n{ruta}: {a['turnos']} turnos")
        print(f"  entrada fresca   {a['frescos']:14,.0f} tokens")
        print(f"  leída de caché   {a['cacheLectura']:14,.0f} tokens  ({tasa:.1%} de la entrada)")
        print(f"  escrita en caché {a['cacheEscritura']:14,.0f} tokens")
        print(f"  salida           {a['salida']:14,.0f} tokens")
        print(f"  factura          {a['bill']:14.4f} $   ·   sin caché: {a['bill_sin_cache']:14.4f} $"
              f"   (el ahorro: {a['bill_sin_cache'] - a['bill']:.4f} $)")

    print("\n" + "=" * 100)
    print("LOS TURNOS IMPOSIBLES (más tokens de entrada que la ventana del modelo)")
    print("=" * 100)
    imp = [f for f in filas_detalle if f["imposible"]]
    if not imp:
        print("ninguno")
    else:
        print(f"{len(imp)} de {len(filas_detalle)} turnos")
        tokens = sum(f["entrada"] for f in imp)
        total = sum(f["entrada"] for f in filas_detalle)
        print(f"tokens de entrada de esos turnos: {tokens:,.0f} de {total:,.0f} ({tokens / total:.1%})")
        print(f"factura imputada a ellos: {sum(f['bill'] for f in imp):.4f} $ de {sum(f['bill'] for f in filas_detalle):.4f} $")
        print("\nlos diez mayores:")
        for f in sorted(imp, key=lambda x: -x["entrada"])[:10]:
            print(f"  {f['entrada']:12,.0f} tokens (ventana {f['ventana']:,}) · {f['proveedor']}/{f['modelo']}")

    print("\n" + "=" * 100)
    print("SI LOS DELTAS INFLADOS NO SE CUENTAN")
    print("=" * 100)
    limpio = [f for f in filas_detalle if not f["imposible"]]
    for etiqueta, grupo in (("todo", filas_detalle), ("sin los imposibles", limpio)):
        ent = sum(f["entrada"] for f in grupo)
        bill = sum(f["bill"] for f in grupo)
        print(f"  {etiqueta:20} turnos={len(grupo):4}  entrada={ent:14,.0f}  factura={bill:.4f} $")

    print("\n(escrito: nada; este script solo mide y no toca nada)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
