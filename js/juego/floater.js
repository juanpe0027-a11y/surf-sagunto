// Floater: subiendo hacia la cresta fuera del tubo, «abajo» → la tabla se queda cruzada encima del labio
// deslizando con la ola (hasta 2 s); «abajo» otra vez, o al acabarse el tiempo, baja la ola y puntúa.
import { lerp, rnd } from '../nucleo/util.js';
import { PQ } from '../nucleo/config.js';
import { G, keys, stick } from '../nucleo/estado.js';
import { vF } from '../mundo/formas.js';
import { emit } from '../mundo/particulas.js';
import { boardRoot } from '../surfista/raiz.js';
import { qLand } from './fisica.js';
import { chip, showTrick } from './hud.js';
import { addPts, bump } from './puntos.js';

const FLOAT_T = 2, FLOAT_DX = 7, FLOAT_TH = -1.3;   // duración, distancia mínima al tubo, rumbo de la tabla (cruzada, punta abajo)
let floatRel = false, floatAcc = 0;
const isDownIn = () => (stick.id !== null && stick.y > 0.45) || keys.down;

// se mira antes de girar (para que la tabla no se ponga a bajar): subiendo cerca del labio y fuera del tubo
export function quiereFloater() {
  return G.state === 'ride' && !G.fs && isDownIn() && G.h > 0.62 && Math.sin(G.theta) > 0.2 && G.px - G.curlX > FLOAT_DX && G.v > 4;
}
export function startFloater() {
  G.floatT = FLOAT_T; floatRel = false; G.theta = 0.05; G.omega = 0; G.turnW = 0; G.turnLock = 0; G.backT = 0; G.pivotAng = 0;
  qLand.copy(boardRoot.quaternion); G.landT = 0;
  G.v = Math.max(G.v, G.curlSpeed + 1.5);
  chip('🌊 Floater');
}
export function floaterStep(dt) {
  G.floatT -= dt;
  const k = 1 - Math.exp(-dt * 10);
  // la tabla va cruzada sobre el labio (la punta hacia abajo de la ola) mientras se desliza de lado con la ola
  G.h = lerp(G.h, 1, k); G.theta = lerp(G.theta, FLOAT_TH, 1 - Math.exp(-dt * 7)); G.bank = lerp(G.bank, 0, k); G.omega = 0; G.twistAmt = lerp(G.twistAmt, 0, k);
  G.crouch = lerp(G.crouch, 1, k);
  G.v = lerp(G.v, G.curlSpeed + 1.8, 1 - Math.exp(-dt * 2)); G.px += G.v * dt; G.s = G.v / 8.5; G.vh = 0;
  floaterSpray(dt);
  const dn = isDownIn();
  if (!dn) floatRel = true;
  if ((floatRel && dn && G.floatT < FLOAT_T - 0.3) || G.floatT <= 0) endFloater();     // abajo otra vez (o a los 2 s): baja la ola
}
function endFloater() {
  const dur = FLOAT_T - Math.max(0, G.floatT);
  G.floatT = 0; G.h = 0.92; G.theta = -0.6; qLand.copy(boardRoot.quaternion); G.landT = 0; G.crouch = 1; G.hMinRun = G.h;
  const p = addPts(250 + dur * 250); showTrick('Floater', p); bump(0.12);
}
// estela de agua que va soltando la tabla por el labio
function floaterSpray(dt) {
  floatAcc += dt * 480 * PQ;
  const b = boardRoot.position;
  vF.set(1, 0, 0).applyQuaternion(boardRoot.quaternion);
  while (floatAcc >= 1) {
    floatAcc--;
    const tl = rnd(0.2, 1.1);
    emit(b.x - vF.x * tl, b.y + 0.05, b.z - vF.z * tl, -vF.x * rnd(0.5, 2.5) + rnd(-0.8, 0.8), rnd(3, 8), rnd(1.5, 5), rnd(0.8, 1.5), rnd(0.15, 0.4), 0.9, 0.7);
  }
}
