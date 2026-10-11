// El Núcleo: tu mente como un cristal vivo. Dentro, un filamento de luz por cada región real de tu memoria.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Atlas } from '../lib/brain'

const TIDE = new THREE.Color('#3fe0c5'), EMBER = new THREE.Color('#f2b36d')

// ruido 3D (Ashima, dominio público) para la respiración orgánica del cristal
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`

type Thread = { line: THREE.Line; mat: THREE.LineBasicMaterial; base: THREE.Color; heat: number; cluster: number; tip: THREE.Vector3; label: string }

export class CoreScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  private controls: OrbitControls
  private composer: EffectComposer
  private bloom: UnrealBloomPass
  private crystal: THREE.Mesh
  private uniforms = { uTime: { value: 0 }, uPulse: { value: 0 } }
  private threads: Thread[] = []
  private motes: THREE.Points | null = null
  private clusterOf = new Map<string, number>()
  private clock = new THREE.Clock()
  private raf = 0
  private pulse = 0
  private heart: THREE.Sprite | null = null
  private shift = 0
  private shiftTarget = 0

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.setClearColor(0x000000, 0)
    host.appendChild(this.renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    this.camera.position.set(0, 0.25, 7.2)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.06, enablePan: false, minDistance: 3.6, maxDistance: 9, autoRotate: true, autoRotateSpeed: 0.35 })

    // luces del escenario: cenital fría, contraluz marea, relleno cálido muy tenue
    const key = new THREE.SpotLight('#cfe6ff', 60, 0, Math.PI / 7, 0.6, 1.4); key.position.set(0, 7, 2); this.scene.add(key)
    const rim = new THREE.PointLight('#3fe0c5', 14, 12); rim.position.set(-2.5, -0.6, -2.5); this.scene.add(rim)
    const fill = new THREE.PointLight('#f2b36d', 3, 10); fill.position.set(2.6, -1.2, 2); this.scene.add(fill)

    const geo = new THREE.IcosahedronGeometry(1.0, 64)
    // Cristal propio: centro casi transparente (se ve la memoria dentro), borde con película fina iridiscente y brillos nítidos
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, transparent: true, depthWrite: false,
      vertexShader: `uniform float uTime; uniform float uPulse;
        ${NOISE}
        varying vec3 vN; varying vec3 vV; varying vec3 vW;
        void main() {
          float n = snoise(normal * 1.3 + vec3(uTime * 0.07)) * 0.035 + snoise(normal * 3.1 - vec3(uTime * 0.05)) * 0.012;
          float ripple = uPulse * 0.045 * sin(12.0 * position.y - uTime * 8.0);
          vec3 p = position + normal * (n + ripple);
          vec4 w = modelMatrix * vec4(p, 1.0);
          vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `uniform float uTime; uniform float uPulse;
        varying vec3 vN; varying vec3 vV; varying vec3 vW;
        vec3 film(float t) { return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t)); }
        void main() {
          vec3 n = normalize(vN), v = normalize(vV);
          float ndv = max(dot(n, v), 0.0);
          float fres = pow(1.0 - ndv, 2.4);
          vec3 iri = film(fres * 1.6 + n.y * 0.25 + uTime * 0.03);
          vec3 tide = vec3(0.247, 0.878, 0.773);
          vec3 l1 = normalize(vec3(0.25, 0.95, 0.45)), l2 = normalize(vec3(-0.7, -0.2, 0.6));
          float s1 = pow(max(dot(reflect(-l1, n), v), 0.0), 90.0) * 1.6;
          float s2 = pow(max(dot(reflect(-l2, n), v), 0.0), 40.0) * 0.35;
          vec3 body = mix(vec3(0.03, 0.07, 0.13), tide * 0.35, fres);
          vec3 col = body * 0.35 + mix(tide, iri, 0.7) * fres * 1.35 + vec3(1.0, 0.97, 0.92) * s1 + tide * s2 + tide * uPulse * 0.35;
          float alpha = clamp(0.06 + fres * 0.9 + s1 + uPulse * 0.08, 0.0, 1.0);
          gl_FragColor = vec4(col, alpha);
        }`,
    })
    this.crystal = new THREE.Mesh(geo, mat)
    this.crystal.renderOrder = 2
    this.scene.add(this.crystal)
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!
      const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(220,255,248,1)'); r.addColorStop(0.25, 'rgba(63,224,197,.55)'); r.addColorStop(1, 'rgba(63,224,197,0)')
      g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c) })()
    this.heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
    this.heart.scale.setScalar(0.55); this.heart.renderOrder = 1
    this.crystal.add(this.heart)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.55, 0.35)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    new ResizeObserver(() => this.resize()).observe(host)
    this.resize()
    this.loop()
    if (import.meta.env.DEV) (window as unknown as { __core: CoreScene }).__core = this
  }

  private resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%'
    this.composer.setSize(w, h); this.bloom.setSize(w, h)
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix()
  }

  /** Un filamento de luz por región; motas de luz por recuerdo a lo largo de él. */
  setData(atlas: Atlas) {
    for (const t of this.threads) { this.crystal.remove(t.line); t.line.geometry.dispose() }
    if (this.motes) { this.crystal.remove(this.motes); this.motes.geometry.dispose() }
    this.threads = []; this.clusterOf.clear()
    atlas.points.forEach((p) => this.clusterOf.set(p.id, p.cluster))
    const total = Math.max(1, atlas.points.length)
    const motePos: number[] = [], moteCol: number[] = []
    atlas.clusters.forEach((c, k) => {
      // la posición del filamento sale de la región real: ángulo por su lugar en el mapa, inclinación por su tamaño
      const theta = Math.atan2(c.y, c.x), phi = Math.acos(THREE.MathUtils.clamp(0.85 * (k / Math.max(1, atlas.clusters.length - 1)) * 2 - 0.85, -0.9, 0.9))
      const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).normalize()
      const reach = 0.42 + 0.48 * Math.sqrt(c.size / total * atlas.clusters.length / 2)
      const tip = dir.clone().multiplyScalar(Math.min(0.95, reach))
      const bend = new THREE.Vector3().randomDirection().multiplyScalar(0.28)
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), tip.clone().multiplyScalar(0.5).add(bend), tip)
      const base = new THREE.Color().setHSL((0.45 + k * 0.618) % 1, 0.55, 0.62).lerp(TIDE, 0.55)
      const mat = new THREE.LineBasicMaterial({ color: base.clone(), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)), mat)
      this.crystal.add(line)
      this.threads.push({ line, mat, base, heat: 0, cluster: c.id, tip, label: c.label })
      const motes = Math.min(60, Math.round(c.size / 4))
      for (let m = 0; m < motes; m++) {
        const p = curve.getPoint(Math.random()).add(new THREE.Vector3().randomDirection().multiplyScalar(0.04 * Math.random()))
        motePos.push(p.x, p.y, p.z); moteCol.push(base.r, base.g, base.b)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(motePos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(moteCol, 3))
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.03, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.crystal.add(this.motes)
  }

  /** Desplaza el Núcleo en pantalla (fracción del ancho) para dejar sitio a un panel, con suavidad. */
  setShift(frac: number) { this.shiftTarget = frac }

  /** La mente recuerda: el cristal se ondula y se encienden las regiones implicadas. */
  recall(ids: string[]) {
    this.pulse = 1
    const hot = new Set(ids.map((i) => this.clusterOf.get(i)).filter((c) => c !== undefined))
    for (const t of this.threads) if (hot.has(t.cluster)) t.heat = 1
  }

  /** Puntos de pantalla de las puntas de las regiones encendidas (para dibujar el haz hacia la respuesta). */
  hotTips(): { x: number; y: number; label: string; heat: number }[] {
    const out = []
    for (const t of this.threads) if (t.heat > 0.05) {
      const p = t.tip.clone().applyMatrix4(this.crystal.matrixWorld).project(this.camera)
      out.push({ x: (p.x * 0.5 + 0.5) * this.host.clientWidth, y: (-p.y * 0.5 + 0.5) * this.host.clientHeight, label: t.label, heat: t.heat })
    }
    return out
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    if (document.hidden) return
    const dt = Math.min(0.05, this.clock.getDelta())
    this.uniforms.uTime.value += dt
    this.pulse = Math.max(0, this.pulse - dt * 0.6)
    this.uniforms.uPulse.value = this.pulse
    for (const t of this.threads) {
      t.heat = Math.max(0, t.heat - dt * 0.25)
      t.mat.color.copy(t.base).lerp(EMBER, t.heat).multiplyScalar(1 + 2.2 * t.heat)
    }
    this.crystal.rotation.y += dt * 0.04
    this.bloom.strength = 0.7 + 0.6 * this.pulse
    if (this.heart) this.heart.scale.setScalar(0.5 + 0.06 * Math.sin(this.uniforms.uTime.value * 1.4) + 0.35 * this.pulse)
    this.shift += (this.shiftTarget - this.shift) * Math.min(1, dt * 3)
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1
    if (Math.abs(this.shift) > 0.001) this.camera.setViewOffset(w, h, this.shift * w, 0, w, h); else this.camera.clearViewOffset()
    this.controls.update()
    this.composer.render()
  }

  dispose() { cancelAnimationFrame(this.raf); this.controls.dispose(); this.renderer.dispose(); this.renderer.domElement.remove() }
}
