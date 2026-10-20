// El Ojo de Esme: el agente ve lo que ves, y lo olvida.
//
// La idea viene del FYP (el «Ojo» de `perception/ojo.py`): una memoria de pantalla **local,
// opcional y con olvido**. No es un grabador: es «una mirada ahora», y lo que se miró hace un
// rato se borra solo.
//
// Guardas: la captura es de tu pantalla, así que puede llevar lo que no se debe ver. Por eso la
// herramienta pasa por el guardián de permisos de siempre (pregunta antes), y la imagen no sale de
// tu equipo: va al modelo que tú elegiste, como el resto de tu conversación.
export type Captura = { ts: number; base64: string; mime: string }
export type Capturador = () => Promise<{ base64: string; mime: string }>

const MS_POR_DEFECTO = 30 * 60_000   // media hora: lo que se vio hace mucho, ya no se recuerda
const MAX_POR_DEFECTO = 8

export class Ojo {
  private memoria: Captura[] = []

  constructor(private readonly capturar: Capturador, private readonly ttlMs = MS_POR_DEFECTO, private readonly max = MAX_POR_DEFECTO) {}

  /** Mira ahora. Devuelve la captura nueva y las que aún se recuerdan. */
  async ver(): Promise<{ ahora: Captura; recientes: Captura[] }> {
    this.olvida()
    const c = await this.capturar()
    const ahora: Captura = { ts: Date.now(), base64: c.base64, mime: c.mime || 'image/png' }
    this.memoria.push(ahora)
    if (this.memoria.length > this.max) this.memoria = this.memoria.slice(-this.max)
    return { ahora, recientes: [...this.memoria] }
  }

  /** Lo que se recuerda ahora mismo (sin mirar otra vez). */
  recientes(): Captura[] {
    this.olvida()
    return [...this.memoria]
  }

  /** El olvido: lo viejo se va. Y si se cierra la app, también (no está en disco: nunca). */
  olvida(): void {
    const ahora = Date.now()
    this.memoria = this.memoria.filter((c) => ahora - c.ts < this.ttlMs)
  }

  /** Borra la memoria del todo (el usuario puede pedirlo). */
  forget(): void { this.memoria = [] }
}

/** La captura real: la pantalla de Electron. */
export async function capturarPantalla(tipo: 'screen' | 'window' = 'screen', ancho = 1280, alto = 800): Promise<{ base64: string; mime: string }> {
  const { desktopCapturer } = await import('electron')
  const fuentes = await desktopCapturer.getSources({
    types: [tipo],
    thumbnailSize: { width: ancho, height: alto },
    fetchWindowIcons: false,
  })
  const primera = fuentes[0]
  if (!primera) throw new Error('No hay ninguna pantalla que mirar.')
  const png = primera.thumbnail.toPNG()
  return { base64: png.toString('base64'), mime: 'image/png' }
}

/** El Ojo de la app: uno solo, con la captura de Electron. */
export const ojo = new Ojo(() => capturarPantalla())
