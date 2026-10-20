// Guion de prueba: juega una ola con cada personaje y revisa menú y récords.
// Se ejecuta dentro de la página: node herramientas/probar.mjs herramientas/pruebas/partida.js
const S = window.__surf, $ = id => document.getElementById(id);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const tecla = (code, tipo = 'keydown') => window.dispatchEvent(new KeyboardEvent(tipo, { code, bubbles: true }));
const pulsar = async (code, ms = 120) => { tecla(code); await esperar(ms); tecla(code, 'keyup'); };
const res = { personajes: {}, problemas: [] };

$('toChars').click(); await esperar(600);
const ids = [...document.querySelectorAll('#cards .card')].map(c => c.dataset.id);
res.numPersonajes = ids.length;
res.fotosRotas = [...document.querySelectorAll('#cards img')].filter(i => !i.complete || !i.naturalWidth).map(i => i.alt);
await captura('1-personajes');

for (const id of ids) {
  document.querySelector(`#cards .card[data-id="${id}"]`).click(); await esperar(150);
  $('charsOk').click(); await esperar(100);
  $('start').click();
  const vistos = new Set();
  let t0 = performance.now();
  while (performance.now() - t0 < 15000 && S.state !== 'ride') {
    vistos.add(S.state);
    if (S.state === 'paddle') await pulsar('Space', 60);
    await esperar(80);
  }
  // surfear: giros, subir y trucos
  t0 = performance.now();
  let aire = false;
  const secuencia = ['ArrowLeft', 'ArrowUp', 'KeyT', 'ArrowRight', 'ArrowUp', 'KeyT', 'ArrowDown', 'ArrowLeft'];
  for (let i = 0; performance.now() - t0 < 6000; i++) {
    vistos.add(S.state); if (S.air) aire = true;
    await pulsar(secuencia[i % secuencia.length], 300);
    for (const k of ['score', 'h', 'v', 'dx']) if (!Number.isFinite(S[k])) res.problemas.push(`${id}: ${k} = ${S[k]}`);
  }
  vistos.add(S.state);
  if (id === 'jowi') await captura('2-surfeando');
  res.personajes[id] = { estados: [...vistos].join(','), aire, puntos: Math.floor(S.score) };
  if (!vistos.has('ride')) res.problemas.push(`${id}: no llegó a surfear`);
  $('hudHome').click(); await esperar(900);
  $('toChars').click(); await esperar(300);
}
$('charsOk').click(); await esperar(200);

// récords: pestaña «mis récords»
$('toRecords').click(); await esperar(400);
document.querySelector('#records [data-t="mine"]')?.click(); await esperar(300);
res.filasRecords = document.querySelectorAll('#recList .rrow').length;
await captura('3-records');
$('recordsOk').click();
return res;
