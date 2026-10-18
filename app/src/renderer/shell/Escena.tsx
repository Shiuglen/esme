// La escena de la piel (tinta/escenas.ts): un fondo vivo a pantalla completa detrás de toda la app, teñido con la piel.
// Se carga solo cuando se elige, se atenúa con una hoja abierta y, si la tarjeta gráfica no puede con ella, desaparece
// sin romper nada (la app sigue con su fondo de siempre).
import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { ESCENAS, type EscenaId, type PaletaEscena } from '../tinta/escenas'
import type { EscenaPiel } from '../tinta/piel'

class SinRomper extends Component<{ children: ReactNode; clave: string }, { roto: boolean }> {
  state = { roto: false }
  static getDerivedStateFromError() { return { roto: true } }
  componentDidUpdate(p: { clave: string }) { if (p.clave !== this.props.clave && this.state.roto) this.setState({ roto: false }) }
  render() { return this.state.roto ? null : this.props.children }
}

const leer = (): PaletaEscena => {
  const cs = getComputedStyle(document.documentElement), v = (k: string, d: string) => cs.getPropertyValue(k).trim() || d
  const hex = (x: string, d: string) => (/^#[0-9a-f]{6}$/i.test(x) ? x : d)
  return { acento: hex(v('--acento', ''), '#5fffd0'), texto: hex(v('--texto', ''), '#ffffff'), fondo: hex(v('--fondo', ''), '#0a0a0a'), superficie: hex(v('--superficie-1', ''), '#151515') }
}
const cargadas = new Map<EscenaId, ReturnType<typeof lazy>>()
const componente = (id: EscenaId) => { if (!cargadas.has(id)) cargadas.set(id, lazy(ESCENAS[id].cargar)); return cargadas.get(id)! }

export function Escena({ id, atenuada, clave }: { id: EscenaPiel; atenuada: boolean; clave: string }) {
  const [paleta, setPaleta] = useState(leer)
  useEffect(() => { const t = setTimeout(() => setPaleta(leer()), 60); return () => clearTimeout(t) }, [clave])
  const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => { const f = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f) }, [])
  const props = useMemo(() => (id === 'ninguna' ? null : ESCENAS[id].props(paleta)), [id, paleta])
  if (id === 'ninguna' || !props || !visible) return null
  const C = componente(id)
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 z-0 transition-opacity duration-700', atenuada ? 'opacity-25' : 'opacity-75')}>
      <SinRomper clave={`${id}${clave}`}><Suspense fallback={null}><C key={`${id}${JSON.stringify(props)}`} {...props} /></Suspense></SinRomper>
      <div className="absolute inset-0 bg-[radial-gradient(75%_65%_at_50%_42%,transparent,var(--fondo)_96%)]" />
    </div>
  )
}
