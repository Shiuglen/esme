import { enjaular } from './motores/jaula'
// Proceso utilitario de terminales: aísla el módulo nativo (node-pty) del proceso principal.
import * as pty from '@lydell/node-pty'

type Msg =
  | { type: 'spawn'; id: string; cmd: string; args: string[]; cwd: string; env: Record<string, string>; cols: number; rows: number }
  | { type: 'write'; id: string; data: string }
  | { type: 'resize'; id: string; cols: number; rows: number }
  | { type: 'kill'; id: string }

const port = (process as unknown as { parentPort: { on: (ev: 'message', fn: (e: { data: Msg }) => void) => void; postMessage: (m: unknown) => void } }).parentPort
const terms = new Map<string, pty.IPty>()

port.on('message', ({ data: m }) => {
  if (m.type === 'spawn') {
    try {
      const t = pty.spawn(m.cmd, m.args, { name: 'xterm-256color', cols: m.cols, rows: m.rows, cwd: m.cwd, env: enjaular({ ...process.env, ...m.env }, Object.keys(m.env ?? {})).env as Record<string, string> })
      terms.set(m.id, t)
      t.onData((data) => port.postMessage({ type: 'data', id: m.id, data }))
      t.onExit(({ exitCode }) => { terms.delete(m.id); port.postMessage({ type: 'exit', id: m.id, code: exitCode }) })
    } catch (err) {
      port.postMessage({ type: 'data', id: m.id, data: `\r\n[no se pudo abrir: ${String(err)}]\r\n` })
      port.postMessage({ type: 'exit', id: m.id, code: -1 })
    }
  } else if (m.type === 'write') terms.get(m.id)?.write(m.data)
  else if (m.type === 'resize') terms.get(m.id)?.resize(Math.max(m.cols, 2), Math.max(m.rows, 2))
  else if (m.type === 'kill') terms.get(m.id)?.kill()
})
