// Prueba de las salas con tope, contra el emulador: llena la ola pública con 12 surfistas y entra uno más.
//   node herramientas/pruebas/sala.mjs     (con el emulador en marcha)
import { execFileSync } from 'node:child_process';
const DB = 'http://127.0.0.1:9000', NS = 'surf-sagunto-default-rtdb', admin = { Authorization: 'Bearer owner' };
const poner = (ruta, datos) => fetch(`${DB}/${ruta}.json?ns=${NS}`, { method: 'PUT', headers: admin, body: JSON.stringify(datos) });
await fetch(`${DB}/v2/salas.json?ns=${NS}`, { method: 'DELETE', headers: admin });
const jugadores = {};
for (let i = 0; i < 12; i++) jugadores['falso' + i] = { ch: 'jowi', st: 'menu', t: Date.now() };
await poner('v2/salas/pantalan/players', jugadores);
const salida = execFileSync('node', ['herramientas/probar.mjs', 'herramientas/pruebas/sala.js', '--emulador', '--hash=', '--espera=4'], { encoding: 'utf8' });
const r = JSON.parse(salida).resultado;
const bien = r.conectado && r.sala === 'pantalan-2';
console.log(bien ? '✓' : '✗', 'con la ola pública llena, el nuevo va a', r.sala);
await fetch(`${DB}/v2/salas.json?ns=${NS}`, { method: 'DELETE', headers: admin });
process.exit(bien ? 0 : 1);
