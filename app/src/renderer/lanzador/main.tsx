// El lanzador: Esme desde cualquier sitio con un atajo (Ctrl+Mayús+Espacio). Ventana ligera aparte: no carga la app
// entera, así aparece al instante. Viste la misma piel que la app (comparten almacenamiento).
import '@fontsource-variable/geist'
import '@fontsource-variable/bodoni-moda'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/esme.css'
import { PIEL_BASE, validarPiel } from '../tinta/piel'
import { vestirApp } from '../tinta/vestir'
import { Lanzador } from './Lanzador'

const cargar = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(`esme:${k}`); return v === null ? d : (JSON.parse(v) as T) } catch { return d } }
const vestir = () => {
  const h = cargar<{ actual?: unknown }>('pieles', {})
  const v = validarPiel(h.actual ?? PIEL_BASE)
  vestirApp(v.ok ? v.piel : PIEL_BASE, cargar<'noche' | 'dia'>('tema', 'noche'))
}
vestir()
window.addEventListener('storage', vestir)   // si cambias de piel en la app, el lanzador la sigue
createRoot(document.getElementById('root')!).render(<StrictMode><Lanzador /></StrictMode>)
