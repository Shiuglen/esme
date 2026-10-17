// El estilo propio: el color deja de ser un catálogo y pasa a ser una ecuación.
// Tres gustos —tono, papel, fuerza— y todo el vocabulario del sistema se deriva:
// el papel toma su temperatura, la aurora nace del tono y el resto de las luces
// giran alrededor como una familia. Día y noche son la misma ecuación invertida.
// Los valores van como HSL: lo entiende cualquier renderer y se recalcula en vivo.

export const ESTILOS = ['esmeralda', 'quartz', 'lime', 'grabado', 'propio'] as const
export type EstiloId = (typeof ESTILOS)[number]

export type Gustos = { tono: number; papel: number; fuerza: number }

const PASOS: Array<[string, number]> =   // la familia libre de la luz: el filo y sus dos compañeras
  [['--luz', 0], ['--luz-2', 65], ['--luz-3', -85]]

const NOMBRE = [
  '--esmeralda', '--esmeralda-1', '--esmeralda-3', '--esmeralda-4', '--hielo', '--brillo',
  '--papel', '--hoja', '--tinta', '--tinta-fresca', '--tinta-vieja', '--grafito',
  '--luz', '--luz-2', '--luz-3', '--sello',
  '--fondo', '--superficie-1', '--superficie-2', '--superficie-3', '--linea', '--linea-fuerte',
  '--texto', '--texto-2', '--texto-3',
  '--acento', '--sobre-acento', '--acento-velo', '--foco',
  '--memoria', '--memoria-velo',
  '--atencion', '--atencion-velo', '--peligro', '--peligro-velo',
  '--info', '--exito', '--exito-velo',
  '--actividad-0', '--actividad-1', '--actividad-2', '--actividad-3', '--actividad-4',
  '--cristal',
] as const

const gira = (h: number, d: number) => { const x = (h + d) % 360; return x < 0 ? x + 360 : x }
// Mezcla dos colores por el camino corto (la semántica cara a su canon, pero con el acento del tono tuyo)
const mezcla = (a: number, b: number, t: number) => { let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360; return gira(a, d * t) }
const canon = (h: number, canonico: number, t = 0.75) => Math.round(mezcla(h, canonico, t))
const hsl = (h: number, s: number, l: number, a = 1) => a === 1 ? `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)` : `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function paletaPropia(g: Gustos, tema: 'noche' | 'dia'): Record<string, string> {
  const noche = tema === 'noche'
  const h = gira(clamp(g.tono, 0, 360), 0)
  const hp = gira(250 - clamp(g.papel, 0, 100) * 2.1, 0)        // 0 → frío azulado (250), 100 → cálido ámbar (~40)
  const fuerza = clamp(g.fuerza, 0, 100)
  const s = (p: number) => Math.round(clamp(p * (0.5 + fuerza / 125), 4, 98))  // la fuerza mueve la saturación entera
  const v: Record<string, string> = {}
  for (const [k, d] of PASOS) {
    v[`${k}a`] = hsl(gira(h, d), noche ? s(82) : s(66), noche ? 66 : 34)                       // pieza con color
    v[`${k}b`] = hsl(gira(h, d), s(noche ? 55 : 88), noche ? 15 : 93)                          // velo de fondo
  }
  if (noche) {
    // primero el papel, la hoja y la tinta: el resto de la paleta se apoya en ellos (antes se leían aún vacíos)
    Object.assign(v, { '--papel': hsl(hp, s(20), 5), '--hoja': hsl(hp, s(18), 8), '--tinta': hsl(h, s(28), 93) })
    Object.assign(v, {
      '--esmeralda': v['--luza'], '--esmeralda-1': hsl(h, s(90), 78), '--esmeralda-3': hsl(h, s(70), 48), '--esmeralda-4': hsl(h, s(60), 30), '--hielo': hsl(canon(h, 250), s(70), 66),
      '--brillo': hsl(h, s(88), 68, 0.35),
      '--papel': hsl(hp, s(20), 5), '--hoja': hsl(hp, s(18), 8),
      '--tinta': hsl(h, s(28), 93), '--tinta-fresca': hsl(h, s(75), 72), '--tinta-vieja': hsl(h, s(38), 56), '--grafito': hsl(hp, s(14), 58),
      '--luz': v['--luza'], '--luz-2': v['--luz-2a'], '--luz-3': v['--luz-3a'], '--sello': hsl(canon(h, 18, 0.6), s(80), 62),
      '--fondo': v['--papel'], '--superficie-1': v['--hoja'], '--superficie-2': hsl(hp, s(17), 12), '--superficie-3': hsl(hp, s(17), 15.5),
      '--linea': hsl(hp, s(15), 14), '--linea-fuerte': hsl(hp, s(15), 26),
      '--texto': v['--tinta'], '--texto-2': hsl(h, s(20), 74), '--texto-3': hsl(h, s(16), 62),
      '--acento': hsl(h, s(70), 66), '--sobre-acento': hsl(h, s(35), 10), '--acento-velo': hsl(h, s(45), 14), '--foco': hsl(h, s(84), 74),
      '--memoria': hsl(h, s(75), 74), '--memoria-velo': hsl(h, s(50), 12),
      '--atencion': hsl(canon(h, 44), s(82), 64), '--atencion-velo': hsl(canon(h, 44), s(56), 15),
      '--peligro': hsl(canon(h, 12), s(85), 64), '--peligro-velo': hsl(canon(h, 12), s(58), 16),
      '--info': hsl(canon(h, 250), s(75), 68), '--exito': hsl(canon(h, 150), s(66), 62), '--exito-velo': hsl(canon(h, 150), s(48), 14),
      '--actividad-0': hsl(hp, s(15), 7), '--actividad-1': hsl(h, s(55), 16), '--actividad-2': hsl(h, s(70), 31), '--actividad-3': hsl(h, s(80), 50), '--actividad-4': hsl(h, s(86), 72),
      '--cristal': hsl(hp, s(18), 5, 0.75),
    })
  } else {
    // primero el papel, la hoja y la tinta: el resto de la paleta se apoya en ellos (antes se leían aún vacíos)
    Object.assign(v, { '--papel': hsl(hp, s(26), 97), '--hoja': hsl(hp, s(30), 100), '--tinta': hsl(h, s(35), 12) })
    Object.assign(v, {
      '--esmeralda': v['--luza'], '--esmeralda-1': hsl(h, s(80), 86), '--esmeralda-3': hsl(h, s(62), 26), '--esmeralda-4': hsl(h, s(60), 18), '--hielo': hsl(canon(h, 250), s(60), 38),
      '--brillo': hsl(h, s(62), 34, 0.22),
      '--papel': hsl(hp, s(26), 97), '--hoja': hsl(hp, s(30), 100),
      '--tinta': hsl(h, s(35), 12), '--tinta-fresca': hsl(h, s(60), 32), '--tinta-vieja': hsl(h, s(20), 58), '--grafito': hsl(h, s(15), 48),
      '--luz': v['--luza'], '--luz-2': v['--luz-2a'], '--luz-3': v['--luz-3a'], '--sello': hsl(canon(h, 18, 0.6), s(72), 42),
      '--fondo': v['--papel'], '--superficie-1': v['--hoja'], '--superficie-2': hsl(hp, s(24), 94.5), '--superficie-3': hsl(hp, s(22), 91),
      '--linea': hsl(hp, s(21), 89), '--linea-fuerte': hsl(hp, s(14), 72),
      '--texto': v['--tinta'], '--texto-2': hsl(h, s(28), 30), '--texto-3': hsl(h, s(22), 42),
      '--acento': hsl(h, s(62), 31), '--sobre-acento': hsl(h, s(35), 98.5), '--acento-velo': hsl(h, s(72), 94), '--foco': hsl(h, s(60), 34),
      '--memoria': hsl(h, s(46), 32), '--memoria-velo': hsl(h, s(72), 94),
      '--atencion': hsl(canon(h, 44), s(70), 30), '--atencion-velo': hsl(canon(h, 44), s(86), 93),
      '--peligro': hsl(canon(h, 12), s(72), 38), '--peligro-velo': hsl(canon(h, 12), s(84), 93),
      '--info': hsl(canon(h, 250), s(60), 42), '--exito': hsl(canon(h, 150), s(56), 32), '--exito-velo': hsl(canon(h, 150), s(76), 92),
      '--actividad-0': hsl(hp, s(20), 95), '--actividad-1': hsl(h, s(60), 90), '--actividad-2': hsl(h, s(66), 74), '--actividad-3': hsl(h, s(62), 38), '--actividad-4': hsl(h, s(62), 27),
      '--cristal': hsl(hp, s(30), 99, 0.85),
    })
  }
  return v
}

// Pone (o retira) los gustos en vivo. retirarPropio borra hasta la última variable tocada.
export function aplicarPropio(g: Gustos, tema: 'noche' | 'dia') {
  const v = paletaPropia(g, tema)
  for (const [k, x] of Object.entries(v)) document.documentElement.style.setProperty(k, x)
}
export function quitarPropio() {
  for (const k of NOMBRE) document.documentElement.style.removeProperty(k)
}
