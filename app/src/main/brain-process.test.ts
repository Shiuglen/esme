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
    new BrainProcess('daimon', '/h', () => {}).start().catch(() => {})
    const opts = spawnMock.mock.calls[0][2]
    expect(opts.env.DAIMON_PARENT_PID).toBe(String(process.pid))
    expect(opts.env.PATH).toBe(process.env.PATH)
  })

  it('con código 3 no reintenta y deja info=null', () => {
    vi.useFakeTimers()
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const c = fakeChild(); spawnMock.mockReturnValue(c)
    const b = new BrainProcess('daimon', '/h', () => {})
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
    const b = new BrainProcess('daimon', '/h', () => {})
    b.start().catch(() => {})
    b.stop()
    expect(c.kill).toHaveBeenCalledWith('SIGTERM')
    vi.advanceTimersByTime(5000)
    expect(c.kill).toHaveBeenCalledWith('SIGKILL')
  })
})
