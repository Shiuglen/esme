import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], build: { rollupOptions: { input: { index: resolve('src/main/index.ts'), 'pty-host': resolve('src/main/pty-host.ts') } } } },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: { root: 'src/renderer', plugins: [react()], build: { rollupOptions: { input: resolve('src/renderer/index.html') } } },
})
