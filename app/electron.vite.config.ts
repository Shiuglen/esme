import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  // Los mapas de fuentes: sin ellos, REA no puede emparejar la fuente con el bundle publicado
  // (su señal más fuerte es `source-map-original-path`; medido el 21-oct: sin mapas, los 572
  // elementos de la comparación quedaron `unknown`). Con ellos, Esme puede entender su
  // propio binario, que es lo que hace falta para el bucle absorber → recrear.
  // El código de Esme es público: los mapas no esconden nada que no esté en el repo.
  main: { plugins: [externalizeDepsPlugin()], build: { sourcemap: true, rollupOptions: { input: { index: resolve('src/main/index.ts'), 'pty-host': resolve('src/main/pty-host.ts') } } } },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: { root: 'src/renderer', resolve: { alias: { '@': resolve('src/renderer') } }, plugins: [react(), tailwindcss()], build: { sourcemap: true, rollupOptions: { input: { index: resolve('src/renderer/index.html'), lanzador: resolve('src/renderer/lanzador.html') } } } },
})
