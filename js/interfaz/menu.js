import { $, hex } from '../nucleo/util.js';
import { avisar, escuchar } from '../nucleo/eventos.js';
import { G, keys, ptr } from '../nucleo/estado.js';
import { DECKS } from '../datos/disenos.js';
import { CHARS, PHOTOS } from '../datos/personajes.js';
import { renderer, scene, world } from '../mundo/motor.js';
import { UP } from '../mundo/formas.js';
import { particles } from '../mundo/particulas.js';
import { poseA, shaka, stance } from '../surfista/posturas.js';
import { applyPose, faceTex } from '../surfista/muneco.js';
import { boardRoot, deckCv, paintBoard } from '../surfista/tabla.js';
import { applyChar } from '../surfista/personaje.js';
import { newGame, startTitleRide } from '../juego/sesion.js';
import { fade } from './hud.js';

export const overlay = $('overlay'), menuP = $('menu'), overP = $('over'), fadeEl = $('fade');
const charsP = $('chars'), controlsP = $('controls'), cardsEl = $('cards');

function pips(n) { let s = ''; for (let i = 1; i <= 5; i++) s += '<i class="' + (i <= n ? 'on' : '') + '"></i>'; return s; }
// retratos de cada surfista: se renderizan con el propio motor 3D, posando con el shaka
const portraits = {};
function makePortraits() {
  const W = 240, H = 300;
  const rt = new THREE.WebGLRenderTarget(W, H), cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 9000);
  const buf = new Uint8Array(W * H * 4), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), img = x.createImageData(W, H);
  const keepPos = boardRoot.position.clone(), keepQ = boardRoot.quaternion.clone(), keepVis = boardRoot.visible, keepTurn = G.faceTurn;
  const bx = G.px, bz = 12.5;
  boardRoot.visible = true; particles.visible = false;
  boardRoot.position.set(bx, 0.05, bz); boardRoot.quaternion.setFromAxisAngle(UP, 0.12);
  cam.position.set(-(bx + 0.12), 1.74, bz + 1.25); cam.lookAt(-(bx + 0.08), 1.56, bz);
  world.updateMatrixWorld(true);
  try {
    for (const c of CHARS) {
      applyChar(c); G.faceTurn = 0.05; applyPose(shaka(stance(poseA, 0.2, 0, 0, 0)));
      world.updateMatrixWorld(true);
      renderer.setRenderTarget(rt); renderer.render(scene, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      x.putImageData(img, 0, 0);
      portraits[c.id] = cv.toDataURL('image/jpeg', 0.86);
    }
  } catch (e) { /* sin retratos: las fichas siguen funcionando */ }
  renderer.setRenderTarget(null); rt.dispose(); particles.visible = true;
  // si alguna cara aún no había cargado, se repiten los retratos la próxima vez
  const ready = CHARS.every(c => !faceTex[c.id] || (faceTex[c.id].image && faceTex[c.id].image.complete));
  if (!ready) for (const k in portraits) delete portraits[k];
  applyChar(G.CH); G.faceTurn = keepTurn;
  boardRoot.position.copy(keepPos); boardRoot.quaternion.copy(keepQ); boardRoot.visible = keepVis;
}
// vista de la tabla de cada surfista para su ficha (el mismo diseño que lleva en el 3D)
const deckPrev = {};
escuchar('foto-tabla', k => { delete deckPrev[k]; });
function makeDeckPreviews() {
  const x = deckCv.getContext('2d');
  for (const c of CHARS) { (DECKS[c.deck] || DECKS.plain)(x, deckCv.width, deckCv.height, c); deckPrev[c.id] = deckCv.toDataURL('image/jpeg', 0.82); }
  paintBoard(G.CH);
}
function renderCards() {
  if (!deckPrev[CHARS[0].id]) makeDeckPreviews();
  if (!CHARS.every(c => PHOTOS[c.id]) && !portraits[CHARS[0].id]) makePortraits();
  cardsEl.textContent = '';
  for (const c of CHARS) {
    const b = document.createElement('button');
    b.className = 'card' + (c === G.CH ? ' sel' : ''); b.setAttribute('aria-pressed', c === G.CH); b.dataset.id = c.id;
    b.innerHTML = ((PHOTOS[c.id] || portraits[c.id]) ? '<img class="portrait" alt="Foto de ' + c.name + '" src="' + (PHOTOS[c.id] || portraits[c.id]) + '">' : '') + '<span class="deckprev' + (c.board === 'body' ? ' bb' : c.board === 'jet' || c.board === 'kayak' || c.board === 'zodiac' ? ' jet' : '') + '"' + (c.deckPhoto ? ' style="transform:scaleY(-1)"' : '') + '><img alt="Tabla de ' + c.name + '" src="' + deckPrev[c.id] + '"></span>' + '<span class="sws">' + c.sw.map(x => '<i style="background:' + hex(x) + '"></i>').join('') + '</span>' +
      '<b>' + c.name + '</b><em>' + c.tag + '</em>' + '<span class="stance">' + (c.zodiac ? 'Zodiac de rescate · salta y empuja' : c.kayak ? 'Kayak · rema y salta' : c.jetski ? 'Moto de agua · salta y empuja' : c.bodyboard ? 'Bodyboard · tumbado con aletas' : c.goofy ? 'Goofy · pie derecho delante' : 'Regular · pie izquierdo delante') + '</span>' +
      '<span class="st"><span>Velocidad</span><span class="pips">' + pips(c.vel) + '</span></span>' +
      '<span class="st"><span>Aéreos</span><span class="pips">' + pips(c.air) + '</span></span>' +
      '<span class="st"><span>Tubos</span><span class="pips">' + pips(c.tubo) + '</span></span>';
    b.addEventListener('click', () => {
      G.CH = c; applyChar(c); renderCards();
      try { localStorage.setItem('surf-sagunto-char', c.id); } catch (e) {}
    });
    cardsEl.appendChild(b);
  }
}
export function showMenu(view) {
  G.menuView = view;
  menuP.hidden = view !== 'main'; charsP.hidden = view !== 'chars'; controlsP.hidden = view !== 'controls'; overP.hidden = true;
  if (view === 'chars') { renderCards(); const s = cardsEl.querySelector('.sel'); if (s) s.focus({ preventScroll: true }); }
  if (view === 'main') $('start').focus({ preventScroll: true });
  avisar('menu', view);
}
$('toChars').addEventListener('click', () => showMenu('chars'));
$('toControls').addEventListener('click', () => showMenu('controls'));
$('charsOk').addEventListener('click', () => showMenu('main'));
$('controlsOk').addEventListener('click', () => showMenu('main'));
// «Surfeas con …» del menú
escuchar('personaje', c => {
  $('whoName').textContent = c.name;
  $('whoSw').innerHTML = c.sw.map(x => '<i style="background:' + hex(x) + '"></i>').join('');
});
applyChar(G.CH);
$('start').addEventListener('click', () => fade(newGame));
$('again').addEventListener('click', () => fade(newGame));
$('toMenu').addEventListener('click', () => fade(() => { startTitleRide(); overlay.hidden = false; showMenu('main'); }));
// volver al menú en mitad de la sesión: se guarda el récord si lo has superado
$('hudHome').addEventListener('click', () => {
  if (Math.floor(G.score) > G.best) { G.best = Math.floor(G.score); try { localStorage.setItem('surf-sagunto-best3d', G.best); } catch (e) {} }
  keys.up = keys.down = keys.left = keys.right = false; ptr.down = false;
  fade(() => { startTitleRide(); overlay.hidden = false; showMenu('main'); });
});
