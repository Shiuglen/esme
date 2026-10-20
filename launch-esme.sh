#!/bin/bash
# Lanzador de ESME (Daimon) — abre la app de escritorio.
# Este script es el que ejecuta el icono ESME del menú de aplicaciones (~/.local/share/applications/esme.desktop).
# Registro de cada arranque: ~/.esme-escritorio.log
cd /home/sakai/Daimon/app || exit 1
# x11: estable en tu sesión GNOME/Wayland. no-sandbox: Ubuntu bloquea el sandbox de Chromium sin setuid.
exec ./node_modules/.bin/electron . --ozone-platform=x11 --no-sandbox "$@" > "$HOME/.esme-escritorio.log" 2>&1
