# Qué cambió entre deska-1.32.asar (antes) y deska-1.37.asar (después)

> Comparación hecha con las dos versiones reducidas (lo que el espejo guardó de cada una). deska-1.32.asar (antes): /home/sakai/Applications/estudio-rea/deska-1.32.asar · deska-1.37.asar (después): /home/sakai/Applications/squashfs-root/resources/app.asar

## En una frase

**0 canales nuevos**, **0 canales que se fueron**, **0 funciones nuevas**, **0 funciones que desaparecieron**, **1 ventana nueva**, **2 ventanas que cambiaron sus preferencias** y 0 ficheros que aparecen o desaparecen.

## Los canales IPC

Antes: 0 · ahora: 0

Ningún canal cambió.

## Las funciones

Ninguna función cambió de nombre (con nombres minificados, esto no dice nada: el minificador renombra en cada compilación).

## Las ventanas

Antes: 3 · ahora: 4 (se emparejan por **qué preferencias declaran**, no por sus valores: los valores cambian en cada compilación y harían que todo pareciera nuevo y viejo a la vez).

Ventana nueva (backgroundThrottling, contextIsolation, devTools, nodeIntegration, offscreen, sandbox, session, spellcheck): ['backgroundThrottling=False', 'contextIsolation=True', 'devTools=False', 'nodeIntegration=False', 'offscreen=True', 'sandbox=True', 'session=sessionForPictures()', 'spellcheck=False'].

Ventana que cambió (contextIsolation, enableBlinkFeatures, nodeIntegration, preload, sandbox, webSecurity, webviewTag): antes ['[spread@2977461]=electron.app.isPackaged ? {} : { additionalArguments: [UNPACKAGED_ARG] }', '[spread@2978136]=process.env.DESKA_E2E === "1" ? { backgroundThrottling: false } : {}', 'contextIsolation=True', 'enableBlinkFeatures=BlockingFocusWithoutUserActivation', 'nodeIntegration=False', 'preload=../preload/index.js', 'sandbox=!disableRendererSandbox()', 'webSecurity=True', 'webviewTag=True'] · ahora ['[spread@3500504]=process.env.DESKA_E2E === "1" ? { backgroundThrottling: false } : {}', 'additionalArguments=[...electron.app.isPackaged ? [] : [UNPACKAGED_ARG], ...bootRepairArgs(windowType)]', 'contextIsolation=True', 'enableBlinkFeatures=BlockingFocusWithoutUserActivation', 'nodeIntegration=False', 'preload=../preload/index.js', 'sandbox=!disableRendererSandbox()', 'webSecurity=True', 'webviewTag=True'].
Ventana que cambió (backgroundThrottling, contextIsolation, nodeIntegration, preload, sandbox, webSecurity): antes ['[spread@2623218]=electron.app.isPackaged ? {} : { additionalArguments: [UNPACKAGED_ARG] }', 'backgroundThrottling=False', 'contextIsolation=True', 'nodeIntegration=False', 'preload=../preload/index.js', 'sandbox=True', 'webSecurity=True'] · ahora ['[spread@2994434]=electron.app.isPackaged ? {} : { additionalArguments: [UNPACKAGED_ARG] }', 'backgroundThrottling=False', 'contextIsolation=True', 'nodeIntegration=False', 'preload=../preload/index.js', 'sandbox=True', 'webSecurity=True'].

## Los ficheros y las medidas

Ficheros: antes 1 · ahora 1 · nuevos: ninguno · fuera: ninguno.

Ficheros JavaScript analizados: antes 5 · ahora 6 · hallazgos: antes 623 · ahora 775 · nodos de AST: antes 550253 · ahora 654387.

