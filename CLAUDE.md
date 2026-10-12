# Esme (repo Daimon)

Antes de trabajar, lee la fuente de verdad del producto: decisiones del creador, estado real y orden de trabajo.

@docs/ESME.md

Al terminar cada paso, actualiza `docs/ESME.md` (estado y aprendizajes) y su copia en el vault (`~/Documentos/Obsidian/Esme-Proyecto.md`).

## Reglas de trabajo aprendidas
- **El creador usa la app mientras se desarrolla.** Antes de reiniciar la app de desarrollo (Electron), comprueba que no haya tareas del Taller en marcha (`window.daimon.taller.lista()` por CDP). Si las hay, espera o avisa. El 12-oct un reinicio dejó «Parada» una tarea suya; su trabajo quedó a salvo en la copia.
- Para verificar lienzos y animaciones usa el laboratorio (`http://localhost:5173/laboratorio.html`, `?tema=dia` para el día) en un Chrome headless propio (`--headless=new`, perfil en el scratchpad, puerto 9444). La ventana de Electron tapada en el escritorio no recibe fotogramas (Wayland), y el panel del navegador sin foco va a 1 fps: ahí las capturas y las medidas mienten.
