// Conexión al empezar: con la sala «bots» juega contra bots sin conexión; si no, se conecta a Firebase y escucha la sala.
import { $ } from '../nucleo/util.js';
import { removePeer, updateCount, upsertPeer } from './jugadores.js';
import { onMsg } from './mensajes.js';
import { FIREBASE_CONFIG, firebaseListo, MP, mpMenu, SALA } from './red.js';
import { BOTS, makeBots } from '../modos/bots.js';

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
  firebaseListo().then(({ db, uid }) => {
    MP.myId = uid;
    MP.db = db;
    MP.base = MP.db.ref('v2/salas/' + SALA);
    MP.meRef = MP.base.child('players/' + MP.myId);
    MP.db.ref('.info/connected').on('value', s => {
      MP.connected = !!s.val();
      if (MP.connected) { MP.meRef.onDisconnect().remove(); MP.sendT = 0; }
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
