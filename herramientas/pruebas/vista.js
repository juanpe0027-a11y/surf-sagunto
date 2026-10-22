// Guion de capturas para comparar cambios visuales: menú, ficha de personaje y surfeando.
//   node herramientas/probar.mjs herramientas/pruebas/vista.js --capturas=carpeta
const S = window.__surf, $ = id => document.getElementById(id);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const tecla = (code, tipo = 'keydown') => window.dispatchEvent(new KeyboardEvent(tipo, { code, bubbles: true }));
await esperar(1500); await captura('a-menu');
$('toChars').click(); await esperar(2500); await captura('b-ficha');
$('charsOk').click(); $('start').click();
for (let i = 0; i < 80 && S.state !== 'ride'; i++) { if (S.state === 'paddle') { tecla('Space'); await esperar(50); tecla('Space', 'keyup'); } await esperar(100); }
tecla('ArrowLeft'); await esperar(1200); tecla('ArrowLeft', 'keyup');
await captura('c-surfeando');
tecla('ArrowUp'); for (let i = 0; i < 30 && !S.air; i++) await esperar(100); tecla('ArrowUp', 'keyup');
await esperar(250); await captura('d-salto');
return { estado: S.state, aire: S.air };
