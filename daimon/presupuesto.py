"""El presupuesto: lo que el espejo puede gastar sin que la máquina se muera.

El 21-oct-2026 el escritorio entero murió de un OOM y se llevó por delante al Shell de GNOME.
La causa no fue la suerte: el espejo lanzaba el análisis de REA sin ningún tope y con tres fallos
que se sumaban:

  1. la salida de REA se guardaba **entera en la memoria** (`capture_output=True`): el sobre JSON
     lived en bytes, luego en texto y luego en el diccionario del analizador, tres veces lo mismo;
  2. el proceso hijo no tenía **límite de memoria**: Ghidra (una JVM) crecía hasta que el sistema
     decidía matar a alguien — y eligió al Shell;
  3. el fin de tiempo mataba al padre, pero los hijos de Ghidra y de `npx` seguían vivos como
     huérfanos, comiendo CPU sin que nadie los esperara.

Aquí vive el gobernador, y son cuatro cosas:

  · un **suelo de memoria**: si la máquina va justa, el espejo dice que no y espera, en vez de
    decidir quién muere;
  · un **vigilante** que mide la memoria del grupo de procesos y lo para si se pasa del tope;
  · un **cerrojo de máquina**: un análisis a la vez, ni entre la terminal, ni el servidor, ni la
    app (es un cerrojo de hilo *y* de fichero, con `flock`);
  · el fin de tiempo **mata al grupo entero**, no sólo al padre.

Las medidas se pueden mover por entorno (`DAIMON_REA_MIN_MEM_MB`, `DAIMON_REA_MAX_MEM_MB`) sin
tocar el código: quien tiene una máquina grande sube los topes, quien tiene una pequeña los baja.
"""
from __future__ import annotations

import contextlib
import errno
import fcntl
import os
import signal
import threading
import time
from pathlib import Path

PAGINA = os.sysconf("SC_PAGE_SIZE") if hasattr(os, "sysconf") else 4096

_MB = 1024 * 1024
_GIB = 1024 * _MB


class Ocupado(RuntimeError):
    """Ya hay un análisis en marcha: la máquina no puede con dos a la vez."""


class PresupuestoInsuficiente(RuntimeError):
    """No hay memoria libre para empezar; empezar sería matar a otra cosa."""


# ── la memoria de la máquina ───────────────────────────────────────────────────────────────────

def _lee_meminfo() -> dict[str, int]:
    """Lo que dice /proc/meminfo, en bytes. Si no se puede leer, no se inventa nada."""
    datos: dict[str, int] = {}
    try:
        for linea in Path("/proc/meminfo").read_text().splitlines():
            clave, _, resto = linea.partition(":")
            campos = resto.split()
            if campos and campos[0].isdigit():
                datos[clave] = int(campos[0]) * 1024
    except (OSError, ValueError):
        pass
    return datos


def memoria_disponible() -> int:
    """Memoria que se puede usar ahora mismo sin.swap (bytes). 0 si no se sabe."""
    return _lee_meminfo().get("MemAvailable", 0)


def memoria_total() -> int:
    """Memoria total de la máquina (bytes). 0 si no se sabe."""
    return _lee_meminfo().get("MemTotal", 0)


def _mb_de_entorno(nombre: str, defecto: int) -> int:
    valor = os.environ.get(nombre, "")
    return int(valor) if valor.isdigit() and int(valor) > 0 else defecto


def suelo_memoria() -> int:
    """Cuánta memoria libre hay que dejar antes de mirar un programa.

    Por defecto 4 GiB, pero nunca más de un tercio de la máquina: en un portátil de 8 GiB el
    espejo no puede gastarse 4 GiB, porque lo que hay al lado (el modelo, la app) lo necesita.
    """
    base = _mb_de_entorno("DAIMON_REA_MIN_MEM_MB", 4096) * _MB
    total = memoria_total()
    return min(base, total // 3) if total else base


def tope_memoria() -> int:
    """Cuánta memoria puede usar el análisis como mucho (bytes).

    Por defecto 4 GiB, y nunca más de la cuarta parte de la máquina (con un mínimo de 1 GiB,
    para que un equipo pequeño todavía pueda mirar algo).
    """
    base = _mb_de_entorno("DAIMON_REA_MAX_MEM_MB", 4096) * _MB
    total = memoria_total()
    return min(base, max(1 * _GIB, total // 4)) if total else base


def hay_suelo() -> tuple[bool, str]:
    """¿Se puede empezar ahora? Devuelve el porqué cuando no."""
    libre = memoria_disponible()
    suelo = suelo_memoria()
    if not libre or not suelo:
        return True, ""                      # no se sabe: no se bloquea por ignorancia
    if libre < suelo:
        return False, (f"la máquina tiene {libre // _MB} MiB libres y el análisis necesita "
                       f"{suelo // _MB} MiB: cierra lo que puedas y vuelve a intentarlo")
    return True, ""


# ── medir lo que usa el grupo de procesos ─────────────────────────────────────────────────────

def _stat(pid: str) -> tuple[int, int] | None:
    """(grupo de procesos, memoria residente en bytes) de un pid, leído de /proc/<pid>/stat."""
    try:
        texto = Path(f"/proc/{pid}/stat").read_text()
    except (OSError, ValueError):
        return None
    corte = texto.rfind(")")
    if corte < 0:
        return None
    campos = texto[corte + 2:].split()
    try:
        # tras el cierre del nombre: campos[0]=estado, campos[2]=grupo, campos[21]=rss (en páginas)
        return int(campos[2]), int(campos[21]) * PAGINA
    except (IndexError, ValueError):
        return None


def _hijos(pid: int) -> list[int]:
    """Los hijos directos de un proceso (Linux: `/proc/<pid>/task/<tid>/children`)."""
    try:
        texto = Path(f"/proc/{pid}/task/{pid}/children").read_text()
    except (OSError, ValueError):
        return []
    return [int(x) for x in texto.split() if x.isdigit()]


def descendientes(pid: int) -> list[int]:
    """Todos los que cuelgan de un proceso, **aunque se hayan desanclado**.

    Esto importa: Ghidra arranca su JVM en su propia sesión, así que deja de estar en el grupo
    del proceso REA. Si sólo se mira el grupo, la JVM es invisible —y es la que se come la
    memoria—. Por el camino de los hijos se la encuentra igual.
    """
    vistos: set[int] = set()
    pendientes = [pid]
    while pendientes:
        actual = pendientes.pop()
        for hijo in _hijos(actual):
            if hijo not in vistos:
                vistos.add(hijo)
                pendientes.append(hijo)
    return sorted(vistos)


def _rss(pid: int) -> int:
    """La memoria residente de un proceso (bytes)."""
    estado = _stat(str(pid))
    return estado[1] if estado else 0


def pids_del_grupo(pgid: int) -> set[int]:
    """Los procesos que están en ese grupo de procesos."""
    fuera: set[int] = set()
    try:
        candidatos = os.listdir("/proc")
    except OSError:
        return fuera
    for pid in candidatos:
        if not pid.isdigit():
            continue
        estado = _stat(pid)
        if estado and estado[0] == pgid:
            fuera.add(int(pid))
    return fuera


def memoria_del_grupo(pgid: int) -> int:
    """La memoria que usan **todos** los procesos del grupo (el hijo y los que el haya spawned)."""
    return sum(_rss(pid) for pid in pids_del_grupo(pgid))


def _mata(pid: int, sig: int) -> None:
    try:
        os.kill(pid, sig)
    except (ProcessLookupError, PermissionError, OSError):
        pass


def _vive(pid: int) -> bool:
    return Path(f"/proc/{pid}").exists()


def mata_grupo(pgid: int, *, espera: float = 3.0) -> None:
    """Mata al grupo entero: primero con sudad, luego sin ella.

    Esto es lo que faltaba: el fin de tiempo mataba al padre y dejaba a los hijos de Ghidra
    huérfanos, que se quedaban comiendo CPU hasta que el sistema los mataba por OOM.
    """
    try:
        os.killpg(pgid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError, OSError):
        return
    fin = time.monotonic() + espera
    while time.monotonic() < fin:
        if not memoria_del_grupo(pgid):
            return
        time.sleep(0.2)
    try:
        os.killpg(pgid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError, OSError):
        pass


def mata_todo(pgid: int, pids: set[int] | None = None, *, espera: float = 3.0) -> None:
    """Mata al grupo **y** a los que se han desanclado de él.

    El grupo no basta: Ghidra arranca su JVM en su propia sesión y `killpg` no la alcanza. Sin
    esto, el fin de tiempo del espejo dejaba la JVM comiendo memoria y CPU como huérfana —que
    es exactamente como se murió el escritorio el 21-oct-.
    """
    sueltos = {int(p) for p in (pids or set())}
    for pid in sueltos:
        _mata(pid, signal.SIGTERM)
    try:
        os.killpg(pgid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError, OSError):
        pass
    fin = time.monotonic() + espera
    while time.monotonic() < fin:
        if not memoria_del_grupo(pgid) and not any(_vive(p) for p in sueltos):
            return
        time.sleep(0.2)
    for pid in sueltos:
        if _vive(pid):
            _mata(pid, signal.SIGKILL)
    try:
        os.killpg(pgid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError, OSError):
        pass


class Vigilante:
    """Mide la memoria del análisis mientras corre y dice si se pasó.

    No se usa `RLIMIT_AS` a propósito: la JVM reserva espacio de direcciones virtuales que no
    son memoria real, y un límite de espacio virtual la mataría al arrancar. Lo que se mide es
    la memoria residente de verdad, que es la que mata al escritorio.

    Se mide el grupo **y** los descendientes sueltos (la JVM de Ghidra se desancla): medir sólo
    el grupo daba 19 MiB cuando la JVM estaba usando cientos.
    """

    def __init__(self, pgid: int, tope: int, intervalo: float = 0.5) -> None:
        self.pgid = pgid
        self.tope = tope
        self.intervalo = intervalo
        self.excedido = False
        self.pico = 0
        self.vistos: set[int] = set()
        self._para = threading.Event()
        self._hilo: threading.Thread | None = None

    def _mide(self) -> None:
        while not self._para.wait(self.intervalo):
            pids = pids_del_grupo(self.pgid)
            pids.update(descendientes(self.pgid))
            self.vistos |= pids
            total = sum(_rss(pid) for pid in pids)
            if total > self.pico:
                self.pico = total
            if total > self.tope:
                self.excedido = True
                mata_todo(self.pgid, self.vistos, espera=0.5)
                return

    def __enter__(self) -> "Vigilante":
        self._hilo = threading.Thread(target=self._mide, name="vigilante-rea", daemon=True)
        self._hilo.start()
        return self

    def __exit__(self, *_exc) -> None:
        self._para.set()
        if self._hilo:
            self._hilo.join(timeout=2)


# ── un análisis a la vez, en toda la máquina ──────────────────────────────────────────────────

_CANDADO_HILO = threading.Lock()
_ESTADO = threading.local()


def ruta_candado() -> Path:
    """Dónde vive el cerrojo de máquina (se puede mover con `DAIMON_CACHE`)."""
    base = os.environ.get("DAIMON_CACHE", "")
    carpeta = Path(base).expanduser() if base else Path.home() / ".cache" / "daimon"
    return carpeta / "rea.lock"


@contextlib.contextmanager
def candado(espera: float = 0.0):
    """Un análisis a la vez: en este proceso y en todos los demás de la máquina.

    El cerrojo de hilo serializa las peticiones dentro del proceso (la app, el servidor); el de
    fichero (`flock`) serializa entre procesos distintos (la terminal, el servidor, la app), que
    es donde se acumulaban los tres REA que mataron el escritorio.

    `espera` son los segundos que se espera a que el otro termine; 0 significa «si está ocupado,
    dilo y no empieces».

    Es **reentrante**: el mismo hilo que ya lo tiene puede volver a tomarlo sin volverse a
    esperar contra sí mismo. Así una comparación (que analiza dos versiones) no suelta la
    máquina entre medias, y el análisis de dentro sigue siendo la misma puerta de siempre.
    """
    if getattr(_ESTADO, "candado", 0) > 0:
        _ESTADO.candado += 1
        try:
            yield
        finally:
            _ESTADO.candado -= 1
    else:
        fin = time.monotonic() + max(0.0, espera)
        if not _CANDADO_HILO.acquire(timeout=max(0.001, espera if espera > 0 else 0.001)):
            raise Ocupado("ya hay un análisis en marcha")
        fd = None
        try:
            ruta = ruta_candado()
            ruta.parent.mkdir(parents=True, exist_ok=True)
            fd = os.open(ruta, os.O_RDWR | os.O_CREAT, 0o600)
            while True:
                try:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except OSError as exc:
                    if exc.errno not in (errno.EACCES, errno.EAGAIN):
                        raise
                    if time.monotonic() >= fin:
                        raise Ocupado("ya hay un análisis en marcha") from None
                    time.sleep(0.2)
            os.ftruncate(fd, 0)
            os.write(fd, f"{os.getpid()}\n".encode())
            _ESTADO.candado = 1
            try:
                yield
            finally:
                _ESTADO.candado = 0
        finally:
            if fd is not None:
                try:
                    fcntl.flock(fd, fcntl.LOCK_UN)
                except OSError:
                    pass
                os.close(fd)
            _CANDADO_HILO.release()
