// Bucle principal: cada fotograma avanza la partida, mueve la cámara y dibuja.
import { $, clamp, lerp, sm, V3 } from './nucleo/util.js';
import { G } from './nucleo/estado.js';
import { adaptQuality, aspect, camera, camLook, camPos, FX, renderer, scene } from './mundo/motor.js';
import { sky, skyMat } from './mundo/cielo.js';
import { ocean, oceanMat } from './mundo/mar.js';
import { updateWave, waveMat } from './mundo/ola.js';
import { emitWave, partMat, updateParticles } from './mundo/particulas.js';
import { coast, north } from './mundo/costa.js';
import { updateDolphins } from './mundo/delfines.js';
import { applyPose } from './surfista/muneco.js';
import { boardRoot } from './surfista/tabla.js';
import { aPos, estelaTabla } from './juego/fisica.js';
import { tablaEnElAire } from './juego/trucos.js';
import { pasoSesion } from './juego/sesion.js';
import { actualizarHud, clockEl, fmtClock, hud, promptEl } from './interfaz/hud.js';
import { statsTick } from './interfaz/records.js';
import { mpUpdate } from './online/jugadores.js';
import { DUEL, duelCam, duelUpdate } from './modos/disputa.js';

const fxV = new THREE.Vector3();
function renderFrame(dt) {
  if (FX.composer && FX.on) {
    if (FX.dof) { boardRoot.getWorldPosition(fxV); FX.dof.cocMaterial.focusDistance = G.state === 'duel' ? camPos.distanceTo(camLook) : Math.max(4, camera.position.distanceTo(fxV)); }
    FX.composer.render(dt);
  } else renderer.render(scene, camera);
}

let camFast = 0;
const desPos = V3(0, 0, 0), desLook = V3(0, 0, 0);

// la cámara sigue a la ola (o a la disputa)
function actualizarCamara(dt) {
  const sp = boardRoot.position, far = aspect < 0.9 ? 1.6 : 1;
  let k = 3.5;
  if (G.state === 'title') {
    const yaw = 2.0 + 2.15 * Math.sin(G.titleT * 0.12 + 1.2);
    if (G.menuView === 'chars') {
      // al elegir surfista, la cámara se acerca para verlo bien
      desPos.set(sp.x - 0.2, 1.55, sp.z + 3.0 * far);
      desLook.set(sp.x + (aspect < 0.9 ? 0 : 1.5), aspect < 0.9 ? 0.6 : 1.2, sp.z);
      k = 4;
    } else {
      desPos.set(sp.x + 7, 4.5, 17);
      desLook.set(desPos.x + Math.sin(yaw) * 60, 6 + 6 * sm(1.4, 2.6, yaw), desPos.z - Math.cos(yaw) * 60);
      k = 1.5;
    }
  } else if (G.state === 'duel') {
    duelCam(desPos, desLook, far); k = 3;
  } else if (G.state === 'miss') {
    desPos.set(sp.x - 3, 4.5, sp.z + 18 * far);
    desLook.set(sp.x - 3, 1.5, sp.z - 3);
    k = 1.2;
  } else if (G.state === 'paddle') {
    desPos.set(sp.x - 2.5, 2.2 + 0.6 * G.grow, sp.z + 13 * far);
    desLook.set(sp.x - 2.5, sp.y + 1.0 + G.grow * 0.8, sp.z - 3);
  } else {
    const yy = G.air ? aPos.y : sp.y, still = G.state === 'wipe' || G.state === 'over' || G.state === 'between';
    // la cámara va con la ola (no pegada al surfista): si frenas, el surfista se va hacia la derecha y se mete
    // bajo el tubo; si aceleras, se adelanta hacia la izquierda. Siempre queda dentro de la pantalla.
    // cuando va rápido, la cámara se acerca y lo mantiene más centrado (que no se meta detrás de los botones)
    camFast = lerp(camFast, still ? 0 : Math.max(sm(7, 14, G.v), sm(10, 30, sp.x - G.curlX)), 1 - Math.exp(-dt * 1.6));
    const half = aspect < 0.9 ? lerp(2.4, 1.4, camFast) : lerp(5, 2.5, camFast);
    let cx = still ? sp.x - 3 : G.curlX + 6 + 0.4 * (sp.x - G.curlX - 9);
    cx = clamp(cx, sp.x - half, sp.x + half);
    desPos.set(cx, Math.max(2.4, yy * 0.4 + lerp(2.8, 2.2, camFast)), still ? 20 * far : sp.z + lerp(19, 12.5, camFast) * far);
    desLook.set(cx, yy * 0.55 + 1.0, sp.z - 6);
  }
  const f = 1 - Math.exp(-dt * k);
  camPos.lerp(desPos, f); camLook.lerp(desLook, f);
  camera.position.set(-camPos.x, camPos.y, camPos.z);
  camera.lookAt(-camLook.x, camLook.y, camLook.z);  sky.position.copy(camPos);
  ocean.position.x = camPos.x; ocean.position.z = camPos.z;
  coast.position.x = camPos.x * 0.92;
  north.position.x = G.state === 'duel' && DUEL.on ? DUEL.ax + DUEL.pOff : camPos.x;   // en la disputa, el Pantalán se queda al lado
}
function update(dt) {
  G.clock += dt; G.gtime += dt;
  for (const m of [skyMat, oceanMat, waveMat, partMat]) m.uniforms.time.value = G.clock;
  if (G.msgTimer > 0) { G.msgTimer -= dt; if (G.msgTimer <= 0) promptEl.hidden = true; }
  if (G.state !== 'title' && G.state !== 'over' && G.state !== 'duel') { G.sessionT -= dt; clockEl.textContent = fmtClock(G.sessionT); }
  let pose;
  if (G.state === 'duel') { boardRoot.visible = false; duelUpdate(dt); pose = null; }
  else pose = pasoSesion(dt);
  tablaEnElAire();
  const calm = (G.state === 'title' && G.menuView === 'chars') || G.state === 'paddle' || G.state === 'miss';
  G.windAmt = lerp(G.windAmt, calm ? 0.06 : G.air ? 1 : clamp(G.v / 13, 0.25, 1), 1 - Math.exp(-dt * 4));
  if (pose) applyPose(pose);
  estelaTabla(dt);
  emitWave(dt);
  updateDolphins(dt);
  updateWave();
  updateParticles(dt);
  actualizarCamara(dt);
  actualizarHud();
}

G.last = performance.now();
export function frame(now) {
  const dt = Math.min(0.05, (now - G.last) / 1000); G.last = now;
  adaptQuality(now);
  if (!document.hidden) { update(dt); mpUpdate(dt); statsTick(dt); $('hudMic').hidden = hud.hidden; renderFrame(dt); }
  requestAnimationFrame(frame);
}
