// Saltos y trucos: despegar de la cresta, girar en el aire (360, switch, backflip, grab), caer y puntuar; snaps y re-entries.
import { clamp, rnd, sm, TAU, V3 } from '../nucleo/util.js';
import { PQ } from '../nucleo/config.js';
import { G, ptr } from '../nucleo/estado.js';
import { seatedC } from '../datos/personajes.js';
import { basisQuat, UP, vF, vN, vT } from '../mundo/formas.js';
import { face, faceAt } from '../mundo/ola.js';
import { emit, splash } from '../mundo/particulas.js';
import { boardRoot } from '../surfista/raiz.js';
import { aPos, LAND_A, LAND_SOFT, qAirBase, qLand, qLandPose, qLaunch, qRide, qTmp, qTmp2 } from './fisica.js';
import { chip, say, showTrick } from './hud.js';
import { addPts, bump } from './puntos.js';
import { wipeout } from './sesion.js';

export const LAND_H = 0.8;
// cómo cae: más abajo en la cara, con la tabla hacia abajo y hacia delante, o hacia el tubo si saltaste hacia él
function setLandPose() {
  faceAt(G.px, LAND_H);
  const a = G.airBack ? -Math.PI + LAND_A : -LAND_A;
  vT.set(0, face.ty, face.tz);
  vF.set(Math.cos(a), 0, 0).addScaledVector(vT, Math.sin(a)).normalize();
  basisQuat(vF, V3(0, -face.tz, face.ty), qLandPose);
}
export function launch() {
  G.air = true; G.airT = 0; G.spin = 0; G.flip = 0; G.spinT = 0; G.flipT = 0; G.grab = 0; G.grabT = 0; G.airHold = 0; G.supT = 0;
  faceAt(G.px, 1);
  aPos.set(G.px, face.y + 0.05, face.z); G.launchY = aPos.y; G.launchZ = face.z; G.airTop = 0;
  // arco estable: siempre hay tiempo para un truco y la ola no te adelanta en el aire
  G.aVy = clamp(G.v * Math.sin(G.theta) * 0.9 + 1.6 + (G.CH.air - 3) * 0.45, 4.6, 10);
  G.airDur = 2 * G.aVy / 9.8 + 0.15;
  // el salto va siempre hacia delante, con la ola
  G.airBack = false; G.airSteer = 0;
  G.airVx = Math.max(G.v * Math.cos(G.theta), G.curlSpeed * 1.02);
  faceAt(G.px + G.airVx * G.airDur, LAND_H);
  G.landZ = face.z;
  setLandPose();
  qLaunch.copy(qRide);
  splash(aPos, 25, 0.8);
  ptr.ax = ptr.x; ptr.ay = ptr.y; ptr.moved = false;
  if (G.state === 'title') G.spinT = TAU;
  else if (!G.airHintShown) { G.airHintShown = true; say(seatedC(G.CH) ? 'TRUCO: 1 toque Superman · 2 Backflip · 3 360 · 4 Backflip + Superman' : 'TRUCO: 1 toque 360 · 2 switch · 3 backflip agarrado · mantén = agarrar', 2.6); }
}
// 1 pulsación = 360 · 2 = switch · 3 = backflip agarrado · 4 = backflip 360 (se pueden encadenar mientras dure el salto)
export const SWITCH_T = 1.3;   // segundos que va en switch antes de volver solo de punta

export function doTrick(n) {
  const dir = 1;
  if (seatedC(G.CH)) {
    if (n === 1) G.supT = 0.8;
    else if (n === 2) G.flipT += TAU;
    else if (n === 3) G.spinT += TAU;
    else { G.flipT += TAU; G.supT = 0.9; }
    G.spinT = clamp(G.spinT, -2 * TAU, 2 * TAU); G.flipT = Math.min(G.flipT, 2 * TAU);
    return;
  }
  // tablas: 1 = 360 · 2 = 180 y cae en switch (al segundo vuelve de punta) · 3 = backflip agarrando la tabla · 4 = backflip 360
  if (n === 1) G.spinT += TAU * dir;
  else if (n === 2) G.spinT += Math.PI * dir;
  else if (n === 3) { G.flipT += TAU; G.supT = 0.9; }
  else { G.flipT += TAU; G.spinT += TAU * dir; G.supT = 0.9; }
  G.spinT = clamp(G.spinT, -2 * TAU, 2 * TAU); G.flipT = Math.min(G.flipT, 2 * TAU);
}
export function land() {
  G.air = false; G.h = LAND_H; G.theta = G.airBack ? -Math.PI + LAND_A : -LAND_A; G.omega = 0; G.turnW = 0; G.backT = 0; G.fs = null; G.crouch = 1;
  G.v = clamp(G.v * 0.7, 6.5, 9.5); G.landV = G.v; G.landSoft = LAND_SOFT;           // al tocar el agua frena: cae suave y controlable
  const sErr = Math.abs(G.spinT - G.spin), fErr = Math.abs(G.flipT - G.flip);
  faceAt(G.px, LAND_H); splash(V3(G.px, face.y, face.z), 34, 0.9);
  qLand.copy(boardRoot.quaternion); G.landT = 0;
  if (G.state === 'title') return;
  if (sErr > 0.9 || fErr > 0.9) { wipeout(sErr > 0.9 ? 'No te ha dado tiempo a completar el giro' : 'No has cerrado el mortal'); return; }
  G.spin = G.spinT; G.flip = G.flipT;
  const ns = Math.floor(Math.abs(G.spinT) / TAU + 0.05), nf = Math.round(G.flipT / TAU), grabbed = G.grabT > 0.2;
  const sw = !seatedC(G.CH) && Math.abs(Math.abs(G.spinT) - ns * TAU - Math.PI) < 0.3;      // ha caído en switch (180)
  if (sw) { G.switchT = SWITCH_T; qTmp.setFromAxisAngle(UP, -Math.PI); qLand.multiply(qTmp); }
  const name = [];
  const gName = seatedC(G.CH) ? 'Superman' : 'Indy';
  if (grabbed) { name.push(G.grabT > 0.6 ? gName + ' largo' : gName); chip((seatedC(G.CH) ? '🦸 ' : '✋ ') + gName + ' ' + G.grabT.toFixed(1) + ' s'); }
  if (ns > 0 || sw) { const n = (G.spinT < 0 ? 'Alley-oop ' : '') + (ns * 360 + (sw ? 180 : 0)) + (sw ? ' switch' : ''); name.push(n); chip('↻ ' + n); }
  if (nf > 0) { const n = nf > 1 ? 'Doble backflip' : 'Backflip'; name.push(n); chip('⟳ ' + n); }
  if (!name.length) name.push('Aéreo');
  chip('↑ ' + G.airTop.toFixed(1) + ' m');
  let pts = 120 + G.airTop * 80 + ns * 450 + (sw ? 350 : 0) + nf * 800 + (grabbed ? 150 + G.grabT * 300 : 0);
  pts *= 1 + 0.3 * Math.max(0, name.length - 1);            // combinar trucos multiplica
  const key = name.join(' + ');
  if (key !== G.lastTrick) pts *= 1.2;                        // variar de truco premia
  G.lastTrick = key;
  const dx = G.px - G.curlX;
  if (dx < 18) { pts += 100; chip('Reentrada'); }            // caer junto al tubo
  const got = addPts(pts);
  showTrick(key, got);
  bump(0.1 + 0.08 * ns + 0.15 * nf + (grabbed ? 0.05 : 0));
}
let sprayAcc = 0;
// abanico de agua que lanza la cola de la tabla al pivotar en la cresta (por detrás de la ola)
export function lipSpray(dt) {
  sprayAcc += dt * 950 * PQ * Math.min(1.4, Math.abs(G.omega) / 5) * Math.min(1.3, G.v / 9);
  const b = boardRoot.position;
  vF.set(1, 0, 0).applyQuaternion(boardRoot.quaternion);
  while (sprayAcc >= 1) {
    sprayAcc--;
    const tl = rnd(0.3, 1.0);
    emit(b.x - vF.x * tl, b.y + 0.15, b.z - vF.z * tl, -vF.x * rnd(1, 5) + rnd(-1.5, 1.5), rnd(7, 17), -rnd(4, 12), rnd(0.9, 1.6), rnd(0.1, 0.32), 0.9, 0.7);
  }
}
export function snap(ang) {
  G.snapCD = 1.0;
  vF.set(1, 0, 0).applyQuaternion(boardRoot.quaternion);
  vN.set(0, 1, 0).applyQuaternion(boardRoot.quaternion);
  const b = boardRoot.position;
  for (let i = 0; i < 80; i++) {
    const a = rnd(2, 7), c = rnd(4, 10);
    emit(b.x - vF.x * 0.8, b.y + 0.2, b.z, -vF.x * a + rnd(-1, 1), vN.y * c + rnd(0, 3), vN.z * c - rnd(1, 4), rnd(0.6, 1.1), rnd(0.2, 0.7), 0.9, 1);
  }
  const deg = Math.round((ang || 1.2) * 57.3 / 5) * 5;
  if (deg >= 150) G.v = Math.max(G.v, G.curlSpeed + 2.5);       // el labio te devuelve a la ola con fuerza
  const name = deg >= 150 ? 'Re-entry ' + deg + '°' : 'Snap ' + deg + '°';
  const pts = addPts(80 + deg * 2.2 + Math.abs(G.s) * 60); chip(name); if (deg >= 150) showTrick(name, pts); bump(deg >= 150 ? 0.15 : 0.06);
  return pts;
}
// la tabla en el aire pasa de la postura de salida a la de recepción mientras gira
export function tablaEnElAire() {
  if (G.air && (G.state === 'ride' || G.state === 'title')) {
    THREE.Quaternion.slerp(qLaunch, qLandPose, qAirBase, sm(0.15, 0.95, G.airT / G.airDur));
    qTmp.setFromAxisAngle(UP, G.spin);
    qTmp2.setFromAxisAngle(V3(0, 0, 1), G.flip);
    boardRoot.quaternion.copy(qTmp).multiply(qAirBase).multiply(qTmp2);
    boardRoot.position.copy(aPos);
  }
}
