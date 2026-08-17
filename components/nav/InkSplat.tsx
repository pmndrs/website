'use client'

import { useEffect, useRef } from 'react'

const SIZE = 224 // css px, square
const DURATION = 2.4 // seconds of animation before we stop the RAF

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

const int N_TENDRILS = 9;
const int N_SATS = 14;

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

  vec2 dp = p - c;
  float ang = atan(dp.y, dp.x);

  // central mass: impact spring (peaks ~120ms) then a slow ink bleed
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
  float r0 = 0.1 * impact * bleed * puff;
  float d = length(dp) - r0 * (1.0 + wob);

  // tendrils: tapered spikes growing out of the mass, most ending in a bulb
  for (int i = 0; i < N_TENDRILS; i++) {
    float fi = float(i);
    float h1 = hash(fi * 3.0 + 1.0);
    float h2 = hash(fi * 3.0 + 2.0);
    float h3 = hash(fi * 3.0 + 3.0);
    float a = (fi + (h1 - 0.5) * 0.8) / float(N_TENDRILS) * 6.28318;
    vec2 dir = vec2(cos(a), sin(a));

    // ballistic launch: instant velocity, drag slows it to rest (~250ms)
    float delay = 0.02 + 0.06 * h2;
    float de = 1.0 - exp2(-16.0 * max(uTime - delay, 0.0));

    // a few long dramatic spikes, the rest short
    float longBoost = step(0.6, h3);
    float base = r0 * 0.7;
    float len = (0.035 + 0.06 * h3 + 0.1 * longBoost * h1) * de;
    len = min(len, reach(c, dir, 0.03) - base - 0.02);
    vec2 tail = c + dir * base;
    vec2 tip = c + dir * (base + len);
    float ra = 0.009 + 0.01 * h1;
    d = smin(d, sdTaperedCapsule(p, tail, tip, ra, 0.0022), 0.018);

    // teardrop bulb riding the tip, slightly stretched while in flight
    if (h2 > 0.3) {
      float bulbR = (0.0045 + 0.009 * h1) * mix(1.2, 0.9, de);
      vec2 q = p - (c + dir * (base + len + bulbR * 0.8));
      float along = dot(q, dir);
      float perp = dot(q, vec2(-dir.y, dir.x));
      vec2 ql = vec2(along / (1.0 + 0.8 * (1.0 - de)), perp);
      d = smin(d, length(ql) - bulbR, 0.02);
    }
  }

  // satellite dots: fastest debris — they land almost instantly with a size bounce
  for (int i = 0; i < N_SATS; i++) {
    float fi = float(i);
    float h1 = hash(40.0 + fi * 3.0);
    float h2 = hash(41.0 + fi * 3.0);
    float h3 = hash(42.0 + fi * 3.0);
    vec2 dir = vec2(cos(h1 * 6.28318), sin(h1 * 6.28318));
    float dt = max(uTime - (0.01 + 0.05 * h2), 0.0);
    float fly = 1.0 - exp2(-16.0 * dt);
    float dist = min((0.145 + 0.27 * h2) * mix(0.5, 1.0, fly), reach(c, dir, 0.035));
    float pop = clamp(springOut(dt, 30.0, 10.0), 0.0, 1.35);
    float rr = (0.003 + 0.021 * h3 * h3 * h3) * pop;
    d = min(d, length(p - c - dir * dist) - rr);
  }

  float aa = 0.005;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  vec3 ink = mix(vec3(0.067), vec3(0.93), uDark);

  // logo rising through the ink in 3D: starts deep and tilted away,
  // springs upright while surfacing, refracted by the liquid until it clears
  float ls = springOut(lt, 18.0, 9.0);
  float focus = 1.0 - exp2(-8.0 * lt);
  float lrot = -0.25 * (1.0 - ls);
  float lsize = 0.086 * mix(0.55, 1.0, ls);

  vec2 lp = p - c;
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

    gl.uniform1f(gl.getUniformLocation(program, 'uSeed'), Math.random() * 100)
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uDark = gl.getUniformLocation(program, 'uDark')

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
    const render = () => {
      const t = (performance.now() - start) / 1000
      drawFrame(t)
      if (t < DURATION) raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    // repaint the settled frame when the theme toggles
    const observer = new MutationObserver(() => {
      setTheme()
      drawFrame(Math.min((performance.now() - start) / 1000, DURATION))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
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
