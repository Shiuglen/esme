import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], build: { rollupOptions: { input: { index: resolve('src/main/index.ts'), 'pty-host': resolve('src/main/pty-host.ts') } } } },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: { root: 'src/renderer', plugins: [react(), tailwindcss()], build: { rollupOptions: { input: { index: resolve('src/renderer/index.html'), lanzador: resolve('src/renderer/lanzador.html') } } } },
})
