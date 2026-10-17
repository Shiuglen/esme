// Lanza el cerebro (daimon serve) como proceso hijo y lee su anuncio {port, token}. Si muere, se relanza.
// Viaja por un envoltorio que cierra los descriptores heredados antes de ejecutar: sin esa higiene, el cerebro
// arrastraba consigo el socket del depurador de electron y las conexiones REMOTO caían en su máquina vacía.
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { createInterface } from 'node:readline'

// La higiene de descriptores: ese fd de escucha no es suyo y siempre lo suelta antes de buscar/oír el anuncio
const envoltorio = 'import os, sys; os.closerange(3, 65536); os.execv(sys.argv[1], ["daimon", "serve", "--home", sys.argv[2]])'

export type BrainInfo = { url: string; token: string }

export class BrainProcess {
  private child: ChildProcess | null = null
  private stopping = false
  info: BrainInfo | null = null

  constructor(private readonly daimonBin: string, private readonly home: string, private readonly onChange: (i: BrainInfo | null) => void) {}

  start(): Promise<BrainInfo> {
    return new Promise((resolve, reject) => {
      const arranque: SpawnOptions = { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DAIMON_PARENT_PID: String(process.pid) } }
      const python = `${dirname(this.daimonBin)}/python3`
      // si el python del venv existe, se pasa por el envoltorio limpio; si no, se lanza tal cual
      const child = existsSync(python)
        ? spawn(python, ['-c', envoltorio, this.daimonBin, this.home], arranque)
        : spawn(this.daimonBin, ['serve', '--home', this.home], arranque)
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
