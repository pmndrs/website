'use client'

import { useEffect, useRef } from 'react'

const SIZE = 224 // css px, square
const DURATION = 2.6 // seconds until the blot is fully settled and still

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
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uStir;

const int N_TENDRILS = 9;
const int N_SATS = 14;

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

// damped spring step response: 0 -> 1 with a physical overshoot and settle
float springOut(float t, float freq, float damp) {
  return 1.0 - exp(-damp * t) * cos(freq * t);
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

void main() {
  // y grows downward to match CSS space
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
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
  float d = length(dp) - r0 * (1.0 + wob);

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
      d = smin(d, length(ql) - bulbR, 0.02);
    }
  }

  // satellite dots: fastest debris — they land almost instantly with a size
  // bounce, then get dragged home and gooily absorbed by the mass
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
    // they glide away and lazily drift home instead of flip-flopping
    vec2 pos = c + dir * dist + uSatOff[i];
    d = smin(d, length(p - pos) - rr, 0.004 + 0.02 * srs * pull);
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
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
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
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uSatOff =
      gl.getUniformLocation(program, 'uSatOff') ?? gl.getUniformLocation(program, 'uSatOff[0]')
    const uSatH =
      gl.getUniformLocation(program, 'uSatH') ?? gl.getUniformLocation(program, 'uSatH[0]')
    const uDark = gl.getUniformLocation(program, 'uDark')
    const uMouse = gl.getUniformLocation(program, 'uMouse')
    const uVel = gl.getUniformLocation(program, 'uVel')
    const uStir = gl.getUniformLocation(program, 'uStir')
    gl.uniform2f(uMouse, -10, -10)
    gl.uniform2f(uVel, 0, 0)
    gl.uniform1f(uStir, 0)

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
    ;(window as unknown as { __inkDebug?: object }).__inkDebug = { pointer, sats, satOff }

    // the blot is static once settled, so the loop sleeps after DURATION and
    // wakes on pointer activity (window.__inkT freezes the clock for debugging)
    let rafActive = true
    const render = () => {
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

      const tOverride = (window as { __inkT?: number }).__inkT
      const t = tOverride ?? (now - start) / 1000
      drawFrame(t)
      if (t < DURATION || tOverride !== undefined || pointer.stir > 0.002 || satEnergy > 0.0005) {
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
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.tx = (e.clientX - rect.left) / SIZE
      pointer.ty = (e.clientY - rect.top) / SIZE
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
    }
    window.addEventListener('pointermove', onPointerMove)
    document.documentElement.addEventListener('pointerleave', onPointerLeave)

    // repaint the settled frame when the theme toggles
    const observer = new MutationObserver(() => {
      setTheme()
      drawFrame(Math.min((performance.now() - start) / 1000, DURATION))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-50"
      style={{ width: SIZE, height: SIZE }}
    />
  )
}
