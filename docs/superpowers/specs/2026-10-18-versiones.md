# Las versiones de Esme: Linux, Windows y macOS (18 oct 2026)

**Qué pidió el creador:** que al final Esme se pueda instalar en todos los sistemas (Linux, Windows, macOS; iOS con xtool más adelante), sin límites.

## Qué hay que resolver
Hoy Esme solo funciona en el equipo del creador: busca el cerebro en `~/Daimon/.venv` y la memoria en `~/Daimon/data/mente_v2`.
Una versión instalable tiene que llevar **todo dentro**: la app (Electron) y el cerebro (Python con sus paquetes).

## Decisiones
1. **Rutas en un solo sitio** (`main/rutas.ts`, con tests). En desarrollo, todo sigue como hoy. En la versión
   instalada: el cerebro está en `resources/cerebro/` y la memoria en la carpeta de datos del sistema
   (`app.getPath('userData')/mente`). Se pueden forzar con `DAIMON_ROOT` y `DAIMON_HOME`.
2. **El cerebro viaja con su propio Python**: un Python autónomo (python-build-standalone, vía `uv`) y sus paquetes
   instalados para el sistema de destino (`uv pip install --python-platform …`), así que se puede preparar el cerebro de
   Windows o de macOS desde Linux. Sin depender del Python del usuario.
3. **Los modelos de voz no van dentro** (Whisper ~460 MB, Piper ~60 MB): se descargan la primera vez que hablas, en la
   carpeta de datos. El instalador pesa menos y la voz sigue siendo local.
4. **Empaquetado con electron-builder**: Linux AppImage y .deb; Windows instalador NSIS; macOS .dmg (arm64 y x64).
   Sin firmar al principio (Windows avisará con SmartScreen; macOS pedirá «Abrir de todos modos»); firmar después.
5. **Compilar en cada sistema con GitHub Actions** (repo privado `Shiuglen/esme`): una matriz Linux / Windows / macOS
   que deja los instaladores como artefactos. En local se compila Linux.

## Orden
1. `rutas.ts` + cerebro empaquetado + AppImage de Linux que arranca en limpio (sin `~/Daimon`). *(ahora)*
2. Windows y macOS en GitHub Actions.
3. Actualizaciones automáticas (electron-updater) y firma.
4. iOS (xtool): Esme como compañera del escritorio, no como copia entera.
