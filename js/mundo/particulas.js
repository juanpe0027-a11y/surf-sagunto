// Partículas de agua: espuma, spray de la cresta, cortina del labio y salpicaduras.
import { rnd } from '../nucleo/util.js';
import { escuchar } from '../nucleo/eventos.js';
import { PQ } from '../nucleo/config.js';
import { G } from '../nucleo/estado.js';
import { pxScale, world } from './motor.js';
import { ctrl, P, prm, wparams } from './ola.js';
import { commonUniforms, GLSL_COMMON } from './shaders.js';

const PN = 3600;
const pPos = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pMax = new Float32Array(PN);
const pSize0 = new Float32Array(PN), pAlpha0 = new Float32Array(PN), pGrav = new Float32Array(PN);
const pSize = new Float32Array(PN), pAlpha = new Float32Array(PN);
const partGeo = new THREE.BufferGeometry();
partGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
partGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
partGeo.setAttribute('alpha', new THREE.BufferAttribute(pAlpha, 1));
export const partMat = new THREE.ShaderMaterial({
  uniforms: Object.assign(commonUniforms(), { uScale: { value: pxScale } }),
  transparent: true, depthWrite: false, fog: false,
  vertexShader: `attribute float size; attribute float alpha; uniform float uScale; varying float vA; varying vec3 vPos;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(size * uScale / -mv.z, 260.0); gl_Position = projectionMatrix * mv; vA = alpha * smoothstep(2.0, 7.0, -mv.z); vPos = (modelMatrix * vec4(position, 1.0)).xyz; }`,
  fragmentShader: GLSL_COMMON + `varying float vA; varying vec3 vPos;
    void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.05, d) * vA;
      vec3 V = normalize(cameraPosition - vPos);
      vec3 col = vec3(0.92, 0.95, 0.97) + vec3(0.25, 0.18, 0.08) * pow(max(dot(-V, sunDir), 0.0), 3.0);
      col = applyFog(col, vPos);
      gl_FragColor = vec4(tone(col), a); }`
});
escuchar('tamano', s => { partMat.uniforms.uScale.value = s; });   // el tamaño de las gotas depende de la resolución
export const particles = new THREE.Points(partGeo, partMat);
particles.frustumCulled = false; particles.renderOrder = 5; world.add(particles);
let pHead = 0;
export function emit(x, y, z, vx, vy, vz, life, size, alpha, grav) {
  const i = pHead; pHead = (pHead + 1) % PN;
  pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
  pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
  pLife[i] = life; pMax[i] = life; pSize0[i] = size; pAlpha0[i] = alpha; pGrav[i] = grav;
}
export function updateParticles(dt) {
  const drag = 1 - 0.9 * dt;
  for (let i = 0; i < PN; i++) {
    if (pLife[i] <= 0) { pAlpha[i] = 0; pSize[i] = 0; continue; }
    pLife[i] -= dt;
    const k = i * 3;
    pVel[k + 1] -= 9.8 * pGrav[i] * dt;
    pVel[k] *= drag; pVel[k + 1] *= drag; pVel[k + 2] *= drag;
    pPos[k] += pVel[k] * dt; pPos[k + 1] += pVel[k + 1] * dt; pPos[k + 2] += pVel[k + 2] * dt;
    const f = Math.max(0, pLife[i] / pMax[i]);
    pSize[i] = pSize0[i] * (1 + 0.8 * (1 - f));
    pAlpha[i] = pAlpha0[i] * Math.min(1, f * 2.2) * Math.min(1, (1 - f) * 8 + 0.2);
  }
  partGeo.attributes.position.needsUpdate = true; partGeo.attributes.size.needsUpdate = true; partGeo.attributes.alpha.needsUpdate = true;
}
export const acc = { crest: 0, curl: 0, wash: 0, board: 0 };
export function emitWave(dt) {
  if (G.grow > 0.6) {
    acc.crest += dt * 560 * G.grow * PQ;
    while (acc.crest >= 1) {
      acc.crest--;
      const x = G.curlX + rnd(0.5, G.XB - 25); wparams(x, prm); ctrl(prm);
      if (prm.H < 0.8) continue;
      emit(x, P[5][1] + 0.05, P[5][0] - 0.1, rnd(-0.3, 0.3), rnd(2.5, 5.5), rnd(-7, -3), rnd(0.5, 1.0), rnd(0.25, 0.8) * prm.g, 0.42, 0.55);   // abanico de spray que el viento levanta de la cresta
    }
  }
  if (G.pm > 0.55) {
    acc.curl += dt * 120 * G.pm * PQ;
    while (acc.curl >= 1) {
      acc.curl--;
      const x = G.curlX + rnd(-1.5, 1.5); wparams(x + 1.5, prm); ctrl(prm);
      emit(x, rnd(0, 0.6), P[8][0] + rnd(-0.6, 0.8), rnd(-2.5, 2.5), rnd(3, 9.5), rnd(-0.5, 4), rnd(0.9, 1.6), rnd(1.3, 3.4), 0.55, 1);
    }
    // cortina: gotas que caen del labio a lo largo del tubo
    acc.lip = (acc.lip || 0) + dt * 260 * G.pm * PQ;
    while (acc.lip >= 1) {
      acc.lip--;
      const x = G.curlX + rnd(0, 18); wparams(x, prm); ctrl(prm);
      if (prm.p < 0.15) continue;
      const k = rnd(0.6, 1);
      emit(x, P[7][1] * k + P[8][1] * (1 - k), P[7][0] * k + P[8][0] * (1 - k) + rnd(-0.2, 0.2), rnd(-0.3, 0.3), rnd(-2.5, -0.5), rnd(0.2, 1.2), rnd(0.35, 0.7), rnd(0.12, 0.35), 0.75, 1);
    }
    acc.wash += dt * 260 * G.pm * PQ;
    while (acc.wash >= 1) {
      acc.wash--;
      const x = G.curlX - rnd(0.5, 32); wparams(x, prm); ctrl(prm);
      emit(x, rnd(0.1, prm.H * 0.9), rnd(-0.5, 7.5), rnd(-1.5, 1.5), rnd(0.5, 3), rnd(-0.5, 2.5), rnd(0.8, 1.4), rnd(1.3, 3.6), 0.38, 0.25);
    }
  }
}
export function splash(pos, n, power) {
  for (let i = 0; i < n; i++) emit(pos.x + rnd(-0.4, 0.4), pos.y + rnd(0, 0.3), pos.z + rnd(-0.4, 0.4), rnd(-3, 3) * power, rnd(2, 7) * power, rnd(-3, 3) * power, rnd(0.7, 1.4), rnd(0.4, 1.6), 0.8, 1);
}
