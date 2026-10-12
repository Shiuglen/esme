// Modo web: el mismo renderer en el navegador, hablando directo con el cerebro local (para verificar y para la futura versión web)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({ root: 'src/renderer', plugins: [react(), tailwindcss()], server: { port: 5173, strictPort: true, host: '127.0.0.1' } })
