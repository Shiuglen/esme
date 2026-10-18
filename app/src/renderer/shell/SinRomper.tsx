// Si una pieza decorativa (una escena, la presencia de Esme…) falla —por ejemplo, porque la tarjeta gráfica no puede con
// ella—, desaparece sin tumbar la app. Al cambiar `clave` (otra escena, otra presencia) se vuelve a intentar.
import { Component, type ReactNode } from 'react'

export class SinRomper extends Component<{ children: ReactNode; clave: string; alFallar?: (e: unknown) => void }, { roto: boolean }> {
  state = { roto: false }
  static getDerivedStateFromError() { return { roto: true } }
  componentDidCatch(e: unknown) { console.warn('[esme] una pieza falló y se ocultó:', e); this.props.alFallar?.(e) }
  componentDidUpdate(p: { clave: string }) { if (p.clave !== this.props.clave && this.state.roto) this.setState({ roto: false }) }
  render() { return this.state.roto ? null : this.props.children }
}
