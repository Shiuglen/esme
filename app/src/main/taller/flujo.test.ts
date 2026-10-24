import { describe, expect, it } from 'vitest'
import { flujoLanzable, MAX_RELEVOS, oficioDeEtapa, relevosDeFlujo } from './flujo'
import { encargoRelevo, planParlamento, podarEvidencia } from './parlamento'
import { PLANTILLAS_CASA } from './plantillas'
import { ROLES_POR_DEFECTO } from './roles'

const casa = ROLES_POR_DEFECTO.map((r) => r.id)

describe('el relevo de un flujo sabe cuál es SU etapa', () => {
  const relevos = [
    { rol: 'explorador', motor: 'opencode', etapa: 'Explorar: entender dónde encaja' },
    { rol: 'constructor', motor: 'opencode', etapa: 'Construir: implementarla' },
    { rol: 'probador', motor: 'opencode', etapa: 'Probar: escribir y correr los tests' },
  ]
  const plan = planParlamento('Añade la exportación a CSV', relevos, ROLES_POR_DEFECTO)

  it('el plan lleva la etapa y cuántas hay', () => {
    expect(plan.map((p) => [p.etapa, p.total])).toEqual([
      ['Explorar: entender dónde encaja', 3], ['Construir: implementarla', 3], ['Probar: escribir y correr los tests', 3],
    ])
  })
  it('el primero hace solo su etapa y deja dicho lo que hizo', () => {
    const e = encargoRelevo(plan[0])
    expect(e).toContain('Tu etapa en este flujo (1 de 3): Explorar: entender dónde encaja')
    expect(e).toContain('Haz solo esta etapa')
    expect(e.indexOf('Tu etapa')).toBeLessThan(e.indexOf('Encargo:\nAñade la exportación a CSV'))
  })
  it('el del medio sabe que hubo uno antes (y que su evidencia está arriba)', () => {
    const e = encargoRelevo(plan[1], podarEvidencia({ resumen: 'Encaja en exportar.ts' }))
    expect(e).toContain('Tu etapa en este flujo (2 de 3): Construir: implementarla')
    expect(e).toContain('su evidencia está arriba')
    expect(e.indexOf('Evidencia del relevo anterior')).toBeLessThan(e.indexOf('Tu etapa'))
  })
  it('el último cierra y dice cómo quedó', () => {
    expect(encargoRelevo(plan[2], podarEvidencia({ resumen: 'hecho' }))).toContain('Es la última etapa')
  })
  it('sin etapa, el parlamento de siempre no cambia ni una letra', () => {
    const viejo = planParlamento('Arregla el reloj', [{ rol: 'constructor', motor: 'a' }, { rol: 'revisor', motor: 'b' }], ROLES_POR_DEFECTO)
    expect(viejo[0]).not.toHaveProperty('etapa')
    expect(viejo[0]).not.toHaveProperty('total')
    expect(encargoRelevo(viejo[1])).not.toContain('Tu etapa')
  })
})

describe('el oficio de cada etapa', () => {
  it('se deduce de sus palabras', () => {
    expect(oficioDeEtapa('Explorar: entender dónde encaja', casa)).toBe('explorador')
    expect(oficioDeEtapa('Probar: escribir y ejecutar los tests', casa)).toBe('probador')
    expect(oficioDeEtapa('Comprueba que la app abre', casa)).toBe('probador')
    expect(oficioDeEtapa('Revisar con ojo crítico', casa)).toBe('revisor')
    expect(oficioDeEtapa('Mirar el binario con ingeniería inversa', casa)).toBe('espejo')
    expect(oficioDeEtapa('Construir la pantalla de ajustes', casa)).toBe('constructor')
    expect(oficioDeEtapa('Un problema de rendimiento', casa)).toBe('constructor')   // «problema» no es «probar»
  })
  it('nunca elige un oficio que este equipo no tiene', () => {
    expect(oficioDeEtapa('Probar en Android', ['constructor', 'revisor'])).toBe('constructor')
    expect(oficioDeEtapa('Probar en Android', ['artesana'])).toBe('artesana')
  })
})

describe('de plantilla a relevos', () => {
  it('manda el oficio declarado; si no hay, se deduce; los motores se turnan', () => {
    const rs = relevosDeFlujo({ pasos: ['Explorar el código', 'Construirla', 'Probarla'], oficios: ['revisor'] }, ['opencode', 'claude'], casa)
    expect(rs).toEqual([
      { rol: 'revisor', motor: 'opencode', etapa: 'Explorar el código' },
      { rol: 'constructor', motor: 'claude', etapa: 'Construirla' },
      { rol: 'probador', motor: 'opencode', etapa: 'Probarla' },
    ])
  })
  it('un oficio declarado que el equipo no tiene se cambia por el deducido', () => {
    expect(relevosDeFlujo({ pasos: ['Probar todo', 'Arreglar'], oficios: ['brujo', 'constructor'] }, ['m'], casa)[0].rol).toBe('probador')
  })
  it('sin motor no hay relevos; los pasos vacíos no cuentan', () => {
    expect(relevosDeFlujo({ pasos: ['a', 'b'] }, [], casa)).toEqual([])
    expect(relevosDeFlujo({ pasos: ['Construir', '   ', 'Probar'] }, ['m'], casa)).toHaveLength(2)
  })
  it('se lanza de 2 a 5 relevos, y si no, dice por qué', () => {
    const n = (k: number) => Array.from({ length: k }, (_, i) => ({ rol: 'constructor', motor: 'm', etapa: `paso ${i}` }))
    expect(flujoLanzable(n(1))).toMatchObject({ ok: false })
    expect(flujoLanzable(n(MAX_RELEVOS + 1))).toMatchObject({ ok: false, motivo: expect.stringContaining(String(MAX_RELEVOS)) })
    expect(flujoLanzable(n(4))).toEqual({ ok: true })
  })
})

describe('los flujos de casa corren de verdad en el parlamento', () => {
  const flujos = PLANTILLAS_CASA.filter((p) => p.categoria === 'Flujo')
  it('cada uno declara un oficio conocido por paso', () => {
    for (const f of flujos) {
      expect(f.oficios?.length, f.id).toBe(f.pasos?.length)
      for (const o of f.oficios!) expect(casa, `${f.id}: ${o}`).toContain(o)
    }
  })
  it('el plan del parlamento los acepta enteros, con su etapa en cada relevo', () => {
    for (const f of flujos) {
      const rs = relevosDeFlujo({ pasos: f.pasos!, oficios: f.oficios }, ['opencode'], casa)
      expect(flujoLanzable(rs), f.id).toEqual({ ok: true })
      const plan = planParlamento(f.encargo, rs, ROLES_POR_DEFECTO)
      expect(plan.length, f.id).toBe(f.pasos!.length)
      expect(plan.every((p) => !!p.etapa), f.id).toBe(true)
    }
  })
})
