// Formato de lo que se manda por la red (Firebase), todo en un sitio.
// ⚠️ Un campo nuevo tiene que estar también en firebase-reglas.json (y su prueba en herramientas/pruebas/reglas.mjs):
// las reglas rechazan los campos que no conocen.
//
// Mi surfista, en v2/salas/<sala>/players/<uid>. Solo se manda lo que ha cambiado:
//   ch personaje · nm nombre · st estado (menu, paddle, ride, air, wipe, duel) · sc puntos · t hora (cada 2 s, para saber que sigo aquí)
//   surfeando:     dx distancia al tubo · h altura en la cara · th rumbo · bk inclinación · cr flexión · gr agarre
//                  ay altura en el aire · sp giro · fl mortal · pr fase de la remada
//   en la Disputa: du rival · dx posición · h vidas · gr golpes dados · sp tipo de golpe · bk cubriéndose · ay salto
// Mensajes, en v2/salas/<sala>/msgs: id quién · nm su nombre · at hora, y además uno de estos:
//   tx texto · au nota de voz · ev evento ('push' empujón, 'duel' disputa, 'hit' golpe) con to a quién (y ty tipo de golpe)
import { TAU } from '../nucleo/util.js';
import { G } from '../nucleo/estado.js';
import { aPos } from '../juego/fisica.js';
import { MP } from './red.js';
import { DUEL } from '../modos/disputa.js';

// los campos numéricos que se suavizan al recibir
export const CAMPOS_NUM = ['dx', 'h', 'th', 'bk', 'cr', 'gr', 'ay', 'sp', 'fl'];
const hora = () => firebase.database.ServerValue.TIMESTAMP;
const r2 = n => Math.round(n * 100) / 100;

// estado (G.state) → lo que ven los demás
function miEstado() {
  if (G.state === 'ride' || G.state === 'popup') return G.air ? 'air' : 'ride';
  if (G.state === 'paddle' || G.state === 'miss') return 'paddle';
  if (G.state === 'wipe') return 'wipe';
  if (G.state === 'duel') return 'duel';
  return 'menu';
}
// lo que mando de mí ahora mismo
export function miSurfista() {
  const st = miEstado(), yo = { ch: G.CH.id, nm: MP.myName || G.CH.name, st, sc: Math.floor(G.score) };
  if (st === 'duel' && DUEL.on) return Object.assign(yo, { du: DUEL.oppId, dx: r2(DUEL.A.u), h: DUEL.A.hp, gr: DUEL.swN, sp: DUEL.A.sw.type, bk: DUEL.A.block ? 1 : 0, ay: r2(DUEL.A.jy) });
  return Object.assign(yo, { dx: r2(G.px - G.curlX), h: r2(G.h), th: r2(G.theta), bk: r2(G.bank), cr: r2(G.crouch),
    gr: r2(G.grab), ay: r2(G.air ? aPos.y : 0), sp: r2(G.spin), fl: r2(G.flip), pr: r2(G.paddlePh % TAU) });
}

// Mandar solo lo que ha cambiado gasta mucho menos (la descarga mensual es el límite del plan gratuito).
// Los puntos (sc) cambian en cada fotograma pero la clasificación se ve cada cuarto de segundo: van como mucho una vez por segundo.
let enviado = {}, tHora = -1e9, tPuntos = -1e9;
export function mandarSurfista(ref, yo) {
  const cambios = {}, ahora = performance.now();
  if (yo.sc !== enviado.sc && ahora - tPuntos < 1000 && yo.st === enviado.st) yo.sc = enviado.sc;
  if (yo.sc !== enviado.sc) tPuntos = ahora;
  for (const k in yo) if (yo[k] !== enviado[k]) cambios[k] = yo[k];
  for (const k in enviado) if (!(k in yo)) cambios[k] = null;          // campos que ya no tocan (al salir de la Disputa)
  if (ahora - tHora > 2000) { cambios.t = hora(); tHora = ahora; }
  if (!Object.keys(cambios).length) return;
  enviado = yo;
  ref.update(cambios).catch(olvidarEnviado);                           // si falla (o me han borrado), la próxima vez va todo
}
// cuando me borran de la sala (al cambiar de app, por inactividad o al reconectar), la próxima vez se manda todo
export function olvidarEnviado() { enviado = {}; tHora = -1e9; tPuntos = -1e9; }

// un mensaje para la sala: { tx }, { au } o un evento
export const mensaje = datos => Object.assign({}, datos, { id: MP.myId, nm: MP.myName || G.CH.name, at: hora() });
export const evento = (ev, to, extra) => mensaje(Object.assign({ ev, to }, extra));
