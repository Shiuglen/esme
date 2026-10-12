import { describe, expect, it } from 'vitest'
import { contarLineas, lados, leerDiff } from './diff'

const DIFF = `diff --git a/src/a.ts b/src/a.ts
index 111..222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@ export function a() {
 uno
-dos
+DOS
+tres
 cuatro
\\ No newline at end of file
diff --git a/nuevo.txt b/nuevo.txt
new file mode 100644
index 0000000..333
--- /dev/null
+++ b/nuevo.txt
@@ -0,0 +1 @@
+hola
diff --git a/logo.png b/logo.png
new file mode 100644
index 0000000..444
Binary files /dev/null and b/logo.png differ
diff --git a/viejo.md b/viejo.md
deleted file mode 100644
--- a/viejo.md
+++ /dev/null
@@ -1 +0,0 @@
-adiós
`

describe('leerDiff', () => {
  const f = leerDiff(DIFF)
  it('separa los ficheros y sus estados', () => {
    expect(f.map((x) => [x.ruta, x.estado])).toEqual([['src/a.ts', 'cambiado'], ['nuevo.txt', 'nuevo'], ['logo.png', 'nuevo'], ['viejo.md', 'borrado']])
    expect(f[2].binario).toBe(true)
  })
  it('cuenta líneas y numera cada lado como en el original', () => {
    expect([f[0].mas, f[0].menos]).toEqual([2, 1])
    expect(f[0].lineas).toEqual([
      { tipo: 'trozo', texto: '@@ -1,3 +1,4 @@ export function a() {' },
      { tipo: 'igual', texto: 'uno', a: 1, b: 1 },
      { tipo: 'menos', texto: 'dos', a: 2 },
      { tipo: 'mas', texto: 'DOS', b: 2 },
      { tipo: 'mas', texto: 'tres', b: 3 },
      { tipo: 'igual', texto: 'cuatro', a: 3, b: 4 },
    ])
  })
  it('un texto vacío no da ficheros', () => expect(leerDiff('')).toEqual([]))
})

describe('contarLineas', () => {
  it('cuenta líneas añadidas y quitadas entre dos versiones', () => {
    expect(contarLineas('a\nb\nc', 'a\nB\nc\nd')).toEqual({ mas: 2, menos: 1 })
  })
  it('un fichero nuevo solo suma y uno vaciado solo resta', () => {
    expect(contarLineas(undefined, 'x\ny')).toEqual({ mas: 2, menos: 0 })
    expect(contarLineas('x\ny', '')).toEqual({ mas: 0, menos: 2 })
  })
  it('las líneas repetidas cuentan cada una', () => {
    expect(contarLineas('}\n}', '}\n}\n}')).toEqual({ mas: 1, menos: 0 })
  })
})

describe('lados', () => {
  it('separa el antes y el después de un fichero y dice de dónde sale cada línea', () => {
    const [f] = leerDiff(DIFF)
    const l = lados(f)
    expect(l.viejo).toEqual(['uno', 'dos', 'cuatro'])
    expect(l.nuevo).toEqual(['uno', 'DOS', 'tres', 'cuatro'])
    expect(l.indice).toEqual([null, { lado: 'nuevo', k: 0 }, { lado: 'viejo', k: 1 }, { lado: 'nuevo', k: 1 }, { lado: 'nuevo', k: 2 }, { lado: 'nuevo', k: 3 }])
  })
})
