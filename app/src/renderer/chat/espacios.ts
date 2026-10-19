// Algunos modelos escriben espacios tipográficos raros: el fino sin corte (U+202F, la costumbre francesa junto a cifras),
// el fino (U+2009), el de cifra (U+2007) o los de ancho cero. Con la letra de Esme casi no se ven y el texto parece pegado
// («el10dediciembre»). Se dibujan como espacios de verdad; lo guardado no se toca.
export const espaciosLegibles = (t: string) =>
  t.replace(/ /g, ' ').replace(/[    ]/g, ' ').replace(/[​⁠﻿]/g, '')
