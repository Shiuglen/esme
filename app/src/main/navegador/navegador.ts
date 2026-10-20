// El navegador: la ventana que se abre, se usa y se cierra. La ventana se fabrica (así esto se
// puede probar sin Electron) y se cierra sola cuando pasa un rato sin usarla: en reposo Esme no
// consume memoria ni navegador abierto.
import { GUION_CLIC, GUION_ESCRIBIR, GUION_ESTADO, normaliza, urlValida, type EstadoPagina } from './estado'

/** Lo mínimo de una ventana que el navegador necesita. */
export type Ventana = {
  loadURL(url: string): Promise<void>
  executeJavaScript(codigo: string): Promise<unknown>
  isDestroyed(): boolean
  close(): void
  url(): string
}
export type FabricarVentana = () => Ventana

export type ResultadoAccion = { ok: boolean; donde: string; estado: EstadoPagina }

const MS_SIN_USO = 120_000   // dos minutos: la ventana se cierra si nadie la usa

export class Navegador {
  private vent: Ventana | null = null
  private reloj: NodeJS.Timeout | null = null
  private ultimoUso = 0

  constructor(private readonly fabricar: FabricarVentana, private readonly msSinUso = MS_SIN_USO) {}

  /** ¿Hay una ventana abierta ahora mismo? */
  get abierto(): boolean { return !!this.vent && !this.vent.isDestroyed() }

  /** Abre una página y devuelve lo que hay. */
  async abrir(url: string): Promise<EstadoPagina> {
    const buena = urlValida(url)
    if (!buena) throw new Error('Esa dirección no es de la web (sólo http y https).')
    const v = this.ventana()
    await v.loadURL(buena)
    return this.estado()
  }

  /** Lo que hay ahora mismo en la página. */
  async estado(): Promise<EstadoPagina> {
    const v = this.ventana()
    const r = await v.executeJavaScript(GUION_ESTADO)
    return normaliza(r)
  }

  /** Pulsa un botón o enlace: el primero cuyo texto contenga lo pedido. */
  async clic(objetivo: string): Promise<ResultadoAccion> {
    const v = this.ventana()
    const r = (await v.executeJavaScript(GUION_CLIC(objetivo))) as { ok?: boolean; donde?: string } | null
    return { ok: !!r?.ok, donde: r?.donde ?? '', estado: await this.estado() }
  }

  /** Rellena un campo: lo busca por nombre, marcador o etiqueta. */
  async escribir(objetivo: string, valor: string): Promise<ResultadoAccion> {
    const v = this.ventana()
    const r = (await v.executeJavaScript(GUION_ESCRIBIR(objetivo, valor))) as { ok?: boolean; donde?: string } | null
    return { ok: !!r?.ok, donde: r?.donde ?? '', estado: await this.estado() }
  }

  /** Cierra la ventana: la deja cerrada aunque esté a medias. */
  cerrar(): void {
    if (this.reloj) { clearTimeout(this.reloj); this.reloj = null }
    const v = this.vent
    this.vent = null
    try { if (v && !v.isDestroyed()) v.close() } catch { /* ya estaba cerrada */ }
  }

  private ventana(): Ventana {
    this.ultimoUso = Date.now()
    if (this.vent && !this.vent.isDestroyed()) { this.programaCierre(); return this.vent }
    this.vent = this.fabricar()
    this.programaCierre()
    return this.vent
  }

  /** Se cierra sola si nadie la usa: en reposo no hay ventana abierta. */
  private programaCierre(): void {
    if (this.reloj) clearTimeout(this.reloj)
    this.reloj = setTimeout(() => { if (Date.now() - this.ultimoUso >= this.msSinUso) this.cerrar() }, this.msSinUso)
    this.reloj.unref?.()
  }
}
