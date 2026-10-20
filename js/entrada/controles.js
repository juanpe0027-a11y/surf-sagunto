import { $, TAU } from '../nucleo/util.js';
import { G, keys, ptr, stick } from '../nucleo/estado.js';
import { wrap } from '../mundo/motor.js';
import { newGame, popUp } from '../juego/sesion.js';
import { fade } from '../interfaz/hud.js';
import { menuP, overlay, showMenu } from '../interfaz/menu.js';
import { tryPush } from '../online/empujones.js';
import { duelSwing } from '../modos/disputa.js';

function trickTap() {
  if (G.state === 'duel') { duelSwing(); return; }
  if (G.state === 'ride' && !G.air) {
    if (tryPush()) return;     // modo online: pegado a otro surfista, TRUCO lo empuja
    if (G.fs) return;
    if (Math.cos(G.theta) >= 0) { G.fs = { ph: 1, t: 0, v0: Math.max(G.v, 8) }; G.theta = Math.min(G.theta, 0.4); G.btnTurn = null; }
    else G.btnTurn = -0.35;                                     // si ya vas hacia el tubo, TRUCO te devuelve hacia fuera
    G.turnLock = 0; return;
  }
  if (G.state !== 'ride' || !G.air) return;
  G.trickTaps++; G.trickWin = 0.2;
}

// ---------- controles: arrastrar el dedo ----------
function tap() { if (G.state === 'paddle' && G.windowOpen) popUp(); }
export const padStick = $('padStick'), padTricks = $('padTricks'), knob = $('knob');
// el joystick usa el centro del círculo de la derecha: vale tocar en cualquier parte de la mitad derecha
function stickFrom(e) {
  const r = padStick.getBoundingClientRect(), R = r.width * 0.5;
  let x = (e.clientX - (r.left + R)) / R, y = (e.clientY - (r.top + R)) / R;
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
  stick.x = x; stick.y = y;
}
export function drawStick() {
  const R = padStick.clientWidth * 0.5 - 18, on = stick.id !== null;
  knob.style.transform = on ? 'translate(' + (stick.x * R).toFixed(1) + 'px,' + (stick.y * R).toFixed(1) + 'px)' : '';
  // la flecha del botón marca hacia dónde apunta la punta de la tabla ahora mismo
  const a = Math.cos(G.theta) * -1, b = -Math.sin(G.theta);
  knob.style.setProperty('--ang', (Math.atan2(b, a) * 57.3 + 90).toFixed(0) + 'deg');
  padStick.classList.toggle('on', on); padTricks.classList.toggle('on', ptr.down);
}
wrap.addEventListener('pointerdown', e => {
  if (!overlay.hidden || e.target.closest('button, .chatp, input')) return;
  const r = wrap.getBoundingClientRect();
  try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
  tap(); e.preventDefault();
  if (e.clientX - r.left > r.width * 0.5) { if (stick.id === null) { stick.id = e.pointerId; stickFrom(e); } return; }
  if (ptr.down) return;
  ptr.down = true; ptr.id = e.pointerId; ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.ax = ptr.x; ptr.ay = ptr.y; ptr.moved = false; G.airHold = 0;
  trickTap();
});
window.addEventListener('pointermove', e => {
  if (e.pointerId === stick.id) { stickFrom(e); return; }
  if (!ptr.down || e.pointerId !== ptr.id) return;
  const r = wrap.getBoundingClientRect();
  ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
});
const release = e => {
  if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; }
  if (e.pointerId === ptr.id) { ptr.down = false; ptr.id = null; }
};
window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
wrap.addEventListener('contextmenu', e => e.preventDefault());
const KMAP = { KeyT: 'trick', ShiftLeft: 'trick', ShiftRight: 'trick', ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
window.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = KMAP[e.code];
  if (!overlay.hidden) {
    const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && !onButton && ((G.state === 'title' && !menuP.hidden) || G.state === 'over')) { e.preventDefault(); fade(newGame); }
    if (e.code === 'Escape' && G.state === 'title' && G.menuView !== 'main') showMenu('main');
    return;
  }
  if (k) {
    e.preventDefault(); keys[k] = true;
    if (!e.repeat) {
      tap();
      // en el aire las flechas encadenan trucos: ← → giro de 360, ↓ rodeo; ↑ o espacio mantenido = grab
      if (k === 'trick') trickTap();
      if (G.air && G.state === 'ride') {
        if (k === 'left' && G.spinT > -TAU * 2 + 0.1) G.spinT -= TAU;
        if (k === 'right' && G.spinT < TAU * 2 - 0.1) G.spinT += TAU;
        if (k === 'down' && G.flipT < TAU - 0.1) G.flipT += TAU;
      }
    }
  }
});
window.addEventListener('keyup', e => { const k = KMAP[e.code]; if (k) keys[k] = false; });
document.addEventListener('visibilitychange', () => { G.last = performance.now(); keys.up = keys.down = keys.left = keys.right = false; ptr.down = false; ptr.id = null; stick.id = null; stick.x = stick.y = 0; });
