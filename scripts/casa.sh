#!/usr/bin/env bash
# El cerrojo de la casa: cuando dos agentes traen su trabajo al repo de casa, uno entra después
# del otro. Sin esto, dos `git commit` a la vez se pisan con «index.lock» y uno se queda con medio
# trabajo: el commit del otro, en un repositorio compartido.
#
# Uso:
#   scripts/casa.sh status
#   scripts/casa.sh pull --rebase
#   scripts/casa.sh commit -am "mensaje"
#   scripts/casa.sh merge rama-del-taller
#
# Espera su turno hasta 5 minutos (ESME_CERROJO_ESPERA, en segundos) y luego avisa: si el cerrojo
# está ocupado, no es un fallo, es que hay otro agente trayendo su trabajo.
set -euo pipefail

RAIZ="${ESME_CASA:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ESPERA="${ESME_CERROJO_ESPERA:-300}"
CERROJO="${ESME_CERROJO:-$RAIZ/.git/esme-casa.lock}"

mkdir -p "$(dirname "$CERROJO")"

exec 9>"$CERROJO"
if ! flock -w "$ESPERA" 9; then
  echo "El cerrojo de la casa está ocupado (esperé ${ESPERA}s). Otro agente está trayendo su trabajo; espera y vuelve a intentarlo." >&2
  exit 75   # EX_TEMPFAIL: reintentar luego, no es un error
fi

cd "$RAIZ"

# ── El commit no se traga el trabajo de otro ────────────────────────────────────────────────────────
# El 20-oct un `git add -A` se llevó 209 líneas del trabajo a medias de otro agente (Paleta.tsx)
# dentro de un commit que no era suyo. Nada se perdió, pero la atribución se falseó: el commit
# decía «anotado en la fuente de verdad» y，里面 había trabajo de otro.
#
# Por eso `commit` **no** usa `add -A`: sólo sube las rutas que le digas, y si hay cambios sin
# subir de OTRO (el árbol tiene algo modificado que no es tuyo), se niega a commitear. La regla
# del contrato («no te metas en lo que es de otro») deja de ser una intención: es un candado.
if [ "${1:-}" = "commit" ]; then
  shift
  SIN_SUBIR="$(git status --porcelain | grep -vE '^[MADRCU?]{1,2} ' || true)"
  # Lo que está en el índice ya es «mío y subido»: la columna 1 del porcelain es el índice y la
  # 2 el árbol de trabajo. Con `awk '$1 != "??"'` lo que ya estaba en el índice salía como
  # «cambio ajeno» y el script se negaba siempre: el candado que protege a los dos agentes
  # impedía trabajar a los dos.
  MODIFICADOS="$(git status --porcelain | awk 'substr($0,2,1) != " " {print $2}' || true)"
  if [ -n "$MODIFICADOS" ]; then
    echo "Hay cambios sin subir en la casa que no son tuyos:" >&2
    git status --porcelain >&2
    echo "Sube sólo lo tuyo con rutas explícitas, o deja esos cambios como están (regla 7 del contrato)." >&2
    exit 76   # EX_PROTOCOL: no es un error de git, es una regla del contrato
  fi
  git commit "$@"
  exit $?
fi

echo "[casa] cerrojo tomado por ${ESME_AGENTE:-un agente} · $(date +%H:%M:%S)" >&2
git "$@"
