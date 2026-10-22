// Guion para medir lo que gasta el online: cada pestaña es un surfista distinto y surfean juntos 20 s.
//   node herramientas/probar.mjs herramientas/pruebas/red.js --emulador --jugadores=3 --hash=pruebas
// El resultado de cada pestaña trae "red": bytes recibidos y enviados por la base de datos.
const S = window.__surf, MP = S.MP, $ = id => document.getElementById(id), yo = window.__jugador;
const esperar = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (cond, ms = 15000) => { const t0 = performance.now(); while (!cond() && performance.now() - t0 < ms) await esperar(100); return cond(); };
const tecla = (code, tipo = 'keydown') => window.dispatchEvent(new KeyboardEvent(tipo, { code, bubbles: true }));
await hasta(() => MP.connected);
const ids = ['jowi', 'litos', 'bruno', 'froskin', 'gutty', 'alex'];
$('toChars').click(); await esperar(300);
document.querySelector(`#cards .card[data-id="${ids[yo]}"]`).click(); $('charsOk').click();
await esperar(2500 + yo * 300);
$('start').click();
const t0 = performance.now(); let n = 0;
while (performance.now() - t0 < 20000) {
  if (S.state === 'paddle') tecla('Space');
  const k = ['ArrowLeft', 'ArrowUp', 'KeyT', 'ArrowRight', 'ArrowDown'][n++ % 5];
  tecla(k); await esperar(250); tecla(k, 'keyup'); tecla('Space', 'keyup');
}
return { surfistasVistos: MP.remotes.size, estado: S.state };
