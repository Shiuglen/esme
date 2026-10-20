// «Que Esme elija»: cuando no le fijas un motor, Esme decide cuál usar según lo que le pides, y te dice por qué.
//
// El router de tres niveles (niveles.ts) sabe clasificar modelos, elegir, escalar y aprender; lo que faltaba era
// (1) entender de qué tipo de tarea se trata y (2) traducir los motores que tienes a los candidatos que el router
// entiende. Eso es lo que hay aquí.
//
// Reglas del juego: primero lo gratis, el nivel que la tarea pide, y si el nivel bajo falla dos veces, al medio; si el
// medio falla dos veces, al alto; y si el alto falla dos veces o la tarea es sensible (dinero, clientes, borrados,
// algo público), decide una persona. Nunca se elige un modelo de pago sin que lo elijas tú.
import { clasificarModelo, elegir, type Candidato, type Nivel, type TipoPaso } from './niveles'
import type { ProveedorCatalogo } from '../catalogo/modelsdev'

/** De qué tipo de tarea se trata: el mensaje y si hay manos (herramientas) en juego. */
export function tipoDe(mensaje: string, o: { herramientas?: boolean } = {}): TipoPaso {
  const t = mensaje.toLowerCase()
  const reglas: [TipoPaso, RegExp][] = [
    ['planificar', /\b(planifica|planifica\b|estrategia|diseña el plan|haz un plan|pasos para|arquitectura|roadmap|qué harías)/i],
    ['juzgar', /\b(revisa|revisa\b|audita|evalúa|juzga|compara|critica|¿es bueno|¿funciona|corrección|bugs?)/i],
    ['construir', /\b(programa|implementa|construye|crea|añade|agrega|refactoriza|arregla|fix|código|script|función|clase|módulo)/i],
    ['escribir', /\b(escribe|redacta|correo|email|artículo|ensayo|documenta|readme|publicación|entrada de blog)/i],
    ['condensar', /\b(resume|resumen|condensa|acorta|en tres líneas|en dos frases|una frase|tl;?dr)/i],
    ['leer', /\b(lee|qué dice|qué hay en|analiza este archivo|explica este|qué contiene)/i],
    ['ordenar', /\b(ordena|organiza|prioriza|clasifica|agrupa|lista de|estructura)/i],
    ['enrutar', /\b(encarga|encárgate|¿qué motor|con quién|quién puede)/i],
  ]
  for (const [tipo, rx] of reglas) if (rx.test(t)) return tipo
  if (o.herramientas && /\b(crea|genera|construye|instala|busca|descarga|convierte)/i.test(t)) return 'construir'
  return 'conversar'
}

/** Los candidatos que el router entiende, a partir de los motores que tienes y el catálogo de modelos. */
export function candidatosDe(o: { motores: { id: string; local: boolean; hasKey: boolean; modelo?: string }[]; catalogo: ProveedorCatalogo[] }): Candidato[] {
  const out: Candidato[] = []
  for (const m of o.motores) {
    if (!m.hasKey && !m.local) continue
    const modelos = o.catalogo.find((p) => p.id === m.id)?.modelos ?? []
    for (const mo of modelos) {
      out.push({ proveedor: m.id, modelo: mo.id, nivel: clasificarModelo(mo), costeEntrada: mo.coste.entrada, costeSalida: mo.coste.salida,
        gratis: mo.gratis, herramientas: mo.herramientas, contexto: mo.contexto })
    }
    // los motores locales: no hay catálogo de ellos, pero su modelo por defecto sí se puede usar
    if (!modelos.length && m.modelo) {
      out.push({ proveedor: m.id, modelo: m.modelo, nivel: 'medio', costeEntrada: 0, costeSalida: 0, gratis: true, herramientas: true, contexto: 0 })
    }
  }
  return out
}

export type Decision = { proveedor: string; modelo: string; nivel: Nivel; motivo: string; tipo: TipoPaso }

/**
 * Decide el motor de una tarea. Si el usuario ha fijado uno, ese gana (es su derecho); si no, elige el router.
 * Devuelve null cuando no hay ningún motor utilizable (entonces la app lo dice y ofrece conectar uno).
 */
export function decidir(o: { mensaje: string; herramientas?: boolean; motores: { id: string; local: boolean; hasKey: boolean; modelo?: string }[]; catalogo: ProveedorCatalogo[];
  fijado?: { proveedor: string; modelo: string }; calidad?: (t: TipoPaso, c: Candidato) => number }): Decision | null {
  const tipo = tipoDe(o.mensaje, { herramientas: o.herramientas })
  if (o.fijado) return { proveedor: o.fijado.proveedor, modelo: o.fijado.modelo, nivel: 'medio', tipo, motivo: 'fijado por ti' }
  const cs = candidatosDe({ motores: o.motores, catalogo: o.catalogo })
  if (!cs.length) return null
  const e = elegir(tipo, cs, { preferirGratis: true, requiereHerramientas: o.herramientas, calidad: o.calidad })
  if (!e) return null
  return { proveedor: e.candidato.proveedor, modelo: e.candidato.modelo, nivel: e.nivel, tipo, motivo: e.motivo }
}
