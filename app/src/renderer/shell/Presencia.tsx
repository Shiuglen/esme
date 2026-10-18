// La presencia de Esme en el centro de mando, con la forma que elija la piel: la esfera de luz (React Bits), el orbe de
// voz (ElevenLabs UI, 3D) o la cara (agentfaces). Todas muestran lo mismo: en qué está Esme (tinta/estado.ts) y, por voz,
// lo fuerte que hablas tú y lo fuerte que habla ella.
import { lazy, Suspense } from 'react'
import type { EstadoEsme } from '../tinta/estado'
import type { Presencia as TipoPresencia } from '../tinta/piel'
import Orb from '../ui/Orb'
import { SinRomper } from './SinRomper'

const OrbeVoz = lazy(() => import('../ui/voz/orb').then((m) => ({ default: m.Orb })))
const Cara = lazy(() => import('../ui/presencia/agent-face').then((m) => ({ default: m.AgentFace })))

const AL_ORBE = { escuchando: 'listening', hablando: 'talking', pensando: 'thinking', 'te-necesita': null, trabajando: 'thinking', reposo: null } as const
const A_LA_CARA = { escuchando: 'listening', hablando: 'speaking', pensando: 'thinking', 'te-necesita': 'needs-you', trabajando: 'working', reposo: 'idle' } as const

export function Presencia(p: { tipo: TipoPresencia; estado: EstadoEsme; nivelTu: number; nivelElla: number; color: string }) {
  // si una forma falla (la gráfica no puede, un recurso no carga), desaparece y la app sigue
  return <SinRomper clave={p.tipo}><Forma {...p} /></SinRomper>
}

function Forma({ tipo, estado, nivelTu, nivelElla, color }: { tipo: TipoPresencia; estado: EstadoEsme; nivelTu: number; nivelElla: number; color: string }) {
  if (tipo === 'ninguna') return null
  if (tipo === 'orbe-voz') return (
    <Suspense fallback={null}>
      <div className="size-full"><OrbeVoz colors={[color, '#ffffff']} agentState={AL_ORBE[estado]} volumeMode="manual" manualInput={nivelTu} manualOutput={nivelElla} /></div>
    </Suspense>
  )
  if (tipo === 'cara') return <Suspense fallback={null}><div className="grid size-full place-items-center"><Cara state={A_LA_CARA[estado]} size={220} color={color} /></div></Suspense>
  const activo = estado === 'escuchando' || estado === 'hablando' || estado === 'pensando'
  const n = estado === 'escuchando' ? nivelTu : nivelElla
  return <Orb colors={[color, '#ffffff', color]} size={1} glow={activo ? 1.5 + n * 2.5 : 1} wobble={activo ? 0.35 + n * 1.2 : 0.25}
    speed={estado === 'pensando' ? 2.2 : activo ? 1.4 : 0.6} hoverIntensity={0.35} rotateOnHover forceHoverState={activo} backgroundColor="transparent" />
}
