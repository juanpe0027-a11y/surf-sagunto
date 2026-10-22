// Prepara una versión nueva para publicar: pone el mismo número nuevo en BUILD_ID (index.html),
// en version.json y en los ?v= de los archivos propios que carga index.html (para saltarse la caché),
// y escribe el mapa de módulos (importmap) de index.html.
//   node herramientas/nueva-version.mjs              prepara la versión nueva
//   node herramientas/nueva-version.mjs --comprobar  solo dice si el mapa de módulos está al día (no cambia nada)
//
// El mapa de módulos: GitHub Pages deja que cada móvil guarde los archivos 10 minutos. Si solo main.js llevara ?v=,
// tras publicar un móvil podría mezclar módulos nuevos con viejos de su caché y no cargar el juego. Con el mapa,
// el navegador pide cada módulo de js/ con la huella de su contenido (util.js?v=1a2b3c4d): lo que ha cambiado se
// descarga seguro y lo que no, se sigue sacando de la caché. Los navegadores sin mapas de módulos lo ignoran.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COMPROBAR = process.argv.includes('--comprobar');
const ruta = resolve(RAIZ, 'index.html');
let html = await readFile(ruta, 'utf8');
const EOL = html.includes('\r\n') ? '\r\n' : '\n';     // index.html tiene finales de línea de Windows: se respetan

// huella de cada módulo (igual en Windows y en Linux: se ignoran los finales de línea)
async function modulos(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await modulos(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
const lineas = [];
for (const p of (await modulos(resolve(RAIZ, 'js'))).sort()) {
  const huella = createHash('sha1').update((await readFile(p, 'utf8')).replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);
  const r = './' + relative(RAIZ, p).split('\\').join('/');
  lineas.push(`  "${r}": "${r}?v=${huella}"`);
}
const MARCA = '<!-- mapa de módulos: cada archivo de js/ con la huella de su contenido. Lo escribe herramientas/nueva-version.mjs: no se toca a mano -->';
const bloque = [MARCA, '<script type="importmap">', '{ "imports": {', lineas.join(',' + EOL), '} }', '</script>'].join(EOL);
const viejo = /<!-- mapa de módulos:[^\n]*-->\r?\n<script type="importmap">[\s\S]*?<\/script>/;

if (COMPROBAR) {
  const m = html.match(viejo);
  if (m && m[0] === bloque) { console.log('✓ El mapa de módulos está al día.'); process.exit(0); }
  console.log('✗ El mapa de módulos no está al día: ejecuta node herramientas/nueva-version.mjs antes de publicar.');
  process.exit(1);
}

const v = String(Math.floor(Date.now() / 1000));
if (!/const BUILD_ID = '\d+'/.test(html)) { console.error('No encuentro BUILD_ID en index.html'); process.exit(1); }
html = html.replace(/const BUILD_ID = '\d+'/, `const BUILD_ID = '${v}'`)
  .replace(/((?:href|src)="(?:css|js)\/[^"?]+\.(?:css|js))(\?v=\d+)?"/g, `$1?v=${v}"`);   // vendor.js no: casi nunca cambia
// el mapa va justo antes del primer módulo (main.js): tiene que estar antes de que se cargue ninguno
if (viejo.test(html)) html = html.replace(viejo, () => bloque);
else html = html.replace(/<script type="module"/, m => bloque + EOL + EOL + m);
await writeFile(ruta, html);
await writeFile(resolve(RAIZ, 'version.json'), JSON.stringify({ build: v }) + '\n');
console.log('Versión nueva:', v, `(${lineas.length} módulos en el mapa)`);
