// Conexión al empezar: con la sala «bots» juega contra bots sin conexión; si no, se conecta a Firebase y escucha la sala.
import { $ } from '../nucleo/util.js';
import { removePeer, updateCount, upsertPeer } from './jugadores.js';
import { onMsg } from './mensajes.js';
import { olvidarEnviado } from './protocolo.js';
import { FIREBASE_CONFIG, firebaseListo, MP, mpMenu, SALA, SALA_PUBLICA, TOPE_SALA } from './red.js';
import { BOTS, makeBots } from '../modos/bots.js';

// La ola pública tiene sitio para TOPE_SALA surfistas: si está llena, se abre pantalan-2, pantalan-3…
// (cuentan los que han dado señales en los últimos 20 s; la hora es la del servidor)
async function salaConSitio(db) {
  const desfase = (await db.ref('.info/serverTimeOffset').once('value')).val() || 0;
  for (let n = 1; n <= 20; n++) {
    const sala = n === 1 ? SALA : SALA + '-' + n;
    const snap = await db.ref('v2/salas/' + sala + '/players').once('value');
    let vivos = 0;
    snap.forEach(c => { if (Date.now() + desfase - (Number(c.child('t').val()) || 0) < 20000) vivos++; });
    if (vivos < TOPE_SALA) return sala;
  }
  return SALA;
}

(function connect() {
  const bb = $('botsBtn');
  if (SALA === 'bots') {
    MP.sim = true; makeBots();
    mpMenu.textContent = '🤖 Simulación con ' + BOTS.length + ' bots (sin conexión)';
    bb.textContent = '👥 Jugar con gente de verdad'; bb.onclick = () => { location.hash = ''; location.reload(); };
    return;
  }
  bb.textContent = '🤖 Jugar con bots'; bb.onclick = () => { location.hash = 'bots'; location.reload(); };
  if (!FIREBASE_CONFIG || !window.firebase) { mpMenu.textContent = 'Modo online sin configurar: juegas solo'; return; }
  mpMenu.textContent = '🌊 Conectando…';
  firebaseListo().then(async ({ db, uid }) => {
    MP.myId = uid;
    MP.db = db;
    if (SALA_PUBLICA) MP.sala = await salaConSitio(db);
    MP.base = MP.db.ref('v2/salas/' + MP.sala);
    MP.meRef = MP.base.child('players/' + MP.myId);
    MP.db.ref('.info/connected').on('value', s => {
      MP.connected = !!s.val();
      if (MP.connected) { MP.meRef.onDisconnect().remove(); MP.sendT = 0; olvidarEnviado(); }   // tras reconectar, el servidor ya me ha borrado
      updateCount();
    });
    const pl = MP.base.child('players');
    pl.on('child_added', s => upsertPeer(s.key, s.val()));
    pl.on('child_changed', s => upsertPeer(s.key, s.val()));
    pl.on('child_removed', s => removePeer(s.key));
    MP.base.child('msgs').orderByChild('at').startAt(Date.now() - 5000).on('child_added', s => onMsg(s.val()));
    window.addEventListener('pagehide', () => { try { MP.meRef.remove(); } catch (e) {} });
  }).catch(() => { mpMenu.textContent = 'No se ha podido conectar al modo online'; });
})();
