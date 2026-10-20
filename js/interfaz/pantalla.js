import { $ } from '../nucleo/util.js';
import { resize } from '../mundo/motor.js';
import { say } from './hud.js';
import { overlay } from './menu.js';

// ---------- pantalla completa ----------
const fsBtn = $('fsBtn'), fsNote = $('fsNote');
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function setFsLabel() { fsBtn.textContent = isFull() ? 'Salir de pantalla completa' : (IS_IOS && !IS_APP ? '📱 Pantalla completa en iPhone' : 'Pantalla completa'); }
// iPhone/iPad: Safari no deja poner pantalla completa a una web; la forma es añadirla a la pantalla de inicio
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_APP = navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const iosGuide = $('iosGuide');
function showIosGuide() { iosGuide.hidden = false; iosGuide.classList.toggle('land', innerWidth > innerHeight); }
$('iosOk').addEventListener('click', () => { iosGuide.hidden = true; });
if (IS_IOS && !IS_APP) fsBtn.textContent = '📱 Pantalla completa en iPhone';
function fsFailed() {
  if (IS_IOS && !IS_APP) { showIosGuide(); return; }
  if (!overlay.hidden) fsNote.hidden = false; else say('Aquí no se puede poner pantalla completa: ábrelo con Chrome', 3);
}
async function toggleFull() {
  if (IS_IOS && !IS_APP) { showIosGuide(); return; }
  try {
    if (isFull()) { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) throw new Error('sin API');
    setTimeout(() => { if (!isFull()) fsFailed(); }, 1200);   // algunos visores ni aceptan ni rechazan
    await req.call(el, { navigationUI: 'hide' });
    fsNote.hidden = true;
    try { await screen.orientation.lock('landscape'); } catch (e) {}
  } catch (e) { fsFailed(); }
}
fsBtn.addEventListener('click', toggleFull);
// móviles: al primer toque, pantalla completa y en horizontal (Android); en iPhone, aviso para girarlo
const TOUCH = window.matchMedia && matchMedia('(pointer: coarse)').matches;
let fsByUser = false;
fsBtn.addEventListener('click', () => { fsByUser = true; }, true);
$('hudFs').addEventListener('click', () => { fsByUser = true; }, true);
async function autoFull() {
  if (!TOUCH || IS_IOS || IS_APP || isFull() || fsByUser) return;
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try { await req.call(el, { navigationUI: 'hide' }); } catch (e) { return; }
  try { await screen.orientation.lock('landscape'); } catch (e) {}
}
window.addEventListener('pointerdown', autoFull, true);
$('rotateTxt').textContent = IS_IOS
  ? (IS_APP ? 'El juego se ve en horizontal.' : 'El juego se ve en horizontal. Para verlo sin barras: Compartir → «Añadir a pantalla de inicio».')
  : 'Toca la pantalla y se pondrá en horizontal y a pantalla completa.';
$('hudFs').addEventListener('click', toggleFull);
document.addEventListener('fullscreenchange', () => { setFsLabel(); resize(); });
document.addEventListener('webkitfullscreenchange', () => { setFsLabel(); resize(); });
