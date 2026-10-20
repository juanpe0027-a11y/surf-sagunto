// Con la sala «bots» no hay conexión: los demás surfistas son bots que comparten tu ola,
// surfean solos, saltan, chocan y pueden empujarte (y tú a ellos) con el botón TRUCO.
import { angDiff, clamp, lerp, rnd, sm, TAU } from '../nucleo/util.js';
import { G } from '../nucleo/estado.js';
import { CHARS } from '../datos/personajes.js';
import { face, faceAt, HW } from '../mundo/ola.js';
import { splash } from '../mundo/particulas.js';
import { boardRoot } from '../surfista/tabla.js';
import { MP } from '../online/red.js';
import { upsertPeer } from '../online/jugadores.js';
import { gotPushed } from '../online/empujones.js';
import { logMsg } from '../online/mensajes.js';
import { duelCount } from './disputa.js';

const BOT_NAMES = ['Bot Pantalán', 'Bot Malvarrosa', 'Bot Almardà'];
export const BOTS = [];
export function makeBots() {
  MP.bots = BOTS;
  const others = CHARS.filter(c => c.id !== G.CH.id);
  const list = others.map(c => ({ ch: c, nm: c.name }));
  for (let i = 0; list.length < 4 && i < BOT_NAMES.length; i++) list.push({ ch: CHARS[(i + 1) % CHARS.length], nm: BOT_NAMES[i] });
  list.forEach((o, i) => BOTS.push({
    id: 'bot' + i, ch: o.ch, nm: o.nm, st: 'paddle', t: -i * 1.3, dx: 5 + i * 3, h: 0.05, th: 0, bk: 0, cr: 0.4, ay: 0, sp: 0, fl: 0, pr: i,
    ph: rnd(0, 6), w: rnd(1.0, 1.5), dxT: rnd(5, 30), dxTT: 0, rideT: 0, score: 0, wave: 0, pushCD: 6, airT: 0, spT: 0, flT: 0, sendT: 0
  }));
}
function botSay(b, text) {
  const R = MP.remotes.get(b.id); if (!R) return;
  const e = R.label.querySelector('.mpbub'); e.textContent = text; e.hidden = false; R.msgT = 2.5;
}
export function botPushed(id, by) {
  const b = BOTS.find(o => o.id === id); if (!b || (b.st !== 'ride' && b.st !== 'air')) return;
  b.wave = 0; b.st = 'wipe'; b.t = 0;
  botSay(b, '😵');
}
export function updateBots(dt) {
  for (const b of BOTS) {
    if (b.st === 'duel') continue;
    b.t += dt; b.pushCD = Math.max(0, b.pushCD - dt);
    if (b.st === 'wipe') {
      if (b.t > 2.5) { b.st = 'paddle'; b.t = 0; b.dx = rnd(4, 10); b.h = 0.05; }
    } else if (b.st === 'paddle') {
      b.pr += dt * 7; b.h = 0.05;
      if (b.t > 3) { b.st = 'ride'; b.t = 0; b.rideT = 0; b.wave = 0; b.th = -0.4; b.pushCD = 4; }
    } else if (b.st === 'ride') {
      b.rideT += dt;
      // bombea por la cara y cambia de sitio: a veces se adelanta, a veces vuelve al tubo
      b.ph += dt * b.w;
      const hT = 0.5 + 0.34 * Math.sin(b.ph);
      const hdot = clamp((hT - b.h) * 3, -1.2, 1.2); b.h = clamp(b.h + hdot * dt, 0.05, 0.95);
      b.dxTT -= dt;
      if (b.dxTT <= 0) { b.dxTT = rnd(3, 6); b.dxT = Math.random() < 0.3 ? rnd(3, 7) : rnd(8, Math.max(45, G.XB * 0.7)); }
      const dxdot = clamp((b.dxT - b.dx) * 0.7, -7, 5);
      b.dx = Math.max(1.5, b.dx + dxdot * dt);
      const vx = G.curlSpeed + dxdot, vy = hdot * HW * 1.25, thN = Math.atan2(vy, vx);
      const om = angDiff(thN, b.th) / Math.max(dt, 1e-3); b.th = thN;
      b.bk = lerp(b.bk, clamp(-om * Math.hypot(vx, vy) * 0.05, -0.8, 0.8), 1 - Math.exp(-dt * 8));
      b.cr = 0.35 + Math.abs(b.bk) * 0.5;
      b.wave += (Math.abs(vx) + (b.dx < 4 ? 40 : 0)) * dt;
      // salto con truco al llegar arriba
      if (b.h > 0.82 && b.dx > 6 && Math.random() < dt * 0.35) {
        b.st = 'air'; b.airT = 0; b.sp = 0; b.fl = 0;
        const r = Math.random(); b.spT = r < 0.45 ? TAU : r < 0.7 ? 2 * TAU : 0; b.flT = r >= 0.7 ? TAU : 0;
      }
      // te empuja si está pegado a ti
      if (G.state === 'ride' && !G.air && b.pushCD === 0 && G.rideT > 4) {
        const rx = G.curlX + b.dx;
        if (Math.abs(rx - G.px) < 1.6 && Math.abs(b.h - G.h) < 0.2 && Math.random() < dt * 0.5) {
          b.pushCD = 7; botSay(b, '💪'); splash(boardRoot.position, 60, 1.2); gotPushed(b.nm); duelCount(MP.remotes.get(b.id));
        }
      }
      if (b.rideT > 28) { b.score += b.wave; b.wave = 0; b.st = 'wipe'; b.t = 1.2; }
    } else if (b.st === 'air') {
      b.airT += dt;
      faceAt(G.curlX + b.dx, 1);
      b.ay = face.y + 5.4 * b.airT - 4.9 * b.airT * b.airT;
      b.sp = b.spT * sm(0.05, 0.9, b.airT); b.fl = b.flT * sm(0.1, 0.9, b.airT);
      b.dx += 2 * dt;
      if (b.airT >= 1.1) {
        b.st = 'ride'; b.h = 0.8;
        const pts = 300 + (b.spT ? 450 * b.spT / TAU : 0) + (b.flT ? 800 : 0); b.wave += pts;
        botSay(b, b.flT ? 'Rodeo!' : b.spT > TAU ? '720!' : b.spT ? '360!' : '🤙');
      }
    }
    b.sendT -= dt;
    if (b.sendT <= 0) {
      b.sendT = 1 / 15;
      upsertPeer(b.id, { ch: b.ch.id, nm: b.nm, st: b.st, dx: b.dx, h: b.h, th: b.th, bk: b.bk, cr: b.cr, gr: 0, ay: b.ay, sp: b.sp, fl: b.fl, pr: b.pr % TAU, sc: Math.floor(b.score + b.wave) });
      const R = MP.remotes.get(b.id); if (R) R.bot = true;
    }
  }
}
// respuestas de los bots al chat
export function botReply() {
  const b = BOTS[Math.floor(Math.random() * BOTS.length)]; if (!b) return;
  const txt = ['🤙', '¡Vaya ola!', '¡La siguiente es mía!', '😂', '¡Tubazo!', 'Cuidado que voy'][Math.floor(Math.random() * 6)];
  setTimeout(() => { botSay(b, txt); logMsg(b.nm, txt); }, rnd(800, 2000));
}
