// Las pieles de casa: el punto de partida, no el límite. Muy distintas entre sí para que se vea hasta dónde llega Esme;
// cualquiera se puede copiar y cambiar, y la persona (o Esme, a petición) puede crear las suyas. Todas se comprueban:
// válidas y legibles de día y de noche (pieles-casa.test.ts).
import { PIEL_BASE, type Piel } from './piel'

const piel = (p: Partial<Piel> & Pick<Piel, 'nombre'>): Piel => ({ ...PIEL_BASE, ...p })

export const PIELES_CASA: Piel[] = [
  PIEL_BASE,
  piel({ nombre: 'Grabado', color: { tipo: 'estilo', estilo: 'grabado' }, letra: { titulos: 'bodoni', texto: 'funnel', escala: 1 },
    forma: { radio: 0.8, sombra: 'plana' }, fondo: 'papel' }),
  piel({ nombre: 'Cuarzo', color: { tipo: 'estilo', estilo: 'quartz' }, letra: { titulos: 'inter', texto: 'inter', escala: 1 }, forma: { radio: 1.2, sombra: 'suave' } }),
  piel({ nombre: 'Lima', color: { tipo: 'estilo', estilo: 'lime' }, letra: { titulos: 'grotesk', texto: 'grotesk', escala: 1 },
    forma: { radio: 0.6, sombra: 'plana' }, densidad: 'compacta', movimiento: 'vivo', caracter: 'lanzado', fondo: 'liso' }),
  // precisión de herramienta profesional: índigo sobre casi negro, compacta y quieta
  piel({ nombre: 'Medianoche', color: { tipo: 'libre', noche: { fondo: '#08090c', superficie: '#101116', texto: '#f7f8f8', acento: '#8a91ff' }, dia: { fondo: '#fafafa', superficie: '#ffffff', texto: '#0b0c10', acento: '#4f58c4' } },
    letra: { titulos: 'inter', texto: 'inter', escala: 1 }, forma: { radio: 0.7, sombra: 'suave' }, densidad: 'compacta', caracter: 'magnetico', fondo: 'liso', navegacion: 'riel' }),
  // blanco y negro puro: la tipografía lo es todo
  piel({ nombre: 'Monocromo', color: { tipo: 'libre', noche: { fondo: '#0a0a0a', superficie: '#121212', texto: '#ededed', acento: '#ededed' }, dia: { fondo: '#ffffff', superficie: '#fafafa', texto: '#171717', acento: '#171717' } },
    letra: { titulos: 'geist', texto: 'geist', escala: 1 }, forma: { radio: 0.6, sombra: 'plana' }, fondo: 'liso' }),
  // revista: serif para leer, papel cálido y mucho aire
  piel({ nombre: 'Editorial', color: { tipo: 'libre', noche: { fondo: '#14110f', superficie: '#1c1815', texto: '#efe8de', acento: '#e2a46b' }, dia: { fondo: '#f7f3ec', superficie: '#fffdf8', texto: '#1f1a14', acento: '#8a4316' } },
    letra: { titulos: 'newsreader', texto: 'instrument', escala: 1.05 }, forma: { radio: 0.4, sombra: 'plana' }, densidad: 'amplia', caracter: 'pesado', fondo: 'papel' }),
  // luz de aurora boreal: violeta vivo, formas redondas y profundidad
  piel({ nombre: 'Boreal', color: { tipo: 'gustos', gustos: { tono: 280, papel: 10, fuerza: 85 } }, letra: { titulos: 'sora', texto: 'sora', escala: 1 },
    forma: { radio: 1.6, sombra: 'honda' }, movimiento: 'vivo', caracter: 'elastico' }),
  // la consola: verde fósforo, monoespaciada, sin adornos ni movimiento
  piel({ nombre: 'Terminal', color: { tipo: 'libre', noche: { fondo: '#050805', superficie: '#0b120b', texto: '#d6f5d6', acento: '#4ade80' }, dia: { fondo: '#f4faf4', superficie: '#ffffff', texto: '#0b1a0b', acento: '#15703a' } },
    letra: { titulos: 'mono', texto: 'mono', escala: 0.95 }, forma: { radio: 0.15, sombra: 'plana' }, densidad: 'compacta', movimiento: 'nada', fondo: 'liso', navegacion: 'riel' }),
  // suave y cercana: lavanda, curvas generosas y aire
  piel({ nombre: 'Nube', color: { tipo: 'libre', noche: { fondo: '#120f1d', superficie: '#1a1628', texto: '#efeaff', acento: '#b794f6' }, dia: { fondo: '#f6f3ff', superficie: '#ffffff', texto: '#1d1730', acento: '#6d28d9' } },
    letra: { titulos: 'manrope', texto: 'manrope', escala: 1.02 }, forma: { radio: 2, sombra: 'suave' }, densidad: 'amplia', caracter: 'elastico', navegacion: 'muelle' }),
  // el estudio: arena y carbón, letra con carácter
  piel({ nombre: 'Estudio', color: { tipo: 'libre', noche: { fondo: '#111110', superficie: '#191917', texto: '#eeeeec', acento: '#f97316' }, dia: { fondo: '#f5f4f0', superficie: '#fcfcfa', texto: '#1b1b18', acento: '#b6430b' } },
    letra: { titulos: 'fraunces', texto: 'dmsans', escala: 1 }, forma: { radio: 1, sombra: 'suave' }, caracter: 'pesado' }),
]
