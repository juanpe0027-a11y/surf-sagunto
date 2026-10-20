import { $, clamp, lerp, rnd, V3 } from '../nucleo/util.js';
import { G, keys, stick } from '../nucleo/estado.js';
import { aspect, camLook, camPos } from '../mundo/motor.js';
import { splash } from '../mundo/particulas.js';
import { boardRoot } from '../surfista/tabla.js';
import { bump } from '../juego/puntos.js';
import { startPaddle } from '../juego/sesion.js';
import { bubble, chip, dial, ringbox, say, showTrick } from '../interfaz/hud.js';
import { MP } from '../online/red.js';
import { mpV } from '../online/jugadores.js';
import { pushMsg } from '../online/mensajes.js';
import { BOTS } from './bots.js';
import { drawFighter, dropFighter, makeFighter } from './luchador.js';

// ===================== DISPUTA POR EL PICO =====================
// Si tiras 3 veces al mismo surfista, los dos os vais al agua junto al Pantalán y os pegáis con lo que lleváis
// (tabla, pala del kayak, remo o lata de rescate). Quien da 5 golpes es el LOCAL LEGEND (+1500) y el otro
// pierde los puntos de la ola. Los demás siguen surfeando; al acabar, los dos vuelven al agua.
// Controles: círculo hacia el rival = acercarse · hacia atrás = cubrirse (los golpes del suelo no cuentan)
// GOLPE = lateral · con el círculo arriba = de arriba abajo · SALTAR y en el aire GOLPE: 1 toque mazazo, 2+ giro
// (los golpes en el aire rompen la guardia; saltando esquivas los golpes del suelo)
export const DUEL_HP = 5, DUEL_TIME = 60, DUEL_Y = -0.72, G_PHI = 0.55, JUMP_V = 5.6, JUMP_G = 15;
export const SW = [
  { dur: 0.55, hit: 0.28, reach: 1.6, name: 'Lateral' },
  { dur: 0.62, hit: 0.33, reach: 1.55, name: 'De arriba abajo' },
  { dur: 0.5, hit: 0.26, reach: 1.75, name: 'Mazazo aéreo' },
  { dur: 0.7, hit: 0.36, reach: 1.85, name: 'Giro aéreo' }
];
export const ZAX = V3(0, 0, 1), XAX = V3(1, 0, 0), qRoll = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2);
export const DUEL = { on: false };
MP.pushCount = {};
const mkFighterState = u => ({ u, hp: DUEL_HP, netHp: DUEL_HP, pendHp: DUEL_HP, pendT: 0, sw: { type: 0, t: -1, hit: true },
  block: false, jy: 0, jv: 0, walk: 0, hurt: 0, ko: 0, airTaps: 0, tapWin: 0, airDone: false, airPlan: 0, spinA: 0 });

// --- marcador de la disputa y botón SALTAR ---
// el marcador y el botón están en index.html y su aspecto en css/estilo.css
const duelHud = $('duelHud'), jumpBtn = $('duelJump');
jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); duelJump(); });
const dBars = duelHud.querySelectorAll('.db'), dClk = duelHud.querySelector('.dclk'), dRes = duelHud.querySelector('.dres');
function duelHudUpdate() {
  const D = DUEL, meLeft = D.A.u >= D.B.u;
  const rows = [[MP.myName || G.CH.name, D.A.hp, true], [D.oppName, D.B.hp, false]];
  if (!meLeft) rows.reverse();
  rows.forEach((r, i) => { dBars[i].querySelector('b').textContent = (r[2] ? '⭐ ' : '') + r[0]; dBars[i].querySelector('span').style.width = (100 * Math.max(0, r[1]) / DUEL_HP) + '%'; });
  dClk.textContent = Math.max(0, Math.ceil(DUEL_TIME - D.t));
}

// --- empujones: al tercero contra el mismo, disputa ---
export function duelCount(R) {
  if (!R || DUEL.on) return;
  const n = (MP.pushCount[R.id] || 0) + 1; MP.pushCount[R.id] = n;
  const name = R.nm || R.ch.name;
  if (n < 3) { chip('⚔️ Disputa con ' + name + ': ' + n + '/3 empujones'); return; }
  MP.pushCount[R.id] = 0;
  if (!R.bot && MP.base) MP.base.child('msgs').push({ ev: 'duel', to: R.id, id: MP.myId, nm: MP.myName || G.CH.name, at: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
  setTimeout(() => startDuel(R), 1200);
}
export function startDuel(R) {
  if (DUEL.on || !R || !R.ch || G.state === 'title' || G.state === 'over') return false;
  const bot = R.bot ? BOTS.find(b => b.id === R.id) : null;
  const side = (MP.myId < R.id) ? -1 : 1;
  Object.assign(DUEL, { on: true, R, oppId: R.id, bot, oppName: R.nm || R.ch.name, side,
    ax: camPos.x, az: 35, pOff: 14, t: 0, swN: 0, oSeenN: -1, bCD: 1.2, bBack: 0, bBlockT: 0, bReact: -1, upWas: false,
    seen: !!bot, goneT: 0, result: '', endT: 0, A: mkFighterState(side * 1.8), B: mkFighterState(-side * 1.8) });
  if (bot) { bot.st = 'duel'; R.st = 'duel'; }
  DUEL.me = makeFighter(G.CH); DUEL.him = makeFighter(R.ch);
  G.state = 'duel'; G.air = false; boardRoot.visible = false; dial.hidden = true; bubble.hidden = true; ringbox.hidden = true; ringbox.classList.remove('go'); G.windowOpen = false;
  duelCam(camPos, camLook, aspect < 0.9 ? 1.6 : 1);
  duelHud.hidden = false; dRes.hidden = true; jumpBtn.hidden = false; duelHudUpdate();
  say('⚔️ ¡Disputa contra ' + DUEL.oppName + '! Hacia atrás te cubres · GOLPE pega · SALTAR + GOLPE en el aire', 3.2);
  bump(0.15);
  return true;
}
function startSwing(f, type) { f.sw.type = type; f.sw.t = 0; f.sw.hit = false; f.block = false; if (f === DUEL.A) DUEL.swN++; }
function jumpF(f) { if (f.jy > 0.01 || f.hp <= 0) return; f.jv = JUMP_V; f.airDone = false; f.airTaps = 0; f.block = false; }
function duelJump() {
  const D = DUEL; if (!D.on || D.result || G.state !== 'duel') return;
  jumpF(D.A);
}
export function duelSwing() {
  const D = DUEL, A = D.A;
  if (!D.on || D.result || A.hp <= 0) return;
  if (A.jy > 0.02) { if (A.airDone || A.sw.t >= 0) return; A.airTaps++; A.tapWin = 0.22; return; }   // en el aire: cuenta los toques
  if (A.sw.t >= 0) return;
  const over = (stick.id !== null && stick.y < -0.45) || keys.down;                                  // círculo arriba = de arriba abajo
  startSwing(A, over ? 1 : 0);
}
function duelFx(u, y, n) { mpV.set(DUEL.ax + u, y, DUEL.az); splash(mpV, n, 0.9); }
// ¿qué pasa con un golpe? (sin dar, bloqueado, esquivado saltando o golpe)
function hitResult(att, def, defBlock, defJy) {
  const S = SW[att.sw.type];
  if (Math.abs(att.u - def.u) > S.reach || def.hp <= 0) return 'miss';
  const ground = att.sw.type < 2;
  if (ground && defJy > 0.55) return 'dodge';
  if (ground && defBlock) return 'block';
  return 'hit';
}
function onBlocked(def) {
  duelFx(def.u, 1.2, 14); def.u = clamp(def.u + Math.sign(def.u - (def === DUEL.A ? DUEL.B : DUEL.A).u || 1) * 0.3, -5, 5);
  say('🛡️ ¡Bloqueado!', 0.7);
}
function myImpact() {
  const D = DUEL, A = D.A, B = D.B;
  const bBlock = D.bot ? B.block : (D.R && D.R.tgt.bk > 0.5), bJy = D.bot ? B.jy : (D.R ? D.R.cur.ay || 0 : 0);
  const r = hitResult(A, B, bBlock, bJy);
  if (r === 'block') { onBlocked(B); return; }
  if (r === 'dodge') { say('💨 ¡Lo ha esquivado!', 0.7); return; }
  if (r !== 'hit') return;
  B.hurt = 1; duelFx(B.u, 0.4, 40); bump(0.12);
  if (A.sw.type >= 2) chip('💥 ' + SW[A.sw.type].name);
  if (D.bot) { B.hp--; B.u = clamp(B.u + Math.sign(B.u - A.u || 1) * 0.75, -5, 5); }
  else {
    B.pendHp = (B.pendT > 0 ? B.pendHp : B.netHp) - 1; B.pendT = 1.5;
    if (MP.base) MP.base.child('msgs').push({ ev: 'hit', to: D.oppId, ty: A.sw.type, id: MP.myId, nm: MP.myName || G.CH.name, at: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
  }
}
export function duelGotHit(fromId, ty) {
  const D = DUEL, A = D.A;
  if (!D.on || D.result || A.hp <= 0 || fromId !== D.oppId) return;
  ty = clamp(Math.round(Number(ty) || 0), 0, 3);
  const ground = ty < 2;
  if (ground && A.jy > 0.55) { say('💨 ¡Esquivado!', 0.7); return; }
  if (ground && A.block) { onBlocked(A); return; }
  A.hp--; A.hurt = 1;
  A.u = clamp(A.u + Math.sign(A.u - D.B.u || 1) * 0.75, -5, 5);
  duelFx(A.u, 0.4, 40); bump(0.12);
}
// salto y golpes de un luchador (la física es la misma para los dos)
function stepFighter(f, dt, isMe) {
  if (f.jy > 0 || f.jv > 0) {
    f.jv -= JUMP_G * dt; f.jy += f.jv * dt;
    if (f.jy <= 0) { f.jy = 0; f.jv = 0; duelFx(f.u, 0.1, 12); }
  }
  if (f.tapWin > 0) {                                              // toques de GOLPE en el aire: 1 mazazo, 2 o más giro
    f.tapWin -= dt;
    if (f.tapWin <= 0 && f.airTaps > 0) { startSwing(f, f.airTaps >= 2 ? 3 : 2); f.airDone = true; f.airTaps = 0; }
  }
  if (f.sw.t >= 0) {
    f.sw.t += dt;
    const S = SW[f.sw.type];
    if (!f.sw.hit && f.sw.t >= S.hit) { f.sw.hit = true; if (isMe) myImpact(); else if (DUEL.bot) botImpact(); }
    if (f.sw.t >= S.dur) f.sw.t = -1;
  }
  f.hurt = Math.max(0, f.hurt - dt * 2.5);
  f.ko = lerp(f.ko, f.hp <= 0 ? 1 : 0, 1 - Math.exp(-dt * 5));
}
function botImpact() {
  const D = DUEL, A = D.A, B = D.B;
  const r = hitResult(B, A, A.block, A.jy);
  if (r === 'block') { onBlocked(A); return; }
  if (r === 'dodge') { say('💨 ¡Esquivado!', 0.7); return; }
  if (r !== 'hit') return;
  A.hp--; A.hurt = 1; A.u = clamp(A.u + Math.sign(A.u - B.u || 1) * 0.75, -5, 5);
  duelFx(A.u, 0.4, 40); bump(0.12);
}
// el bot pelea solo: se acerca, pega, a veces se cubre, salta o retrocede
function duelBot(dt) {
  const D = DUEL, A = D.A, B = D.B, dist = A.u - B.u, ad = Math.abs(dist), dir = Math.sign(dist) || 1;
  let mv = 0;
  D.bCD -= dt; D.bBack -= dt; D.bBlockT -= dt;
  B.block = false;
  if (!D.result && B.hp > 0) {
    // reacciona a tu golpe: a veces se cubre, a veces salta
    if (A.sw.t >= 0 && A.sw.t < 0.2 && A.sw.type < 2 && ad < 2.2 && D.bReact !== D.swN) {
      D.bReact = D.swN; const r = Math.random();
      if (r < 0.4) D.bBlockT = 0.55; else if (r < 0.52) jumpF(B);
    }
    if (D.bBlockT > 0 && B.jy <= 0.01 && B.sw.t < 0) { B.block = true; mv = -dir * 0.4; }
    else {
      const want = D.bBack > 0 ? 2.8 : 1.25;
      mv = ad > want + 0.15 ? dir : ad < want - 0.35 ? -dir : 0;
      if (B.sw.t < 0 && B.jy <= 0.01 && D.bCD <= 0 && ad < 1.5) {
        if (Math.random() < 0.22) { jumpF(B); B.airPlan = Math.random() < 0.5 ? 2 : 3; }
        else startSwing(B, Math.random() < 0.5 ? 1 : 0);
        D.bCD = rnd(1.0, 2.0); if (Math.random() < 0.3) D.bBack = rnd(0.5, 1.2);
      }
      if (B.airPlan && B.jy > 0.5 && B.jv < 1.5 && B.sw.t < 0) { startSwing(B, B.airPlan); B.airPlan = 0; }
    }
  }
  if (B.sw.t >= 0) mv *= 0.3;
  B.u = clamp(B.u + mv * (B.block ? 1.1 : 2.1) * dt, -5, 5);
  B.walk = lerp(B.walk, Math.abs(mv), 1 - Math.exp(-dt * 8));
}
// el rival online: su posición, vida, guardia, salto y golpes llegan con su estado
function duelNet(dt) {
  const D = DUEL, B = D.B, R = MP.remotes.get(D.oppId);
  const inDuel = R && R.st === 'duel' && R.du === MP.myId;
  if (inDuel) {
    D.seen = true; D.goneT = 0;
    const u0 = B.u; B.u = R.cur.dx;
    B.walk = lerp(B.walk, clamp(Math.abs(B.u - u0) / Math.max(dt, 1e-3) / 2.6, 0, 1), 1 - Math.exp(-dt * 8));
    B.block = R.tgt.bk > 0.5; B.jy = Math.max(0, R.cur.ay || 0);
    const n = Math.round(R.tgt.gr);
    if (D.oSeenN < 0) D.oSeenN = n;
    else if (n > D.oSeenN) { D.oSeenN = n; B.sw.type = clamp(Math.round(R.tgt.sp) || 0, 0, 3); B.sw.t = 0; B.sw.hit = true; }   // el golpe lo calcula él
    const hp = Math.round(R.tgt.h);
    if (hp < B.netHp) B.hurt = 1;
    B.netHp = hp;
  } else if (D.seen) D.goneT += dt;
  B.pendT = Math.max(0, B.pendT - dt);
  B.hp = B.pendT > 0 ? Math.min(B.netHp, B.pendHp) : B.netHp;
}
function duelFinish(win, why) {
  const D = DUEL; if (D.result) return;
  D.result = win === true ? 'win' : win === false ? 'lose' : 'tie'; D.endT = 0;
  if (win === true) {
    G.score += 1500; showTrick('👑 LOCAL LEGEND', 1500);
    dRes.textContent = '👑 ¡ERES EL LOCAL LEGEND!' + (why ? ' (' + why + ')' : '');
    if (!MP.sim && !D.bot) pushMsg({ tx: '👑 ¡Soy el LOCAL LEGEND! He ganado a ' + D.oppName });
  } else if (win === false) {
    const lost = Math.floor(G.wavePts); G.score = Math.max(0, G.score - G.wavePts); G.wavePts = 0; G.mult = 1;
    dRes.textContent = '😵 ' + D.oppName + ' es el LOCAL LEGEND' + (lost ? '  −' + lost : '');
    if (D.bot) { D.bot.score += 1500; }
  } else dRes.textContent = '🤝 Empate';
  dRes.hidden = false;
}
function duelEnd() {
  const D = DUEL;
  dropFighter(D.me); dropFighter(D.him); D.me = D.him = null;
  if (D.bot) { D.bot.st = 'paddle'; D.bot.t = 0; D.bot.dx = rnd(4, 10); }
  D.on = false; duelHud.hidden = true; jumpBtn.hidden = true; boardRoot.visible = true;
  MP.pushCount[D.oppId] = 0;
  startPaddle();
}
export function duelUpdate(dt) {
  const D = DUEL;
  if (!D.on) { boardRoot.visible = true; jumpBtn.hidden = true; startPaddle(); return; }
  const A = D.A, B = D.B;
  D.t += dt;
  const t = performance.now() / 1000;
  // moverse: círculo de la derecha (o flechas) hacia la izquierda o la derecha de la pantalla
  let mv = stick.id !== null && Math.abs(stick.x) > 0.25 ? Math.sign(stick.x) * Math.min(1, Math.abs(stick.x) * 1.4) : 0;
  mv = -mv; if (keys.left) mv = 1; if (keys.right) mv = -1;   // derecha de la pantalla = -x interno
  if (D.result || A.hp <= 0) mv = 0;
  // hacia atrás (alejándote del rival) te cubres con el objeto y retrocedes despacio
  const toward = Math.sign(B.u - A.u) || 1;
  A.block = mv * toward < -0.3 && A.jy <= 0.01 && A.sw.t < 0 && !D.result && A.hp > 0;
  if (keys.up && !D.upWas) duelJump();                        // teclado: ↑ / espacio = saltar
  D.upWas = keys.up;
  if (A.sw.t >= 0) mv *= 0.3;
  A.u = clamp(A.u + mv * (A.block ? 1.2 : 2.8) * dt, -5, 5);
  A.walk = lerp(A.walk, Math.abs(mv), 1 - Math.exp(-dt * 8));
  stepFighter(A, dt, true);
  if (D.bot) { duelBot(dt); stepFighter(B, dt, false); }
  else { duelNet(dt); if (B.sw.t >= 0) { B.sw.t += dt; if (B.sw.t >= SW[B.sw.type].dur) B.sw.t = -1; } B.hurt = Math.max(0, B.hurt - dt * 2.5); B.ko = lerp(B.ko, B.hp <= 0 ? 1 : 0, 1 - Math.exp(-dt * 5)); }
  // no se atraviesan (salvo saltando por encima)
  const gap = A.u - B.u;
  if (Math.abs(gap) < 0.75 && A.jy < 0.6 && B.jy < 0.6) A.u = B.u + Math.sign(gap || D.side) * 0.75;
  drawFighter(D.me, A, B.u, t);
  drawFighter(D.him, B, A.u, t);
  duelHudUpdate();
  if (!D.result) {
    if (A.hp <= 0) duelFinish(false);
    else if (D.bot ? B.hp <= 0 : B.netHp <= 0) duelFinish(true);
    else if (D.t > DUEL_TIME) duelFinish(A.hp > B.hp ? true : A.hp < B.hp ? false : null);
    else if (!D.bot && !D.seen && D.t > 6) { say(D.oppName + ' no ha entrado en la disputa', 2.2); duelEnd(); }
    else if (!D.bot && D.goneT > 3) duelFinish(true, D.oppName + ' se ha ido');
  } else { D.endT += dt; if (D.endT > 3.4) duelEnd(); }
}
export function duelCam(dp, dl, far) {
  const D = DUEL, mid = D.ax + (D.A.u + D.B.u) / 2, sep = Math.abs(D.A.u - D.B.u);
  dp.set(mid, 1.05, D.az + (2.1 + sep * 0.42) * far); dl.set(mid, 0.75, D.az);
}
