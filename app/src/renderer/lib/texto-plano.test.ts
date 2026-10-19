import { describe, expect, it } from 'vitest'
import { sinMarkdown } from './texto-plano'

describe('la vista previa de un recuerdo es texto limpio', () => {
  it('sin almohadillas, asteriscos, viñetas ni enlaces crudos', () => {
    expect(sinMarkdown('## 6. Fases de implantación\n**4a. Cimientos:** - la [Lente](https://x.dev) va `primero`'))
      .toBe('6. Fases de implantación · 4a. Cimientos: la Lente va primero')
  })
  it('quita la fecha ISO repetida al principio', () => {
    expect(sinMarkdown('2026-10-12 — Decidí que el Taller use copias aisladas')).toBe('Decidí que el Taller use copias aisladas')
  })
  it('los bloques de código se resumen y los espacios se juntan', () => {
    expect(sinMarkdown('Mira:\n```ts\nconst a = 1\n```\n  fin')).toBe('Mira: [código] fin')
  })
})
