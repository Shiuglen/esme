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

mkdirp_dir="$(dirname "$CERROJO")"
mkdir -p "$mkdirp_dir"

exec 9>"$CERROJO"
if ! flock -w "$ESPERA" 9; then
  echo "El cerrojo de la casa está ocupado (esperé ${ESPERA}s). Otro agente está trayendo su trabajo; espera y vuelve a intentarlo." >&2
  exit 75   # EX_TEMPFAIL: reintentar luego, no es un error
fi

cd "$RAIZ"
echo "[casa] cerrojo tomado por ${ESME_AGENTE:-un agente} · $(date +%H:%M:%S)" >&2
git "$@"
