import { describe, expect, it } from 'vitest'
import { baseDe, encargoRelevo, ejecucionesDe, juezDe, parecioPrueba, planParlamento, podarEvidencia, veredictoDe } from './parlamento'
import { ROLES_POR_DEFECTO } from './roles'
import type { EventoMotor } from '../motores/sesion-acp'

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

describe('baseDe — el encargo limpio de una tarea vieja', () => {
  const oficio = ROLES_POR_DEFECTO[0].instruccion
  it('un texto de tarea con oficio suelta el oficio y devuelve lo que se pidió', () => {
    expect(baseDe(`${oficio}\n\nEncargo:\nArregla el reloj`)).toBe('Arregla el reloj')
  })
  it('un texto sencillo queda tal cual', () => {
    expect(baseDe('Arregla el reloj')).toBe('Arregla el reloj')
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

const ejecuto = (detalle: string, estado?: string): EventoMotor =>
  ({ tipo: 'herramienta', id: 'x', clase: 'execute', detalle, estado })
const maquina = (ejecuciones: EventoMotor[], resumen: string): { resumen: string; eventos: EventoMotor[] } => ({ resumen, eventos: ejecuciones })

describe('juezDe — la palabra no firma, la consola encaja o tumba', () => {
  it('dijo que pasaban y corrió las pruebas de verdad: probado se queda', () => {
    const j1 = juezDe(maquina([ejecuto('npm test', 'completed')], 'Las 3 pruebas pasan.'))
    expect(j1.estado).toBe('probado')
    expect(j1.frase).toBe('Las 3 pruebas pasan.')
    const j2 = juezDe(maquina([ejecuto('npx vitest run', 'completed'), ejecuto('git status', 'completed')], 'Las pruebas pasan.'))
    expect(j2.estado).toBe('probado')
  })
  it('dijo que pasaban sin haber corrido NADA: el juez le niega el probado', () => {
    const j = juezDe(maquina([], 'Las 3 pruebas pasan.'))
    expect(j.estado).toBe('dudoso')
    expect(j.frase).toContain('sin haber corrido nada')
    expect(j.frase).toContain('Las 3 pruebas pasan.')
  })
  it('corrió cosas, pero ninguna parece prueba: dudoso también', () => {
    const j = juezDe(maquina([ejecuto('git status', 'completed'), ejecuto('ls src', 'completed')], 'Las pruebas pasan.'))
    expect(j.estado).toBe('dudoso')
    expect(j.frase).toContain('no se ve que corriera una')
  })
  it('juró que pasaban pero su ÚLTIMA prueba acabó en fallo: palabra y consola chocan, tumbado', () => {
    const j = juezDe(maquina([ejecuto('git status', 'completed'), ejecuto('npm test', 'failed')], 'Las pruebas pasan, todo correcto.'))
    expect(j.estado).toBe('tumbado')
    expect(j.frase).toContain('su última prueba acabó en fallo')
    expect(j.frase).toContain('npm test')
  })
  it('una prueba que falló ANTES y otra que pasó después: no se tumba por la primera', () => {
    const j = juezDe(maquina([ejecuto('npm test', 'failed'), ejecuto('npm test', 'completed')], 'Ya pasan las pruebas.'))
    expect(j.estado).toBe('probado')
  })
  it('la caída del runtime es un hecho, no una opinión: inapelable con o sin consola', () => {
    expect(juezDe({ resumen: 'Las pruebas pasan.', caido: 'Gemini se negó a hacerlo', eventos: [ejecuto('npm test', 'completed')] }).estado).toBe('tumbado')
    expect(juezDe({ caido: 'se murió el motor' }).frase).toBe('El parlamento no llegó: se murió el motor')
  })
  it('quien no declaró nada claro no lo juzga nadie', () => {
    const j = juezDe(maquina([ejecuto('npm test', 'completed')], ''))
    expect(j.estado).toBe('dudoso')
    expect(j.frase).toContain('sin veredicto')
  })
})

describe('ejecucionesDe y parecioPrueba — la consola del probador', () => {
  it('solo las herramientas de la clase execute, con su detalle y su estado', () => {
    const eventos: EventoMotor[] = [
      { tipo: 'texto', texto: 'voy' },
      ejecuto('npm test', 'completed'),
      { tipo: 'herramienta', id: 'y', titulo: 'leer', clase: 'read', rutas: ['a.ts'] },
      ejecuto('pytest -q'),
    ]
    expect(ejecucionesDe(eventos)).toEqual([{ detalle: 'npm test', estado: 'completed' }, { detalle: 'pytest -q', estado: undefined }])
  })
  it('parecioPrueba: por el nombre manda', () => {
    expect(parecioPrueba('npm test')).toBe(true)
    expect(parecioPrueba('python -m pytest')).toBe(true)
    expect(parecioPrueba('npx tsc --check')).toBe(true)
    expect(parecioPrueba('go test ./...')).toBe(true)
    expect(parecioPrueba('git status')).toBe(false)
    expect(parecioPrueba('')).toBe(false)
    expect(parecioPrueba()).toBe(false)
  })
})
