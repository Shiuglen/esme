#!/usr/bin/env python3
"""Publicar Esme: primero PyPI, después el Registro oficial de MCP.

Son dos pasos y son del creador (los dos necesitan su cuenta), pero todo lo demás —el
nombre del paquete, la versión, la entrada del registro, el `mcp-name` del README— ya
está comprobado. Este script dice exactamente qué falta en cada momento, en vez de
fallar a mitad.

    python3 scripts/publicar.py            → dice qué falta (no publica nada)
    python3 scripts/publicar.py --pypi     → sube el paquete a PyPI (necesita tu cuenta)
    python3 scripts/publicar.py --registro → publica la entrada (necesita REGISTRY_TOKEN)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PYPROJECT = RAIZ / "pyproject.toml"
SERVER_JSON = RAIZ / "mcp" / "server.json"
README = RAIZ / "README.md"


def version() -> str:
    m = re.search(r'^version\s*=\s*"([^"]+)"', PYPROJECT.read_text(encoding="utf-8"), re.M)
    return m.group(1) if m else "?"


def nombre() -> str:
    m = re.search(r'^name\s*=\s*"([^"]+)"', PYPROJECT.read_text(encoding="utf-8"), re.M)
    return m.group(1) if m else "?"


def entrada() -> dict:
    return json.loads(SERVER_JSON.read_text(encoding="utf-8"))


def comprobaciones() -> list[str]:
    """Lo que tiene que estar en su sitio antes de publicar. Devuelve los fallos."""
    fallos = []
    e = entrada()
    v = version()
    if e.get("version") != v:
        fallos.append(f"la entrada del registro dice {e.get('version')} y el paquete es {v}")
    paquete = e.get("packages", [{}])[0] if e.get("packages") else {}
    if paquete.get("identifier") != nombre():
        fallos.append(f"la entrada apunta a «{paquete.get('identifier')}» y el paquete se llama «{nombre()}»")
    if not any(p.get("registryType") == "pypi" for p in e.get("packages", [])):
        fallos.append("la entrada no declara un paquete de PyPI")
    # el registro exige la línea «mcp-name» en el README del paquete
    if "mcp-name:" not in README.read_text(encoding="utf-8"):
        fallos.append("el README no lleva la línea «mcp-name: <nombre de la entrada>» (el registro la exige)")
    if not (RAIZ / "LICENSE").exists():
        fallos.append("falta el fichero LICENSE (la entrada promete MIT)")
    return fallos


def construir() -> bool:
    print("· construyendo el paquete…")
    r = subprocess.run([sys.executable, "-m", "build"], cwd=RAIZ, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-1500:]); print(r.stderr[-1500:])
        return False
    for f in sorted((RAIZ / "dist").glob("*")):
        print(f"  · {f.name} ({f.stat().st_size // 1024} KB)")
    return True


def pypi() -> int:
    fallos = comprobaciones()
    if fallos:
        print("❌ Antes de subir nada:")
        for f in fallos:
            print("   ·", f)
        return 1
    if not construir():
        return 1
    if not (os.environ.get("TWINE_USERNAME") or (Path.home() / ".pypirc").exists()):
        print("""
Para subirlo a PyPI hace falta tu cuenta:
  1. Crea la cuenta en https://pypi.org/manage/account/ (con 2FA).
  2. Crea un token «pypi-…» en https://pypi.org/manage/account/token/.
  3. Exporta TWINE_USERNAME=__token__ y TWINE_PASSWORD=pypi-… y ejecuta:
       python3 scripts/publicar.py --pypi
""")
        return 1
    # twine es la herramienta de subida. Se busca en el Python actual y en el PATH (por si
    # la instaló con pipx): no se instala nada dentro del proyecto sin que lo pidas.
    tiene_twine = subprocess.run([sys.executable, "-c", "import twine"], capture_output=True).returncode == 0
    en_path = subprocess.run(["which", "twine"], capture_output=True).returncode == 0
    if not (tiene_twine or en_path):
        print("Falta twine (la herramienta de subida). Sin tocar el proyecto:")
        print("   pipx install twine     # o: python3 -m pip install --user twine")
        print("y vuelve a ejecutar: python3 scripts/publicar.py --pypi")
        return 1
    comando = [sys.executable, "-m", "twine"] if tiene_twine else ["twine"]
    r = subprocess.run(comando + ["upload", "dist/*"], cwd=RAIZ, capture_output=True, text=True)
    print(r.stdout[-2000:] or r.stderr[-2000:])
    if r.returncode == 0:
        print(f"✅ {nombre()} {version()} está en PyPI.")
        print("   Ahora: node mcp/publicar.mjs --publicar  (con REGISTRY_TOKEN)")
    return r.returncode


def registro() -> int:
    if not os.environ.get("REGISTRY_TOKEN"):
        print("""
Para publicar en el Registro oficial de MCP:
  1. Entra en https://registry.modelcontextprotocol.io con tu cuenta de GitHub y pide un token.
  2. export REGISTRY_TOKEN=… y ejecuta:
       node mcp/publicar.mjs --publicar
  (la entrada remota, para las mentes que ya están en marcha, es:
       node mcp/publicar.mjs remoto --publicar )
""")
        return 1
    r = subprocess.run(["node", "mcp/publicar.mjs", "--publicar"], cwd=RAIZ, capture_output=True, text=True)
    print(r.stdout[-2000:] or r.stderr[-2000:])
    return r.returncode


def estado() -> int:
    e = entrada()
    fallos = comprobaciones()
    print(f"Paquete: {nombre()} {version()}")
    print(f"Entrada: {e.get('name')} ({e.get('version')})")
    print(f"Licencia: {'LICENSE presente' if (RAIZ / 'LICENSE').exists() else 'FALTA LICENSE'}")
    print(f"mcp-name en el README: {'sí' if 'mcp-name:' in README.read_text(encoding='utf-8') else 'NO'}")
    if fallos:
        print("\n❌ Falta:")
        for f in fallos:
            print("   ·", f)
        return 1
    print("\n✅ Todo en su sitio. Sólo faltan tus dos cuentas (PyPI y el registro).")
    return 0


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--pypi" in args:
        sys.exit(pypi())
    if "--registro" in args:
        sys.exit(registro())
    sys.exit(estado())
