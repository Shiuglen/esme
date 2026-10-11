// La escena del Atlas: tu memoria real como un mapa vivo. Tinta de día, luz de noche.
import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import type { Atlas } from '../lib/brain'
import { EXTENT, heightGrid, sampleHeight } from './terrain'

const GRID = 192
const LIFT = 0.34                       // altura máxima del relieve en unidades del mundo
const KIND: Record<string, number> = { note: 0, doc: 1, user_msg: 2, ai_msg: 3 }
export const WHO_COLOR: Record<string, string> = {
  chat: '#7ef2d0', claude: '#f0a860', opencode: '#7cc8ff', codex: '#c9a6ff', gemini: '#8fb4ff', agente: '#e6e2d6', app: '#7ef2d0',
}

const terrainVS = /* glsl */ `
  attribute float height;
  uniform float uLift;
  varying float vH; varying vec3 vPos; varying vec2 vXY;
  void main() {
    vH = height;
    vec3 p = position; p.y += height * uLift;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vPos = w.xyz; vXY = position.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`

const terrainFS = /* glsl */ `
  uniform float uDay, uTime, uExtent;
  varying float vH; varying vec3 vPos; varying vec2 vXY;
  float contour(float v, float width) {
    float fw = fwidth(v);
    float d = min(fract(v), 1.0 - fract(v));
    return 1.0 - smoothstep(0.0, fw * width, d);
  }
  void main() {
    vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
    float shade = clamp(dot(n, normalize(vec3(-0.55, 0.9, -0.45))), 0.0, 1.0);
    float minor = contour(vH * 26.0, 1.0) * smoothstep(0.015, 0.06, vH);
    float major = contour(vH * 6.5, 1.6) * smoothstep(0.01, 0.04, vH);
    float r = length(vXY) / uExtent;
    float edge = 1.0 - smoothstep(0.72, 1.0, r);

    // Noche: luz que fluye por las curvas de nivel; las cimas (lo que más sabes) brillan más
    float flow = 0.55 + 0.45 * sin(vH * 40.0 - uTime * 0.8 + vXY.x * 4.0 + vXY.y * 3.0);
    vec3 abyss = mix(vec3(0.012, 0.022, 0.028), vec3(0.03, 0.085, 0.09), smoothstep(0.0, 1.0, vH)) * (0.5 + 0.5 * shade);
    vec3 lum = vec3(0.30, 0.89, 0.76);
    vec3 peak = vec3(0.96, 0.84, 0.55);
    vec3 night = abyss + lum * minor * 0.09 + mix(lum, peak, smoothstep(0.55, 1.0, vH)) * major * (0.18 + 0.55 * vH) * flow;

    // Día: papel antiguo con sombreado de relieve y curvas en tinta
    vec3 paper = vec3(0.93, 0.895, 0.83) * (0.84 + 0.16 * shade);
    vec3 ink = vec3(0.16, 0.13, 0.10);
    vec3 day = mix(paper, ink, minor * 0.14 + major * 0.40);

    vec3 col = mix(night, day, uDay);
    gl_FragColor = vec4(col, edge);
  }`

const pointsVS = /* glsl */ `
  attribute float aLit; attribute float aKind;
  uniform float uPx, uTime;
  varying float vLit; varying float vKind;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float pulse = aLit > 0.0 ? 1.0 + 0.35 * sin(uTime * 6.0) : 1.0;
    gl_PointSize = (2.0 + aLit * 10.0 * pulse) * uPx * (2.6 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vLit = aLit; vKind = aKind;
  }`

const pointsFS = /* glsl */ `
  uniform float uDay;
  varying float vLit; varying float vKind;
  vec3 kindColor(float k, float day) {
    vec3 n0 = vec3(1.0, 0.82, 0.52), n1 = vec3(0.45, 0.95, 0.84), n2 = vec3(1.0, 0.62, 0.72), n3 = vec3(0.68, 0.80, 1.0);
    vec3 d0 = vec3(0.55, 0.32, 0.08), d1 = vec3(0.08, 0.36, 0.33), d2 = vec3(0.55, 0.16, 0.25), d3 = vec3(0.18, 0.25, 0.48);
    vec3 n = k < 0.5 ? n0 : k < 1.5 ? n1 : k < 2.5 ? n2 : n3;
    vec3 d = k < 0.5 ? d0 : k < 1.5 ? d1 : k < 2.5 ? d2 : d3;
    return mix(n, d, day);
  }
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, r);
    vec3 c = mix(kindColor(vKind, uDay), mix(vec3(1.0, 0.95, 0.85), vec3(0.65, 0.25, 0.05), uDay), vLit);
    gl_FragColor = vec4(c, soft * (0.5 + 0.5 * vLit) * mix(1.0, 0.85, uDay));
  }`

type Beam = { lines: THREE.LineSegments; marker: HTMLDivElement; anchor: THREE.Vector3; born: number }

export class AtlasScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(34, 1, 0.01, 50)
  private controls: MapControls
  private terrain: THREE.Mesh | null = null
  private points: THREE.Points | null = null
  private grid: Float32Array = new Float32Array(0)
  private idIndex = new Map<string, number>()
  private lit: Float32Array = new Float32Array(0)
  private beams: Beam[] = []
  private labels: { el: HTMLDivElement; pos: THREE.Vector3; size: number }[] = []
  private raf = 0
  private clock = new THREE.Clock()
  private dayTarget = 0
  private day = 0
  private dirty = true
  private raycaster = new THREE.Raycaster()
  private pointerNdc = new THREE.Vector2(9, 9)
  onHover: (id: string | null, x: number, y: number) => void = () => {}
  onPick: (id: string) => void = () => {}

  constructor(private readonly host: HTMLElement, private readonly overlay: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio))
    this.renderer.setClearColor(0x000000, 0)
    host.appendChild(this.renderer.domElement)
    this.camera.position.set(0, 1.55, 1.75)
    this.controls = new MapControls(this.camera, this.renderer.domElement)
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, screenSpacePanning: false, minDistance: 0.25, maxDistance: 4.2, maxPolarAngle: Math.PI * 0.44 })
    this.controls.target.set(0, 0, 0)
    this.controls.addEventListener('change', () => { this.dirty = true })
    this.raycaster.params.Points = { threshold: 0.012 }
    const el = this.renderer.domElement
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect()
      this.pointerNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      this.dirty = true
    })
    el.addEventListener('pointerleave', () => { this.pointerNdc.set(9, 9); this.onHover(null, 0, 0) })
    el.addEventListener('dblclick', () => { const id = this.hovered(); if (id) this.onPick(id) })
    new ResizeObserver(() => this.resize()).observe(host)
    if (import.meta.env.DEV) (window as unknown as { __atlas: AtlasScene }).__atlas = this   // depuración en desarrollo
    this.resize()
    this.loop()
  }

  private resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%'
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.dirty = true
  }

  setData(atlas: Atlas) {
    for (const o of [this.terrain, this.points]) if (o) { this.scene.remove(o); o.geometry.dispose() }
    this.labels.forEach((l) => l.el.remove()); this.labels = []
    this.grid = heightGrid(atlas.points, GRID)

    const geo = new THREE.PlaneGeometry(2 * EXTENT, 2 * EXTENT, GRID - 1, GRID - 1)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const heights = new Float32Array(pos.count)
    for (let k = 0; k < pos.count; k++) heights[k] = sampleHeight(this.grid, GRID, pos.getX(k), -pos.getZ(k))
    geo.setAttribute('height', new THREE.BufferAttribute(heights, 1))
    const tmat = new THREE.ShaderMaterial({
      vertexShader: terrainVS, fragmentShader: terrainFS, transparent: true, depthWrite: true,
      uniforms: { uLift: { value: LIFT }, uDay: { value: this.day }, uTime: { value: 0 }, uExtent: { value: EXTENT } },
    })
    this.terrain = new THREE.Mesh(geo, tmat)
    this.scene.add(this.terrain)

    const n = atlas.points.length
    const p = new Float32Array(n * 3), kind = new Float32Array(n)
    this.lit = new Float32Array(n); this.idIndex.clear()
    atlas.points.forEach((pt, i) => {
      const h = sampleHeight(this.grid, GRID, pt.x, pt.y)
      p.set([pt.x, h * LIFT + 0.006, -pt.y], i * 3)
      kind[i] = KIND[pt.kind] ?? 1
      this.idIndex.set(pt.id, i)
    })
    const pgeo = new THREE.BufferGeometry()
    pgeo.setAttribute('position', new THREE.BufferAttribute(p, 3))
    pgeo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1))
    pgeo.setAttribute('aLit', new THREE.BufferAttribute(this.lit, 1))
    const pmat = new THREE.ShaderMaterial({
      vertexShader: pointsVS, fragmentShader: pointsFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPx: { value: this.renderer.getPixelRatio() * 2.2 }, uDay: { value: this.day }, uTime: { value: 0 } },
    })
    this.points = new THREE.Points(pgeo, pmat)
    this.scene.add(this.points)

    for (const c of atlas.clusters) {
      const el = document.createElement('div')
      el.className = 'atlas-label'; el.textContent = c.label
      el.style.setProperty('--size', String(Math.min(1, 0.55 + c.size / 400)))
      this.overlay.appendChild(el)
      const h = sampleHeight(this.grid, GRID, c.x, c.y)
      this.labels.push({ el, pos: new THREE.Vector3(c.x, h * LIFT + 0.05, -c.y), size: c.size })
    }
    this.dirty = true
  }

  setDay(on: boolean) { this.dayTarget = on ? 1 : 0; this.dirty = true }

  /** Ilumina lo que alguien acaba de recordar y levanta un haz hacia su marca. */
  light(ids: string[], who: string, label: string) {
    const idx = ids.map((id) => this.idIndex.get(id)).filter((i): i is number => i !== undefined)
    if (!idx.length || !this.points) return
    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute
    const centroid = new THREE.Vector3()
    for (const i of idx) { this.lit[i] = 1; centroid.add(new THREE.Vector3().fromBufferAttribute(posAttr, i)) }
    centroid.divideScalar(idx.length)
    const anchor = centroid.clone().add(new THREE.Vector3(0, 0.32, 0))
    const verts: number[] = []
    for (const i of idx) { const v = new THREE.Vector3().fromBufferAttribute(posAttr, i); verts.push(v.x, v.y, v.z, anchor.x, anchor.y, anchor.z) }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    const color = new THREE.Color(WHO_COLOR[who] ?? WHO_COLOR.agente)
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.scene.add(lines)
    const marker = document.createElement('div')
    marker.className = 'atlas-who'; marker.style.setProperty('--who', WHO_COLOR[who] ?? WHO_COLOR.agente)
    marker.innerHTML = `<b>${who}</b><span>${label}</span>`
    this.overlay.appendChild(marker)
    this.beams.push({ lines, marker, anchor, born: this.clock.getElapsedTime() })
    ;(this.points.geometry.attributes.aLit as THREE.BufferAttribute).needsUpdate = true
    this.dirty = true
  }

  /** Vuela suavemente hasta un recuerdo. */
  focus(id: string) {
    const i = this.idIndex.get(id)
    if (i === undefined || !this.points) return
    const v = new THREE.Vector3().fromBufferAttribute(this.points.geometry.attributes.position as THREE.BufferAttribute, i)
    const from = this.controls.target.clone(), camFrom = this.camera.position.clone()
    const offset = camFrom.clone().sub(from).setLength(0.6)
    const t0 = performance.now()
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / 900), e = 1 - Math.pow(1 - t, 3)
      this.controls.target.lerpVectors(from, v, e)
      this.camera.position.lerpVectors(camFrom, v.clone().add(offset), e)
      this.dirty = true
      if (t < 1) requestAnimationFrame(step)
    }
    step()
    this.light([id], 'app', 'foco')
  }

  private hovered(): string | null {
    if (!this.points) return null
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)
    const hit = this.raycaster.intersectObject(this.points)[0]
    if (hit?.index === undefined) return null
    for (const [id, i] of this.idIndex) if (i === hit.index) return id
    return null
  }

  private project(v: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const p = v.clone().project(this.camera)
    return { x: (p.x * 0.5 + 0.5) * this.host.clientWidth, y: (-p.y * 0.5 + 0.5) * this.host.clientHeight, visible: p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 }
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    if (document.hidden) return
    const dt = this.clock.getDelta(), t = this.clock.getElapsedTime()
    this.controls.update()
    const dayMoving = Math.abs(this.dayTarget - this.day) > 0.001
    this.day += (this.dayTarget - this.day) * Math.min(1, dt * 2.5)
    let anyLit = false
    for (let i = 0; i < this.lit.length; i++) if (this.lit[i] > 0) { this.lit[i] = Math.max(0, this.lit[i] - dt * 0.18); anyLit = true }
    if (anyLit && this.points) (this.points.geometry.attributes.aLit as THREE.BufferAttribute).needsUpdate = true
    this.beams = this.beams.filter((b) => {
      const age = t - b.born
      ;(b.lines.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.85 * (1 - age / 6))
      if (age > 6) { this.scene.remove(b.lines); b.lines.geometry.dispose(); b.marker.remove(); return false }
      const s = this.project(b.anchor)
      b.marker.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -120%)`
      b.marker.style.opacity = String(s.visible ? Math.min(1, 1.6 * (1 - age / 6)) : 0)
      return true
    })
    // la noche fluye despacio (a ~30 fps en reposo); el resto se pinta solo cuando algo cambia
    const nightFlow = this.day < 0.5
    if (!this.dirty && !dayMoving && !anyLit && !this.beams.length && !(nightFlow && Math.floor(t * 30) !== Math.floor((t - dt) * 30))) return
    this.dirty = false
    for (const o of [this.terrain, this.points]) {
      const u = (o?.material as THREE.ShaderMaterial | undefined)?.uniforms
      if (u) { u.uDay.value = this.day; u.uTime.value = t }
    }
    if (this.points) (this.points.material as THREE.ShaderMaterial).blending = this.day > 0.5 ? THREE.NormalBlending : THREE.AdditiveBlending
    const dist = this.camera.position.distanceTo(this.controls.target)
    for (const l of this.labels) {
      const s = this.project(l.pos)
      const near = Math.max(0, Math.min(1, (3.2 - dist) / 1.4 + l.size / 600))
      l.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`
      l.el.style.opacity = String(s.visible ? 0.35 + 0.65 * near : 0)
    }
    const id = this.hovered()
    if (id) { const p = this.points!.geometry.attributes.position as THREE.BufferAttribute; const s = this.project(new THREE.Vector3().fromBufferAttribute(p, this.idIndex.get(id)!)); this.onHover(id, s.x, s.y) }
    else this.onHover(null, 0, 0)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.controls.dispose(); this.renderer.dispose(); this.renderer.domElement.remove()
    this.labels.forEach((l) => l.el.remove()); this.beams.forEach((b) => b.marker.remove())
  }
}
