// Laboratorio (solo desarrollo; no entra en la build: electron.vite.config solo empaqueta index.html).
// Pinta piezas de Esme sueltas en un navegador que sí recibe fotogramas: la ventana de Electron, si está tapada en el
// escritorio, no los recibe (Wayland no manda frame callbacks a superficies ocultas) y el lienzo y las animaciones no avanzan.
// Datos: si existe ./datos/atlas.json (copia de data/mente_v2/atlas.json, ignorada por git) usa tu mente real;
// si no, una mente sintética. Uso: http://localhost:5173/laboratorio.html?tema=dia
import '@fontsource-variable/funnel-sans'
import '@fontsource-variable/jetbrains-mono'
import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import type { Atlas } from '../lib/brain'
import { RedNeuronal, type RedHandle } from '../memoria/RedNeuronal'
import { FondoVivo } from '../shell/FondoVivo'
import '../styles/esme.css'

const reales = import.meta.glob<{ atlas: Atlas }>('./datos/atlas.json', { eager: true, import: 'default' })

/** Una mente inventada pero creíble: 6 temas, 360 recuerdos en 20 días, un tercio dichos por una IA. */
function sintetica(): Atlas {
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const temas = ['diseño', 'memoria', 'motores', 'tienda', 'seguridad', 'voz']
  const clusters = temas.map((label, id) => ({ id, label, x: Math.cos(id) * 4, y: Math.sin(id * 1.7) * 3, size: 60 }))
  const hoy = Date.now()
  const points = Array.from({ length: 360 }, (_, i) => {
    const c = clusters[i % 6]
    return { id: `p${i}`, x: c.x + (r() - 0.5) * 2.4, y: c.y + (r() - 0.5) * 2.4, h: r(), cluster: c.id, kind: r() < 0.33 ? 'ai_msg' : 'note', source: 'sintetica',
      ts: new Date(hoy - r() * 20 * 864e5).toISOString(), trust: 0 }
  }).map((p) => ({ ...p, trust: p.kind === 'ai_msg' ? 0.4 : 0.8 }))
  return { points, clusters }
}

function Lab() {
  const tema = new URLSearchParams(location.search).get('tema') === 'dia' ? 'dia' : 'noche'
  document.documentElement.dataset.theme = tema
  const atlas = Object.values(reales)[0]?.atlas ?? sintetica()
  const red = useRef<RedHandle>(null)
  useEffect(() => {
    // para probar desde fuera: __lab.encender() enciende 25 recuerdos como si Esme los recordara
    Object.assign(window, { __lab: { encender: () => red.current?.encender(atlas.points.slice(0, 25).map((p) => p.id)), puntos: atlas.points.length } })
  }, [atlas])
  return (
    <div className="h-screen w-screen overflow-hidden bg-papel text-texto">
      <FondoVivo tema={tema} estado="reposo" />
      <div className="relative z-10 h-full"><RedNeuronal ref={red} atlas={atlas} tema={tema} recordados={[]} onPick={() => {}} /></div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Lab />)
