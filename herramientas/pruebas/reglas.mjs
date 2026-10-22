// Pruebas de las reglas de Firebase contra el emulador local (no toca la base de datos real).
//   1) firebase emulators:start --only auth,database      (necesita Java)
//   2) node herramientas/pruebas/reglas.mjs
const DB = 'http://127.0.0.1:9000', AUTH = 'http://127.0.0.1:9099', NS = 'surf-sagunto-default-rtdb';
const TS = { '.sv': 'timestamp' };

async function usuario() {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=prueba`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
  const j = await r.json(); return { uid: j.localId, token: j.idToken };
}
// quien: un usuario, null (sin login) o 'admin' (se salta las reglas, para preparar datos)
async function op(quien, metodo, ruta, datos, query = '') {
  const auth = quien && quien !== 'admin' ? '&auth=' + quien.token : '';
  const headers = quien === 'admin' ? { Authorization: 'Bearer owner' } : {};
  const r = await fetch(`${DB}/${ruta}.json?ns=${NS}${auth}${query}`, { method: metodo, headers, body: datos === undefined ? undefined : JSON.stringify(datos) });
  return r.ok;
}
let fallos = 0, total = 0;
async function espera(nombre, esperado, promesa) {
  total++;
  const ok = await promesa;
  if (ok !== esperado) { fallos++; console.log(`✗ ${nombre}: ${ok ? 'se permitió' : 'se rechazó'} y no debía`); }
  else console.log(`✓ ${nombre}`);
}

await op('admin', 'DELETE', '');
const A = await usuario(), B = await usuario();
const sala = 'v2/salas/pruebas';
const jugador = (extra = {}) => ({ ch: 'jowi', nm: 'Ana', st: 'ride', dx: 1.5, h: 0.4, th: 0.1, bk: 0, cr: 0.2, gr: 0, ay: 0, sp: 0, fl: 0, pr: 1, pt: 1, sb: '', sc: 120, t: TS, ...extra });

console.log('— jugadores');
await espera('sin login no se puede leer', false, op(null, 'GET', `${sala}/players`));
await espera('sin login no se puede escribir', false, op(null, 'PUT', `${sala}/players/x`, jugador()));
await espera('escribo mi jugador', true, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador()));
await espera('escribo mi jugador en la disputa', true, op(A, 'PUT', `${sala}/players/${A.uid}`, { ch: 'jowi', nm: 'Ana', st: 'duel', du: B.uid, dx: 0.3, h: 4, gr: 2, sp: 3, bk: 1, ay: 0.2, sc: 10, t: TS }));
await espera('con login se puede leer', true, op(B, 'GET', `${sala}/players`));
await espera('no puedo escribir el jugador de otro', false, op(B, 'PUT', `${sala}/players/${A.uid}`, jugador()));
await espera('no puedo borrar a otro que está activo', false, op(B, 'DELETE', `${sala}/players/${A.uid}`));
await espera('campo desconocido', false, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador({ hack: 1 })));
await espera('número que no es número', false, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador({ dx: 'mucho' })));
await espera('escribo mi jugador con una tabla robada', true, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador({ sb: 'litos' })));
await espera('tabla robada con nombre larguísimo', false, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador({ sb: 'x'.repeat(21) })));
await espera('protección que no es 0 ni 1', false, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador({ pt: 5 })));
await espera('puntos imposibles', false, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador({ sc: 9e9 })));
await espera('hora inventada', false, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador({ t: 123 })));
await espera('nombre demasiado largo', false, op(A, 'PUT', `${sala}/players/${A.uid}`, jugador({ nm: 'x'.repeat(21) })));
await espera('sala con caracteres raros', false, op(A, 'PUT', `v2/salas/HOLA$/players/${A.uid}`, jugador()));
await op('admin', 'PUT', `${sala}/players/fantasma`, { ch: 'jowi', st: 'ride', t: Date.now() - 60000 });
await espera('puedo borrar un fantasma (más de 45 s sin dar señales)', true, op(B, 'DELETE', `${sala}/players/fantasma`));
await espera('me borro yo al salir', true, op(A, 'DELETE', `${sala}/players/${A.uid}`));

console.log('— mensajes');
const msg = (extra = {}) => ({ id: A.uid, nm: 'Ana', at: TS, ...extra });
await espera('mando un texto', true, op(A, 'PUT', `${sala}/msgs/m1`, msg({ tx: '¡Vaya ola!' })));
await espera('mando un empujón', true, op(A, 'PUT', `${sala}/msgs/m2`, msg({ ev: 'push', to: B.uid })));
await espera('mando un empujón que le roba la tabla', true, op(A, 'PUT', `${sala}/msgs/m2b`, msg({ ev: 'push', to: B.uid, sb: 1 })));
await espera('«robo» en un mensaje que no es empujón', false, op(A, 'PUT', `${sala}/msgs/m2c`, msg({ tx: 'hola', sb: 1 })));
await espera('mando un golpe de la disputa', true, op(A, 'PUT', `${sala}/msgs/m3`, msg({ ev: 'hit', to: B.uid, ty: 2 })));
await espera('mando una nota de voz', true, op(A, 'PUT', `${sala}/msgs/m4`, msg({ au: 'data:audio/webm;base64,' + 'A'.repeat(20000) })));
await espera('no puedo hacerme pasar por otro', false, op(A, 'PUT', `${sala}/msgs/m5`, msg({ id: B.uid, tx: 'soy B' })));
await espera('texto demasiado largo', false, op(A, 'PUT', `${sala}/msgs/m6`, msg({ tx: 'x'.repeat(81) })));
await espera('evento desconocido', false, op(A, 'PUT', `${sala}/msgs/m7`, msg({ ev: 'ban', to: B.uid })));
await espera('evento sin destinatario', false, op(A, 'PUT', `${sala}/msgs/m8`, msg({ ev: 'push' })));
await espera('texto y evento a la vez', false, op(A, 'PUT', `${sala}/msgs/m9`, msg({ ev: 'push', to: B.uid, tx: 'hola' })));
await espera('nota de voz demasiado grande', false, op(A, 'PUT', `${sala}/msgs/m10`, msg({ au: 'data:audio/webm;base64,' + 'A'.repeat(100000) })));
await espera('«nota de voz» que no es audio', false, op(A, 'PUT', `${sala}/msgs/m11`, msg({ au: 'data:text/html;base64,AAAA' })));
await espera('mensaje vacío', false, op(A, 'PUT', `${sala}/msgs/m12`, msg()));
await espera('no puedo cambiar un mensaje ya enviado', false, op(A, 'PUT', `${sala}/msgs/m1`, msg({ tx: 'cambiado' })));
await espera('no puedo borrar un mensaje reciente de otro', false, op(B, 'DELETE', `${sala}/msgs/m1`));
await espera('puedo borrar mi propio mensaje', true, op(A, 'DELETE', `${sala}/msgs/m2`));
await op('admin', 'PUT', `${sala}/msgs/viejo`, { id: A.uid, nm: 'Ana', at: Date.now() - 200000, tx: 'viejo' });
await espera('cualquiera puede limpiar mensajes viejos', true, op(B, 'DELETE', `${sala}/msgs/viejo`));
await espera('leer mensajes recientes ordenados', true, op(B, 'GET', `${sala}/msgs`, undefined, '&orderBy=%22at%22&startAt=0'));

console.log('— récords');
const rec = 'v2/records/2';
const ficha = (extra = {}) => ({ nm: 'Ana', ch: 'jowi', best: 5000, bestWave: 2000, bestTube: 1.8, legends: 0, sessions: 3, total: 12, tricks: { Tubo: 3, '360': 2 }, at: TS, ...extra });
await espera('guardo mis récords', true, op(A, 'PUT', `${rec}/${A.uid}`, ficha()));
await espera('subo mi récord', true, op(A, 'PUT', `${rec}/${A.uid}`, ficha({ best: 6000 })));
await espera('no puedo bajar mi récord', false, op(A, 'PUT', `${rec}/${A.uid}`, ficha({ best: 100 })));
await espera('no puedo tocar los récords de otro', false, op(B, 'PUT', `${rec}/${A.uid}`, ficha({ best: 9000 })));
await espera('no puedo borrar mis récords', false, op(A, 'DELETE', `${rec}/${A.uid}`));
await espera('récord imposible', false, op(B, 'PUT', `${rec}/${B.uid}`, ficha({ best: 9e9 })));
await espera('campo desconocido', false, op(B, 'PUT', `${rec}/${B.uid}`, ficha({ admin: true })));
await espera('truco con nombre larguísimo', false, op(B, 'PUT', `${rec}/${B.uid}`, ficha({ tricks: { ['x'.repeat(31)]: 1 } })));
await espera('temporada que no es un número', false, op(B, 'PUT', `v2/records/hack/${B.uid}`, ficha()));
await espera('B guarda sus récords', true, op(B, 'PUT', `${rec}/${B.uid}`, ficha({ nm: 'Bea', best: 7000 })));
await espera('sin login no se ve el ranking', false, op(null, 'GET', rec, undefined, '&orderBy=%22best%22&limitToLast=20'));
await espera('ranking: los 20 mejores', true, op(B, 'GET', rec, undefined, '&orderBy=%22best%22&limitToLast=20'));

console.log('— rutas antiguas (el juego en vivo, mientras dure la transición)');
await espera('el juego viejo sigue pudiendo escribir', true, op(null, 'PUT', 'salas/pantalan/players/p1', { ch: 'jowi', st: 'ride' }));
await espera('el juego viejo sigue guardando récords', true, op(null, 'PUT', 'stats/abc123', { nm: 'Ana', best: 10, bestWave: 5, season: 2 }));
await espera('fuera de las rutas conocidas no se escribe nada', false, op(A, 'PUT', 'cualquiercosa', { a: 1 }));

console.log(`\n${total - fallos}/${total} pruebas correctas`);
process.exit(fallos ? 1 : 0);
