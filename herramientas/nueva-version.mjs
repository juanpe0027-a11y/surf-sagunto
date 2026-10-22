// Prepara una versión nueva para publicar: pone el mismo número nuevo en BUILD_ID (index.html),
// en version.json y en los ?v= de los archivos propios que carga index.html (para saltarse la caché).
//   node herramientas/nueva-version.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const v = String(Math.floor(Date.now() / 1000));
const ruta = resolve(RAIZ, 'index.html');
let html = await readFile(ruta, 'utf8');
if (!/const BUILD_ID = '\d+'/.test(html)) { console.error('No encuentro BUILD_ID en index.html'); process.exit(1); }
html = html.replace(/const BUILD_ID = '\d+'/, `const BUILD_ID = '${v}'`)
  .replace(/((?:href|src)="(?:css|js)\/[^"?]+\.(?:css|js))(\?v=\d+)?"/g, `$1?v=${v}"`);   // vendor.js no: casi nunca cambia
await writeFile(ruta, html);
await writeFile(resolve(RAIZ, 'version.json'), JSON.stringify({ build: v }) + '\n');
console.log('Versión nueva:', v);
