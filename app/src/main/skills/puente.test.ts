// PUENTE (verificación de una vez, no puerta): la mente (Python) escribe el esqueleto y la
// app (TypeScript) lo instala. Atraviesa la frontera real entre las dos lenguas.
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, readlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { instalarPropuesta } from './propuesta'

const py = `
import sys, json, tempfile, pathlib
sys.path.insert(0, '/home/sakai/Daimon')
from tests.fakes import fake_encoder
from daimon.home import Home
from daimon.ingest import Event
from daimon.repeticion import propuesta
tmp = pathlib.Path(tempfile.mkdtemp())
enc, dim = fake_encoder(32)
h = Home(tmp / "mente", encoder=(enc, dim))
otros = ["mide el consumo de memoria del servidor en reposo y anótalo en el informe",
         "publica la versión nueva en la tienda de skins con su licencia leída",
         "arregla el test que falla en la puerta del taller con el motor lento",
         "escribe la guía de instalación para el servidor con el nginx delante",
         "mide el consumo de la app en reposo con la tarea en marcha"]
h.add([Event(f"r{i}", t, "encargo", "user_msg", "2026-10-01T10:00:00Z", 1.0) for i, t in enumerate(otros)])
h.add([Event(f"x{i}", "actualiza el README del proyecto con la instalación nueva", "encargo", "user_msg", "2026-10-02T10:00:00Z", 1.0) for i in (1, 2, 3)])
print(json.dumps(propuesta(h)["repeticiones"][0]["borrador"], ensure_ascii=False))
`

// El puente sólo se prueba donde está la mente (este equipo). En otro sitio, se salta:
// la puerta de la app no puede depender de Python.
const VENT = '/home/sakai/Daimon/.venv/bin/python'
const HAY_MENTE = existsSync(VENT) && existsSync('/home/sakai/Daimon/daimon/repeticion.py')

describe.skipIf(!HAY_MENTE)('el puente entre la mente y la app', () => {
  it('lo que la mente propone, la app lo instala sin tocar una coma', () => {
    const borrador = JSON.parse(execFileSync(VENT, ['-c', py], { encoding: 'utf8' }))
    const raiz = mkdtempSync(join(tmpdir(), 'receta-'))
    const home = join(raiz, 'home')
    const datos = join(raiz, 'datos')
    const r = instalarPropuesta({ ...borrador, agentes: ['claude', 'opencode'] }, { home, datos })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const skill = readFileSync(join(r.canonica, 'SKILL.md'), 'utf8')
    console.log(skill)
    expect(skill).toContain(`name: ${borrador.nombre}`)
    expect(skill).toContain(borrador.descripcion.split(':')[0])
    expect(readlinkSync(join(home, '.claude', 'skills', borrador.nombre))).toBe(r.canonica)
    expect(existsSync(join(r.canonica, '.esme-skill.json'))).toBe(true)
  })
})
