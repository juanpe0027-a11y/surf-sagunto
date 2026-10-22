// Empujones: pegado a otro surfista, TRUCO lo tira (vuelve a remar y pierde los puntos de la ola).
// Nada más coger la ola hay unos segundos de protección (🛡️ junto al nombre) en los que nadie te puede tirar.
import { G } from '../nucleo/estado.js';
import { splash } from '../mundo/particulas.js';
import { endFly, flyStep, FLY_T, pushArms, PUSH_T, startFly } from '../surfista/empujon.js';
import { applyPose, rider } from '../surfista/muneco.js';
import { poseA } from '../surfista/posturas.js';
import { boardRoot } from '../surfista/raiz.js';
import { chip, showTrick } from '../juego/hud.js';
import { addPts, bump } from '../juego/puntos.js';
import { wipeout } from '../juego/sesion.js';
import { alive } from './jugadores.js';
import { evento } from './protocolo.js';
import { MP } from './red.js';
import { botPushed } from '../modos/bots.js';
import { duelCount } from '../modos/disputa.js';

// solo pegado a él (también en el aire) y nunca a quien acaba de coger la ola (unos segundos)
export const PUSH_DIST = 1.7, SAFE_T = 4;

// fromX: dónde estaba el que me ha empujado (salgo volando hacia el otro lado)
export function gotPushed(name, fromX) {
  if (G.state !== 'ride' || MP.safe) return;
  const lost = Math.floor(G.wavePts);
  G.score = Math.max(0, G.score - G.wavePts); G.wavePts = 0; G.mult = 1;
  wipeout('💥 ' + name + ' te ha tirado  −' + lost + ' puntos');
  if (G.state === 'wipe') MP.fly = startFly(boardRoot, Math.sign(G.px - (fromX ?? G.px - 1)) || 1, Math.max(G.v, 6));
}

// quién está a tiro: el más cercano a menos de PUSH_DIST que no esté protegido
function pushTarget() {
  if (G.state !== 'ride') return null;
  let best = null, bd = PUSH_DIST;
  for (const R of MP.remotes.values()) {
    if ((R.st !== 'ride' && R.st !== 'air') || !R.rig || !alive(R) || R.tgt.pt > 0.5) continue;
    const d = R.rig.root.position.distanceTo(boardRoot.position);
    if (d < bd) { bd = d; best = R; }
  }
  return best;
}
// protección: nada más coger la ola (o volver después de que te tiren), unos segundos sin que te puedan tirar
MP.safe = true; MP.safeT = 0;
export function updateSafe(dt) {
  if (G.floatT > 0) { if (!MP.safe) { MP.safe = true; MP.sendT = 0; } return; }   // haciendo un floater tampoco te pueden tirar
  if (G.state === 'ride' || G.state === 'popup') {
    MP.safeT += dt;
    if (MP.safe && MP.safeT > SAFE_T) { MP.safe = false; MP.sendT = 0; }
  } else if (G.state !== 'duel') {
    if (!MP.safe) MP.sendT = 0;
    MP.safe = true; MP.safeT = 0;
  }
}
export function tryPush() {
  const best = pushTarget();
  if (!best) return false;
  const name = best.nm || best.ch.name;
  if (best.bot) botPushed(best.id, MP.myName || G.CH.name);
  else if (MP.base) MP.base.child('msgs').push(evento('push', best.id)).catch(() => {});
  best.st = 'wipe';
  MP.pushArm = { t: 0, R: best };
  best.fly = startFly(best.rig.root, Math.sign(best.rig.root.position.x - G.px) || 1, G.curlSpeed);
  splash(best.rig.root.position, 70, 1.4);
  const got = addPts(300); chip('💪 Has tirado a ' + name); showTrick('Empujón a ' + name, got); bump(0.1);
  G.v = Math.max(6, G.v - 1); G.crouch = 1;
  duelCount(best);
  return true;
}
const padLab = document.querySelector('#padTricks .lab');
let pushShown = 0;
export function updatePushHint() {
  const mode = G.state === 'duel' ? 2 : pushTarget() ? 1 : 0;
  if (mode !== pushShown) { pushShown = mode; padLab.textContent = ['TRUCO', '💪 EMPUJAR', '⚔️ GOLPE'][mode]; document.getElementById('padTricks').classList.toggle('push', mode > 0); }
}

// --- animación: a quién apuntan los brazos del que empuja (pa = { t, R } yo empujo · { me } me empujan · { to } empujan a otro) ---
export function armTarget(pa) {
  if (pa.R) return pa.R.rig ? pa.R.rig.root.position : null;
  if (pa.me) return boardRoot.position;
  const V = MP.remotes.get(pa.to); return V && V.rig ? V.rig.root.position : null;
}
// yo: los brazos al empujar y la caída separado de la tabla (después de que la partida haya puesto mi postura en poseA)
export function myPushAnims(dt) {
  if (MP.pushArm) {
    MP.pushArm.t += dt;
    if (MP.pushArm.t > PUSH_T || G.state !== 'ride') MP.pushArm = null;
    else { pushArms(poseA, boardRoot, rider, armTarget(MP.pushArm), MP.pushArm.t); applyPose(poseA); }
  }
  if (MP.fly) {
    if (G.state !== 'wipe') { endFly(rider); MP.fly = null; }
    else if ((MP.fly.t += dt) > FLY_T) boardRoot.visible = false;
    else { boardRoot.visible = true; flyStep(MP.fly, boardRoot, rider, poseA); applyPose(poseA); }
  }
}
