// Lo que manda el inspector de la vista previa viene de la página: es dato no confiable. Se valida, se recorta y se cita.
export type Elegido = { etiqueta: string; id: string; clases: string[]; texto: string; selector: string; html: string }

const cadena = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : null)

export function limpiarElegido(d: unknown): Elegido | null {
  if (!d || typeof d !== 'object' || (d as { esme?: unknown }).esme !== 'elegido') return null
  const x = d as Record<string, unknown>
  const etiqueta = cadena(x.etiqueta, 24), selector = cadena(x.selector, 240)
  if (!etiqueta || !/^[a-z][a-z0-9-]*$/.test(etiqueta) || selector === null) return null
  const clases = Array.isArray(x.clases) ? x.clases.filter((c): c is string => typeof c === 'string').slice(0, 6).map((c) => c.slice(0, 48)) : []
  return { etiqueta, id: cadena(x.id, 80) ?? '', clases, texto: (cadena(x.texto, 140) ?? '').trim(), selector, html: cadena(x.html, 600) ?? '' }
}

/** El encargo para el motor: el elemento como contexto citado y, al final, lo que quieres cambiar. */
export function pedidoSobre(e: Elegido, cambio: string): string {
  return [
    'En la vista previa elegí este elemento de la página:',
    `- Selector: \`${e.selector}\``,
    `- Etiqueta: <${e.etiqueta}>${e.texto ? `, con el texto «${e.texto}»` : ''}`,
    ...(e.html ? ['- HTML actual:', '```html', e.html, '```'] : []),
    '',
    `Cambio que quiero: ${cambio.trim()}`,
  ].join('\n')
}
