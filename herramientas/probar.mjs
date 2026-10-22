// Prueba automática del juego en Chrome/Edge sin ventana (opcional: necesita Node 22+ y Chrome o Edge).
// Sirve la carpeta, abre el juego, recoge los errores de la consola, ejecuta un guion de pruebas y hace capturas.
//
//   node herramientas/probar.mjs [guion.js] [--hash=pruebas] [--espera=8] [--capturas=carpeta] [--jugadores=2] [--emulador] [--online] [--cpu] [--pagina=ruta.html] [--web]
//
// Sin --online se bloquea Firebase, para no llenar la base de datos real de jugadores y récords de prueba.
// --emulador conecta el juego al emulador local de Firebase; --jugadores=N abre N pestañas (N jugadores distintos).
// --cpu dibuja sin tarjeta gráfica (mucho más lento: el juego va a cámara lenta).
// --web prueba el juego publicado (https://juanpe0027-a11y.github.io/surf-sagunto/) en vez de esta carpeta: sirve para
// comprobar en un minuto que lo que se acaba de publicar funciona (Firebase sigue bloqueado salvo con --online).
//
// El guion (opcional) es un archivo JS que se ejecuta DENTRO de la página, con acceso a window.__surf,
// y debe devolver un objeto (o una promesa) con los resultados; se imprime como JSON.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const guion = process.argv.slice(2).find(a => !a.startsWith('--'));
const HASH = args.hash ?? 'pruebas';
const ESPERA = Number(args.espera ?? 8) * 1000;

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const servidor = createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const archivo = join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta);
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  try { const d = await readFile(archivo); res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(d); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => servidor.listen(0, '127.0.0.1', r));
const PUERTO = servidor.address().port;

const NAVEGADORES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const nav = NAVEGADORES.find(existsSync);
if (!nav) { console.error('No encuentro Chrome ni Edge'); process.exit(2); }
const perfil = await mkdtemp(join(tmpdir(), 'surf-prueba-'));
const chrome = spawn(nav, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perfil, '--no-first-run', '--no-default-browser-check',
  ...(args.cpu ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']), '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=1280,720', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok, mal) => {
  let buf = '';
  chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
  setTimeout(() => mal(new Error('Chrome no arranca')), 15000);
});

// --- protocolo de DevTools, lo justo ---
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r));
let nid = 0; const pend = new Map(), oyentes = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.mal(new Error(m.error.message)) : p.ok(m.result); }
  else oyentes.forEach(f => f(m));
});
const cdp = (method, params = {}, sessionId) => new Promise((ok, mal) => { const id = ++nid; pend.set(id, { ok, mal }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

// --- una pestaña por jugador, cada una con su propio perfil (= su propio login anónimo) ---
const JUGADORES = Number(args.jugadores ?? 1);
const BASE = args.web ? 'https://juanpe0027-a11y.github.io/surf-sagunto/' : `http://127.0.0.1:${PUERTO}/`;
const URL_JUEGO = `${BASE}${args.pagina || ''}${args.emulador ? '?emulador' : ''}${HASH && !args.pagina ? '#' + HASH : ''}`;
const paginas = [];
for (let i = 0; i < JUGADORES; i++) {
  const { browserContextId } = await cdp('Target.createBrowserContext');
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const p = { i, S: sessionId, errores: [], avisos: [], fallos404: [], red: { recibidos: 0, enviados: 0, tramas: 0 } };
  paginas.push(p);
  oyentes.push(m => {
    if (m.sessionId !== p.S) return;
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; p.errores.push((d.exception?.description || d.text) + (d.url ? ' @ ' + d.url.replace(/.*\//, '') + ':' + d.lineNumber : '')); }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      const t = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
      (m.params.type === 'error' ? p.errores : p.avisos).push(t);
    }
    // bytes por WebSocket (la base de datos de Firebase): para medir lo que gasta el online
    if (m.method === 'Network.webSocketFrameReceived') { p.red.recibidos += m.params.response.payloadData.length; p.red.tramas++; }
    if (m.method === 'Network.webSocketFrameSent') p.red.enviados += m.params.response.payloadData.length;
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) p.fallos404.push(m.params.response.status + ' ' + m.params.response.url);
    if (m.method === 'Network.loadingFailed' && !m.params.canceled && m.params.blockedReason !== 'inspector') p.fallos404.push(`falla ${m.params.errorText} ${m.params.blockedReason || m.params.corsErrorStatus?.corsError || ""} ${m.params.type}`);
  });
  await cdp('Runtime.enable', {}, p.S); await cdp('Network.enable', {}, p.S); await cdp('Page.enable', {}, p.S);
  // por defecto no se toca la base de datos real (las pruebas guardarían récords y jugadores falsos); --online la deja pasar
  if (!args.online) await cdp('Network.setBlockedURLs', { urls: ['https://*.firebasedatabase.app/*', 'wss://*.firebasedatabase.app/*', 'https://*.firebaseio.com/*', 'wss://*.firebaseio.com/*', 'https://identitytoolkit.googleapis.com/*', 'https://securetoken.googleapis.com/*'] }, p.S);
  await cdp('Page.navigate', { url: URL_JUEGO }, p.S);
}
await new Promise(r => setTimeout(r, ESPERA));

const evaluar = async (p, expr) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, p.S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const captura = async (p, nombre) => {
  if (!args.capturas) return;
  await mkdir(args.capturas, { recursive: true });
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' }, p.S);
  await writeFile(join(args.capturas, (JUGADORES > 1 ? 'j' + (p.i + 1) + '-' : '') + nombre + '.png'), Buffer.from(data, 'base64'));
};

// el guion se ejecuta a la vez en todas las pestañas; window.__jugador dice cuál es (0, 1, …)
// y puede pedir capturas con: await captura('nombre')
async function correrGuion(p, codigo) {
  await evaluar(p, `window.__jugador = ${p.i}; window.__capturaPedida = []; window.captura = n => new Promise(r => window.__capturaPedida.push([n, r]));`);
  const promesa = evaluar(p, `(async () => { ${codigo} })()`);
  let fin = false; promesa.finally(() => { fin = true; }).catch(() => {});
  while (!fin) {
    const pedidas = await evaluar(p, `(window.__capturaPedida || []).map(x => x[0])`).catch(() => []);
    for (const n of pedidas) { await captura(p, n); await evaluar(p, `(() => { const x = window.__capturaPedida.find(y => y[0] === ${JSON.stringify(n)}); window.__capturaPedida = window.__capturaPedida.filter(y => y !== x); x[1](); })()`); }
    await new Promise(r => setTimeout(r, 150));
  }
  try { p.resultado = await promesa; } catch (e) { p.errorGuion = String(e.message || e); }
}
for (const p of paginas) await captura(p, '0-inicio');
if (guion) {
  const codigo = await readFile(guion, 'utf8');
  await Promise.all(paginas.map(p => correrGuion(p, codigo)));
  for (const p of paginas) await captura(p, '9-final');
}
// errores que el propio juego ha apuntado (por ejemplo, un módulo que no carga)
for (const p of paginas) p.errores.push(...await evaluar(p, '(window.__errores || []).slice()').catch(() => []));
const limpio = ({ S, i, ...resto }) => resto;
console.log(JSON.stringify(JUGADORES > 1 ? paginas.map(limpio) : limpio(paginas[0]), null, 2));
chrome.kill(); servidor.close();
await new Promise(r => setTimeout(r, 500));
await rm(perfil, { recursive: true, force: true }).catch(() => {});
process.exit(paginas.some(p => p.errores.length || p.errorGuion) ? 1 : 0);
