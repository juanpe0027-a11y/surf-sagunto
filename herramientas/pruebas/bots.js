// Guion de prueba del modo bots y la Disputa por el Pico:
//   node herramientas/probar.mjs herramientas/pruebas/bots.js --hash=bots
const S = window.__surf, MP = S.MP, $ = id => document.getElementById(id);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (cond, ms = 15000) => { const t0 = performance.now(); while (!cond() && performance.now() - t0 < ms) await esperar(100); return cond(); };
const tecla = (code, tipo = 'keydown') => window.dispatchEvent(new KeyboardEvent(tipo, { code, bubbles: true }));
const res = {};

res.hayBots = await hasta(() => MP.remotes.size >= 3);
res.numBots = MP.remotes.size;
$('start').click();
res.surfeo = await hasta(() => { if (S.state === 'paddle') { tecla('Space'); setTimeout(() => tecla('Space', 'keyup'), 50); } return S.state === 'ride'; }, 20000);
await esperar(2000);
await captura('con-bots');

// Disputa por el Pico contra un bot
const bot = [...MP.remotes.values()][0];
S.startDuel(bot);
res.disputa = await hasta(() => S.state === 'duel', 8000);
const vistos = new Set();
const t0 = performance.now();
let n = 0;
while (S.state === 'duel' && performance.now() - t0 < 30000) {
  // pegar, cubrirse, moverse y saltar
  const k = ['KeyT', 'ArrowLeft', 'KeyT', 'ArrowDown', 'ArrowRight', 'KeyT', 'ArrowUp'][n++ % 7];
  tecla(k); await esperar(150); tecla(k, 'keyup'); await esperar(200);
  vistos.add(S.state);
  if (n === 12) await captura('disputa');
}
res.disputaTermina = S.state !== 'duel';
res.estadoFinal = S.state;
return res;
