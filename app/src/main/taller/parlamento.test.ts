import { describe, expect, it } from 'vitest'
import { encargoRelevo, planParlamento, podarEvidencia, veredictoDe } from './parlamento'
import { ROLES_POR_DEFECTO } from './roles'

const cronistas = ROLES_POR_DEFECTO
const relevos = [
  { rol: 'constructor', motor: 'opencode' },
  { rol: 'revisor', motor: 'claude' },
  { rol: 'probador', motor: 'gemini' },
]

describe('planParlamento — el plan del comité', () => {
  it('tres relevos conocidos: tres pasos inobjetables, cada uno con su oficio', () => {
    const plan = planParlamento('Arregla el reloj de la mariposa', relevos, cronistas)
    expect(plan.map((p) => p.rol)).toEqual(['constructor', 'revisor', 'probador'])
    expect(plan.map((p) => p.orden)).toEqual([1, 2, 3])
    expect(plan.map((p) => p.motor)).toEqual(['opencode', 'claude', 'gemini'])
    expect(plan[0].instruccion).toContain('quien construye')
  })
  it('menos de dos relevos no es parlamento: es una tarea', () => {
    expect(planParlamento('algo', [relevos[0]], cronistas)).toEqual([])
    expect(planParlamento('   ', relevos, cronistas)).toEqual([])
  })
  it('un oficio desconocido detiene el plan: no se inventa', () => {
    expect(planParlamento('algo', [{ rol: 'brujo', motor: 'opencode' }, ...relevos], cronistas)).toEqual([])
  })
})

describe('encargoRelevo — el relevo cosido', () => {
  const plan = planParlamento('Arregla el reloj de la mariposa', relevos, cronistas)
  it('el primer relevo: oficio + encargo, sin evidencia que no existe', () => {
    const e = encargoRelevo(plan[0])
    expect(e).toContain('quien construye')
    expect(e).toContain('Encargo:\nArregla el reloj de la mariposa')
    expect(e).not.toContain('Evidencia')
  })
  it('el segundo: lo que dijo el anterior, los ficheros y lo que falló, cada cosa en su pieza', () => {
    const e = encargoRelevo(plan[1], podarEvidencia({
      resumen: 'Cambié el reloj y dejé el código limpio.',
      ficheros: [{ nombre: 'src/reloj.ts', mas: 12, menos: 3 }],
      caido: 'Gemini se negó a hacerlo',
    }))
    expect(e).toContain('quien revisa')
    expect(e).toContain('Evidencia del relevo anterior')
    expect(e).toContain('Cambié el reloj y dejé el código limpio.')
    expect(e).toContain('src/reloj.ts (+12/−3)')
    expect(e).toContain('Lo que quedó MAL en el camino anterior: Gemini se negó a hacerlo')
  })
  it('un texto largo se poda: el siguiente relevo no se ahoga', () => {
    const corta = encargoRelevo(plan[1], podarEvidencia({ resumen: 'f'.repeat(3000) }))
    expect(corta.length).toBeLessThan(1200)
    expect(corta.endsWith('…\n\nEncargo:\nArregla el reloj de la mariposa') || corta.includes('…\n\nEncargo:\n')).toBe(true)
  })
  it('sin evidencia real (todo vacío), el cosido deja fuera las líneas vacías', () => {
    const e = encargoRelevo(plan[1], { resumen: '   ', ficheros: [], caido: '  ' })
    expect(e).not.toContain('Evidencia')
    expect(e).toContain('quien revisa')
  })
})

describe('veredictoDe — lo que firma el último relevo', () => {
  it('dijo que pasan las pruebas: probado', () => {
    expect(veredictoDe({ resumen: 'Las 14 pruebas pasan con npm test.' }).estado).toBe('probado')
    expect(veredictoDe({ resumen: 'all tests pass' }).estado).toBe('probado')
  })
  it('dijo que no, o el relevo cayó o se negó: tumbado y con la frase del error', () => {
    expect(veredictoDe({ resumen: 'las pruebas fallan en el segundo caso' }).estado).toBe('dudoso')
    expect(veredictoDe({ caido: 'Gemini se negó a hacerlo' })).toEqual({ estado: 'tumbado', frase: 'El parlamento no llegó: Gemini se negó a hacerlo' })
  })
  it('no dijo nada: dudoso, no se encubre', () => {
    expect(veredictoDe({}).frase).toContain('sin veredicto')
    expect(veredictoDe({ resumen: '   ' }).estado).toBe('dudoso')
  })
})
