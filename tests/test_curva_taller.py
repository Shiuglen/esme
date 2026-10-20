"""La curva del Taller: la terminal y la app deben dar el mismo número.

El Taller de ejemplo (`tests/fixtures/taller-curva/`) lo leen las dos pruebas: la de Python (este
fichero) y la de la app (`app/src/main/taller/curva-io.test.ts`). Las dos comparan con el mismo
`esperado.json`. Si las reglas se separan —un redondeo, un día, un estado— una de las dos se cae.
"""
from __future__ import annotations

import importlib.util
import json
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
EJEMPLO = RAIZ / "tests" / "fixtures" / "taller-curva"


def _carga_script():
    spec = importlib.util.spec_from_file_location("curva_taller", RAIZ / "scripts" / "curva_taller.py")
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


curva = _carga_script()


def test_la_terminal_y_la_app_dicen_lo_mismo():
    c = curva.curva_de(curva.carga(EJEMPLO))
    esperado = json.loads((EJEMPLO / "esperado.json").read_text(encoding="utf-8"))
    assert c == esperado


def test_el_dia_es_del_creador_y_no_de_utc():
    # Las 23:30 del día 10 son las 23:30 del creador: en UTC pueden ser otro día, y ahí se cae.
    ts = int(datetime(2026, 5, 10, 23, 30).timestamp() * 1000)
    assert curva.dia_de(ts) == "2026-05-10"


def test_los_fallos_son_solo_de_las_tareas_que_estan_en_error():
    c = curva.curva_de(curva.carga(EJEMPLO))
    mensajes = [f["mensaje"] for f in c["fallos"]]
    # t3 está «trabajando» y su registro tiene un fallo: ese no cuenta.
    assert "este fallo no cuenta: la tarea no está en error" not in mensajes
    assert mensajes == ["Internal error", "Authentication required"]
    assert c["fallos"][0]["veces"] == 2


def test_el_coste_del_accierto_solo_cuenta_las_tareas_del_veredicto():
    c = curva.curva_de(curva.carga(EJEMPLO))
    # Hay tres veredictos positivos, pero uno llegó sin tarea: el coste es de los otros dos.
    assert c["veredictos"]["positivos"] == 3
    assert c["costeDelAcierto"] == {"tareas": 2, "tokens": 1550, "coste": 0.0133}


def test_sin_datos_no_hay_curva_pero_no_se_rompe(tmp_path: Path):
    c = curva.curva_de(curva.carga(tmp_path))
    assert c["tareas"] == 0
    assert c["porDia"] == []
    assert c["porMotor"] == []
    assert c["fallos"] == []
    assert c["costeDelAcierto"] is None
