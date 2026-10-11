// Lanza el cerebro (daimon serve) como proceso hijo y lee su anuncio {port, token}. Si muere, se relanza.
import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'

export type BrainInfo = { url: string; token: string }

export class BrainProcess {
  private child: ChildProcess | null = null
  private stopping = false
  info: BrainInfo | null = null

  constructor(private readonly daimonBin: string, private readonly home: string, private readonly onChange: (i: BrainInfo | null) => void) {}

  start(): Promise<BrainInfo> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.daimonBin, ['serve', '--home', this.home], { stdio: ['ignore', 'pipe', 'pipe'] })
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
        if (!this.stopping) setTimeout(() => this.start().catch(() => {}), 2000)   // reintento
        if (code !== 0) clearTimeout(timer)
      })
    })
  }

  stop() { this.stopping = true; this.child?.kill() }
}
