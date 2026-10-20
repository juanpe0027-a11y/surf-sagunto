// Los demás surfistas: mandar mi estado, recibir el suyo, dibujarlos en mi ola, choques y la clasificación de la sala.
import { $, clamp, lerp, TAU, V3 } from '../nucleo/util.js';
import { escuchar } from '../nucleo/eventos.js';
import { G } from '../nucleo/estado.js';
import { CHARS, seatedC } from '../datos/personajes.js';
import { basisQuat, UP, vT } from '../mundo/formas.js';
import { toScreen } from '../mundo/motor.js';
import { face, faceAt } from '../mundo/ola.js';
import { splash } from '../mundo/particulas.js';
import { poseFor, posturas } from '../surfista/posturas.js';
import { boardRoot } from '../surfista/raiz.js';
import { applyPoseRig, buildRig, disposeRig } from '../surfista/rig.js';
import { aPos } from '../juego/fisica.js';
import { chip, hud, showTrick, toast } from '../juego/hud.js';
import { addPts, bump } from '../juego/puntos.js';
import { updatePushHint } from './empujones.js';
import { checkIdle, MP, mpCount, mpLayer, mpMenu, SALA } from './red.js';
import { updateBots } from '../modos/bots.js';
import { DUEL } from '../modos/disputa.js';

// cuando llega el cuerpo realista, se rehacen los surfistas que ya estaban en el agua
function rebuildRigs() { for (const R of MP.remotes.values()) if (R.rig && R.ch) { disposeRig(R.rig); R.rig = buildRig(R.ch); } }
escuchar('cuerpo-listo', rebuildRigs);

// --- mi estado (absoluto, ~8 veces por segundo; en el menú, cada 2 s) ---
function myStatus() {
  if (G.state === 'ride' || G.state === 'popup') return G.air ? 'air' : 'ride';
  if (G.state === 'paddle' || G.state === 'miss') return 'paddle';
  if (G.state === 'wipe') return 'wipe';
  if (G.state === 'duel') return 'duel';
  return 'menu';
}
const r2 = n => Math.round(n * 100) / 100;
function mpSend(dt) {
  if (!MP.meRef || !MP.connected || MP.away) return;
  MP.sendT -= dt;
  if (MP.sendT > 0) return;
  const st = myStatus();
  MP.sendT = st === 'menu' ? 2 : st === 'duel' ? 0.1 : 0.125;
  if (st === 'duel' && DUEL.on) {
    MP.meRef.set({ ch: G.CH.id, nm: MP.myName || G.CH.name, st, du: DUEL.oppId, dx: r2(DUEL.A.u), h: DUEL.A.hp, gr: DUEL.swN, sp: DUEL.A.sw.type, bk: DUEL.A.block ? 1 : 0, ay: r2(DUEL.A.jy), sc: Math.floor(G.score), t: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
    return;
  }
  MP.meRef.set({ ch: G.CH.id, nm: MP.myName || G.CH.name, st, dx: r2(G.px - G.curlX), h: r2(G.h), th: r2(G.theta), bk: r2(G.bank), cr: r2(G.crouch),
    gr: r2(G.grab), ay: r2(G.air ? aPos.y : 0), sp: r2(G.spin), fl: r2(G.flip), pr: r2(G.paddlePh % TAU), sc: Math.floor(G.score), t: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
}

// --- los demás surfistas ---
const KEYS_NUM = ['dx', 'h', 'th', 'bk', 'cr', 'gr', 'ay', 'sp', 'fl'];
export function upsertPeer(id, pr) {
  if (!pr || id === MP.myId) return;
  let R = MP.remotes.get(id);
  const ch = CHARS.find(c => c.id === pr.ch) || CHARS[0];
  if (!R) {
    R = { id, chId: null, rig: null, cur: {}, tgt: {}, st: 'menu', nm: '', label: document.createElement('div'), msgT: 0, hitCD: 0, overDone: false };
    R.label.className = 'mplabel'; R.label.innerHTML = '<b></b><span class="mpbub" hidden></span>'; R.label.hidden = true;
    mpLayer.appendChild(R.label);
    MP.remotes.set(id, R);
  }
  if (R.chId !== ch.id) { if (R.rig) disposeRig(R.rig); R.rig = buildRig(ch); R.chId = ch.id; }
  const wasSt = R.st;
  R.seen = performance.now(); R.purged = false;
  R.ch = ch; R.st = typeof pr.st === 'string' ? pr.st : 'menu';
  R.du = typeof pr.du === 'string' ? pr.du : '';
  if (R.st === 'duel' && wasSt !== 'duel' && R.du && R.du !== MP.myId && id < R.du) {
    const O = MP.remotes.get(R.du); chip('⚔️ Disputa por el Pico: ' + (pr.nm || ch.name) + ' contra ' + (O ? O.nm || O.ch.name : 'otro surfista'));
  }
  R.nm = typeof pr.nm === 'string' ? pr.nm.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 20) : ch.name;
  R.label.querySelector('b').textContent = R.nm || ch.name;
  for (const k of KEYS_NUM) { const v = Number(pr[k]); R.tgt[k] = isFinite(v) ? v : 0; if (!(k in R.cur)) R.cur[k] = R.tgt[k]; }
  R.tgt.pr = Number(pr.pr) || 0; R.sc = Math.max(0, Math.floor(Number(pr.sc) || 0));
  updateCount();
}
export function removePeer(id) {
  const R = MP.remotes.get(id); if (!R) return;
  if (R.rig) disposeRig(R.rig); R.label.remove(); MP.remotes.delete(id); updateCount();
}
// jugador «fantasma»: lleva más de 10 s sin mandar nada (móvil bloqueado, pestaña olvidada…)
export const alive = R => R.bot || performance.now() - (R.seen || 0) < 10000;
export function updateCount() {
  const live = [...MP.remotes.values()].filter(alive);
  const n = live.filter(R => R.st !== 'menu').length, all = live.length;
  const txt = n === 0 ? 'Solo tú en el agua' : n === 1 ? '1 surfista más en el agua' : n + ' surfistas más en el agua';
  mpCount.textContent = '🌊 ' + txt;
  mpMenu.textContent = !MP.db ? mpMenu.textContent : MP.connected ? '🌊 Online · sala «' + SALA + '» · ' + all + (all === 1 ? ' conectado más' : ' conectados más') : '🌊 Conectando…';
}

// --- dibujar a los demás en mi ola, choques y saltos por encima ---
export const qR = new THREE.Quaternion(), qR2 = new THREE.Quaternion(), qR3 = new THREE.Quaternion(), mpV = V3(0, 0, 0);
function remoteFaceQuat(th, bk, out) {
  vT.set(0, face.ty, face.tz);
  const F = V3(Math.cos(th), 0, 0).addScaledVector(vT, Math.sin(th)).normalize();
  basisQuat(F, V3(0, -face.tz, face.ty), out);
  qR3.setFromAxisAngle(V3(1, 0, 0), bk); out.multiply(qR3);
  return out;
}
export function mpUpdate(dt) {
  checkIdle();
  mpSend(dt);
  if (MP.sim) updateBots(dt);
  updateBoard(dt); waveLength(dt); updatePushHint();
  const showAll = !(G.state === 'title' && G.menuView === 'chars') && G.state !== 'over';
  const t = performance.now() / 1000, k = 1 - Math.exp(-dt * 10);
  for (const R of MP.remotes.values()) {
    if (!R.rig) continue;
    for (const key of KEYS_NUM) R.cur[key] = lerp(R.cur[key] ?? R.tgt[key], R.tgt[key], k);
    if (Math.abs(R.tgt.dx - R.cur.dx) > 25) R.cur.dx = R.tgt.dx;     // ha cambiado de ola: sin arrastre
    R.msgT = Math.max(0, R.msgT - dt);
    if (R.msgT === 0) R.label.querySelector('.mpbub').hidden = true;
    // los fantasmas no se ven; si siguen así 45 s, se borran de la sala
    if (!alive(R) && !R.purged && MP.base && performance.now() - (R.seen || 0) > 45000) { R.purged = true; MP.base.child('players/' + R.id).remove().catch(() => {}); }
    const vis = showAll && alive(R) && G.state !== 'duel' && R.st !== 'menu' && R.st !== 'wipe' && R.st !== 'duel';
    R.rig.root.visible = vis;
    if (!vis) { R.label.hidden = true; continue; }
    const c = R.cur, rx = G.curlX + c.dx, root = R.rig.root;
    if (R.st === 'paddle') {
      faceAt(rx, clamp(c.h, 0.03, 1));
      vT.set(0, -face.ty, -face.tz); basisQuat(vT, V3(0, -face.tz, face.ty), root.quaternion);
      root.position.set(rx, face.y + 0.02, face.z);
      // cada uno rema a su ritmo (pr = su fase de remada)
      applyPoseRig(R.rig, posturas(R.ch).remar(R.rig.pose, t + R.tgt.pr / 1.9, t * 7 + R.tgt.pr, 0.7), 0.06, seatedC(R.ch) ? 1.5 : 0.9, t);
    } else if (R.st === 'air') {
      faceAt(rx, 1);
      remoteFaceQuat(0.5, 0, qR);
      qR2.setFromAxisAngle(UP, c.sp); qR3.setFromAxisAngle(V3(0, 0, 1), c.fl);
      root.quaternion.copy(qR2).multiply(qR).multiply(qR3);
      root.position.set(rx, Math.max(c.ay, face.y), face.z);
      applyPoseRig(R.rig, poseFor(R.ch)(R.rig.pose, 0.95, c.gr, t, 0), 1, seatedC(R.ch) ? 1.5 : 0.9, t);
    } else {
      faceAt(rx, clamp(c.h, 0.03, 1));
      remoteFaceQuat(c.th, c.bk, root.quaternion);
      root.position.set(rx, face.y + 0.02, face.z);
      applyPoseRig(R.rig, poseFor(R.ch)(R.rig.pose, c.cr, 0, t + R.tgt.pr, -c.bk * 0.8), 0.7, seatedC(R.ch) ? 1.5 : 0.9, t);
    }
    // nombre (y bocadillo) sobre su cabeza
    const sc = toScreen(root.position.x, root.position.y + 2.3, root.position.z);
    R.label.hidden = sc[2] > 1;
    R.label.style.transform = 'translate(' + Math.round(sc[0]) + 'px,' + Math.round(sc[1]) + 'px) translate(-50%,-100%)';

    // interacción conmigo (cuando estoy surfeando)
    R.hitCD = Math.max(0, R.hitCD - dt);
    if (G.state !== 'ride') continue;
    const dxp = rx - G.px;
    if (!G.air && R.st === 'ride' && Math.abs(dxp) < 1.6 && Math.abs(c.h - G.h) < 0.15 && R.hitCD === 0) {
      R.hitCD = 1.2; R.lastHit = performance.now();
      G.v = Math.max(6, G.v - 1.5); G.theta += (G.h > c.h ? 0.2 : -0.2); G.crouch = 1;
      mpV.copy(boardRoot.position).lerp(root.position, 0.5); splash(mpV, 40, 1);
      chip('💥 Choque con ' + (R.nm || R.ch.name));
    }
    if (G.air && R.st !== 'air' && Math.abs(dxp) < 2 && aPos.y > root.position.y + 1.7 && !R.overDone) {
      R.overDone = true; const got = addPts(300); showTrick('Por encima de ' + (R.nm || R.ch.name), got); bump(0.1);
    }
    if (!G.air) R.overDone = false;
  }
  // mi bocadillo
  const me = $('myBub');
  if (MP.myMsgT > 0) {
    MP.myMsgT -= dt;
    if (MP.myMsgT <= 0 || (G.state === 'title' && G.menuView === 'chars')) me.hidden = true;
    else { const sc = toScreen(boardRoot.position.x, boardRoot.position.y + 2.3, boardRoot.position.z); me.hidden = sc[2] > 1; me.style.transform = 'translate(' + Math.round(sc[0]) + 'px,' + Math.round(sc[1]) + 'px) translate(-50%,-100%)'; }
  }
}
// cada personaje solo puede llevarlo una persona a la vez
function takenBy(id) {
  if (MP.sim) return null;
  for (const R of MP.remotes.values()) if (R.chId === id && alive(R)) return R.nm || R.ch.name;
  return null;
}
document.addEventListener('click', e => {
  const card = e.target.closest && e.target.closest('#chars .card');
  if (card) { const who = takenBy(card.dataset.id); if (who) { e.stopImmediatePropagation(); e.preventDefault(); toast('Ese personaje ya lo ha escogido ' + who + '. Elige otro.'); } return; }
  if (e.target.closest && e.target.closest('#start')) {
    const who = takenBy(G.CH.id);
    if (who) { e.stopImmediatePropagation(); e.preventDefault(); toast(G.CH.name + ' ya lo lleva ' + who + '. Elige otro personaje.'); $('toChars').click(); }
  }
}, true);
function markTaken() {
  document.querySelectorAll('#chars .card').forEach(c => { const who = takenBy(c.dataset.id); c.classList.toggle('taken', !!who); if (who) c.dataset.who = 'Escogido por ' + who; });
}
// la ola se alarga cuantos más surfistas hay en el agua, para que quepan todos
function waveLength(dt) {
  let n = 1; for (const R of MP.remotes.values()) if (R.st !== 'menu' && alive(R)) n++;
  const target = Math.min(420, 150 + 45 * (n - 1));
  G.XB = lerp(G.XB, target, 1 - Math.exp(-dt * 0.5));
}
// clasificación de los que están en la sala
const boardEl = $('mpBoard'); let boardT = 0;
function updateBoard(dt) {
  boardT -= dt; if (boardT > 0) return; boardT = 0.25;
  markTaken(); updateCount();
  const rows = [{ n: 'Tú', s: Math.floor(G.score), me: true }];
  for (const R of MP.remotes.values()) if (R.st !== 'menu' && alive(R)) rows.push({ n: R.nm || R.ch.name, s: R.sc || 0 });
  boardEl.hidden = rows.length < 2 || hud.hidden || G.state === 'duel';
  if (boardEl.hidden) return;
  rows.sort((a, b) => b.s - a.s);
  boardEl.textContent = '';
  // solo los 3 primeros y tú (para no tapar la ola)
  rows.forEach((r, i) => { if (i > 2 && !r.me) return; const d = document.createElement('div'); if (r.me) d.className = 'me'; d.textContent = (i + 1) + '. ' + r.n + '  ' + r.s; boardEl.appendChild(d); });
}
