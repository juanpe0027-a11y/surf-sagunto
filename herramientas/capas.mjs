// Comprueba que ningún módulo de js/ importa de una capa de arriba (ver docs/ARQUITECTURA.md).
//   node herramientas/capas.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'js');
const CAPAS = ['nucleo', 'datos', 'mundo', 'surfista', 'juego', 'online', 'modos', 'interfaz', 'entrada'];
const PARES = [['online', 'modos'], ['modos', 'online']];   // online y modos trabajan juntos: pueden usarse entre sí
const capa = f => CAPAS.indexOf(f.split('/')[0]);
const todos = d => readdirSync(d).flatMap(n => statSync(join(d, n)).isDirectory() ? todos(join(d, n)) : n.endsWith('.js') ? [join(d, n)] : []);
const fallos = [];
for (const abs of todos(JS)) {
  const f = relative(JS, abs).replace(/\/g, '/');
  if (capa(f) < 0) continue;                       // main.js, inicio.js, bucle.js, debug.js: arriba del todo
  for (const m of readFileSync(abs, 'utf8').matchAll(/^import .* from '([^']+)'/mg)) {
    const d = posix.normalize(posix.join(posix.dirname(f), m[1]));
    const a = f.split('/')[0], b = d.split('/')[0];
    if (capa(d) < 0) fallos.push(`${f} importa ${d}, que está por encima de todas las capas`);
    else if (capa(d) > capa(f) && !PARES.some(([x, y]) => x === a && y === b)) fallos.push(`${f} (${a}) importa ${d} (${b}), que es una capa de arriba`);
  }
}
if (fallos.length) { console.log('✗ Imports hacia una capa de arriba:\n  ' + fallos.join('\n  ')); console.log('\nSolución: mueve la pieza compartida a la capa de abajo, o usa avisar/escuchar (js/nucleo/eventos.js).'); process.exit(1); }
console.log('✓ Las capas están bien: nadie importa de una capa de arriba.');
