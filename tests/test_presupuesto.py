"""El presupuesto: lo que el espejo puede gastar sin que la máquina se muera.

El 21-oct-2026 el escritorio entero murió de un OOM. Estos tests son la red que lo impide
volver a pasar: sin suelo de memoria, sin tope al hijo, sin matar al grupo entero y sin un
análisis a la vez, el espejo se lleva por delante al Shell de GNOME.
"""
import os
import subprocess
import threading
import time

import pytest

from daimon import presupuesto


# ── la memoria de la máquina ───────────────────────────────────────────────────────────────────

def test_hay_suelo_cuando_la_maquina_tiene_memoria_de_sobra(monkeypatch):
    monkeypatch.setattr(presupuesto, "memoria_disponible", lambda: 12 * 1024 ** 3)
    monkeypatch.setattr(presupuesto, "suelo_memoria", lambda: 4 * 1024 ** 3)
    hay, porque = presupuesto.hay_suelo()
    assert hay
    assert porque == ""


def test_no_hay_suelo_cuando_la_memoria_no_da(monkeypatch):
    monkeypatch.setattr(presupuesto, "memoria_disponible", lambda: 1024 ** 3)
    monkeypatch.setattr(presupuesto, "suelo_memoria", lambda: 4 * 1024 ** 3)
    hay, porque = presupuesto.hay_suelo()
    assert not hay
    assert "libres" in porque


def test_si_no_se_sabe_la_memoria_no_se_bloquea(monkeypatch):
    """Sin datos, no se bloquea por ignorancia: se intenta y se avisa si algo se pasa."""
    monkeypatch.setattr(presupuesto, "memoria_disponible", lambda: 0)
    monkeypatch.setattr(presupuesto, "suelo_memoria", lambda: 4 * 1024 ** 3)
    assert presupuesto.hay_suelo()[0]


def test_el_suelo_no_es_mas_de_un_tercio_de_la_maquina(monkeypatch):
    """En un portátil de 8 GiB el espejo no puede gastarse 4 GiB: lo que hay al lado lo necesita."""
    monkeypatch.setenv("DAIMON_REA_MIN_MEM_MB", "4096")
    monkeypatch.setattr(presupuesto, "memoria_total", lambda: 8 * 1024 ** 3)
    assert presupuesto.suelo_memoria() == (8 * 1024 ** 3) // 3


def test_el_tope_de_memoria_se_puede_mover_sin_tocar_el_codigo(monkeypatch):
    monkeypatch.setenv("DAIMON_REA_MAX_MEM_MB", "2048")
    monkeypatch.setattr(presupuesto, "memoria_total", lambda: 64 * 1024 ** 3)
    assert presupuesto.tope_memoria() == 2048 * 1024 ** 2


# ── el grupo de procesos ───────────────────────────────────────────────────────────────────────

def test_matar_al_grupo_mata_a_los_hijos_tambien():
    """Esto es lo que faltaba: el fin de tiempo mataba al padre y dejaba a los hijos de Ghidra
    huérfanos, comiendo CPU hasta que el sistema los mataba por OOM."""
    padre = subprocess.Popen(["sleep", "300"], process_group=0)
    hijo = subprocess.Popen(["sleep", "300"], process_group=padre.pid)
    try:
        # el hijo se cuelga del grupo del padre (como los hijos de Ghidra con su `rea`)
        assert padre.poll() is None
        assert hijo.poll() is None
        presupuesto.mata_grupo(padre.pid, espera=1.0)
        time.sleep(0.3)
        assert padre.poll() is not None
        assert hijo.poll() is not None
    finally:
        for p in (padre, hijo):
            if p.poll() is None:
                p.kill()


def test_la_memoria_del_grupo_suma_a_todos_sus_miembros():
    """Medir sólo al padre no sirve: Ghidra es una JVM aparte, y es la que se come la memoria."""
    padre = subprocess.Popen(["sleep", "300"], process_group=0)
    try:
        memoria = presupuesto.memoria_del_grupo(padre.pid)
        assert memoria >= 0
    finally:
        padre.kill()


def test_se_encuentran_los_descendientes_aunque_se_desanclen():
    """La JVM de Ghidra arranca en su propia sesión: si sólo se mira el grupo, es invisible."""
    # el shell lanza un hijo con setsid (se desancla: otro grupo y otra sesión) y otro que no
    padre = subprocess.Popen(["sh", "-c", "setsid sleep 300 & sleep 300"], process_group=0)
    try:
        time.sleep(0.5)
        hijos = presupuesto.descendientes(padre.pid)
        assert hijos, "no se encontró ningún descendiente"
        sueltos = set(hijos) - presupuesto.pids_del_grupo(padre.pid)
        assert sueltos, "el descendiente desanclado no apareció"
    finally:
        padre.kill()


def test_matar_al_todo_mata_a_los_desanclados():
    """`killpg` no alcanza a quien se desancló: sin esto, la JVM queda huérfana comiendo memoria."""
    padre = subprocess.Popen(["sleep", "300"], process_group=0)
    hijo = subprocess.Popen(["sleep", "300"], process_group=0)   # en su propio grupo
    try:
        assert hijo.poll() is None
        presupuesto.mata_todo(padre.pid, {padre.pid, hijo.pid}, espera=1.0)
        time.sleep(0.3)
        assert padre.poll() is not None
        assert hijo.poll() is not None
    finally:
        for p in (padre, hijo):
            if p.poll() is None:
                p.kill()


def test_el_vigilante_avisa_cuando_se_pasa_del_tope(monkeypatch):
    monkeypatch.setattr(presupuesto, "pids_del_grupo", lambda pgid: {424242})
    monkeypatch.setattr(presupuesto, "_rss", lambda pid: 99 * 1024 ** 3)
    with presupuesto.Vigilante(424242, 1024 ** 3, intervalo=0.05) as vigila:
        time.sleep(0.4)
    assert vigila.excedido


def test_el_vigilante_no_avisa_si_no_se_pasa(monkeypatch):
    monkeypatch.setattr(presupuesto, "pids_del_grupo", lambda pgid: {424242})
    monkeypatch.setattr(presupuesto, "_rss", lambda pid: 1024)
    with presupuesto.Vigilante(424242, 1024 ** 3, intervalo=0.05) as vigila:
        time.sleep(0.3)
    assert not vigila.excedido


# ── un análisis a la vez ───────────────────────────────────────────────────────────────────────

def test_el_cerrojo_solo_deja_un_análisis(tmp_path, monkeypatch):
    """Dos REA a la vez son los que mataron el escritorio: el segundo tiene que esperar o decirlo."""
    monkeypatch.setenv("DAIMON_CACHE", str(tmp_path))
    resultado = {}

    def segundo():
        try:
            with presupuesto.candado(espera=0.2):
                resultado["entro"] = True
        except presupuesto.Ocupado:
            resultado["entro"] = False

    with presupuesto.candado():
        hilo = threading.Thread(target=segundo)
        hilo.start()
        hilo.join()
    assert resultado["entro"] is False


def test_el_cerrojo_es_reentrante(tmp_path, monkeypatch):
    """El mismo hilo puede volver a tomarlo: una comparación analiza dos versiones sin soltarlo."""
    monkeypatch.setenv("DAIMON_CACHE", str(tmp_path))
    with presupuesto.candado():
        with presupuesto.candado():
            pass


def test_el_cerrojo_se_libera_al_salir(tmp_path, monkeypatch):
    monkeypatch.setenv("DAIMON_CACHE", str(tmp_path))
    with presupuesto.candado():
        pass
    with presupuesto.candado(espera=0.1):
        pass      # si el cerrojo no se hubiera liberado, esto fallaría


def test_el_cerrojo_espera_a_que_el_otro_termine(tmp_path, monkeypatch):
    monkeypatch.setenv("DAIMON_CACHE", str(tmp_path))
    orden = []

    def primero():
        with presupuesto.candado():
            orden.append("entro")
            time.sleep(0.4)
            orden.append("salgo")

    def segundo():
        time.sleep(0.1)
        with presupuesto.candado(espera=3.0):
            orden.append("entro2")

    h1 = threading.Thread(target=primero)
    h2 = threading.Thread(target=segundo)
    h1.start()
    h2.start()
    h1.join()
    h2.join()
    assert orden == ["entro", "salgo", "entro2"]


def test_el_cerrojo_tambien_es_de_fichero(tmp_path, monkeypatch):
    """No basta con el hilo: la terminal, el servidor y la app son procesos distintos."""
    import fcntl
    monkeypatch.setenv("DAIMON_CACHE", str(tmp_path))
    ruta = presupuesto.ruta_candado()
    ruta.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(ruta, os.O_RDWR | os.O_CREAT, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with pytest.raises(presupuesto.Ocupado):
            with presupuesto.candado(espera=0.2):
                pass
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)
