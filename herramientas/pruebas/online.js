// Guion de prueba del modo online con dos jugadores contra el emulador de Firebase:
//   node herramientas/probar.mjs herramientas/pruebas/online.js --emulador --jugadores=2 --hash=pruebas
const S = window.__surf, MP = S.MP, $ = id => document.getElementById(id), yo = window.__jugador;
const esperar = ms => new Promise(r => setTimeout(r, ms));
const hasta = async (cond, ms = 15000) => { const t0 = performance.now(); while (!cond() && performance.now() - t0 < ms) await esperar(100); return cond(); };
const tecla = (code, tipo = 'keydown') => window.dispatchEvent(new KeyboardEvent(tipo, { code, bubbles: true }));
const res = {};

res.conectado = await hasta(() => MP.connected && !/^p/.test(MP.myId));
res.miId = MP.myId;
res.veoAlOtro = await hasta(() => MP.remotes.size >= 1);
const otro = [...MP.remotes.keys()][0];

// a surfear los dos (cada personaje solo lo puede llevar uno: el jugador 1 coge a Litos)
if (yo === 1) { $('toChars').click(); await esperar(300); document.querySelector('#cards .card[data-id="litos"]').click(); $('charsOk').click(); await esperar(2500); }
else await esperar(2800);
$('start').click();
res.surfeo = await hasta(() => { if (S.state === 'paddle') { tecla('Space'); setTimeout(() => tecla('Space', 'keyup'), 50); } return S.state === 'ride'; }, 20000);
await esperar(1500);
const R = MP.remotes.get(otro);
res.estadoDelOtro = R && R.st;
res.otroSeMueve = !!(R && Number.isFinite(R.tgt.dx));
await captura('surfeando-juntos');

// chat: el jugador 1 escribe y el 0 lo recibe
if (yo === 1) { $('chatIn').value = 'hola desde el 1'; $('chatForm').requestSubmit(); }
res.chatRecibido = yo === 0 ? await hasta(() => $('chatLog').textContent.includes('hola desde el 1'), 8000) : 'enviado';

// empujón (como lo manda el juego)
if (yo === 0) await MP.base.child('msgs').push({ ev: 'push', to: otro, id: MP.myId, nm: 'Cero', at: firebase.database.ServerValue.TIMESTAMP }).then(() => res.empujonEnviado = true, e => res.empujonEnviado = String(e.code || e));

// lo que las reglas NO deben dejar hacer desde el juego
res.escribirAlOtro = await MP.base.child('players/' + otro).set({ ch: 'jowi', st: 'ride', t: firebase.database.ServerValue.TIMESTAMP }).then(() => 'PERMITIDO (mal)', e => 'rechazado');
res.suplantarMensaje = await MP.base.child('msgs').push({ id: otro, nm: 'X', tx: 'soy el otro', at: firebase.database.ServerValue.TIMESTAMP }).then(() => 'PERMITIDO (mal)', e => 'rechazado');

// récords: se guardan al abrir la pantalla y el ranking sale de la base de datos
$('hudHome').click(); await esperar(1000);
$('toRecords').click();
document.querySelector('#records [data-t="best"]')?.click();
res.ranking = await hasta(() => !/Cargando/.test($('recList').textContent) && $('recList').children.length > 0, 10000) && $('recList').textContent.slice(0, 120);
await esperar(1500);
document.querySelector('#records [data-t="mine"]')?.click(); await esperar(200);
document.querySelector('#records [data-t="best"]')?.click();
await hasta(() => !/Cargando/.test($('recList').textContent), 8000);
res.filasRanking = $('recList').querySelectorAll('.rrow:not(.head)').length;
res.meVeoEnElRanking = !!$('recList').querySelector('.rrow.me');
await captura('ranking');
return res;
