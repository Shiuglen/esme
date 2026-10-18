// La colección de lanzamiento de la Tienda: pieles completas (color, letra, superficie, escena, presencia y piezas) para
// que la Tienda nazca llena y se vea hasta dónde llega Esme. Todas validadas y legibles de día y de noche
// (pieles-tienda.test.ts). Cualquiera se prueba en vivo, se viste, se copia y se cambia.
import { PIEL_BASE, type Piel } from './piel'
import { PIEZAS_BASE } from './piezas'

export type PielTienda = { id: string; piel: Piel; descripcion: string; etiquetas: string[]; autor: string }
const p = (id: string, descripcion: string, etiquetas: string[], x: Partial<Piel> & Pick<Piel, 'nombre'>): PielTienda =>
  ({ id, descripcion, etiquetas, autor: 'Esme', piel: { ...PIEL_BASE, ...x, piezas: { ...PIEZAS_BASE, ...x.piezas } } })

export const PIELES_TIENDA: PielTienda[] = [
  p('neon-tokio', 'Lluvia de neón en Tokio: magenta y cian, letra de máquina y un saludo con interferencia.', ['neón', 'cyberpunk', 'noche', 'magenta'], {
    nombre: 'Neón Tokio', color: { tipo: 'libre', noche: { fondo: '#0a0612', superficie: '#140b22', texto: '#f5eaff', acento: '#ff3fd2' }, dia: { fondo: '#fbf5ff', superficie: '#ffffff', texto: '#1a0d26', acento: '#b0129a' } },
    letra: { titulos: 'grotesk', texto: 'mono', escala: 0.98 }, forma: { radio: 0.4, sombra: 'honda' }, movimiento: 'vivo', caracter: 'lanzado', escena: 'hiperespacio', presencia: 'orbe',
    piezas: { superficie: 'neon', saludo: 'glitch', pulsar: 'chispas', sonido: 'completo', trabajo: 'electrico' } }),
  p('arcilla', 'Suave como la arcilla: formas abombadas, pastel y una cara amable que te acompaña.', ['suave', 'pastel', 'amable', 'clay'], {
    nombre: 'Arcilla', color: { tipo: 'libre', noche: { fondo: '#1c1820', superficie: '#26212c', texto: '#f3eef7', acento: '#c9a7ff' }, dia: { fondo: '#f4eef8', superficie: '#fbf8fd', texto: '#2a2230', acento: '#6b3fb3' } },
    letra: { titulos: 'sora', texto: 'manrope', escala: 1.02 }, forma: { radio: 2.2, sombra: 'suave' }, densidad: 'amplia', caracter: 'elastico', escena: 'aurora-suave', presencia: 'cara',
    piezas: { superficie: 'clay', saludo: 'enfoque', pulsar: 'chispas', sonido: 'avisos', trabajo: 'brillo' } }),
  p('brutalista', 'Negro, amarillo y sombras duras. Sin adornos: la estructura es la estética.', ['brutalismo', 'contraste', 'amarillo'], {
    nombre: 'Brutalista', color: { tipo: 'libre', noche: { fondo: '#0d0d0d', superficie: '#161616', texto: '#f2f2f2', acento: '#ffe14d' }, dia: { fondo: '#fffbe6', superficie: '#ffffff', texto: '#111111', acento: '#8a6d00' } },
    letra: { titulos: 'grotesk', texto: 'grotesk', escala: 1 }, forma: { radio: 0.2, sombra: 'plana' }, densidad: 'compacta', movimiento: 'sutil', caracter: 'preciso', escena: 'persianas', presencia: 'orbe',
    piezas: { superficie: 'brutal', saludo: 'fijo', pulsar: 'nada', sonido: 'completo', trabajo: 'estrella' } }),
  p('oceano', 'Profundidad marina: azules de abismo, seda que ondula y un orbe que respira contigo.', ['azul', 'calma', 'agua'], {
    nombre: 'Océano', color: { tipo: 'libre', noche: { fondo: '#04121a', superficie: '#0a1d28', texto: '#e6f6fb', acento: '#3fd0e8' }, dia: { fondo: '#eef8fb', superficie: '#ffffff', texto: '#06202b', acento: '#0a6f86' } },
    letra: { titulos: 'instrument', texto: 'instrument', escala: 1 }, forma: { radio: 1.2, sombra: 'suave' }, caracter: 'pesado', escena: 'seda', presencia: 'orbe-voz',
    piezas: { superficie: 'vidrio', saludo: 'brillo', pulsar: 'nada', sonido: 'avisos', trabajo: 'brillo' } }),
  p('boreal', 'La aurora boreal sobre cristal esmerilado: verdes y violetas que se mueven despacio.', ['aurora', 'verde', 'cristal'], {
    nombre: 'Aurora boreal', color: { tipo: 'libre', noche: { fondo: '#06100f', superficie: '#0d1a18', texto: '#e8fbf5', acento: '#5cf0b8' }, dia: { fondo: '#effbf6', superficie: '#ffffff', texto: '#08221b', acento: '#0d7a55' } },
    letra: { titulos: 'funnel', texto: 'funnel', escala: 1 }, forma: { radio: 1.4, sombra: 'honda' }, caracter: 'magnetico', escena: 'aurora', presencia: 'orbe',
    piezas: { superficie: 'esmerilado', saludo: 'degradado', pulsar: 'chispas', sonido: 'avisos', trabajo: 'electrico' } }),
  p('sakura', 'Primavera en papel: rosa cerezo, serif para leer y pétalos de luz flotando.', ['rosa', 'editorial', 'primavera'], {
    nombre: 'Sakura', color: { tipo: 'libre', noche: { fondo: '#170d12', superficie: '#21141a', texto: '#fbeef3', acento: '#ff8fb8' }, dia: { fondo: '#fdf3f6', superficie: '#fffafc', texto: '#2b1018', acento: '#b0285c' } },
    letra: { titulos: 'newsreader', texto: 'instrument', escala: 1.04 }, forma: { radio: 0.8, sombra: 'suave' }, densidad: 'amplia', caracter: 'elastico', escena: 'particulas', presencia: 'orbe',
    piezas: { superficie: 'papel', saludo: 'enfoque', pulsar: 'chispas', sonido: 'avisos', trabajo: 'brillo' } }),
  p('cine', 'Gran pantalla: oro sobre negro, Bodoni para los títulos y un velo de luz de proyector.', ['lujo', 'oro', 'cine'], {
    nombre: 'Cine', color: { tipo: 'libre', noche: { fondo: '#0c0a07', superficie: '#16120c', texto: '#f6efe2', acento: '#e8c26e' }, dia: { fondo: '#fbf6ec', superficie: '#fffdf8', texto: '#1f1a12', acento: '#7d5d17' } },
    letra: { titulos: 'bodoni', texto: 'instrument', escala: 1.03 }, forma: { radio: 0.5, sombra: 'honda' }, caracter: 'pesado', escena: 'rayos', presencia: 'orbe',
    piezas: { superficie: 'vidrio', saludo: 'descifrar', pulsar: 'nada', sonido: 'avisos', trabajo: 'estrella' } }),
  p('matrix', 'Dentro de la máquina: verde fósforo, todo en monoespaciada y el saludo que se descifra.', ['hacker', 'verde', 'terminal'], {
    nombre: 'Matriz', color: { tipo: 'libre', noche: { fondo: '#020803', superficie: '#071209', texto: '#d9fbe0', acento: '#3cff7a' }, dia: { fondo: '#f2fbf3', superficie: '#ffffff', texto: '#06200d', acento: '#11752f' } },
    letra: { titulos: 'mono', texto: 'mono', escala: 0.96 }, forma: { radio: 0.1, sombra: 'plana' }, densidad: 'compacta', caracter: 'preciso', escena: 'lineas', presencia: 'orbe', navegacion: 'riel',
    piezas: { superficie: 'neon', saludo: 'descifrar', pulsar: 'nada', sonido: 'completo', trabajo: 'electrico' } }),
  p('lava', 'Calor volcánico: naranjas de plasma, formas redondas y movimiento con inercia.', ['naranja', 'energía', 'cálido'], {
    nombre: 'Lava', color: { tipo: 'libre', noche: { fondo: '#120804', superficie: '#1e0f08', texto: '#fff1e8', acento: '#ff7a2f' }, dia: { fondo: '#fff4ed', superficie: '#ffffff', texto: '#2a1308', acento: '#b0420a' } },
    letra: { titulos: 'sora', texto: 'dmsans', escala: 1 }, forma: { radio: 1.6, sombra: 'honda' }, movimiento: 'vivo', caracter: 'lanzado', escena: 'plasma', presencia: 'orbe',
    piezas: { superficie: 'vidrio', saludo: 'degradado', pulsar: 'chispas', sonido: 'avisos', trabajo: 'electrico' } }),
  p('cosmos', 'El espacio profundo: estrellas que derivan, violeta de nebulosa y el orbe de voz flotando.', ['espacio', 'violeta', 'galaxia'], {
    nombre: 'Cosmos', color: { tipo: 'libre', noche: { fondo: '#05040d', superficie: '#0d0b1d', texto: '#efedff', acento: '#9b8cff' }, dia: { fondo: '#f4f3ff', superficie: '#ffffff', texto: '#14112b', acento: '#4c3db8' } },
    letra: { titulos: 'geist', texto: 'geist', escala: 1 }, forma: { radio: 1.1, sombra: 'suave' }, caracter: 'magnetico', escena: 'galaxia', presencia: 'orbe-voz', navegacion: 'muelle',
    piezas: { superficie: 'esmerilado', saludo: 'enfoque', pulsar: 'chispas', sonido: 'avisos', trabajo: 'estrella' } }),
  p('minimal', 'Nada que sobre: papel, Inter, grises exactos y ningún movimiento. Para concentrarse.', ['minimalismo', 'foco', 'sobrio'], {
    nombre: 'Mínimo', color: { tipo: 'libre', noche: { fondo: '#0f0f10', superficie: '#17171a', texto: '#ececee', acento: '#a5a5ad' }, dia: { fondo: '#f7f7f8', superficie: '#ffffff', texto: '#141416', acento: '#55555d' } },
    letra: { titulos: 'inter', texto: 'inter', escala: 0.98 }, forma: { radio: 0.6, sombra: 'plana' }, densidad: 'compacta', movimiento: 'nada', caracter: 'preciso', escena: 'ninguna', presencia: 'ninguna',
    piezas: { superficie: 'papel', saludo: 'fijo', pulsar: 'nada', sonido: 'nada', trabajo: 'nada' } }),
  p('prisma', 'Luz partida en colores: iridiscencia detrás, vidrio líquido delante y un brillo que lo recorre todo.', ['iridiscente', 'arcoíris', 'vidrio'], {
    nombre: 'Prisma', color: { tipo: 'libre', noche: { fondo: '#08080c', superficie: '#121219', texto: '#f2f3fa', acento: '#7fd4ff' }, dia: { fondo: '#f5f7fc', superficie: '#ffffff', texto: '#10131d', acento: '#1d5f9e' } },
    letra: { titulos: 'manrope', texto: 'manrope', escala: 1 }, forma: { radio: 1.4, sombra: 'suave' }, movimiento: 'vivo', caracter: 'elastico', escena: 'iridiscencia', presencia: 'orbe',
    piezas: { superficie: 'vidrio', saludo: 'brillo', pulsar: 'chispas', sonido: 'completo', trabajo: 'electrico' } }),
]
