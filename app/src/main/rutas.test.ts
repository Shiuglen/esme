import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { rutasDe } from './rutas'

const base = { home: '/home/ana', userData: '/home/ana/.config/esme', resources: '/opt/Esme/resources', env: {} }

describe('dónde vive cada cosa', () => {
  it('en desarrollo, todo como siempre: ~/Daimon, su .venv y su mente', () => {
    const r = rutasDe({ ...base, empaquetada: false, plataforma: 'linux' })
    expect(r.python).toBe(join('/home/ana/Daimon', '.venv', 'bin', 'python3'))
    expect(r.mente).toBe(join('/home/ana/Daimon', 'data', 'mente_v2'))
    expect(r.cwdTerminal).toBe('/home/ana/Daimon')
    expect(r.extraPython).toBeNull()
  })
  it('instalada, el cerebro va dentro de la app y la memoria en la carpeta de datos del sistema', () => {
    const r = rutasDe({ ...base, empaquetada: true, plataforma: 'linux' })
    expect(r.python).toBe(join('/opt/Esme/resources', 'cerebro', 'python', 'bin', 'python3'))
    expect(r.mente).toBe(join('/home/ana/.config/esme', 'mente'))
    expect(r.cwdTerminal).toBe('/home/ana')
    expect(r.extraPython).toBe(join('/opt/Esme/resources', 'cerebro', 'paquetes'))
  })
  it('en Windows el Python está donde lo pone Windows', () => {
    expect(rutasDe({ ...base, empaquetada: true, plataforma: 'win32' }).python).toBe(join('/opt/Esme/resources', 'cerebro', 'python', 'python.exe'))
    expect(rutasDe({ ...base, empaquetada: false, plataforma: 'win32' }).python).toBe(join('/home/ana/Daimon', '.venv', 'Scripts', 'python.exe'))
  })
  it('DAIMON_ROOT y DAIMON_HOME mandan si los pones', () => {
    const r = rutasDe({ ...base, empaquetada: true, plataforma: 'linux', env: { DAIMON_ROOT: '/srv/daimon', DAIMON_HOME: '/srv/mente' } })
    expect(r.python).toBe(join('/srv/daimon', '.venv', 'bin', 'python3'))
    expect(r.mente).toBe('/srv/mente')
  })
})
