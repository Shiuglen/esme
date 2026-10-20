// Genera src/main/skills/catalogo.json: las skills que Esme ofrece, cada una fijada a un commit revisado con la huella de su
// árbol (la misma fórmula que arbolSha256 en src/main/skills/descargar.ts) y su licencia leída EN SU CARPETA (si es
// propietaria o no hay, se excluye). Uso: node scripts/catalogo-skills.mjs   (necesita `gh` con sesión, solo lectura)
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

// [id, repo, carpeta, grupo, descripción en español] — licencias verificadas en docs/investigacion/2026-10-19-skills.md §3.2
const ELEGIDAS = [
  ['anthropics/frontend-design', 'anthropics/skills', 'frontend-design', 'Diseño', 'Interfaces con personalidad propia: tipografía, color y composición con intención, lejos de lo genérico.'],
  ['anthropics/canvas-design', 'anthropics/skills', 'canvas-design', 'Diseño', 'Piezas visuales (pósters, láminas) diseñadas como obra, en PNG o PDF.'],
  ['anthropics/theme-factory', 'anthropics/skills', 'theme-factory', 'Diseño', 'Temas visuales completos (color y letra) para documentos, webs y presentaciones.'],
  ['vercel/web-design-guidelines', 'vercel-labs/agent-skills', 'web-design-guidelines', 'Diseño', 'Revisa una interfaz contra las buenas prácticas de diseño web de Vercel.'],
  ['vercel/composition-patterns', 'vercel-labs/agent-skills', 'composition-patterns', 'Código', 'Patrones de composición de componentes React que escalan sin volverse un lío.'],
  ['vercel/react-best-practices', 'vercel-labs/agent-skills', 'react-best-practices', 'Código', 'Rendimiento y buenas prácticas de React y Next.js según el equipo de Vercel.'],
  ['vercel/react-view-transitions', 'vercel-labs/agent-skills', 'react-view-transitions', 'Diseño', 'Transiciones de vista en React que se sienten nativas y fluidas.'],
  ['vercel/writing-guidelines', 'vercel-labs/agent-skills', 'writing-guidelines', 'Escritura', 'Escribe textos de producto claros y consistentes, como el equipo de Vercel.'],
  ['mattpocock/tdd', 'mattpocock/skills', 'tdd', 'Código', 'Desarrollo guiado por tests: rojo, verde y refactorizar, de verdad.'],
  ['mattpocock/diagnosing-bugs', 'mattpocock/skills', 'diagnosing-bugs', 'Código', 'Encuentra la causa de un fallo antes de tocar código, con hipótesis y pruebas.'],
  ['mattpocock/code-review', 'mattpocock/skills', 'code-review', 'Código', 'Revisión de código a fondo: errores, legibilidad y riesgos, con hallazgos concretos.'],
  ['mattpocock/improve-codebase-architecture', 'mattpocock/skills', 'improve-codebase-architecture', 'Código', 'Mejora la arquitectura de un proyecto paso a paso, sin romper lo que funciona.'],
  ['mattpocock/research', 'mattpocock/skills', 'research', 'Investigación', 'Investiga un tema con método y devuelve conclusiones con sus fuentes.'],
  ['mattpocock/grill-me', 'mattpocock/skills', 'grill-me', 'Método', 'Te interroga sobre tu plan hasta que no le queden huecos (solo cuando la llamas).'],
  ['mattpocock/handoff', 'mattpocock/skills', 'handoff', 'Método', 'Deja un traspaso claro para que otro agente (o tú mañana) siga donde quedó.'],
  ['superpowers/systematic-debugging', 'obra/superpowers', 'systematic-debugging', 'Código', 'Depuración sistemática: reproducir, aislar, entender la causa raíz y solo entonces arreglar.'],
  ['superpowers/test-driven-development', 'obra/superpowers', 'test-driven-development', 'Código', 'El ciclo de TDD estricto: ningún código sin un test que falle primero.'],
  ['superpowers/verification-before-completion', 'obra/superpowers', 'verification-before-completion', 'Método', 'Nada se da por hecho sin pruebas: verifica antes de decir «listo».'],
  ['superpowers/brainstorming', 'obra/superpowers', 'brainstorming', 'Método', 'De idea a diseño: preguntas, alternativas y un plan antes de construir.'],
  ['superpowers/writing-plans', 'obra/superpowers', 'writing-plans', 'Método', 'Planes de implementación que otro agente puede ejecutar sin adivinar.'],
  ['anthropics/mcp-builder', 'anthropics/skills', 'mcp-builder', 'Código', 'Construye servidores MCP de calidad para dar herramientas nuevas a cualquier IA.'],
  ['anthropics/skill-creator', 'anthropics/skills', 'skill-creator', 'Método', 'Crea skills nuevas siguiendo el estándar, probadas y bien descritas.'],
  ['anthropics/webapp-testing', 'anthropics/skills', 'webapp-testing', 'Código', 'Prueba aplicaciones web con un navegador automatizado (trae scripts).'],
  ['openai/playwright', 'openai/skills', 'playwright', 'Código', 'Automatiza un navegador con Playwright para probar y recorrer webs.'],
  ['openai/security-best-practices', 'openai/skills', 'security-best-practices', 'Código', 'Revisa la seguridad de tu código con buenas prácticas por lenguaje.'],
  ['openai/gh-fix-ci', 'openai/skills', 'gh-fix-ci', 'Código', 'Investiga y arregla la integración continua de GitHub cuando falla.'],
  ['openai/pdf', 'openai/skills', 'pdf', 'Documentos', 'Lee, crea y transforma PDF.'],
  ['openai/openai-docs', 'openai/skills', 'openai-docs', 'Investigación', 'Consulta la documentación oficial de OpenAI para responder con datos al día.'],
  ['marketing/copywriting', 'coreyhaines31/marketingskills', 'copywriting', 'Escritura', 'Textos que convencen: titulares, páginas y llamadas a la acción.'],
  ['marketing/content-strategy', 'coreyhaines31/marketingskills', 'content-strategy', 'Escritura', 'Estrategia de contenidos: temas, calendario y por qué cada pieza.'],
  // La colección de addy Osmani (MIT, 108.668★ el 20-oct-2026): 25 skills de ingeniería y método.
  // Es la mayor colección abierta y verificada que existe; se copia la carpeta entera, así que sus
  // `references/` viajan con ella (el fallo #361 de `npx skills add` no aplica aquí).
  ['addy/context-engineering', 'addyosmani/agent-skills', 'context-engineering', 'Método', 'Ingeniería de contexto: cómo darle a un agente lo justo en el momento justo.'],
  ['addy/spec-driven-development', 'addyosmani/agent-skills', 'spec-driven-development', 'Método', 'Desarrollar desde una especificación escrita antes de la primera línea de código.'],
  ['addy/test-driven-development', 'addyosmani/agent-skills', 'test-driven-development', 'Método', 'La disciplina del test primero, con sus reglas y su ritmo.'],
  ['addy/code-review-and-quality', 'addyosmani/agent-skills', 'code-review-and-quality', 'Método', 'Revisar código como un revisor exigente: qué mirar y qué no perdonar.'],
  ['addy/code-simplification', 'addyosmani/agent-skills', 'code-simplification', 'Método', 'Quitar lo de más: menos código, menos casos, menos superficie.'],
  ['addy/doubt-driven-development', 'addyosmani/agent-skills', 'doubt-driven-development', 'Método', 'Construir dudando: poner a prueba lo que parece funcionar antes de creerlo.'],
  ['addy/constraint-driven-development', 'addyosmani/agent-skills', 'constraint-driven-development', 'Método', 'Las restricciones como motor: acotar el problema hasta que la solución se ve.'],
  ['addy/incremental-implementation', 'addyosmani/agent-skills', 'incremental-implementation', 'Método', 'Avanzar en pasos que dejo la rama verde en todo momento.'],
  ['addy/planning-and-task-breakdown', 'addyosmani/agent-skills', 'planning-and-task-breakdown', 'Método', 'Partir un objetivo grande en tareas que se pueden cerrar y verificar.'],
  ['addy/idea-refine', 'addyosmani/agent-skills', 'idea-refine', 'Método', 'Afinar una idea floja hasta que se pueda empezar a trabajar en ella.'],
  ['addy/interview-me', 'addyosmani/agent-skills', 'interview-me', 'Investigación', 'Preguntar bien: sacar de alguien lo que sabe sin cansarle.'],
  ['addy/source-driven-development', 'addyosmani/agent-skills', 'source-driven-development', 'Investigación', 'Desarrollar desde las fuentes: leer la documentación y el código antes de inventar.'],
  ['addy/debugging-and-error-recovery', 'addyosmani/agent-skills', 'debugging-and-error-recovery', 'Método', 'Encontrar la causa raíz y no el síntoma; y recuperarse cuando algo falla.'],
  ['addy/deprecation-and-migration', 'addyosmani/agent-skills', 'deprecation-and-migration', 'Código', 'Retirar lo viejo y migrar a lo nuevo sin romper a nadie por el camino.'],
  ['addy/api-and-interface-design', 'addyosmani/agent-skills', 'api-and-interface-design', 'Diseño', 'Diseñar APIs e interfaces que se puedan usar bien a la primera.'],
  ['addy/frontend-ui-engineering', 'addyosmani/agent-skills', 'frontend-ui-engineering', 'Diseño', 'Ingeniería de interfaz: estados, carga, error y los detalles que no se ven.'],
  ['addy/browser-testing-with-devtools', 'addyosmani/agent-skills', 'browser-testing-with-devtools', 'Código', 'Probar una web con las herramientas del navegador y leer lo que de verdad pasa.'],
  ['addy/performance-optimization', 'addyosmani/agent-skills', 'performance-optimization', 'Código', 'Medir antes de optimizar y atacar primero lo que se nota.'],
  ['addy/observability-and-instrumentation', 'addyosmani/agent-skills', 'observability-and-instrumentation', 'Código', 'Instrumentar para saber qué pasa de verdad en producción.'],
  ['addy/security-and-hardening', 'addyosmani/agent-skills', 'security-and-hardening', 'Código', 'Endurecer lo que se entrega: dependencias, entradas, secretos y permisos.'],
  ['addy/ci-cd-and-automation', 'addyosmani/agent-skills', 'ci-cd-and-automation', 'Código', 'Automatizar la integración continua sin convertirla en una pesadilla.'],
  ['addy/git-workflow-and-versioning', 'addyosmani/agent-skills', 'git-workflow-and-versioning', 'Código', 'Flujo de trabajo con Git: ramas, commits y deshacer sin perder nada.'],
  ['addy/documentation-and-adrs', 'addyosmani/agent-skills', 'documentation-and-adrs', 'Documentos', 'Escribir documentación que aguanta el paso del tiempo y decisiones con su porqué.'],
  ['addy/shipping-and-launch', 'addyosmani/agent-skills', 'shipping-and-launch', 'Método', 'De «listo» a publicado: la última mile, que es donde se cae lo demás.'],
  ['addy/using-agent-skills', 'addyosmani/agent-skills', 'using-agent-skills', 'Método', 'Cómo usar bien las skills: elegir, combinar y no duplicar effort.'],
]

const gh = (ruta) => JSON.parse(execFileSync('gh', ['api', ruta], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
const sha = (b) => createHash('sha256').update(b).digest('hex')
const huella = (fs) => { const h = createHash('sha256'); for (const f of [...fs].sort((a, b) => (a.ruta < b.ruta ? -1 : 1))) h.update(`${f.ruta}\0${sha(f.datos)}\n`); return h.digest('hex') }
if (huella([{ ruta: 'SKILL.md', datos: Buffer.from('hola') }]) !== 'dcfdf15be51ef20066d44d8bd13f461843b3a4b3463a14f57419fa524f79c481') throw new Error('la huella no coincide con descargar.ts')
const licenciaDe = (t) => /Apache License[\s\S]{0,200}Version 2\.0/i.test(t) ? 'Apache-2.0' : /\bMIT License\b|Permission is hereby granted, free of charge/i.test(t) ? 'MIT'
  : /all rights reserved/i.test(t) ? 'propietaria' : null
const EJECUTABLE = /\.(py|sh|bash|zsh|js|mjs|cjs|ts|ps1|bat|cmd|exe|rb|pl|php)$/i

const arboles = new Map(), out = []
for (const [id, repo, carpeta, grupo, descripcionEs] of ELEGIDAS) {
  try {
    if (!arboles.has(repo)) {
      const commit = gh(`repos/${repo}/commits/HEAD`).sha
      const repoLic = (() => { try { return gh(`repos/${repo}/license`).license?.spdx_id } catch { return null } })()
      arboles.set(repo, { commit, repoLic, tree: gh(`repos/${repo}/git/trees/${commit}?recursive=1`).tree })
    }
    const { commit, repoLic, tree } = arboles.get(repo)
    const md = tree.find((x) => x.type === 'blob' && (x.path === `${carpeta}/SKILL.md` || x.path.endsWith(`/${carpeta}/SKILL.md`)))
    if (!md) { console.error(`· ${id}: no encontré ${carpeta}/SKILL.md en ${repo}`); continue }
    const ruta = md.path.slice(0, -'/SKILL.md'.length)
    const blobs = tree.filter((x) => x.path.startsWith(`${ruta}/`) && x.type === 'blob')
    if (tree.some((x) => x.path.startsWith(`${ruta}/`) && (x.mode === '120000' || x.type === 'commit'))) { console.error(`· ${id}: trae enlaces o submódulos, fuera`); continue }
    const ficheros = []
    for (const b of blobs) {
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/${commit}/${b.path.split('/').map(encodeURIComponent).join('/')}`)
      if (!r.ok) throw new Error(`${b.path}: ${r.status}`)
      ficheros.push({ ruta: b.path.slice(ruta.length + 1), datos: Buffer.from(await r.arrayBuffer()), modo: b.mode })
    }
    const propia = ficheros.find((f) => /^LICEN[SC]E(\.txt|\.md)?$/i.test(f.ruta))
    const licencia = (propia && licenciaDe(propia.datos.toString('utf8'))) || (repoLic && repoLic !== 'NOASSERTION' ? repoLic : null)
      || (repo === 'vercel-labs/agent-skills' ? 'MIT' : null)   // MIT declarado en su README (el repo no trae LICENSE)
    if (!licencia || licencia === 'propietaria') { console.error(`· ${id}: licencia ${licencia ?? 'desconocida'}, fuera`); continue }
    const skill = ficheros.find((f) => f.ruta === 'SKILL.md').datos.toString('utf8')
    const descripcion = (/\ndescription:\s*(?:"([^"]*)"|'([^']*)'|(.*))/.exec(skill) ?? []).slice(1).find(Boolean)?.trim() ?? ''
    out.push({ id, nombre: carpeta, grupo, descripcionEs, descripcion, repo, ruta, commit, arbolSha256: huella(ficheros), licencia,
      tieneScripts: ficheros.some((f) => f.modo === '100755' || f.ruta.startsWith('scripts/') || EJECUTABLE.test(f.ruta)),
      ficheros: ficheros.length, bytes: ficheros.reduce((s, f) => s + f.datos.length, 0), revisadoEl: new Date().toISOString().slice(0, 10) })
    console.error(`✓ ${id} (${licencia}, ${ficheros.length} ficheros)`)
  } catch (e) { console.error(`· ${id}: ${e.message}`) }
}
writeFileSync(new URL('../src/main/skills/catalogo.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`)
console.error(`${out.length} skills en el catálogo`)
