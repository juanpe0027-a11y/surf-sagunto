import { $ } from '../nucleo/util.js';
import { escuchar } from '../nucleo/eventos.js';
import { G } from '../nucleo/estado.js';
import { CHARS } from '../datos/personajes.js';
import { showMenu } from './menu.js';
import { firebaseListo, MP } from '../online/red.js';

// ===================== RÉCORDS: trucos y puntuaciones =====================
// Cada móvil tiene su número propio, el del login anónimo (sin cuentas ni contraseñas). Se guarda en el móvil
// y en Firebase (v2/records/<temporada>/<móvil>) para el ranking de todos: mejor sesión, mejor ola, mejor tubo,
// LOCAL LEGEND y cada truco.
const ST_KEY = 'surf-sagunto-stats';
let ST ={ best: 0, bestWave: 0, bestTube: 0, legends: 0, sessions: 0, total: 0, tricks: {}, tbest: {} };
// temporada: al cambiarla, todos los récords (los del móvil y el ranking) empiezan de cero
const ST_SEASON = 2;
try { const o = JSON.parse(localStorage.getItem(ST_KEY) || 'null'); if (o && typeof o === 'object' && o.season === ST_SEASON) ST = Object.assign(ST, o); } catch (e) {}
try { if (localStorage.getItem('surf-sagunto-season') !== String(ST_SEASON)) { localStorage.setItem('surf-sagunto-season', String(ST_SEASON)); localStorage.setItem('surf-sagunto-best3d', '0'); G.best = 0; } } catch (e) {}
ST.season = ST_SEASON;
ST.best = Math.max(ST.best || 0, G.best || 0);
let stDirty = true, stSaveT = 4, stUid = null;
const recRef = (db, uid) => db.ref('v2/records/' + ST_SEASON + (uid ? '/' + uid : ''));
// al conectar, se recupera lo que hubiera en la nube (por si se borraron los datos del navegador):
// las reglas no dejan bajar un récord, así que el móvil tiene que partir del valor guardado
firebaseListo().then(({ db, uid }) => recRef(db, uid).once('value').then(s => {
  stUid = uid;
  const v = s.val();
  if (v && typeof v === 'object') {
    for (const k of ['best', 'bestWave', 'bestTube', 'legends', 'sessions', 'total']) ST[k] = Math.max(Number(ST[k]) || 0, Number(v[k]) || 0);
    if (v.tricks && typeof v.tricks === 'object') for (const k in v.tricks) ST.tricks[k] = Math.max(ST.tricks[k] || 0, Number(v.tricks[k]) || 0);
    if (ST.best > G.best) G.best = ST.best;
  }
  stDirty = true;
})).catch(() => {});
// «Tubo 1.8 s» → Tubo, «Re-entry 165°» → Re-entry, «Empujón a Gutty» → Empujón, «Indy largo» → Indy
function trickKey(name) {
  return String(name).replace(/^👑\s*/, '').replace(/\s+\d+(\.\d+)?\s*(s|°)$/, '').replace(/\s+(a|de)\s+.+$/, '')
    .replace(/\s+largo$/, '').replace(/[.#$\[\]\/]/g, '').trim().slice(0, 30);
}
escuchar('truco', (name, pts) => {
  if (G.state === 'title' || G.state === 'over') return;
  const parts = String(name).split(' + ');
  for (const p of parts) { const k = trickKey(p); if (k) { ST.tricks[k] = (ST.tricks[k] || 0) + 1; ST.total++; } }
  if (parts.length === 1 && pts) { const k = trickKey(name); if (k) ST.tbest[k] = Math.max(ST.tbest[k] || 0, Math.round(pts)); }
  const m = /^Tubo (\d+(\.\d+)?) s/.exec(name); if (m) ST.bestTube = Math.max(ST.bestTube, +m[1]);
  if (/LOCAL LEGEND/.test(name)) ST.legends++;
  stDirty = true;
});
escuchar('fin-sesion', () => {
  ST.sessions++; ST.best = Math.max(ST.best, Math.floor(G.score)); stDirty = true; statsSave();
});
export function statsTick(dt) {
  if (G.state !== 'title' && G.state !== 'over') {
    if (G.bestWave > ST.bestWave) { ST.bestWave = Math.floor(G.bestWave); stDirty = true; }
    if (G.score > ST.best) { ST.best = Math.floor(G.score); stDirty = true; }
  }
  stSaveT -= dt; if (stSaveT <= 0) { stSaveT = 20; statsSave(); }
}
function statsSave() {
  if (!stDirty) return; stDirty = false;
  try { localStorage.setItem(ST_KEY, JSON.stringify(ST)); } catch (e) {}
  if (!stUid) { stDirty = true; return; }   // todavía sin conectar: se guarda en cuanto haya conexión
  firebaseListo().then(({ db }) => recRef(db, stUid).set({ nm: (MP.myName || G.CH.name || 'Surfista').slice(0, 20), ch: G.CH.id, best: Math.floor(ST.best), bestWave: Math.floor(ST.bestWave),
    bestTube: Math.round(ST.bestTube * 10) / 10, legends: ST.legends, sessions: ST.sessions, total: ST.total, tricks: ST.tricks,
    at: firebase.database.ServerValue.TIMESTAMP })).catch(() => { stDirty = true; });   // un fallo aquí nunca para el juego
}
document.addEventListener('visibilitychange', () => { if (document.hidden) statsSave(); });

// --- pantalla 🏆 Récords ---
const recP = $('records'), recList = $('recList');
let recTab = 'best';
escuchar('menu', view => { recP.hidden = view !== 'records'; if (view === 'records') renderRecords(); });
$('toRecords').addEventListener('click', () => showMenu('records'));
$('recordsOk').addEventListener('click', () => showMenu('main'));
recP.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => {
  recTab = b.dataset.t; recP.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b)); renderRecords();
}));
function recRow(cells, cls) {
  const d = document.createElement('div'); d.className = 'rrow' + (cls ? ' ' + cls : '');
  cells.forEach(c => { const s = document.createElement('span'); s.textContent = c; d.appendChild(s); });
  recList.appendChild(d);
}
function renderRecords() {
  stDirty = true; statsSave();
  recList.textContent = '';
  if (recTab === 'mine') {
    recList.className = 'rlist mine';
    recRow(['Mejor sesión', Math.floor(ST.best)], 'sum'); recRow(['Mejor ola', Math.floor(ST.bestWave)], 'sum');
    recRow(['Mejor tubo', ST.bestTube ? ST.bestTube.toFixed(1) + ' s' : '—'], 'sum'); recRow(['👑 LOCAL LEGEND', ST.legends + ' veces'], 'sum');
    recRow(['Partidas', ST.sessions], 'sum'); recRow(['Trucos hechos', ST.total], 'sum');
    const ks = Object.keys(ST.tricks).sort((a, b) => ST.tricks[b] - ST.tricks[a]);
    recRow(['Truco', 'Veces', 'Récord'], 'head');
    if (!ks.length) recRow(['Todavía no has hecho trucos', '', '']);
    ks.forEach(k => recRow([k, ST.tricks[k], ST.tbest[k] ? '+' + ST.tbest[k] : '—']));
    return;
  }
  recList.className = 'rlist rank';
  recRow(['', 'Cargando…', '', '']);
  const field = recTab;
  const fallo = () => { if (recTab !== field) return; recList.textContent = ''; recRow(['', 'No se ha podido cargar el ranking', '', '']); };
  // solo se descargan los 20 mejores (no todo el ranking)
  firebaseListo().then(({ db }) => recRef(db).orderByChild(field).limitToLast(20).once('value')).then(snap => {
    if (recTab !== field) return;
    let list = [];
    snap.forEach(c => { const v = c.val() || {}; list.push({ id: c.key, nm: String(v.nm || 'Surfista').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 20), ch: v.ch, val: Math.floor(Number(v[field]) || 0) }); });
    list = list.filter(r => r.val > 0).sort((a, b) => b.val - a.val).slice(0, 20);
    recList.textContent = '';
    recRow(['#', 'Surfista', 'Personaje', field === 'best' ? 'Sesión' : 'Ola'], 'head');
    list.forEach((r, i) => { const c = CHARS.find(x => x.id === r.ch); recRow([i + 1, r.nm, c ? c.name : '', r.val], r.id === stUid ? 'me' : ''); });
    if (!list.length) recRow(['', 'Todavía no hay récords. ¡Sé el primero!', '', '']);
  }).catch(fallo);
}
