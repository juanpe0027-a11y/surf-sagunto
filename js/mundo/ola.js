import { clamp, lerp, sm } from '../nucleo/util.js';
import { LOWQ } from '../nucleo/config.js';
import { G } from '../nucleo/estado.js';
import { world } from './motor.js';
import { commonUniforms, GLSL_COMMON } from './shaders.js';

// ---------- la ola ----------
export const HW = 3.4;           // altura de la ola en metros
const NX = LOWQ ? 220 : 360, XA = -48, NF = LOWQ ? 48 : 65, NB = 16;
           // largo de la ola por delante del tubo (en el online crece con los surfistas que haya)
function makeStrip(nx, ns) {
  const g = new THREE.BufferGeometry(), n = (nx + 1) * ns;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('foam', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('thin', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('sv', new THREE.BufferAttribute(new Float32Array(n), 1));
  const idx = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ns - 1; j++) {
    const a = i * ns + j, b = (i + 1) * ns + j, c = b + 1, d = a + 1;
    idx.push(a, b, d, b, c, d);
  }
  g.setIndex(idx);
  return g;
}
export const waveMat = new THREE.ShaderMaterial({
  uniforms: Object.assign(commonUniforms(), { hq: { value: LOWQ ? 0 : 1 } }), side: THREE.DoubleSide, fog: false,
  vertexShader: `attribute float foam; attribute float thin; attribute float sv;
    varying vec3 vPos; varying vec3 vN; varying float vFoam; varying float vThin; varying float vS;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vPos = w.xyz; vN = mat3(modelMatrix) * normal; vFoam = foam; vThin = thin; vS = sv; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: GLSL_COMMON + `varying vec3 vPos; varying vec3 vN; varying float vFoam; varying float vThin; varying float vS; uniform float hq;
  vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
  // encaje de espuma: bordes de celdas (F2 - F1) que se deforman despacio
  float lace(vec2 uv){
    vec2 ip = floor(uv), fp = fract(uv); float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y)); vec2 o = hash2(ip + g);
      o = 0.5 + 0.42 * sin(time * 0.5 + 6.2831 * o);
      vec2 r = g + o - fp; float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return sqrt(d2) - sqrt(d1);
  }
  void main(){
    vec3 V = normalize(cameraPosition - vPos);
    vec3 N = normalize(vN);
    if (dot(N, V) < 0.0) N = -N;
    // rizado fino del agua que sube por la cara
    float n1 = fbm(vec2(vPos.x*0.8 + time*0.25, vS*26.0 - time*0.7));
    float n2 = fbm(vec2(vPos.x*0.8 + 5.3, vS*26.0 + 2.1 - time*0.7));
    float n3 = noise(vec2(vPos.x*3.5, vS*70.0 - time*2.2));
    N = normalize(N + vec3((n1-0.5)*0.30 + (n3-0.5)*0.10, 0.0, (n2-0.5)*0.30));
    float fres = 0.02 + 0.98*pow(1.0 - max(dot(N, V), 0.0), 5.0);
    // color: azul profundo en la cara, más claro abajo y turquesa translúcido arriba
    vec3 trough = vec3(0.10, 0.34, 0.55);
    vec3 deep   = vec3(0.02, 0.13, 0.33);
    vec3 upper  = vec3(0.05, 0.30, 0.52);
    vec3 lipc   = vec3(0.12, 0.50, 0.62);
    vec3 body = mix(trough, deep, smoothstep(0.02, 0.30, vS));
    body = mix(body, upper, smoothstep(0.35, 0.62, vS));
    body = mix(body, lipc, smoothstep(0.62, 0.78, vS) * vThin);
    float tr = pow(max(dot(-V, sunDir), 0.0), 2.0) * smoothstep(0.5, 0.8, vS) * vThin;
    body += vec3(0.10, 0.48, 0.50) * tr * 0.55;
    float diff = max(dot(N, sunDir), 0.0);
    body *= 0.80 + 0.35*diff;
    vec3 col = mix(body, skyCol(reflect(-V, N)) * vec3(0.85, 0.92, 1.0), fres * 0.65);
    float sp = pow(max(dot(reflect(-sunDir, N), V), 0.0), 220.0);
    col += vec3(1.0, 0.92, 0.78) * sp * 2.4;
    // vetas de agua estirada hacia la cresta
    float st = noise(vec2(vPos.x*3.0, vS*110.0 - time*2.4));
    col += vec3(0.45, 0.75, 0.90) * smoothstep(0.75, 0.97, st) * 0.10 * vThin;
    // encaje de espuma: denso abajo y en la zona rota, suelto en la cara
    float fpatch = fbm(vec2(vPos.x*0.18 - time*0.05, vS*3.0));
    // en móvil el encaje se hace con ruido simple (mucho más barato)
    float lw = hq > 0.5 ? 1.0 - smoothstep(0.0, 0.06, lace(vec2(vPos.x*0.6 - time*0.08, vS*11.0 + time*0.12))) : smoothstep(0.66, 0.74, noise(vec2(vPos.x*1.1 - time*0.1, vS*16.0 + time*0.15)));
    float lw2 = hq > 0.5 ? 1.0 - smoothstep(0.0, 0.045, lace(vec2(vPos.x*1.4 + 3.1, vS*24.0 - time*0.2))) : 0.0;
    float laceMask = (1.0 - smoothstep(0.10, 0.42, vS)) * 0.85 + smoothstep(0.45, 0.75, fpatch) * 0.45 * (1.0 - smoothstep(0.55, 0.7, vS));
    float laceA = clamp(max(lw * 0.8, lw2 * 0.5) * laceMask * smoothstep(0.35, 0.7, fpatch + 0.2) + vFoam * lw * 0.5, 0.0, 1.0);
    // espuma sólida donde rompe
    float fn = fbm(vec2(vPos.x*1.2 - time*0.5, vS*30.0 + time*0.9));
    float foam = smoothstep(0.38, 0.78, vFoam * (0.55 + fn));
    // cortina del labio: chorros blancos verticales que caen
    float lipZ = smoothstep(0.72, 0.84, vS) * vThin;
    float curtain = noise(vec2(vPos.x*8.0 + fn*2.0, vS*5.0 - time*3.2));
    curtain = smoothstep(0.35, 0.85, curtain * 0.7 + noise(vec2(vPos.x*21.0, vS*9.0 - time*4.0)) * 0.45);
    vec3 foamCol = vec3(0.93, 0.96, 0.98) * (0.85 + 0.22*diff);
    col = mix(col, foamCol * 0.95, laceA * 0.2 * smoothstep(0.35, 0.75, fn + 0.2));
    col = mix(col, foamCol, clamp(foam + lipZ * curtain * 0.85, 0.0, 1.0));
    col = applyFog(col, vPos);
    // el labio es translúcido entre los chorros: deja ver al surfista dentro del tubo
    float a = mix(1.0, 0.5 + 0.5 * curtain, lipZ * (1.0 - clamp(foam, 0.0, 1.0)));
    gl_FragColor = vec4(tone(col), a);
  }`
});
waveMat.transparent = true;
const frontGeo = makeStrip(NX, NF), backGeo = makeStrip(NX, NB);
const frontMesh = new THREE.Mesh(frontGeo, waveMat), backMesh = new THREE.Mesh(backGeo, waveMat);
frontMesh.frustumCulled = false; backMesh.frustumCulled = false;
world.add(frontMesh, backMesh);

export const prm = { p: 0, g: 0, br: 0, dx: 0, H: 0, sz: 1 };
export function wparams(x, o) {
  const dx = x - G.curlX;
  let p, g, br;
  if (dx >= 0) { p = 1 - sm(0, 18, dx); g = 1 - 0.45 * sm(G.XB * 0.33, G.XB * 0.93, dx); br = 0; }
  else { br = sm(0, 2.0, -dx); p = 1 - 0.8 * sm(2, 20, -dx); g = 1 - 0.62 * sm(0.5, 24, -dx); }
  g *= sm(XA, XA + 12, dx) * (1 - sm(G.XB - 16, G.XB, dx));
  o.p = p * G.pm; o.g = g * G.grow; o.br = br * G.pm; o.dx = dx;
  o.H = HW * o.g; o.sz = 0.35 + 0.65 * o.g;
  return o;
}
export const P = Array.from({ length: 9 }, () => [0, 0]);
const BP = Array.from({ length: 5 }, () => [0, 0]);
export function ctrl(o) {
  const H = o.H, sz = o.sz, p = o.p;
  P[0][0] = 22; P[0][1] = -0.08;
  P[1][0] = 12; P[1][1] = 0.02 * H;
  P[2][0] = 5.0 * sz; P[2][1] = 0.12 * H;
  P[3][0] = (3.4 - 0.5 * p) * sz; P[3][1] = 0.45 * H;
  P[4][0] = (2.0 - 0.6 * p) * sz; P[4][1] = 0.82 * H;
  P[5][0] = (1.0 + 0.1 * p) * sz; P[5][1] = H;
  P[6][0] = (1.0 + 2.9 * p) * sz; P[6][1] = H * (1 + 0.09 * p);
  P[7][0] = (1.0 + 5.2 * p) * sz; P[7][1] = H * (1 - 0.42 * p);
  P[8][0] = (1.0 + 6.6 * p) * sz; P[8][1] = H * (1 - 0.9 * p);
  BP[0][0] = P[4][0]; BP[0][1] = P[4][1];
  BP[1][0] = P[5][0]; BP[1][1] = P[5][1];
  BP[2][0] = -2.6 * sz; BP[2][1] = 0.55 * H;
  BP[3][0] = -7 * sz; BP[3][1] = 0.12 * H;
  BP[4][0] = -16; BP[4][1] = -0.08;
}
const cro = [0, 0];
function cr(Pts, i, u, out) {
  const n = Pts.length;
  const p0 = Pts[Math.max(i - 1, 0)], p1 = Pts[i], p2 = Pts[Math.min(i + 1, n - 1)], p3 = Pts[Math.min(i + 2, n - 1)];
  const u2 = u * u, u3 = u2 * u;
  for (let k = 0; k < 2; k++) out[k] = 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3);
  return out;
}

export function updateWave() {
  const fp = frontGeo.attributes.position.array, ff = frontGeo.attributes.foam.array, ft = frontGeo.attributes.thin.array, fs = frontGeo.attributes.sv.array;
  const bp = backGeo.attributes.position.array, bf = backGeo.attributes.foam.array, bt = backGeo.attributes.thin.array, bs = backGeo.attributes.sv.array;
  for (let i = 0; i <= NX; i++) {
    const x = G.curlX + XA + (G.XB - XA) * i / NX;
    wparams(x, prm); ctrl(prm);
    const br = prm.br, p = prm.p;
    for (let j = 0; j < NF; j++) {
      const t = j / (NF - 1) * 8, seg = Math.min(7, Math.floor(t)), u = t - seg;
      cr(P, seg, u, cro);
      let y = cro[1];
      if (br > 0) y += br * sm(1, 5, t) * (Math.sin(x * 1.3 + G.gtime * 4 + t) * 0.22 + Math.sin(x * 0.55 - G.gtime * 2.6 + t * 0.5) * 0.25);
      const k = i * NF + j;
      fp[k * 3] = x; fp[k * 3 + 1] = y; fp[k * 3 + 2] = cro[0];
      ft[k] = sm(1.5, 4.8, t);
      fs[k] = t / 8;
      ff[k] = br * (0.55 + 0.5 * sm(2, 5, t)) + p * sm(6.9, 8, t) * 0.9 + 0.2 * sm(4.75, 5, t) * (1 - sm(5, 5.3, t)) * prm.g;
    }
    for (let j = 0; j < NB; j++) {
      const t = 1 + j / (NB - 1) * 3, seg = Math.min(3, Math.floor(t)), u = t - seg;
      cr(BP, seg, u, cro);
      const k = i * NB + j;
      bp[k * 3] = x; bp[k * 3 + 1] = cro[1]; bp[k * 3 + 2] = cro[0];
      bt[k] = 0.7 * (1 - sm(1, 3, t));
      bs[k] = 0.6 + t * 0.1;
      bf[k] = br * 0.8 * (1 - sm(1.5, 4, t));
    }
  }
  for (const g of [frontGeo, backGeo]) {
    g.attributes.position.needsUpdate = true; g.attributes.foam.needsUpdate = true;
    g.attributes.thin.needsUpdate = true; g.attributes.sv.needsUpdate = true;
    g.computeVertexNormals();
  }
}

// punto de la cara de la ola a una altura h (0 = seno, 1 = cresta)
export const face = { y: 0, z: 0, ty: 1, tz: 0, Hc: 1, p: 0, dx: 0 };
const fy = new Float32Array(48), fz = new Float32Array(48);
export function faceAt(x, h) {
  wparams(x, prm); ctrl(prm);
  const n = 48;
  for (let j = 0; j < n; j++) {
    const t = j / (n - 1) * 5, seg = Math.min(4, Math.floor(t)), u = t - seg;
    cr(P, seg, u, cro); fy[j] = cro[1]; fz[j] = cro[0];
  }
  const Hc = Math.max(0.3, P[5][1]), target = h * Hc;
  let j = 1;
  while (j < n - 1 && fy[j] < target) j++;
  const y0 = fy[j - 1], y1 = fy[j], k = y1 > y0 ? clamp((target - y0) / (y1 - y0), 0, 1) : 1;
  face.y = lerp(y0, y1, k); face.z = lerp(fz[j - 1], fz[j], k);
  let ty = y1 - y0, tz = fz[j] - fz[j - 1];
  if (ty < 0.05) { ty = 0.05; tz = -Math.max(Math.abs(tz), 0.3); }   // en la cresta la tangente nunca da la vuelta
  const l = Math.hypot(ty, tz) || 1;
  face.ty = ty / l; face.tz = tz / l; face.Hc = Hc; face.p = prm.p; face.dx = prm.dx;
  return face;
}
