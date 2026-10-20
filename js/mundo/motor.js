import { $, V3 } from '../nucleo/util.js';
import { avisar } from '../nucleo/eventos.js';
import { LOWQ } from '../nucleo/config.js';

export const wrap = $('wrap'), canvas = $('c');

// ---------- motor ----------
export let renderer;
renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOWQ, powerPreference: 'high-performance' });   // si no hay WebGL ni se llega aquí (main.js)
let pixRatio = Math.min(window.devicePixelRatio || 1, LOWQ ? 1.4 : 1.75);
renderer.setPixelRatio(pixRatio);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // mismo color que el juego original
// calidad automática: si va a menos de ~48 fps, se baja la resolución poco a poco hasta que vaya fluido
const perf = { t: 0, n: 0, last: 0, cool: 3 };
export function adaptQuality(now) {
  if (!perf.last) { perf.last = now; return; }
  const d = now - perf.last; perf.last = now;
  if (document.hidden || d > 250) return;
  perf.t += d; perf.n++;
  if (perf.t < 2000) return;
  const fps = perf.n * 1000 / perf.t; perf.t = 0; perf.n = 0;
  if (perf.cool > 0) { perf.cool--; return; }        // los primeros segundos no cuentan (carga)
  if (fps < 40 && pixRatio <= 0.75 && FX.on && FX.composer) { FX.on = false; perf.cool = 1; return; }
  if (fps < 48 && pixRatio > 0.7) { pixRatio = Math.max(0.7, pixRatio - 0.15); renderer.setPixelRatio(pixRatio); resize(); perf.cool = 1; }
  else if (fps > 58 && pixRatio < Math.min(window.devicePixelRatio || 1, LOWQ ? 1.4 : 1.75) - 0.05 && !LOWQ) { pixRatio += 0.1; renderer.setPixelRatio(pixRatio); resize(); perf.cool = 2; }
}
export const scene = new THREE.Scene();
export const FOG = 0.00040;
export const fogHex = 0xf0d2b0;
scene.fog = new THREE.FogExp2(fogHex, FOG);
export const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 9000);
// Todo el mundo va dentro de un grupo espejado en X: el surfista avanza hacia la izquierda de la
// pantalla y el tubo y el Pantalán quedan a la derecha, como en el vídeo de referencia.
export const world = new THREE.Group(); world.scale.x = -1; scene.add(world); world.updateMatrixWorld();
const sunDirInt = V3(-0.32, 0.16, -1).normalize();            // coordenadas internas
export const sunDir = V3(-sunDirInt.x, sunDirInt.y, sunDirInt.z);     // coordenadas de mundo (shaders)

const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x1d5866, 0.85 * Math.PI); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xffd2a0, 1.25 * Math.PI); sunL.position.copy(sunDirInt).multiplyScalar(100); world.add(sunL);
const fillL = new THREE.DirectionalLight(0xbcd6ff, 0.5 * Math.PI); fillL.position.set(-0.3, 0.6, 1); world.add(fillL);

export let pxScale = 500, aspect = 1;
export function resize() {
  const r = wrap.getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  renderer.setSize(w, h, false);
  aspect = w / h;
  camera.aspect = aspect;
  camera.fov = aspect < 0.9 ? 68 : 50;
  camera.updateProjectionMatrix();
  pxScale = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  if (FX.composer) FX.composer.setSize(w, h, false);
  avisar('tamano', pxScale);
}

// ---------- efectos de cámara de cine (librería postprocessing) ----------
// brillo del sol y de la espuma, color más vivo, viñeta y, en ordenador, fondo desenfocado y bordes suaves
export const FX = { composer: null, on: true, dof: null };
export function setupFX() {
  const P = window.POSTFX; if (!P) return;
  try {
    const c = new P.EffectComposer(renderer, { frameBufferType: LOWQ ? THREE.UnsignedByteType : THREE.HalfFloatType });
    c.addPass(new P.RenderPass(scene, camera));
    const fx = [];
    if (!LOWQ) fx.push(new P.SMAAEffect());
    if (!LOWQ) { FX.dof = new P.DepthOfFieldEffect(camera, { focusDistance: 20, focusRange: 30, bokehScale: 2.0, resolutionScale: 0.5 }); fx.push(FX.dof); }
    fx.push(new P.BloomEffect({ intensity: LOWQ ? 0.45 : 0.6, luminanceThreshold: 0.86, luminanceSmoothing: 0.12, mipmapBlur: true, radius: 0.6 }));
    fx.push(new P.HueSaturationEffect({ saturation: 0.14 }));
    fx.push(new P.BrightnessContrastEffect({ contrast: 0.09 }));
    fx.push(new P.VignetteEffect({ offset: 0.32, darkness: 0.42 }));
    c.addPass(new P.EffectPass(camera, ...fx));
    FX.composer = c;
  } catch (e) { FX.composer = null; }
}

// el dedo marca la altura objetivo en la cara de la ola
const prj = V3(0, 0, 0);
export function toScreen(x, y, z) {
  prj.set(x, y, z).applyMatrix4(world.matrixWorld).project(camera);
  return [(prj.x + 1) * 0.5 * wrap.clientWidth, (1 - prj.y) * 0.5 * wrap.clientHeight, prj.z];
}
export const camPos = V3(8, 5, 20), camLook = V3(0, 1, 0);
