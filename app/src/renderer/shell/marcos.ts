// El sitio que deja libre cada forma de navegar (la elige la piel): dónde empiezan las hojas, cuánto de tu mente queda a la
// vista en reposo y dónde se apoya la portada. La leyenda y el riel viven en una columna a la izquierda (64 px + 12 de aire);
// el muelle flota abajo en el centro y reserva esa franja.
import type { Navegacion } from '../tinta/piel'

export type Marco = {
  izquierda: number      // dónde empieza una hoja por la izquierda
  abajo: number          // dónde acaba por abajo
  inicio: number         // cuánto tapa la navegación en reposo (para encuadrar la mente)
  portada: { izquierda: number; abajo: number; cabecera: number }   // compositor y saludo
}

const MARCOS: Record<Navegacion, Marco> = {
  leyenda: { izquierda: 76, abajo: 12, inicio: 300, portada: { izquierda: 240, abajo: 24, cabecera: 28 } },
  riel: { izquierda: 76, abajo: 12, inicio: 76, portada: { izquierda: 96, abajo: 24, cabecera: 88 } },
  muelle: { izquierda: 12, abajo: 76, inicio: 0, portada: { izquierda: 32, abajo: 88, cabecera: 28 } },
}

export const marcoDe = (nav: Navegacion): Marco => MARCOS[nav] ?? MARCOS.leyenda
