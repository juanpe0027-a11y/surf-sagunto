// Los demás surfistas: mandar mi estado, recibir el suyo, dibujarlos en mi ola, choques y la clasificación de la sala.
import { $, clamp, lerp, V3 } from '../nucleo/util.js';
import { escuchar } from '../nucleo/eventos.js';
import { G } from '../nucleo/estado.js';
import { CHARS, seatedC } from '../datos/personajes.js';
import { basisQuat, UP, vT } from '../mundo/formas.js';
import { toScreen, wrap } from '../mundo/motor.js';
import { face, faceAt } from '../mundo/ola.js';
import { splash } from '../mundo/particulas.js';
import { poseFor, posturas } from '../surfista/posturas.js';
import { boardRoot } from '../surfista/raiz.js';
import { applyPoseRig, buildRig, disposeRig } from '../surfista/rig.js';
import { carryPose, endFly, flyStep, FLY_T, pushArms, PUSH_T, wobbleBoard } from '../surfista/empujon.js';
import { aPos } from '../juego/fisica.js';
import { chip, hud, showTrick, toast } from '../juego/hud.js';
import { addPts, bump } from '../juego/puntos.js';
import { armTarget, myPushAnims, updatePushHint, updateSafe } from './empujones.js';
import { CAMPOS_NUM, mandarSurfista, miSurfista, olvidarEnviado } from './protocolo.js';
import { MP, mpCount, mpLayer, mpMenu } from './red.js';
import { canSteal, updateRobo } from './robo.js';
import { updateBots } from '../modos/bots.js';

// cuando llega el cuerpo realista, se rehacen los surfistas que ya estaban en el agua
function rebuildRigs() { for (const R of MP.remotes.values()) if (R.rig && R.ch) { disposeRig(R.rig); R.rig = buildRig(R.ch); } }
escuchar('cuerpo-listo', rebuildRigs);

// --- inactividad: si te coge la ola 10 veces seguidas sin tocar nada (o pasan 3 min), sales del agua ---
MP.lastInput = performance.now(); MP.idleWaves = 0; MP.away = false; MP.prevSt = '';
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => {
  MP.lastInput = performance.now(); MP.idleWaves = 0;
  if (MP.away) { MP.away = false; MP.sendT = 0; }
}, true));
// al bloquear el móvil o cambiar de app, desapareces de la ola de los demás; al volver, apareces otra vez
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (MP.meRef) MP.meRef.remove().catch(() => {}); olvidarEnviado(); }
  else MP.sendT = 0;
});
function checkIdle() {
  if (MP.sim || G.state === 'title' || G.state === 'over' || G.state === 'duel') { MP.prevSt = G.state; return; }
  const idle = performance.now() - MP.lastInput;
  if (G.state === 'paddle' && MP.prevSt !== 'paddle' && idle > 6000) MP.idleWaves++;
  MP.prevSt = G.state;
  if (MP.idleWaves >= 10 || idle > 180000) {
    MP.away = true; MP.idleWaves = 0;
    if (MP.meRef) MP.meRef.remove().catch(() => {});
    olvidarEnviado();
    $('hudHome').click();
    setTimeout(() => toast('Te hemos sacado del agua por inactividad. Pulsa «¡A surfear!» para volver.'), 700);
  }
}

// --- mi estado: ~7 veces por segundo surfeando, 10 en la Disputa, 4 remando y cada 2 s en el menú (solo lo que cambia: protocolo.js) ---
function mpSend(dt) {
  if (!MP.meRef || !MP.connected || MP.away) return;
  MP.sendT -= dt;
  if (MP.sendT > 0) return;
  const yo = miSurfista();
  MP.sendT = yo.st === 'menu' ? 2 : yo.st === 'duel' ? 0.1 : yo.st === 'paddle' ? 0.25 : 0.15;
  mandarSurfista(MP.meRef, yo);
}

// --- los demás surfistas ---
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
  // con algo robado (sb): su muñeco va con la tabla o el vehículo del otro (y su tabla bajo el brazo)
  const sbCh = typeof pr.sb === 'string' && pr.sb ? CHARS.find(x => x.id === pr.sb) : null;
  const sbOk = sbCh && canSteal(ch, sbCh) ? sbCh : null;
  const rigKey = ch.id + '|' + (sbOk ? sbOk.id : '');
  if (R.rigKey !== rigKey) { if (R.rig) disposeRig(R.rig); R.rig = buildRig(ch, sbOk); R.chId = ch.id; R.rigKey = rigKey; }
  R.poseCh = sbOk;                // va como el dueño de lo robado: de pie, sentado en la moto, en el kayak…
  const wasSt = R.st;
  R.seen = performance.now(); R.purged = false;
  R.ch = ch; R.st = typeof pr.st === 'string' ? pr.st : 'menu';
  R.du = typeof pr.du === 'string' ? pr.du : '';
  if (R.st === 'duel' && wasSt !== 'duel' && R.du && R.du !== MP.myId && id < R.du) {
    const O = MP.remotes.get(R.du); chip('⚔️ Disputa por el Pico: ' + (pr.nm || ch.name) + ' contra ' + (O ? O.nm || O.ch.name : 'otro surfista'));
  }
  R.nm = typeof pr.nm === 'string' ? pr.nm.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 20) : ch.name;
  R.label.querySelector('b').textContent = (Number(pr.pt) > 0.5 ? '🛡️ ' : '') + (R.nm || ch.name);
  for (const k of CAMPOS_NUM) { const v = Number(pr[k]); R.tgt[k] = isFinite(v) ? v : 0; if (!(k in R.cur)) R.cur[k] = R.tgt[k]; }
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
  mpMenu.textContent = !MP.db ? mpMenu.textContent : MP.connected ? '🌊 Online · sala «' + MP.sala + '» · ' + all + (all === 1 ? ' conectado más' : ' conectados más') : '🌊 Conectando…';
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
  if (MP.wobble > 0) { MP.wobble = Math.max(0, MP.wobble - dt); if (G.state === 'ride' && !G.air) wobbleBoard(boardRoot, MP.wobble, performance.now() / 1000); }
  checkIdle(); updateSafe(dt); myPushAnims(dt); updateRobo(dt);
  mpSend(dt);
  if (MP.sim) updateBots(dt);
  updateBoard(dt); waveLength(dt); updatePushHint();
  const showAll = !(G.state === 'title' && G.menuView === 'chars') && G.state !== 'over';
  const t = performance.now() / 1000, k = 1 - Math.exp(-dt * 10);
  for (const R of MP.remotes.values()) {
    if (!R.rig) continue;
    for (const key of CAMPOS_NUM) R.cur[key] = lerp(R.cur[key] ?? R.tgt[key], R.tgt[key], k);
    if (Math.abs(R.tgt.dx - R.cur.dx) > 25) R.cur.dx = R.tgt.dx;     // ha cambiado de ola: sin arrastre
    R.msgT = Math.max(0, R.msgT - dt);
    if (R.msgT === 0) R.label.querySelector('.mpbub').hidden = true;
    // los fantasmas no se ven; si siguen así 45 s, se borran de la sala
    if (!alive(R) && !R.purged && MP.base && performance.now() - (R.seen || 0) > 45000) { R.purged = true; MP.base.child('players/' + R.id).remove().catch(() => {}); }
    // si lo acaban de tirar, se ve cómo sale volando separado de su tabla
    if (R.fly && (R.fly.t += dt) > FLY_T) { endFly(R.rig.rider); if (R.fly.hidden) R.fly.hidden.forEach(o => { o.visible = true; }); R.fly = null; }
    if (R.pushArm && (R.pushArm.t += dt) > PUSH_T) R.pushArm = null;
    const vis = showAll && alive(R) && G.state !== 'duel' && R.st !== 'menu' && R.st !== 'duel' && (R.st !== 'wipe' || !!R.fly);
    R.rig.root.visible = vis;
    if (!vis) { R.label.hidden = true; continue; }
    const c = R.cur, rx = G.curlX + c.dx, root = R.rig.root;
    // su velocidad (para el empujón, que lo gana el más rápido): lo que avanza la ola más lo que se adelanta o se queda
    if (R.prevDx !== undefined && dt > 0) R.spd = lerp(R.spd || G.curlSpeed, G.curlSpeed + (c.dx - R.prevDx) / dt, 1 - Math.exp(-dt * 3));
    R.prevDx = c.dx;
    R.rig.sombra.visible = R.st !== 'air' && !R.fly;
    if (R.fly) {
      R.label.hidden = true;
      root.visible = toScreen(root.position.x, root.position.y, root.position.z)[2] <= 1;
      if (root.visible) applyPoseRig(R.rig, flyStep(R.fly, root, R.rig.rider, R.rig.pose), 1, 0.9, t);
      continue;
    }
    let pose, viento;
    if (R.st === 'paddle') {
      faceAt(rx, clamp(c.h, 0.03, 1));
      vT.set(0, -face.ty, -face.tz); basisQuat(vT, V3(0, -face.tz, face.ty), root.quaternion);
      root.position.set(rx, face.y + 0.02, face.z);
      // cada uno rema a su ritmo (pr = su fase de remada)
      pose = posturas(R.ch).remar(R.rig.pose, t + R.tgt.pr / 1.9, t * 7 + R.tgt.pr, 0.7); viento = 0.06;
    } else if (R.st === 'air') {
      faceAt(rx, 1);
      remoteFaceQuat(0.5, 0, qR);
      qR2.setFromAxisAngle(UP, c.sp); qR3.setFromAxisAngle(V3(0, 0, 1), c.fl);
      root.quaternion.copy(qR2).multiply(qR).multiply(qR3);
      root.position.set(rx, Math.max(c.ay, face.y), face.z);
      pose = poseFor(R.poseCh || R.ch)(R.rig.pose, 0.95, c.gr, t, 0); viento = 1;
    } else {
      faceAt(rx, clamp(c.h, 0.03, 1));
      remoteFaceQuat(c.th, c.bk, root.quaternion);
      root.position.set(rx, face.y + 0.02, face.z);
      pose = poseFor(R.poseCh || R.ch)(R.rig.pose, c.cr, 0, t + R.tgt.pr, -c.bk * 0.8); viento = 0.7;
    }
    // si está fuera de la pantalla no se dibuja ni se le mueve el esqueleto (con mucha gente en la ola se nota)
    const sc = toScreen(root.position.x, root.position.y + 2.3, root.position.z);
    const enPantalla = sc[2] <= 1 && sc[0] > -200 && sc[0] < wrap.clientWidth + 200 && sc[1] > -100 && sc[1] < wrap.clientHeight + 400;
    root.visible = enPantalla;
    // el que empuja estira los brazos hacia el otro
    if (R.rig.carry && enPantalla) carryPose(pose, R.rig.carry);            // su tabla bajo el brazo
    if (R.wobble > 0) { R.wobble = Math.max(0, R.wobble - dt); wobbleBoard(root, R.wobble, t); }
    if (R.pushArm && enPantalla) pushArms(pose, root, R.rig.rider, armTarget(R.pushArm), R.pushArm.t);
    if (enPantalla) applyPoseRig(R.rig, pose, viento, seatedC(R.poseCh || R.ch) ? 1.5 : 0.9, t);
    // nombre (y bocadillo) sobre su cabeza
    R.label.hidden = !enPantalla;
    if (enPantalla) R.label.style.transform = 'translate(' + Math.round(sc[0]) + 'px,' + Math.round(sc[1]) + 'px) translate(-50%,-100%)';

    // interacción conmigo (cuando estoy surfeando)
    R.hitCD = Math.max(0, R.hitCD - dt);
    if (G.state !== 'ride') continue;
    const dxp = rx - G.px;
    if (!G.air && R.st === 'ride' && Math.abs(dxp) < 1.6 && Math.abs(c.h - G.h) < 0.15 && R.hitCD === 0) {
      // chocar sin empujar no tira a nadie: los dos se tambalean un poco
      R.hitCD = 1.2; R.wobble = 0.7; MP.wobble = 0.7;
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
