// La sesión de surf: empezar, remar, ponerse de pie, surfear, caerse y terminar.
// pasoSesion(dt) hace lo que toca en cada estado (G.state) en cada fotograma y devuelve la postura del surfista.
// Estados: title (menú) → paddle (remando) → popup (poniéndose de pie) → ride (surfeando) → wipe (caída) → between → paddle…
//          miss (ha perdido la ola), duel (Disputa por el Pico, en modos/disputa.js), over (fin de la sesión).
import { $, clamp, lerp, rnd, sm, V3 } from '../nucleo/util.js';
import { avisar } from '../nucleo/eventos.js';
import { SESSION } from '../nucleo/config.js';
import { G } from '../nucleo/estado.js';
import { basisQuat, UP, vT } from '../mundo/formas.js';
import { face, faceAt } from '../mundo/ola.js';
import { splash } from '../mundo/particulas.js';
import { lerpPose, poseA, poseB, poseOut, posturas, riderStance } from '../surfista/posturas.js';
import { boardRoot } from '../surfista/tabla.js';
import { addPts, bump } from './puntos.js';
import { placeBoardOnFace, qRide, qTmp, qTmp2, rideStep, steerTarget } from './fisica.js';
import { bubble, chip, clockEl, dial, fade, fmtClock, hud, promptEl, ringArc, ringbox, ringTxt, say, showTrick, tricksEl, waveNEl } from '../interfaz/hud.js';
import { menuP, overlay, overP } from '../interfaz/menu.js';
import { leer, guardar } from '../nucleo/guardado.js';

G.sessionT = SESSION;
G.best = +leer('mejor') || 0;

const qPop0 = new THREE.Quaternion();
const wVel = V3(0, 0, 0), wAxis = V3(1, 0, 0);

export function startTitleRide() {
  G.state = 'title'; G.px = 0; G.curlX = -7; G.h = 0.5; G.vh = 0; G.s = 1.4; G.air = false; G.grow = 1; G.pm = 1; G.rideT = 30; G.theta = 0; G.v = 11;
  boardRoot.visible = true; boardRoot.scale.setScalar(1); G.landT = 1;
  hud.hidden = true; dial.hidden = true; bubble.hidden = true; ringbox.hidden = true; promptEl.hidden = true;
}
export function newGame() {
  G.score = 0; G.sessionT = SESSION; G.waves = 0; G.bestWave = 0;
  overlay.hidden = true; hud.hidden = false; tricksEl.textContent = ''; clockEl.textContent = fmtClock(G.sessionT);
  startPaddle();
}
export function startPaddle() {
  if (G.sessionT <= 0) { endSession(); return; }
  G.state = 'paddle'; G.pt = 0; G.windowOpen = false; G.air = false; G.tubeT = 0; G.mult = 1; G.wavePts = 0;
  G.curlX = G.px - 7; G.grow = 0.35; G.pm = 0; G.h = 0.04; G.vh = 0; G.s = 1.25; G.rideT = 0;
  boardRoot.visible = true;
  ringbox.hidden = false; ringbox.classList.remove('go'); ringTxt.textContent = 'Prepárate para tocar';
  dial.hidden = true; bubble.hidden = true; promptEl.hidden = true;
  waveNEl.textContent = 'Ola ' + (G.waves + 1);
}
export function popUp() {
  G.state = 'popup'; G.popT = 0; qPop0.copy(boardRoot.quaternion); ringbox.hidden = true; G.waves++;
  const perfect = G.pt < 3.05;
  G.v = perfect ? 10 : 9; G.theta = -0.45; G.omega = 0; G.backT = 0; G.twistAmt = 0; G.fs = null; G.btnTurn = null; G.s = G.v / 8.5; G.vh = 0; G.rideT = 0; G.curlX = Math.max(G.curlX, G.px - 5); G.pxStart = G.px;
  if (perfect) { chip('Take-off perfecto'); addPts(150); bump(0.1); }
}
function missTakeoff(why) {
  G.state = 'miss'; G.missT = 0; G.windowOpen = false; ringbox.hidden = true;
  say(why, 2); splash(boardRoot.position, 60, 1.2); boardRoot.visible = false;
}
export function wipeout(why) {
  if (G.state !== 'ride' && G.state !== 'popup') return;
  G.state = 'wipe'; G.wipeT = 0; G.air = false; G.tubeT = 0;
  say(why, 1.8);
  wVel.set(G.s * 8.5 * 0.4, 4, 2.5); wAxis.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
  splash(boardRoot.position, 70, 1.3);
  dial.hidden = true; bubble.hidden = true;
}
function kickOut() {
  if (G.state !== 'ride') return;
  G.state = 'wipe'; G.wipeT = 0.6; G.tubeT = 0;
  const v = addPts(150); say('Fin de la ola  +' + v, 1.8);
  wVel.set(G.s * 8.5 * 0.3, 3, -1.5); wAxis.set(0, 1, 0);
  splash(boardRoot.position, 30, 0.8);
  dial.hidden = true; bubble.hidden = true;
}
function endSession() {
  G.state = 'over';
  const fs = Math.floor(G.score);
  $('final').textContent = fs; $('bestWave').textContent = Math.floor(G.bestWave);
  $('reason').textContent = G.waves + (G.waves === 1 ? ' ola surfeada' : ' olas surfeadas');
  const isBest = fs > G.best;
  if (isBest) { G.best = fs; guardar('mejor', G.best); }
  $('finalBest').textContent = G.best; $('newbest').hidden = !isBest || fs === 0;
  overlay.hidden = false; menuP.hidden = true; overP.hidden = false;
  hud.hidden = true; dial.hidden = true; bubble.hidden = true; ringbox.hidden = true; promptEl.hidden = true;
  $('again').focus({ preventScroll: true });
  avisar('fin-sesion');
}

// Lo que pasa en cada estado, en cada fotograma. Cada uno devuelve la postura del surfista (o null).
// Un estado nuevo es una función más aquí (y la que lo empieza, como startPaddle).
const ESTADOS = {
  // menú: el surfista surfea solo de fondo; en la ficha de personajes, posa delante de la ola
  title(dt) {
    if (G.menuView === 'chars') {
      G.showT += dt; G.air = false;
      boardRoot.position.set(G.px, 0.05 + Math.sin(G.clock * 1.6) * 0.04, 12.5);
      qTmp.setFromAxisAngle(UP, Math.sin(G.showT * 0.45) * 0.3 + (G.CH.goofy ? 0 : Math.PI));
      qTmp2.setFromAxisAngle(V3(1, 0, 0), Math.sin(G.clock * 1.3) * 0.05);
      boardRoot.quaternion.copy(qTmp).multiply(qTmp2);
      const pose = posturas(G.CH).posar(poseA, G.clock);
      G.faceTurn = lerp(G.faceTurn, 0.05, 1 - Math.exp(-dt * 4));
      return pose;
    }
    G.titleT += dt; G.faceTurn = 0.9;
    if (G.h < 0.2) G.autoT = 0.85;
    if (G.h > 0.88) G.autoT = -0.85;
    if (!G.air) G.autoSpin = 0;
    if (G.px - G.curlX < 4) G.v = Math.max(G.v, 12);
    rideStep(dt, G.autoT);
    G.landT += dt;
    if (!G.air) placeBoardOnFace();
    return riderStance(poseA, G.crouch, G.air ? 0.8 : 0, G.clock, G.air ? 0 : -G.bank * 0.8, G.air ? 0 : G.twistAmt);
  },
  // remando mientras la ola crece: hay que tocar cuando el círculo se llena
  paddle(dt) {
    G.pt += dt;
    G.grow = 0.35 + 0.65 * sm(0, 3.0, G.pt); G.pm = sm(2.0, 3.3, G.pt);
    G.paddlePh += dt * 7;
    const hp = 0.04 + 0.5 * sm(0.6, 3.0, G.pt);
    faceAt(G.px, hp);
    vT.set(0, -face.ty, -face.tz);
    basisQuat(vT, V3(0, -face.tz, face.ty), qTmp);
    boardRoot.quaternion.copy(qTmp);
    boardRoot.position.set(G.px, face.y + 0.02 + Math.sin(G.clock * 2.2) * 0.03, face.z);
    G.h = hp;
    const pose = posturas(G.CH).remar(poseA, G.clock, G.paddlePh, 0.7);
    ringArc.style.strokeDashoffset = (251.3 * (1 - clamp(G.pt / 2.6, 0, 1))).toFixed(1);
    if (!G.windowOpen && G.pt >= 2.6) { G.windowOpen = true; ringbox.classList.add('go'); ringTxt.textContent = '¡TOCA!'; }
    if (G.windowOpen && G.pt >= 3.9) missTakeoff('Tarde. La ola te ha pasado por encima');
    return pose;
  },
  // ha perdido la ola: la ola pasa por encima y se vuelve a remar
  miss(dt) {
    G.missT += dt; G.grow = 1; G.pm = Math.min(1, G.pm + dt); G.curlX += 8.5 * dt;
    const pose = posturas(G.CH).remar(poseA, G.clock, G.paddlePh, 0);
    if (G.missT > 1.9) { G.missT = -99; fade(startPaddle); }
    return pose;
  },
  // poniéndose de pie: de tumbado a la postura de surfear en medio segundo
  popup(dt) {
    G.popT += dt; G.grow = 1; G.pm = 1;
    rideStep(dt, null);
    placeBoardOnFace();
    const k = sm(0, 0.5, G.popT);
    THREE.Quaternion.slerp(qPop0, qRide, boardRoot.quaternion, k);
    posturas(G.CH).remar(poseA, G.clock, G.paddlePh, 0); riderStance(poseB, 1, 0, G.clock);
    const pose = lerpPose(poseA, poseB, sm(0.05, 0.45, G.popT), poseOut);
    if (G.popT >= 0.5) G.state = 'ride';
    return pose;
  },
  // surfeando: puntos por velocidad y tubo; caídas y fin de la ola
  ride(dt) {
    rideStep(dt, steerTarget());
    if (G.state === 'ride') {
      const dx = G.px - G.curlX;
      if (!G.air) {
        placeBoardOnFace();
        addPts(Math.abs(G.s) * 8 * dt);
        const inTube = dx > 0 && dx < (3.6 + 0.3 * G.CH.tubo) * 2 && G.h < 0.7 && G.pm > 0.8;
        if (inTube) { G.tubeT += dt; addPts(50 * dt); }
        else if (G.tubeT > 0) {
          if (G.tubeT > 0.8) { const v = addPts(G.tubeT * 200 * (0.7 + 0.1 * G.CH.tubo)); chip('◎ Tubo ' + G.tubeT.toFixed(1) + ' s'); showTrick('Tubo ' + G.tubeT.toFixed(1) + ' s', v); bump(0.15); }
          G.tubeT = 0;
        }
        if (dx < -0.4) wipeout('Te ha comido la ola');
        else if (G.h > 0.97 && dx < 2 && face.p > 0.7 && !G.turnLock && G.pivotAng === 0 && Math.sin(G.theta) > 0.3) wipeout('El labio te ha lanzado por encima');
        else if (dx > G.XB - 22) kickOut();
      } else if (dx < -0.4 && G.aVy < 0) wipeout('Has caído dentro de la espuma');
    }
    G.landT += dt;
    return riderStance(poseA, G.crouch, G.air ? G.grab : 0, G.clock, G.air ? 0 : -G.bank * 0.8, G.air ? 0 : G.twistAmt);
  },
  wipe: caida,
  over: caida,
};
// caída (o fin de la sesión): la tabla sale volando y se hunde; luego, a remar otra ola
function caida(dt) {
  G.wipeT += dt; G.curlX += G.curlSpeed * dt;
  if (boardRoot.visible) {
    wVel.y -= 9.8 * dt;
    boardRoot.position.addScaledVector(wVel, dt);
    qTmp.setFromAxisAngle(wAxis, 9 * dt); boardRoot.quaternion.premultiply(qTmp);
    if (boardRoot.position.y < 0.1 && wVel.y < 0) { splash(boardRoot.position, 50, 1); boardRoot.visible = false; }
  }
  const pose = riderStance(poseA, 0.2, 0, G.clock);
  if (G.state === 'wipe' && G.wipeT > 1.7) {
    G.state = 'between'; G.bestWave = Math.max(G.bestWave, G.wavePts);
    fade(startPaddle);
  }
  return pose;
}
export function pasoSesion(dt) {
  const paso = ESTADOS[G.state];
  return paso ? paso(dt) : null;
}
