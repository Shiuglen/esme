// La cola de eventos del Taller: se acumulan y se sueltan en lote, una vez por fotograma.
//
// **Por qué no basta el fotograma:** `requestAnimationFrame` no dispara cuando la ventana está
// oculta, minimized o tapada. Si la cola sólo se soltara con el fotograma, seguiría creciendo
// mientras nadie mira la ventana —y el renderer se comería la memoria (medido: 2,8 GB de montón
// de JavaScript, con el swap lleno). Por eso hay tres reglas:
//   1. se suelta en cuanto llega el fotograma;
//   2. si el fotograma no llega, lo suelta un reloj (la ventana oculta no da fotogramas, pero sí
//      tiempo);
//   3. la cola nunca pasa del tope: si lo pasa, se suelta ya, porque el tope es un tope.

export type Entrada<T> = { id: string; e: T }

/** Lo que la cola necesita del navegador para programarse (así se puede probar sin navegador). */
export type Programador = {
  fotograma: (tarea: () => void) => number
  reloj: (tarea: () => void, ms: number) => number
  cancelarFotograma: (id: number) => void
  cancelarReloj: (id: number) => void
}

/** El tope de la cola: por encima, se suelta. Mil y pico de eventos es un segundo de trabajo. */
export const MAX_COLA = 2000
/** Lo que se espera antes de soltar sin fotograma (ms). */
export const ESPERA_RESPALDO = 250

export class Cola<T> {
  private entradas: Entrada<T>[] = []
  private idFotograma = 0
  private idReloj = 0

  constructor(private readonly programa: Programador,
              private readonly suelta: (lote: Entrada<T>[]) => void,
              private readonly maximo: number = MAX_COLA,
              private readonly espera: number = ESPERA_RESPALDO) {}

  /** Lo que hay en la cola ahora mismo (para mirar, no para mutar). */
  get largo(): number { return this.entradas.length }

  meter(id: string, e: T): void {
    this.entradas.push({ id, e })
    if (!this.idFotograma && !this.idReloj) {
      this.idFotograma = this.programa.fotograma(() => this.soltar())
      this.idReloj = this.programa.reloj(() => this.soltar(), this.espera)
    }
    if (this.entradas.length >= this.maximo) this.soltar()
  }

  /** Suelta lo que haya ahora mismo (el fotograma, el reloj o el tope). */
  soltar(): void {
    if (this.idFotograma) { this.programa.cancelarFotograma(this.idFotograma); this.idFotograma = 0 }
    if (this.idReloj) { this.programa.cancelarReloj(this.idReloj); this.idReloj = 0 }
    const lote = this.entradas
    this.entradas = []
    if (lote.length) this.suelta(lote)
  }

  /** Se lleva lo encolado de una tarea (su historial completo viene de otro sitio). */
  quitar(id: string): void {
    this.entradas = this.entradas.filter((x) => x.id !== id)
  }
}
