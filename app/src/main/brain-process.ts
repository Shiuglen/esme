// Lanza el cerebro (daimon serve) como proceso hijo y lee su anuncio {port, token}. Si muere, se relanza.
// Viaja por un envoltorio que cierra los descriptores heredados antes de ejecutar: sin esa higiene, el cerebro
// arrastraba consigo el socket del depurador de electron y las conexiones REMOTO caían en su máquina vacía.
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process'
import { createInterface } from 'node:readline'

// La higiene de descriptores: ese fd de escucha no es suyo y siempre lo suelta antes de buscar/oír el anuncio. Después llama
// al cerebro en el mismo proceso: así vale igual con el .venv de desarrollo que con el Python autónomo de la versión instalada.
const envoltorio = 'import os, sys; os.closerange(3, 65536); from daimon.cli import main; main(["serve", "--home", sys.argv[1]])'
export type Cerebro = { python: string; extraPython: string | null }

export type BrainInfo = { url: string; token: string }

export class BrainProcess {
  private child: ChildProcess | null = null
  private stopping = false
  info: BrainInfo | null = null

  constructor(private readonly cerebro: Cerebro, private readonly home: string, private readonly onChange: (i: BrainInfo | null) => void) {}

  start(): Promise<BrainInfo> {
    return new Promise((resolve, reject) => {
      const { python, extraPython } = this.cerebro
      // instalada, sus paquetes van aparte (PYTHONPATH) y nunca se mezclan con los del usuario
      const env = { ...process.env, DAIMON_PARENT_PID: String(process.pid), ...(extraPython ? { PYTHONPATH: extraPython, PYTHONNOUSERSITE: '1' } : {}) }
      const arranque: SpawnOptions = { stdio: ['ignore', 'pipe', 'pipe'], env }
      const child = spawn(python, ['-c', envoltorio, this.home], arranque)
      this.child = child
      const rl = createInterface({ input: child.stdout! })
      const timer = setTimeout(() => reject(new Error('el cerebro no respondió en 120 s')), 120_000)
      rl.once('line', (line) => {
        clearTimeout(timer)
        try {
          const { port, token } = JSON.parse(line)
          this.info = { url: `http://127.0.0.1:${port}`, token }
          this.onChange(this.info)
          resolve(this.info)
        } catch (e) { reject(e) }
      })
      child.stderr!.on('data', (d) => process.stderr.write(`[cerebro] ${d}`))
      child.on('exit', (code) => {
        this.info = null
        this.onChange(null)
        if (code === 3) console.error('[cerebro] otra instancia usa esta mente')   // no reintentar en bucle
        else if (!this.stopping) setTimeout(() => this.start().catch(() => {}), 2000)   // reintento
        if (code !== 0) clearTimeout(timer)
      })
    })
  }

  stop() {
    this.stopping = true
    const child = this.child
    if (!child || child.exitCode !== null || child.signalCode !== null) return
    child.kill('SIGTERM')
    const t = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL') }, 5000)
    child.once('exit', () => clearTimeout(t))
  }
}
