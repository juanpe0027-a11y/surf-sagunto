// Comprueba si Firebase está listo para la versión nueva del juego: login anónimo activado y reglas nuevas publicadas.
// Hace lo mismo que un jugador al entrar (crea una sesión anónima, escribe su surfista en una sala de prueba)
// y luego lo borra todo. No toca el ranking ni las salas de verdad.
//   node herramientas/comprobar-firebase.mjs
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const red = await readFile(resolve(RAIZ, 'js/online/red.js'), 'utf8');
const KEY = red.match(/"apiKey":\s*"([^"]+)"/)[1];
// con --emulador comprueba el emulador local (firebase emulators:start) en vez de la base de datos real
const EMU = process.argv.includes('--emulador');
const DB = EMU ? 'http://127.0.0.1:9000' : red.match(/"databaseURL":\s*"([^"]+)"/)[1];
const NS = EMU ? '&ns=surf-sagunto-default-rtdb' : '';
const AUTH = (EMU ? 'http://127.0.0.1:9099/' : 'https://') + 'identitytoolkit.googleapis.com/v1/accounts';
let fallos = 0;
const bien = t => console.log('✓ ' + t), mal = t => { fallos++; console.log('✗ ' + t); };

// 1. login anónimo (lo que hace cada móvil al abrir el juego)
const r = await fetch(`${AUTH}:signUp?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }).then(x => x.json());
if (!r.idToken) {
  const msg = r.error && r.error.message;
  mal('El login anónimo NO está activado (Firebase → Authentication → Método de inicio de sesión → Anónimo).'
    + (msg === 'CONFIGURATION_NOT_FOUND' ? ' Authentication ni siquiera está empezado: hay que pulsar «Comenzar» primero.' : ' Firebase dice: ' + msg));
  console.log('  (las reglas no se pueden comprobar hasta que el login anónimo funcione)');
} else {
  bien('El login anónimo está activado.');
  // 2. reglas nuevas: escribo mi surfista (con todos los campos que manda el juego) en una sala de prueba y lo borro
  const ruta = `${DB}/v2/salas/comprobacion/players/${r.localId}.json?auth=${r.idToken}${NS}`;
  const yo = { ch: 'jowi', nm: 'Comprobación', st: 'menu', dx: 0, h: 0.5, th: 0, bk: 0, cr: 0.3, gr: 0, ay: 0, sp: 0, fl: 0, pr: 0, pt: 1, sb: 'jowi', sc: 0, t: { '.sv': 'timestamp' } };
  const w = await fetch(ruta, { method: 'PUT', body: JSON.stringify(yo) });
  // y un empujón que roba la tabla (el mensaje con más campos)
  const rutaMsg = `${DB}/v2/salas/comprobacion/msgs/c${r.localId}.json?auth=${r.idToken}${NS}`;
  const msg = { id: r.localId, nm: 'Comprobación', at: { '.sv': 'timestamp' }, ev: 'push', to: r.localId, sb: 1 };
  const wm = await fetch(rutaMsg, { method: 'PUT', body: JSON.stringify(msg) });
  if (w.ok && wm.ok) bien('Las reglas nuevas están publicadas (aceptan todo lo que manda la versión nueva).');
  else mal('Las reglas nuevas NO están publicadas, o son una versión antigua (Firebase → Realtime Database → Reglas). Firebase dice: ' + (w.ok ? await wm.text() : await w.text()).trim());
  await fetch(ruta, { method: 'DELETE' });
  await fetch(rutaMsg, { method: 'DELETE' });
  await fetch(`${AUTH}:delete?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: r.idToken }) });
}
// 3. el juego que hay ahora en la web tiene que seguir funcionando mientras tanto
const v = await fetch(`${DB}/salas/pantalan/players.json?shallow=true${NS}`);
if (v.ok) bien('El juego que está ahora en la web sigue pudiendo conectarse.');
else mal('El juego que está ahora en la web NO puede leer sus salas: las reglas publicadas no son las de firebase-reglas.json.');

console.log(fallos ? '\nTodavía no se puede publicar la versión nueva: falta lo marcado con ✗.' : '\nTodo listo: se puede publicar la versión nueva.');
process.exit(fallos ? 1 : 0);
