import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'

const spawnMock = vi.fn()
vi.mock('node:child_process', () => ({ spawn: (...a: unknown[]) => spawnMock(...a) }))

import { BrainProcess } from './brain-process'

function fakeChild() {
  const c: any = new EventEmitter()
  c.stdout = new PassThrough(); c.stderr = new PassThrough()
  c.exitCode = null; c.signalCode = null
  c.kill = vi.fn()
  return c
}

describe('BrainProcess', () => {
  beforeEach(() => { spawnMock.mockReset(); vi.useRealTimers() })

  it('pasa DAIMON_PARENT_PID al hijo conservando el entorno', () => {
    const c = fakeChild(); spawnMock.mockReturnValue(c)
    new BrainProcess({ python: 'py', extraPython: null }, '/h', () => {}).start().catch(() => {})
    const opts = spawnMock.mock.calls[0][2]
    expect(opts.env.DAIMON_PARENT_PID).toBe(String(process.pid))
    expect(opts.env.PATH).toBe(process.env.PATH)
  })

  it('lanza el Python que le digan con el envoltorio limpio y la mente como argumento', () => {
    const c = fakeChild(); spawnMock.mockReturnValue(c)
    new BrainProcess({ python: '/r/cerebro/python/bin/python3', extraPython: null }, '/datos/mente', () => {}).start().catch(() => {})
    const [cmd, args, opts] = spawnMock.mock.calls[0]
    expect(cmd).toBe('/r/cerebro/python/bin/python3')
    expect(args[0]).toBe('-c')
    expect(args[1]).toContain('closerange')
    expect(args[1]).toContain('daimon.cli')
    expect(args.slice(2)).toEqual(['/datos/mente'])
    expect(opts.env.PYTHONPATH).toBeUndefined()
  })

  it('instalada, sus paquetes van por PYTHONPATH y no mira los del usuario', () => {
    const c = fakeChild(); spawnMock.mockReturnValue(c)
    new BrainProcess({ python: 'py', extraPython: '/r/cerebro/paquetes' }, '/h', () => {}).start().catch(() => {})
    const opts = spawnMock.mock.calls[0][2]
    expect(opts.env.PYTHONPATH).toBe('/r/cerebro/paquetes')
    expect(opts.env.PYTHONNOUSERSITE).toBe('1')
  })

  it('con puerto y token fijos, el cerebro los recibe (así tus otras IAs lo encuentran siempre en el mismo sitio)', () => {
    const c = fakeChild(); spawnMock.mockReturnValue(c)
    new BrainProcess({ python: 'py', extraPython: null, puerto: 47321, token: 'tok' }, '/h', () => {}).start().catch(() => {})
    expect(spawnMock.mock.calls[0][1].slice(2)).toEqual(['/h', '47321', 'tok'])
  })

  it('si el puerto fijo está ocupado (muere enseguida), reintenta con uno libre', () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const a = fakeChild(), b = fakeChild(); spawnMock.mockReturnValueOnce(a).mockReturnValueOnce(b)
    new BrainProcess({ python: 'py', extraPython: null, puerto: 47321, token: 'tok' }, '/h', () => {}).start().catch(() => {})
    a.emit('exit', 1)
    vi.advanceTimersByTime(2500)
    expect(spawnMock.mock.calls[1][1].slice(2)).toEqual(['/h', '0', 'tok'])
  })

  it('con código 3 no reintenta y deja info=null', () => {
    vi.useFakeTimers()
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const c = fakeChild(); spawnMock.mockReturnValue(c)
    const b = new BrainProcess({ python: 'py', extraPython: null }, '/h', () => {})
    b.start().catch(() => {})
    c.emit('exit', 3)
    vi.advanceTimersByTime(10_000)
    expect(spawnMock).toHaveBeenCalledTimes(1)
    expect(b.info).toBeNull()
    expect(err).toHaveBeenCalledWith('[cerebro] otra instancia usa esta mente')
  })

  it('stop envía SIGTERM y SIGKILL a los 5 s si sigue vivo', () => {
    vi.useFakeTimers()
    const c = fakeChild(); spawnMock.mockReturnValue(c)
    const b = new BrainProcess({ python: 'py', extraPython: null }, '/h', () => {})
    b.start().catch(() => {})
    b.stop()
    expect(c.kill).toHaveBeenCalledWith('SIGTERM')
    vi.advanceTimersByTime(5000)
    expect(c.kill).toHaveBeenCalledWith('SIGKILL')
  })
})
