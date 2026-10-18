// La voz de Esme en la app: escuchar manos libres (para sola cuando dejas de hablar), convertir el audio a lo que espera
// el oído del cerebro (PCM float32, mono, 16 kHz) y dejar el texto listo para decirlo en voz alta (sin markdown, sin
// código, sin deletrear enlaces). Nada sale del equipo: el oído y la voz están en el cerebro local (daimon/voz.py).
import { useCallback, useEffect, useRef, useState } from 'react'

const FINAL = /[.:!?;,)»"…]$/

/** El texto de una respuesta, tal como suena bien dicho. Lo largo se corta en una frase y se deja el resto en pantalla. */
export function paraDecir(md: string, max = 700): string {
  const lineas = md
    .replace(/```[\s\S]*?```/g, '\n(te dejo el código en pantalla).\n')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'un enlace')
    .replace(/`([^`]+)`/g, '$1')
    .split('\n')
    .map((l) => l.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').replace(/\*\*|__|\*|_|~~/g, '').trim())
    .filter(Boolean)
    .map((l) => (FINAL.test(l) ? l : `${l}.`))
  const todo = lineas.join(' ').replace(/\s+/g, ' ').trim()
  if (todo.length <= max) return todo
  const corte = todo.slice(0, max).lastIndexOf('. ')
  return `${todo.slice(0, corte > 0 ? corte + 1 : max).trim()} El resto te lo dejo en pantalla.`
}

/** De la frecuencia del micrófono (44,1 o 48 kHz) a 16 kHz, interpolando. */
export function remuestrear(a: Float32Array, desde: number, hasta = 16000): Float32Array {
  if (desde === hasta) return a
  const r = desde / hasta, n = Math.floor(a.length / r), b = new Float32Array(n)
  for (let i = 0; i < n; i++) { const x = i * r, j = Math.floor(x), f = x - j; b[i] = a[j] * (1 - f) + (a[j + 1] ?? a[j]) * f }
  return b
}

/** Escucha manos libres: empieza al llamar a `empezar` y para sola tras un silencio cuando ya hablaste (o a los 60 s). */
export function useEscucha(onAudio: (pcm: Float32Array) => void, { silencioMs = 1300, umbral = 0.035, maxMs = 60_000 } = {}) {
  const [escuchando, setEscuchando] = useState(false)
  const [nivel, setNivel] = useState(0)
  const rec = useRef<{ parar(enviar: boolean): void } | null>(null)
  const cb = useRef(onAudio); cb.current = onAudio

  const parar = useCallback((enviar = true) => { rec.current?.parar(enviar); rec.current = null }, [])
  const empezar = useCallback(async () => {
    if (rec.current) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } })
    const ctx = new AudioContext(), fuente = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(4096, 1, 1)
    const trozos: Float32Array[] = []
    let hablo = false, ultimaVoz = performance.now(), terminado = false
    const inicio = performance.now()
    const fin = (enviar: boolean) => {
      if (terminado) return
      terminado = true
      proc.disconnect(); fuente.disconnect(); stream.getTracks().forEach((t) => t.stop()); void ctx.close()
      setEscuchando(false); setNivel(0); rec.current = null
      if (!enviar || !hablo) return
      const todo = new Float32Array(trozos.reduce((n, t) => n + t.length, 0)); let o = 0
      for (const t of trozos) { todo.set(t, o); o += t.length }
      cb.current(remuestrear(todo, ctx.sampleRate))
    }
    proc.onaudioprocess = (e) => {
      const d = new Float32Array(e.inputBuffer.getChannelData(0)); trozos.push(d)
      let m = 0; for (const v of d) m = Math.max(m, Math.abs(v))
      setNivel(Math.min(1, m * 2.5))
      const ahora = performance.now()
      if (m > umbral) { hablo = true; ultimaVoz = ahora }
      if ((hablo && ahora - ultimaVoz > silencioMs) || ahora - inicio > maxMs) fin(true)
    }
    fuente.connect(proc); proc.connect(ctx.destination)
    rec.current = { parar: fin }
    setEscuchando(true)
  }, [silencioMs, umbral, maxMs])
  useEffect(() => () => rec.current?.parar(false), [])
  return { escuchando, nivel, empezar, parar }
}

// —— lo que dice Esme: se reproduce con un analizador para que la esfera vibre al ritmo real de su voz ——
const oyentes = new Set<(n: number) => void>()
const avisar = (n: number) => oyentes.forEach((f) => f(n))
/** Lo fuerte que habla Esme ahora mismo (0–1): la esfera lo usa para vibrar con su voz. */
export function useNivelVoz() {
  const [n, setN] = useState(0)
  useEffect(() => { oyentes.add(setN); return () => { oyentes.delete(setN) } }, [])
  return n
}
let sonando: { parar(): void } | null = null
/** Reproduce lo que dice Esme (un WAV); si ya estaba hablando, la corta para decir lo nuevo. */
export async function reproducir(wav: Blob, alTerminar?: () => void) {
  sonando?.parar()
  const ctx = new AudioContext(), buf = await ctx.decodeAudioData(await wav.arrayBuffer())
  const src = ctx.createBufferSource(), an = ctx.createAnalyser()
  an.fftSize = 512; src.buffer = buf; src.connect(an); an.connect(ctx.destination)
  const datos = new Uint8Array(an.fftSize)
  let raf = 0, cortada = false
  const medir = () => { an.getByteTimeDomainData(datos); let m = 0; for (const v of datos) m = Math.max(m, Math.abs(v - 128)); avisar(Math.min(1, (m / 128) * 1.8)); raf = requestAnimationFrame(medir) }
  const fin = () => { cancelAnimationFrame(raf); avisar(0); void ctx.close(); if (sonando === yo) sonando = null }
  const yo = { parar: () => { cortada = true; try { src.stop() } catch { /* ya paró */ } fin() } }
  sonando = yo
  src.onended = () => { fin(); if (!cortada) alTerminar?.() }
  src.start(); medir()
}
export const callar = () => sonando?.parar()
export const hablando = () => sonando !== null
