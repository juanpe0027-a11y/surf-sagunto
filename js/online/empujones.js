import { G } from '../nucleo/estado.js';
import { splash } from '../mundo/particulas.js';
import { addPts, bump } from '../juego/puntos.js';
import { wipeout } from '../juego/sesion.js';
import { chip, showTrick } from '../interfaz/hud.js';
import { MP } from './red.js';
import { alive } from './jugadores.js';
import { botPushed } from '../modos/bots.js';
import { duelCount } from '../modos/disputa.js';

export function gotPushed(name) {
  if (G.state !== 'ride' || G.air) return;
  const lost = Math.floor(G.wavePts);
  G.score = Math.max(0, G.score - G.wavePts); G.wavePts = 0; G.mult = 1;
  wipeout('💥 ' + name + ' te ha tirado  −' + lost + ' puntos');
}

// --- empujón: pegado a otro surfista, TRUCO lo tira (vuelve a remar y pierde los puntos de la ola) ---
// quién está a tiro: cerca en la ola o con quien acabas de chocar (1,5 s)
function pushTarget() {
  if (G.state !== 'ride' || G.air) return null;
  let best = null, bd = 99;
  const now = performance.now();
  for (const R of MP.remotes.values()) {
    if ((R.st !== 'ride' && R.st !== 'air') || !R.rig || !alive(R)) continue;
    const ddx = Math.abs(G.curlX + R.cur.dx - G.px), ddh = Math.abs(R.cur.h - G.h);
    const recent = R.lastHit && now - R.lastHit < 1500;
    if ((ddx < 4 && ddh < 0.45) || recent) { const d = ddx + ddh * 6 - (recent ? 5 : 0); if (d < bd) { bd = d; best = R; } }
  }
  return best;
}
export function tryPush() {
  const best = pushTarget();
  if (!best) return false;
  const name = best.nm || best.ch.name;
  if (best.bot) botPushed(best.id, MP.myName || G.CH.name);
  else if (MP.base) MP.base.child('msgs').push({ ev: 'push', to: best.id, id: MP.myId, nm: MP.myName || G.CH.name, at: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
  best.st = 'wipe';
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
