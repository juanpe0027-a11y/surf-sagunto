// Prueba de la caché al publicar: que tras una versión nueva el móvil use los módulos nuevos y no mezcle con los viejos.
// Imita a GitHub Pages (cada archivo se puede guardar 10 minutos; si no ha cambiado, responde «304, igual»):
//   1. abre el juego (versión A), 2. publica la versión B cambiando un módulo, 3. vuelve a entrar como un jugador.
// Lo hace dos veces: con el mapa de módulos (tiene que usar B) y sin él, como antes (se quedaba con A).
//   node herramientas/pruebas/cache.mjs
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, stat, writeFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp4': 'video/mp4' };
const NAV = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
if (!NAV) { console.error('No encuentro Chrome ni Edge'); process.exit(2); }
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function escenario(conMapa) {
  // una copia del juego en una carpeta temporal (la que se «publica»)
  const T = await mkdtemp(join(tmpdir(), 'surf-cache-'));
  for (const f of ['index.html', 'version.json', 'vendor.js', 'icono.png', 'js', 'css', 'img', 'modelos', 'audio', 'herramientas/nueva-version.mjs']) await cp(join(RAIZ, f), join(T, f), { recursive: true });
  const publicar = () => execFileSync(process.execPath, [join(T, 'herramientas/nueva-version.mjs')]);
  const quitarMapa = async () => { const p = join(T, 'index.html'); await writeFile(p, (await readFile(p, 'utf8')).replace(/<!-- mapa de módulos:[^\n]*-->\r?\n<script type="importmap">[\s\S]*?<\/script>/, '')); };
  publicar(); if (!conMapa) await quitarMapa();
  // servidor como GitHub Pages
  const servidor = createServer(async (req, res) => {
    const archivo = join(T, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    try {
      const s = await stat(archivo), etag = `"${s.mtimeMs.toString(36)}-${s.size}"`;
      if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': 'max-age=600' }).end(); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: etag }).end(await readFile(archivo));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const URL_JUEGO = `http://127.0.0.1:${servidor.address().port}/#bots`;
  // Chrome sin ventana, con su caché normal
  const perfil = await mkdtemp(join(tmpdir(), 'surf-cache-perfil-'));
  const chrome = spawn(NAV, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perfil, '--no-first-run', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((ok, mal) => { let b = ''; chrome.stderr.on('data', d => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); }); setTimeout(() => mal(new Error('Chrome no arranca')), 15000); });
  const ws = new WebSocket(wsUrl); await new Promise(r => ws.addEventListener('open', r));
  let nid = 0; const pend = new Map(), errores = [];
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') errores.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
  const cdp = (method, params = {}, sessionId) => new Promise(ok => { const id = ++nid; pend.set(id, ok); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId: S } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  await cdp('Runtime.enable', {}, S); await cdp('Network.enable', {}, S);
  await cdp('Network.setBlockedURLs', { urls: ['https://*.firebasedatabase.app/*', 'wss://*.firebasedatabase.app/*', 'https://identitytoolkit.googleapis.com/*', 'https://securetoken.googleapis.com/*'] }, S);
  const evaluar = async expr => (await cdp('Runtime.evaluate', { expression: expr, returnByValue: true }, S)).result?.value;
  const entrar = async () => { await cdp('Page.navigate', { url: 'about:blank' }, S); await esperar(300); await cdp('Page.navigate', { url: URL_JUEGO }, S); await esperar(9000); };

  await entrar();                                                   // 1. versión A
  const cargaA = await evaluar('!!window.__surf');
  // 2. se publica B: un módulo cambia (util.js exporta algo nuevo) y otro lo usa (inicio.js)
  await appendFile(join(T, 'js/nucleo/util.js'), "\nexport const MARCA = 'B';\n");
  await appendFile(join(T, 'js/inicio.js'), "\nimport { MARCA } from './nucleo/util.js';\nwindow.__marca = MARCA;\n");
  await esperar(1100); publicar(); if (!conMapa) await quitarMapa();
  await entrar();                                                   // 3. el jugador vuelve a entrar
  const res = { conMapa, cargaA, juegoCargaB: await evaluar('!!window.__surf'), usaB: await evaluar("window.__marca === 'B'"), url: await evaluar('location.search'), errores };
  chrome.kill(); servidor.close(); await esperar(500);
  await rm(perfil, { recursive: true, force: true }).catch(() => {}); await rm(T, { recursive: true, force: true }).catch(() => {});
  return res;
}

const con = await escenario(true), sin = await escenario(false);
console.log(JSON.stringify({ conMapa: con, sinMapaComoAntes: sin }, null, 2));
const bien = con.cargaA && con.juegoCargaB && con.usaB && !con.errores.length;
console.log(bien ? '\n✓ Con el mapa de módulos, tras publicar se usan los módulos nuevos.' : '\n✗ Con el mapa de módulos, tras publicar NO se usan los módulos nuevos.');
if (!sin.usaB) console.log('  (sin el mapa, como antes, el jugador se quedaba con módulos viejos de la caché)');
process.exit(bien ? 0 : 1);
