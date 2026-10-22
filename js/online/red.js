// Cada jugador escribe su estado en v2/salas/<sala>/players/<id> unas 8 veces por segundo
// (dónde va respecto a la ola: dx = distancia al tubo, h = altura en la cara, giros, saltos...)
// y escucha los de los demás para dibujarlos en SU ola en ese mismo sitio.
// Los mensajes (texto y notas de voz) van a v2/salas/<sala>/msgs.
// <id> es el del login anónimo de Firebase: las reglas (firebase-reglas.json) solo dejan escribir lo tuyo.
import { $ } from '../nucleo/util.js';
import { guardar, leer } from '../nucleo/guardado.js';

export const FIREBASE_CONFIG = {"apiKey": "AIzaSyBYEgJnEQxYbgT97giPRuTaRNd5d9vF8tg", "authDomain": "surf-sagunto.firebaseapp.com", "databaseURL": "https://surf-sagunto-default-rtdb.europe-west1.firebasedatabase.app", "projectId": "surf-sagunto", "storageBucket": "surf-sagunto.firebasestorage.app", "messagingSenderId": "669179228796", "appId": "1:669179228796:web:1e39377632d94fa1c50ff9"};
// sala: la que diga la URL (#amigos), o la ola pública «pantalan», que se reparte en pantalan-2, pantalan-3… cuando se llena
export const SALA = (location.hash.replace('#', '').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'pantalan').toLowerCase();
export const SALA_PUBLICA = !location.hash.replace('#', '');
export const TOPE_SALA = 12;   // surfistas por ola en la sala pública
// conexión con Firebase, compartida por el online y los récords: login anónimo (el jugador no ve nada).
// Con ?emulador en la URL usa el emulador local (firebase emulators:start) en vez de la base de datos real.
// Con ?sinred no se conecta a nada (lo usan las pruebas, para no llenar el ranking real de partidas de prueba).
const EMULADOR = new URLSearchParams(location.search).has('emulador');
const SIN_RED = new URLSearchParams(location.search).has('sinred');
let fbPromesa = null;
export function firebaseListo() {
  if (fbPromesa) return fbPromesa;
  if (SIN_RED || !FIREBASE_CONFIG || !window.firebase || !firebase.auth) return (fbPromesa = Promise.reject(new Error('sin Firebase')));
  fbPromesa = new Promise((ok, mal) => {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const auth = firebase.auth(), db = firebase.database();
    if (EMULADOR) { auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); db.useEmulator('127.0.0.1', 9000); }
    // primero se mira si ya había sesión guardada en este móvil; si no, se crea una
    const off = auth.onAuthStateChanged(u => {
      if (u) { off(); ok({ db, uid: u.uid }); }
      else auth.signInAnonymously().catch(e => { off(); mal(e); });
    });
  });
  fbPromesa.catch(() => {});
  return fbPromesa;
}
export const MP = { db: null, base: null, meRef: null, myId: 'p' + Math.random().toString(36).slice(2, 10), myName: '',
  sala: SALA, remotes: new Map(), sendT: 0, myMsgT: 0, connected: false, startAt: Date.now(), lastSentMenu: 0,
  pushCount: {} };   // pushCount: empujones entre tú y cada uno (al tercero, Disputa por el Pico)
export const mpLayer = $('mpLayer'), mpCount = $('mpCount'), mpMenu = $('mpMenu'), chatP = $('chatP'), chatLog = $('chatLog');
const nickIn = $('nick');
nickIn.value = leer('nombre') || '';
MP.myName = nickIn.value.trim();
nickIn.addEventListener('input', () => {
  MP.myName = nickIn.value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20);
  guardar('nombre', MP.myName);
  MP.sendT = 0;
});
