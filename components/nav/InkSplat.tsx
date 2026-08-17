'use client'

import Link from '@/components/Link'
import headerNavLinks from '@/data/headerNavLinks'
import siteMetadata from '@/data/siteMetadata'
import { useEffect, useRef, useState } from 'react'
import { MoreMenu } from './MoreMenu'

const WIDTH = 520 // css px
const HEIGHT = 224 // css px
const UNIT = 224 // px per shader unit — all shader constants live in this scale
const DURATION = 2.6 // seconds until the blot is fully settled and still

const NAV_LINKS = headerNavLinks.filter((l) => l.href !== '/' && l.href !== '/tags')

// spring curve (~tension:300 friction:20), shared with the rest of the nav UI
const SPRING =
  'linear(0.00, 0.0183, 0.0587, 0.116, 0.184, 0.264, 0.349, 0.436, 0.524, 0.610, 0.691, 0.768, 0.837, 0.900, 0.955, 1.00, 1.04, 1.07, 1.10, 1.12, 1.13, 1.14, 1.14, 1.14, 1.14, 1.13, 1.12, 1.11, 1.10, 1.08, 1.07, 1.06, 1.05, 1.04, 1.03, 1.02, 1.01, 1.00, 0.996, 0.991, 0.987, 0.984, 0.982, 0.980, 0.980, 0.980, 0.980, 0.981, 0.982, 0.984, 0.986, 0.987, 0.989, 0.991, 0.992, 0.994, 0.996, 0.997, 0.998, 0.999, 1.00)'

// items trail out behind the advancing ink front: tight stagger, springy
// pop-in with follow-through; exits are faster and peel from the right,
// matching the ink pulling back in
const trailStyle = (open: boolean, i: number, count: number) => {
  const inDelay = 40 + i * 45
  const outDelay = (count - 1 - i) * 20
  // exits accelerate toward the mass, traveling farther the farther out the
  // item sits — matching the ink blobs being yanked home
  const yank = 'cubic-bezier(0.55, 0, 1, 0.45)'
  return {
    opacity: open ? 1 : 0,
    translate: open ? '0 0' : `-${14 + i * 10}px 0`,
    scale: open ? '1' : '0.7',
    transition: open
      ? `opacity 160ms ease-out ${inDelay}ms, translate 420ms ${SPRING} ${inDelay}ms, scale 420ms ${SPRING} ${inDelay}ms`
      : `opacity 110ms ${yank} ${outDelay}ms, translate 150ms ${yank} ${outDelay}ms, scale 150ms ${yank} ${outDelay}ms`,
  }
}

const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform float uSeed;
uniform float uDark;
uniform vec2 uDims;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uStir;
uniform float uKick;
uniform float uSmear;

const int N_TENDRILS = 9;
const int N_SATS = 14;

// nav pill: one ink blob per item, each with its own JS-driven spring
const int N_PILL = 6;
uniform float uPillP[N_PILL];
uniform float uPillX[N_PILL];
uniform float uPillW[N_PILL];

// satellite randomness is generated in JS (GPU sin()-hash precision diverges
// from JS at large arguments) along with per-droplet displacement offsets
uniform vec3 uSatH[N_SATS];
uniform vec2 uSatOff[N_SATS];

float hash(float n) {
  return fract(sin(n * 127.1 + uSeed * 311.7) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * vnoise(p);
    p *= 2.13;
    amp *= 0.5;
  }
  return v;
}

// polynomial smooth-min: merges shapes with a gooey fillet
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// capsule whose radius tapers from ra at a to rb at b
float sdTaperedCapsule(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}

// how far ink may travel from c along dir before hitting the top/left canvas edge
float reach(vec2 c, vec2 dir, float margin) {
  float tx = dir.x < 0.0 ? (c.x - margin) / -dir.x : 1e3;
  float ty = dir.y < 0.0 ? (c.y - margin) / -dir.y : 1e3;
  return min(tx, ty);
}

float sdBox(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

// pmndrs mark: five axis-aligned blocks in a unit square (y down)
float logoSDF(vec2 q) {
  float d = sdBox(q - vec2(0.675, 0.144), vec2(0.325, 0.144));
  d = min(d, sdBox(q - vec2(0.85, 0.320), vec2(0.15, 0.320)));
  d = min(d, sdBox(q - vec2(0.5, 0.489), vec2(0.15, 0.150)));
  d = min(d, sdBox(q - vec2(0.15, 0.489), vec2(0.15, 0.150)));
  d = min(d, sdBox(q - vec2(0.5, 0.843), vec2(0.15, 0.154)));
  return d;
}

// damped spring step response: 0 -> 1 with a physical overshoot and settle
float springOut(float t, float freq, float damp) {
  return 1.0 - exp(-damp * t) * cos(freq * t);
}

void main() {
  // y grows downward to match CSS space; uDims widens x past 1.0
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uDims;
  vec2 c = vec2(0.154, 0.154);

  // pointer disturbance, liquid-style: ink near the cursor is smeared along
  // the cursor's motion (a relaxing wake) plus a whisper of a dent; the logo
  // below samples pRaw and stays rigid — only the ink flows. The core is
  // shielded so hovering the button never breaks the mark.
  vec2 pRaw = p;
  vec2 mv = p - uMouse;
  float md = length(mv);
  float coreShield = smoothstep(0.05, 0.13, length(uMouse - c));
  float near = exp(-md * md * 50.0);
  p -= uVel * (uStir * coreShield * 0.02 * near);
  p -= (mv / max(md, 1e-4)) * (uStir * coreShield * 0.008 * near);

  vec2 dp = p - c;
  float ang = atan(dp.y, dp.x);

  // after the splat settles and a beat passes, surface tension pulls the
  // farthest ink back toward the mass
  float retP = smoothstep(1.15, 1.65, uTime);

  // central mass: impact spring (peaks ~120ms) and a slow ink bleed; the
  // lumps are static so the settled blot stays messy and natural
  float lobes = 0.5 * sin(ang * 3.0 + uSeed) +
                0.3 * sin(ang * 5.0 + uSeed * 2.7) +
                0.2 * sin(ang * 8.0 + uSeed * 5.3);
  float grain = fbm(vec2(cos(ang), sin(ang)) * 2.5 + uSeed) - 0.5;
  float wob = lobes * 0.1 + grain * 0.12;
  float impact = springOut(max(uTime - 0.02, 0.0), 30.0, 13.0);
  float bleed = 1.0 + 0.05 * (1.0 - exp(-max(uTime - 0.35, 0.0) * 1.2));
  // secondary action: the mass puffs slightly as the logo pushes to the surface
  float lt = max(uTime - 0.28, 0.0);
  float puff = 1.0 + 0.03 * exp(-9.0 * lt) * sin(18.0 * lt);
  // a slight swell as the mass swallows the returning ink
  float absorb = 1.0 + 0.03 * retP;
  float r0 = 0.1 * impact * bleed * puff * absorb;
  // impact squash: returning nav blobs slam in from the right — the mass
  // compresses along x, bulges in y, and recoils left, ringing briefly
  vec2 dq = vec2(dp.x * (1.0 + uKick * 1.3) + uKick * 0.12, dp.y * (1.0 - uKick * 0.65));
  float d = length(dq) - r0 * (1.0 + wob);

  // wind (from scrolling): the mass sheds a fluttering streak of ink
  // downwind, relaxing back once the wind dies
  float smA = abs(uSmear);
  if (smA > 0.003) {
    vec2 smDir = vec2(0.0, sign(uSmear));
    float tailLen = min(r0 * 0.3 + smA * 0.55, reach(c, smDir, 0.02));
    vec2 tailEnd = c + smDir * tailLen;
    tailEnd.x += sin(uTime * 18.0) * smA * 0.03;
    float dTail = sdTaperedCapsule(p, c, tailEnd, r0 * 0.72, r0 * (0.15 + 0.2 * smA));
    d = smin(d, dTail, 0.045);
  }

  // tendrils: tapered spikes growing out of the mass, most ending in a bulb
  for (int i = 0; i < N_TENDRILS; i++) {
    float fi = float(i);
    float h1 = hash(fi * 3.0 + 1.0);
    float h2 = hash(fi * 3.0 + 2.0);
    float h3 = hash(fi * 3.0 + 3.0);
    float a = (fi + (h1 - 0.5) * 0.8) / float(N_TENDRILS) * 6.28318;
    vec2 dir = vec2(cos(a), sin(a));

    // ballistic launch: instant velocity, drag slows it to rest (~250ms),
    // then a staggered pull back into the mass
    float delay = 0.02 + 0.06 * h2;
    float de = 1.0 - exp2(-16.0 * max(uTime - delay, 0.0));
    float rs = smoothstep(1.1 + 0.2 * h2, 1.55 + 0.2 * h2, uTime);

    // a few long dramatic spikes, the rest short; only the long ones fully
    // retract — the short ones just relax so the rest state stays messy
    float longBoost = step(0.6, h3);
    float pull = mix(0.2 + 0.2 * h1, 1.0, longBoost);
    float ext = de * (1.0 - rs * pull);
    float base = r0 * 0.7;
    float len = (0.035 + 0.06 * h3 + 0.1 * longBoost * h1) * ext;
    len = max(min(len, reach(c, dir, 0.03) - base - 0.02), 0.001);
    vec2 tail = c + dir * base;
    vec2 tip = c + dir * (base + len);
    float ra = 0.009 + 0.01 * h1;
    d = smin(d, sdTaperedCapsule(p, tail, tip, ra, 0.0022), 0.018);

    // teardrop bulb riding the tip, slightly stretched while in flight,
    // shrinking as it gets reabsorbed
    if (h2 > 0.3) {
      float bulbR = (0.0045 + 0.009 * h1) * mix(1.2, 0.9, de) * (1.0 - 0.6 * rs * pull);
      vec2 q = p - (c + dir * (base + len + bulbR * 0.8));
      float along = dot(q, dir);
      float perp = dot(q, vec2(-dir.y, dir.x));
      vec2 ql = vec2(along / (1.0 + 0.8 * (1.0 - de)), perp);
      d = smin(d, length(ql) - bulbR, 0.015);
    }
  }

  // satellite dots: fastest debris — they land almost instantly with a size
  // bounce; the farthest get pulled home after the beat, near ones barely move
  for (int i = 0; i < N_SATS; i++) {
    float h1 = uSatH[i].x;
    float h2 = uSatH[i].y;
    float h3 = uSatH[i].z;
    vec2 dir = vec2(cos(h1 * 6.28318), sin(h1 * 6.28318));
    float dt = max(uTime - (0.01 + 0.05 * h2), 0.0);
    float fly = 1.0 - exp2(-16.0 * dt);
    float srs = smoothstep(1.1 + 0.25 * h2, 1.6 + 0.25 * h2, uTime);
    // farther drops get pulled all the way home; nearby ones barely budge
    float pull = mix(0.12, 1.0, smoothstep(0.35, 0.8, h2));
    float dist = min((0.145 + 0.27 * h2) * mix(0.5, 1.0, fly), reach(c, dir, 0.035));
    dist *= 1.0 - srs * pull;
    float pop = clamp(springOut(dt, 30.0, 10.0), 0.0, 1.35);
    float rr = (0.003 + 0.021 * h3 * h3 * h3) * pop;
    // drops are shoved by the cursor with real inertia (simulated in JS):
    // they glide away and settle somewhere new instead of flip-flopping;
    // during a scroll smear each drop drags its own little smudge tail
    vec2 pos = c + dir * dist + uSatOff[i];
    // the tail (and its taper) only exists while the wind blows — at rest
    // this is an exact circle of radius rr
    float smT = clamp(abs(uSmear) * 10.0, 0.0, 1.0);
    vec2 dropTail = vec2(0.0, uSmear * (0.16 + 0.2 * h3) + 1e-4);
    float dd = sdTaperedCapsule(p, pos, pos + dropTail, rr, rr * mix(1.0, 0.45, smT));
    d = smin(d, dd, 0.004 + 0.02 * srs * pull);
  }

  // nav pill: a chain of ink blobs, one per item, each flying out of the
  // mass to its slot on its own spring (overshooting slightly) and merging
  // gooily with its neighbors into a lumpy liquid bar
  for (int i = 0; i < N_PILL; i++) {
    float pp = uPillP[i];
    float ppc = clamp(pp, 0.0, 1.0);
    if (pp > 0.01 && uPillW[i] > 0.001) {
      float px = mix(c.x, uPillX[i], pp);
      float bH = 0.075 * (0.35 + 0.65 * ppc);
      float hw = uPillW[i] * ppc;
      float dB = sdBox(vec2(p.x - px, p.y - c.y), vec2(max(hw - bH, 0.0), 0.0)) - bH;
      d = smin(d, dB, max(0.055 * ppc, 0.004));
    }
  }

  // meniscus: the edge nearest the cursor swells gently toward it and
  // follows it around the rim, like liquid adhering to a fingertip
  float mdc = length(uMouse - c);
  vec2 edgeDir = (uMouse - c) / max(mdc, 1e-4);
  vec2 mb = c + edgeDir * min(mdc, r0 * 1.05);
  float reachF = exp(-pow(max(mdc - r0, 0.0), 2.0) * 300.0);
  float mstr = uStir * reachF;
  float mr = 0.022 * mstr;
  // the goo constant scales with strength too — a zero-size bulge must not
  // leave a phantom smin fillet orbiting the rim
  d = smin(d, length(p - mb) - mr, max(0.045 * mstr, 0.004));

  // fine static grain on every edge so the liquid reads as physical ink
  d += (fbm(p * 12.0 + uSeed * 3.0) - 0.5) * 0.005;

  float aa = 0.005;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  vec3 ink = mix(vec3(0.067), vec3(0.93), uDark);

  // logo rising through the ink in 3D: starts deep and tilted away,
  // springs upright while surfacing, refracted by the liquid until it clears
  float ls = springOut(lt, 18.0, 9.0);
  float focus = 1.0 - exp2(-8.0 * lt);
  float lrot = -0.25 * (1.0 - ls);
  float lsize = 0.086 * mix(0.55, 1.0, ls);

  vec2 lp = pRaw - c;
  float csr = cos(lrot);
  float snr = sin(lrot);
  lp = vec2(csr * lp.x - snr * lp.y, snr * lp.x + csr * lp.y) / lsize;

  // inverse perspective: the logo plane pivots around its horizontal axis
  // (springOut overshoot tips it slightly past vertical before settling)
  float tilt = 1.1 * (1.0 - ls);
  float ct = cos(tilt);
  float st = sin(tilt);
  float ppy = lp.y / max(ct - lp.y * st / 1.2, 0.25);
  vec2 lq = vec2(lp.x * (1.0 + ppy * st / 1.2), ppy);

  // refraction shimmer while still submerged, dying off as it surfaces
  float sub = 1.0 - focus;
  lq += (vec2(fbm(lq * 6.0 + uTime * 3.0), fbm(lq * 6.0 + 17.0 - uTime * 3.0)) - 0.5) * 0.16 * sub;

  float dl = logoSDF(lq + vec2(0.5, 0.498)) * lsize;
  float aaL = mix(0.012, 0.003, focus);
  float logoM = (1.0 - smoothstep(-aaL, aaL, dl)) * focus;

  vec3 col = mix(ink, mix(vec3(1.0), vec3(0.067), uDark), logoM);

  // faint ripple ring crossing the blot as the logo breaks the surface
  float rt = max(uTime - 0.5, 0.0);
  float rippleR = r0 * (0.35 + 2.2 * rt);
  float ring = exp(-pow((length(dp) - rippleR) * 90.0, 2.0)) * exp(-rt * 5.0) * step(0.001, rt);
  col = mix(col, mix(vec3(0.35), vec3(0.7), uDark), ring * 0.35 * (1.0 - logoM));

  gl_FragColor = vec4(col * alpha, alpha);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('InkSplat shader error:', gl.getShaderInfoLog(shader))
  }
  return shader
}

export function InkSplat() {
  const ref = useRef<HTMLCanvasElement>(null)
  const navElRef = useRef<HTMLElement>(null)
  const focusRef = useRef(false)
  const wakeRef = useRef<() => void>(() => {})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    })
    if (!gl) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = WIDTH * dpr
    canvas.height = HEIGHT * dpr
    gl.viewport(0, 0, canvas.width, canvas.height)

    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    gl.useProgram(program)

    // fullscreen triangle
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const seed = Math.random() * 100
    gl.uniform1f(gl.getUniformLocation(program, 'uSeed'), seed)
    gl.uniform2f(gl.getUniformLocation(program, 'uDims'), WIDTH / UNIT, HEIGHT / UNIT)
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uDark = gl.getUniformLocation(program, 'uDark')
    const uMouse = gl.getUniformLocation(program, 'uMouse')
    const uVel = gl.getUniformLocation(program, 'uVel')
    const uStir = gl.getUniformLocation(program, 'uStir')
    const uPillP =
      gl.getUniformLocation(program, 'uPillP') ?? gl.getUniformLocation(program, 'uPillP[0]')
    const uPillX =
      gl.getUniformLocation(program, 'uPillX') ?? gl.getUniformLocation(program, 'uPillX[0]')
    const uPillW =
      gl.getUniformLocation(program, 'uPillW') ?? gl.getUniformLocation(program, 'uPillW[0]')
    const uSatOff =
      gl.getUniformLocation(program, 'uSatOff') ?? gl.getUniformLocation(program, 'uSatOff[0]')
    const uSatH =
      gl.getUniformLocation(program, 'uSatH') ?? gl.getUniformLocation(program, 'uSatH[0]')
    const uKick = gl.getUniformLocation(program, 'uKick')
    const uSmear = gl.getUniformLocation(program, 'uSmear')
    gl.uniform2f(uMouse, -10, -10)
    gl.uniform2f(uVel, 0, 0)
    gl.uniform1f(uStir, 0)
    gl.uniform1f(uKick, 0)
    gl.uniform1f(uSmear, 0)

    gl.clearColor(0, 0, 0, 0)

    const setTheme = () =>
      gl.uniform1f(uDark, document.documentElement.classList.contains('dark') ? 1 : 0)
    setTheme()

    const start = performance.now()
    let raf = 0
    const drawFrame = (t: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform1f(uTime, t)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    // the pointer is smoothed through an underdamped spring so quick flicks
    // overshoot and the liquid jiggles; stir ramps up fast near the blot and
    // bleeds off slowly after the cursor leaves
    const pointer = { tx: -10, ty: -10, x: -10, y: -10, vx: 0, vy: 0, stir: 0, gone: true, lastMove: 0 }
    let lastFrame = start

    // satellite randomness lives here and is uploaded to the shader, so the
    // JS displacement sim and the GPU agree exactly on each drop's rest spot
    const CENTER = 0.154
    const sstep = (a: number, b: number, x: number) => {
      const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
      return t * t * (3 - 2 * t)
    }
    const SAT_COUNT = 14
    const satH = new Float32Array(SAT_COUNT * 3)
    const sats = Array.from({ length: SAT_COUNT }, (_, i) => {
      const h1 = Math.random()
      const h2 = Math.random()
      const h3 = Math.random()
      satH[i * 3] = h1
      satH[i * 3 + 1] = h2
      satH[i * 3 + 2] = h3
      const ang = h1 * Math.PI * 2
      const dx = Math.cos(ang)
      const dy = Math.sin(ang)
      const reachX = dx < 0 ? (CENTER - 0.035) / -dx : 1e3
      const reachY = dy < 0 ? (CENTER - 0.035) / -dy : 1e3
      const dist0 = Math.min(0.145 + 0.27 * h2, Math.min(reachX, reachY))
      const dist = dist0 * (1 - (0.12 + 0.88 * sstep(0.35, 0.8, h2)))
      return { rx: CENTER + dx * dist, ry: CENTER + dy * dist, ox: 0, oy: 0, vx: 0, vy: 0, bx: 0, by: 0 }
    })
    gl.uniform3fv(uSatH, satH)
    const satOff = new Float32Array(SAT_COUNT * 2)
    let satEnergy = 0
    // dev-only inspection hook (see __inkT above)
    ;(window as unknown as { __inkDebug?: object }).__inkDebug = {
      pointer,
      sats,
      satOff,
      getKick: () => kick,
      getSmear: () => smear,
      getFrames: () => frames,
      getAwake: () => rafActive,
      getScrollState: () => ({ pendingScroll, lastSeenScrollY, smear, smearV }),
    }

    // nav pill state: one spring per item blob, staggered so they trail out
    // of the mass; opens only on the blob itself (plus focus / touch)
    const hoverNone = window.matchMedia('(hover: none)').matches
    const N_PILL = 6
    const pillX = new Float32Array(N_PILL)
    const pillW = new Float32Array(N_PILL)
    const pillP = new Float32Array(N_PILL)
    const pillV = new Float32Array(N_PILL)
    const blobTgt = new Float32Array(N_PILL)
    let navCount = 1
    let navRight = 1.2
    let flipAt = 0
    let openState = false
    let kick = 0
    let kickV = 0
    let smear = 0
    let smearV = 0
    // scroll deltas accumulate in the event handler and are consumed by the
    // render loop — waking must never eat the delta that triggered it
    let lastSeenScrollY = window.scrollY
    let pendingScroll = 0
    const measureNav = () => {
      const el = navElRef.current
      if (!el) return
      navRight = (58 + el.offsetWidth + 16) / UNIT
      navCount = Math.min(el.children.length, N_PILL)
      for (let i = 0; i < N_PILL; i++) {
        const kid = el.children[i] as HTMLElement | undefined
        pillX[i] = kid ? (58 + kid.offsetLeft + kid.offsetWidth / 2) / UNIT : 0
        pillW[i] = kid ? (kid.offsetWidth / 2 + 9) / UNIT : 0
      }
      gl.uniform1fv(uPillX, pillX)
      gl.uniform1fv(uPillW, pillW)
    }
    measureNav()
    const navObserver = navElRef.current ? new ResizeObserver(() => (measureNav(), wake())) : null
    if (navElRef.current && navObserver) navObserver.observe(navElRef.current)

    // the blot is static once settled, so the loop sleeps after DURATION and
    // wakes on pointer activity (window.__inkT freezes the clock for debugging)
    let rafActive = true
    let frames = 0
    const render = () => {
      frames++
      const now = performance.now()
      const dt = Math.min((now - lastFrame) / 1000, 0.033)
      lastFrame = now

      pointer.vx += ((pointer.tx - pointer.x) * 90 - pointer.vx * 12) * dt
      pointer.vy += ((pointer.ty - pointer.y) * 90 - pointer.vy * 12) * dt
      pointer.x += pointer.vx * dt
      pointer.y += pointer.vy * dt
      // stir is graded by cursor distance — full strength right at the blot,
      // fading to nothing ~110px out — and fades in place when the cursor
      // leaves the window or goes quiet, rather than being dragged away
      const distC = Math.hypot(pointer.tx - CENTER, pointer.ty - CENTER)
      const prox =
        pointer.gone || now - pointer.lastMove >= 1500 ? 0 : 1 - sstep(0.22, 0.5, distC)
      pointer.stir += (prox - pointer.stir) * (prox > pointer.stir ? 10 : 3) * dt
      gl.uniform2f(uMouse, pointer.x, pointer.y)
      const vlen = Math.hypot(pointer.vx, pointer.vy)
      const vclamp = vlen > 1.5 ? 1.5 / vlen : 1
      gl.uniform2f(uVel, pointer.vx * vclamp, pointer.vy * vclamp)
      gl.uniform1f(uStir, pointer.stir)

      // soft, damped spring per droplet: the cursor's force shoves it, the
      // spring drifts it home — fast cursor jiggle averages out via inertia
      satEnergy = 0
      for (let i = 0; i < SAT_COUNT; i++) {
        const s = sats[i]
        const dx = s.rx + s.bx + s.ox - pointer.x
        const dy = s.ry + s.by + s.oy - pointer.y
        const d2 = dx * dx + dy * dy
        const f = (pointer.stir * 1.2 * Math.exp(-d2 * 60)) / (Math.sqrt(d2) || 1e-4)
        s.vx += (dx * f - s.ox * 20 - s.vx * 7) * dt
        s.vy += (dy * f - s.oy * 20 - s.vy * 7) * dt
        // wind from scrolling blows drops downwind — lighter drops fly
        // farther, and the springs carry everything home when it dies
        s.vy += smear * (5 + 5 * (1 - satH[i * 3 + 2])) * dt
        // the page edge acts as a ceiling: blown ink pools against it
        const minOy = 0.025 - s.ry - s.by
        if (s.oy < minOy) {
          s.oy = minOy
          if (s.vy < 0) s.vy = 0
        }
        s.ox += s.vx * dt
        s.oy += s.vy * dt

        // plastic flow: while a drop is held away from home, part of the
        // elastic offset becomes a permanent bias — position stays continuous
        // but the drop settles somewhere new instead of exactly where it was
        const flow = Math.min(0.8 * dt, 1)
        s.bx += s.ox * flow
        s.by += s.oy * flow
        s.ox -= s.ox * flow
        s.oy -= s.oy * flow
        const blen = Math.hypot(s.bx, s.by)
        if (blen > 0.03) {
          s.bx *= 0.03 / blen
          s.by *= 0.03 / blen
        }

        satOff[i * 2] = s.bx + s.ox
        satOff[i * 2 + 1] = s.by + s.oy
        satEnergy = Math.max(satEnergy, Math.abs(s.ox), Math.abs(s.oy))
      }
      gl.uniform2fv(uSatOff, satOff)

      // nav pill: opens only when hovering the blob itself; once open it
      // stays while the cursor is anywhere along the pill, so links are
      // reachable — leaving both closes it
      const overPill =
        openState &&
        pointer.tx > 0.04 &&
        pointer.tx < navRight &&
        pointer.ty > 0.02 &&
        pointer.ty < 0.29
      const wantOpen =
        hoverNone || focusRef.current || (!pointer.gone && (distC < 0.13 || overPill))
      if (wantOpen !== openState) {
        openState = wantOpen
        flipAt = now
        setOpen(wantOpen)
      }
      // staggered per-blob springs: each item's ink blob launches (or gets
      // recalled, rightmost first) on its own delay — a physical trail
      let navEnergy = 0
      for (let i = 0; i < N_PILL; i++) {
        const delay = wantOpen ? i * 45 : (navCount - 1 - i) * 25
        if (now - flipAt >= delay) blobTgt[i] = wantOpen ? 1 : 0
        // returning ink is yanked home much harder than it launches
        const closing = blobTgt[i] === 0 && pillP[i] > 0
        const k = closing ? 320 : 170
        const damp = closing ? 11 : 15
        pillV[i] += ((blobTgt[i] - pillP[i]) * k - pillV[i] * damp) * dt
        pillP[i] += pillV[i] * dt
        // hard landing: the blob slams into the mass, momentum becomes a kick
        if (closing && pillP[i] <= 0.02) {
          if (pillV[i] < -0.5) kickV += Math.min(-pillV[i], 9) * pillW[i] * 2.2
          pillP[i] = 0
          pillV[i] = 0
        }
        navEnergy = Math.max(navEnergy, Math.abs(blobTgt[i] - pillP[i]), Math.abs(pillV[i]) * 0.05)
      }
      gl.uniform1fv(uPillP, pillP)
      // impact oscillator: rings the mass after each landing, then dies out
      kickV += (-kick * 900 - kickV * 18) * dt
      kick += kickV * dt
      gl.uniform1f(uKick, kick)
      navEnergy = Math.max(navEnergy, Math.abs(kick) * 0.5, Math.abs(kickV) * 0.02)

      // scroll smear: the accumulated scroll delta lands on the spring as a
      // dt-independent impulse (a zero-length wake frame can never drop it),
      // then the overdamped spring relaxes the smudge back without bounce
      smearV += Math.max(-2.5, Math.min(2.5, (-pendingScroll / UNIT) * 5))
      pendingScroll = 0
      smearV += (-smear * 220 - smearV * 32) * dt
      smear += smearV * dt
      smear = Math.max(-0.3, Math.min(0.3, smear))
      gl.uniform1f(uSmear, smear)
      navEnergy = Math.max(navEnergy, Math.abs(smear) * 0.5, Math.abs(smearV) * 0.02)

      const tOverride = (window as { __inkT?: number }).__inkT
      const t = tOverride ?? (now - start) / 1000
      drawFrame(t)
      if (
        t < DURATION ||
        tOverride !== undefined ||
        pointer.stir > 0.002 ||
        satEnergy > 0.0005 ||
        navEnergy > 0.002
      ) {
        raf = requestAnimationFrame(render)
      } else {
        rafActive = false
      }
    }
    raf = requestAnimationFrame(render)

    const wake = () => {
      if (!rafActive) {
        rafActive = true
        lastFrame = performance.now()
        raf = requestAnimationFrame(render)
      }
    }
    const onScroll = () => {
      const y = window.scrollY
      pendingScroll += y - lastSeenScrollY
      lastSeenScrollY = y
      wake()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    wakeRef.current = wake
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.tx = (e.clientX - rect.left) / UNIT
      pointer.ty = (e.clientY - rect.top) / UNIT
      pointer.gone = false
      pointer.lastMove = performance.now()
      // while the disturbance is invisible, teleport the spring to the cursor
      // so re-entry never sweeps a wake across the blot
      if (pointer.stir < 0.02) {
        pointer.x = pointer.tx
        pointer.y = pointer.ty
        pointer.vx = 0
        pointer.vy = 0
      }
      wake()
    }
    const onPointerLeave = () => {
      pointer.gone = true
      wake()
    }
    window.addEventListener('pointermove', onPointerMove)
    document.documentElement.addEventListener('pointerleave', onPointerLeave)

    // repaint the settled frame when the theme toggles
    const observer = new MutationObserver(() => {
      setTheme()
      wake()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      navObserver?.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <div className="fixed top-0 left-0 z-50">
      <canvas
        ref={ref}
        aria-hidden
        className="pointer-events-none block"
        style={{ width: WIDTH, height: HEIGHT }}
      />
      <Link
        href="/"
        aria-label={siteMetadata.headerTitle}
        className="absolute top-3 left-3 h-[2.8rem] w-[2.8rem] rounded-full"
      />
      <nav
        ref={navElRef}
        aria-label="Site navigation"
        onFocusCapture={() => {
          focusRef.current = true
          wakeRef.current()
        }}
        onBlurCapture={() => {
          focusRef.current = false
          wakeRef.current()
        }}
        className="absolute top-[13px] left-[58px] flex h-[43px] items-center gap-1 pr-2"
        style={{ pointerEvents: open ? 'auto' : 'none' }}
      >
        {NAV_LINKS.map(({ href, title }, i) => (
          <Link
            key={href}
            href={href}
            className="grid h-[1.8rem] place-items-center rounded-full px-3 text-[0.75rem] font-medium text-white/75 hover:text-white dark:text-black/60 dark:hover:text-black"
            style={trailStyle(open, i, NAV_LINKS.length + 1)}
          >
            {title}
          </Link>
        ))}
        <div
          className="[&>div>button]:text-white/60 [&>div>button:hover]:text-white dark:[&>div>button]:text-black/60 dark:[&>div>button:hover]:text-black"
          style={trailStyle(open, NAV_LINKS.length, NAV_LINKS.length + 1)}
        >
          <MoreMenu />
        </div>
      </nav>
    </div>
  )
}
