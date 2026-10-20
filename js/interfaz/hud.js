// Marcadores en pantalla mientras se surfea: puntos, reloj, multiplicador, velocímetro, mensajes y avisos.
import { $, clamp } from '../nucleo/util.js';
import { avisar } from '../nucleo/eventos.js';
import { G } from '../nucleo/estado.js';
import { toScreen } from '../mundo/motor.js';
import { boardRoot } from '../surfista/tabla.js';
import { fadeEl } from './menu.js';
import { drawStick, padStick, padTricks } from '../entrada/controles.js';

export const hud = $('hud'), scoreEl = $('score'), clockEl = $('clock'), waveNEl = $('waveN'), tricksEl = $('tricks');
const multv = $('multv'), multArc = $('multArc'), wavePtsEl = $('wavePts');
export const dial = $('dial'), dialArc = $('dialArc'), kmhEl = $('kmh'), angEl = $('ang'), distEl = $('dist');
export const bubble = $('bubble'), bubV = $('bubV'), bubL = $('bubL');
export const trickEl = $('trick'), ringbox = $('ringbox'), ringArc = $('ringArc'), ringTxt = $('ringTxt');
export const promptEl = $('prompt'), msgEl = $('msg');

export function showTrick(name, pts) {
  $('trickName').textContent = name; $('trickPts').textContent = pts ? '+' + pts : '';
  trickEl.classList.remove('show'); void trickEl.offsetWidth; trickEl.classList.add('show');
  avisar('truco', name, pts);
}
export function say(t, dur) { msgEl.textContent = t; promptEl.hidden = false; G.msgTimer = dur || 1.8; }
export function chip(t) {
  const c = document.createElement('span'); c.textContent = t; tricksEl.prepend(c);
  while (tricksEl.children.length > 2) tricksEl.lastChild.remove();
  setTimeout(() => c.remove(), 3500);
}
export function fade(cb) { fadeEl.style.opacity = 1; setTimeout(() => { cb(); fadeEl.style.opacity = 0; }, 300); }
export function fmtClock(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
// marcadores: puntos, multiplicador, velocímetro y bocadillo de altura o tiempo en el tubo
export function actualizarHud() {
  const sp = boardRoot.position;
  if (G.state !== 'title' && G.state !== 'over') {
    scoreEl.textContent = Math.floor(G.score);
    multv.textContent = 'x' + G.mult.toFixed(2);
    multArc.style.strokeDashoffset = (276.5 * (1 - clamp((G.mult - 1) / 2, 0, 1))).toFixed(1);
    wavePtsEl.textContent = Math.floor(G.wavePts);
  }
  const showPads = !hud.hidden && (G.state === 'ride' || G.state === 'popup' || G.state === 'paddle' || G.state === 'duel');
  padStick.hidden = padTricks.hidden = !showPads;
  if (showPads) drawStick();
  if (G.state === 'ride' || G.state === 'popup') {
    dial.hidden = false;
    const kmh = Math.round(G.v * 3.6);
    kmhEl.textContent = kmh;
    dialArc.style.strokeDashoffset = (276.5 * (1 - clamp(kmh / 75, 0, 1))).toFixed(1);
    angEl.textContent = Math.round(G.air ? 0 : G.rideAngle) + '°';
    distEl.textContent = Math.max(0, Math.round(G.px - G.pxStart)) + ' m';
  }
  if (G.state === 'ride' && (G.air || G.tubeT > 0.2)) {
    const sc = toScreen(sp.x, sp.y + 1.2, sp.z);
    bubble.hidden = sc[2] > 1;
    bubble.style.left = Math.round(sc[0] + 70) + 'px'; bubble.style.top = Math.round(sc[1] - 30) + 'px';
    if (G.air) { bubV.textContent = G.airTop.toFixed(1); bubL.textContent = 'metros'; }
    else { bubV.textContent = G.tubeT.toFixed(1); bubL.textContent = 'seg'; }
  } else bubble.hidden = true;
}
const toastEl = $('mpToast'); let toastTO = 0;
export function toast(t) { toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastTO); toastTO = setTimeout(() => { toastEl.hidden = true; }, 2600); }
