// Laboratorio (solo desarrollo; no entra en la build: electron.vite.config solo empaqueta index.html).
// Pinta piezas de Esme sueltas en un navegador que sí recibe fotogramas: la ventana de Electron, si está tapada en el
// escritorio, no los recibe (Wayland no manda frame callbacks a superficies ocultas) y el lienzo y las animaciones no avanzan.
// Datos: si existe ./datos/atlas.json (copia de data/mente_v2/atlas.json, ignorada por git) usa tu mente real;
// si no, una mente sintética. Uso: http://localhost:5173/laboratorio.html?tema=dia  ·  ?pieza=taller (planta y sellos)
import '@fontsource-variable/funnel-sans'
import '@fontsource-variable/jetbrains-mono'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Atlas } from '../lib/brain'
import type { Curva, TareaTaller } from '../lib/bridge'
import { Chispa } from '../marca/ChispaVista'
import { FirmaMente, Sello } from '../marca/SelloVista'
import { firmaDe, giroSello } from '../marca/sello'
import { Escena } from '../taller/Escena'
import { CurvaTaller } from '../paginas/CurvaTaller'
import { Oficios } from '../taller/Oficios'
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

// Tareas de muestra para la planta: una de cada estado y dos aprobadas (una recién, para ver el sello estamparse).
function tareasDeMuestra(): TareaTaller[] {
  const ahora = Date.now(), base = { motor: 'opencode', motorNombre: 'OpenCode', titulo: 'muestra', turnos: 2, herramientas: 3, cambios: { ficheros: 2, mas: 8, menos: 1 },
    uso: { entrada: 0, salida: 0 }, copia: { repo: '/tmp/demo', rama: 'esme/x' } }
  const t = (id: string, estado: string, extra: object = {}) => ({ ...base, id, estado, inicio: ahora - 600_000 + id.length * 1000, ...extra }) as unknown as TareaTaller
  return [t('a1', 'trabajando'), t('b22', 'esperando', { permiso: { titulo: 'editar' } }), t('c333', 'lista', { aplicada: { cuando: ahora - 60_000, modo: 'carpeta', ficheros: 2 } }),
    t('d4444', 'lista', { aplicada: { cuando: ahora, modo: 'rama', ficheros: 2 } }), t('e55555', 'error'), t('f666666', 'preparando'), t('g7777777', 'parada')]
}

// La curva del Taller, con los números reales del 20-oct: para verla sin abrir la app.
function PiezaCurva() {
  const curva: Curva = {
    tareas: 46,
    estados: { error: 16, lista: 19, parada: 9, trabajando: 2 },
    veredictos: { total: 11, positivos: 7, negativos: 4 },
    porDia: [
      { dia: '2026-10-12', positivos: 1, negativos: 1, aciertos: 0.5 },
      { dia: '2026-10-16', positivos: 0, negativos: 2, aciertos: 0 },
      { dia: '2026-10-17', positivos: 2, negativos: 1, aciertos: 0.667 },
      { dia: '2026-10-18', positivos: 3, negativos: 1, aciertos: 0.75 },
      { dia: '2026-10-20', positivos: 1, negativos: 1, aciertos: 0.5 },
    ],
    porMotor: [
      { motor: 'opencode', tareas: 21, terminadas: 10, error: 3, parada: 8, trabajando: 0, herramientas: 1884, tokens: 2512986, coste: 0, ficheros: 210, veredictos: 8, aciertos: 5, aciertosPorTarea: 0.238, herramientasPorTarea: 89.7, tokensPorTarea: 119666, costePorTarea: 0 },
      { motor: 'qwen-code', tareas: 22, terminadas: 11, error: 10, parada: 1, trabajando: 0, herramientas: 9, tokens: 0, coste: 0, ficheros: 3, veredictos: 3, aciertos: 2, aciertosPorTarea: 0.091, herramientasPorTarea: 0.4, tokensPorTarea: 0, costePorTarea: 0 },
    ],
    fallos: [
      { mensaje: 'Internal error', veces: 7 },
      { mensaje: 'Authentication required: provider authentication required', veces: 3 },
      { mensaje: 'Internal error: Rate limit exceeded. Please try again later.', veces: 2 },
      { mensaje: 'Internal error: getaddrinfo ETIMEOUT opencode.ai', veces: 2 },
    ],
    costeDelAcierto: { tareas: 7, tokens: 1820000, coste: 0 },
  }
  return (
    <div className="h-full overflow-y-auto p-10">
      <div className="mx-auto grid max-w-[720px] gap-6"><CurvaTaller curva={curva} /></div>
    </div>
  )
}


// Los oficios del equipo: los roles que se pueden repartir en una arena.
function PiezaOficios() {
  const roles = [
    { id: 'constructor', nombre: 'Constructor', instruccion: 'Eres quien construye. Haz el encargo entero y deja el código limpio.' },
    { id: 'revisor', nombre: 'Revisor', instruccion: 'Eres quien revisa. No rehaces el trabajo: lo miras con ojo crítico.' },
    { id: 'probador', nombre: 'Probador', instruccion: 'Eres quien prueba. Escribe o ejecuta las pruebas del encargo.' },
    { id: 'explorador', nombre: 'Explorador', instruccion: 'Eres quien explora. Antes de tocar nada, entérate de cómo está hecho.' },
  ]
  const [elegidos, setElegidos] = useState<string[]>(['constructor', 'revisor'])
  return (
    <div className="h-full overflow-y-auto p-10">
      <div className="mx-auto grid max-w-[720px] gap-6">
        <div className="vidrio aurora-foco rounded-4 border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Oficios roles={roles} elegidos={elegidos} onCambiar={setElegidos} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Taller({ atlas, tema }: { atlas: Atlas; tema: string }) {  const [tareas] = useState(tareasDeMuestra)
  return (
    <FirmaMente.Provider value={firmaDe(atlas)}>
      <div className="grid h-full grid-rows-[1fr_auto] gap-4 p-6">
        <Escena tema={tema} tareas={tareas} seleccion={null} resaltada={null} ahora={Date.now()} onElegir={() => {}} onResaltar={() => {}} onNueva={() => {}} />
        <div className="flex items-end gap-6">{[16, 26, 64, 140].map((l) => <Sello key={l} lado={l} giro={giroSello(`m${l}`)} estampar />)}</div>
      </div>
    </FirmaMente.Provider>
  )
}

// La chispa esmeralda nacida del atlas real: tamaños y estados (con dos temas encendidos al recordar).
function PiezaChispa({ atlas }: { atlas: Atlas }) {
  const firma = firmaDe(atlas), dos = new Set(firma.slice(0, 2).map((t) => t.id!))
  return (
    <FirmaMente.Provider value={firma}>
      <div className="grid h-full place-items-center">
        <div className="flex items-end gap-14">
          <Chispa tam={360} estado="reposo" onTema={() => {}} />
          <Chispa tam={200} estado="recordando" encendidas={dos} />
          <div className="grid gap-6"><Chispa tam={64} /><Chispa tam={28} /><Chispa tam={18} /></div>
        </div>
      </div>
    </FirmaMente.Provider>
  )
}

function Lab() {
  const tema = new URLSearchParams(location.search).get('tema') === 'dia' ? 'dia' : 'noche'
  document.documentElement.dataset.theme = tema
  const atlas = Object.values(reales)[0]?.atlas ?? sintetica()
  const red = useRef<RedHandle>(null)
  const pieza = new URLSearchParams(location.search).get('pieza')
  useEffect(() => {
    // para probar desde fuera: __lab.encender() enciende 25 recuerdos como si Esme los recordara
    Object.assign(window, { __lab: { encender: () => red.current?.encender(atlas.points.slice(0, 25).map((p) => p.id)), puntos: atlas.points.length } })
  }, [atlas])
  return (
    <div className="h-screen w-screen overflow-hidden bg-papel text-texto">
      <FondoVivo tema={tema} estado="reposo" />
      <div className="relative z-10 h-full">{pieza === 'chispa' ? <PiezaChispa atlas={atlas} /> : pieza === 'curva' ? <PiezaCurva /> : pieza === 'oficios' ? <PiezaOficios /> : pieza === 'taller' ? <Taller atlas={atlas} tema={tema} /> : <RedNeuronal ref={red} atlas={atlas} tema={tema} recordados={[]} onPick={() => {}} />}</div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Lab />)
