// Robar la tabla: el segundo empujón al mismo surfista le quita lo suyo (tabla, moto, kayak o zodiac; el bodyboard no).
// Surfeas con lo suyo —con su postura y sus trucos— llevando tu tabla bajo el brazo, hasta que él vuelve a coger ola:
// entonces das un saltito y vuelves a lo tuyo (si es un vehículo, llega navegando por tu costado) y lo robado se queda atrás.
// Los demás lo ven porque mando qué llevo robado (campo sb, ver protocolo.js).
import { clamp, rnd, sm, V3 } from '../nucleo/util.js';
import { escuchar } from '../nucleo/eventos.js';
import { G } from '../nucleo/estado.js';
import { canCarry, CHARS, seatedC } from '../datos/personajes.js';
import { splash } from '../mundo/particulas.js';
import { carryPose } from '../surfista/empujon.js';
import { applyPose, rider } from '../surfista/muneco.js';
import { setBoardShape } from '../surfista/personaje.js';
import { poseA } from '../surfista/posturas.js';
import { boardRoot } from '../surfista/raiz.js';
import { buildRig, disposeRig, makeCarry, texFromCanvas } from '../surfista/rig.js';
import { boardMesh, deckCv, finMeshes, paintBoard } from '../surfista/tabla.js';
import { ironG, jetG, kayakG, paddle, zodiacG } from '../surfista/vehiculos.js';
import { chip } from '../juego/hud.js';
import { addPts } from '../juego/puntos.js';
import { MP } from './red.js';

// a quién se le puede robar qué (a puede quitarle lo suyo a b)
export const canSteal = (a, b) => !!a && !!b && a.id !== b.id && !a.bodyboard && !b.bodyboard;
// todo lo que es «mi objeto», para esconderlo mientras salgo volando sin él
export const misObjetos = () => [boardMesh, jetG, kayakG, zodiacG, ironG, paddle, ...finMeshes];

// MP.steal: lo que llevo robado ({ chId de quién, id del jugador, t, ret: la vuelta a lo mío }) · MP.carry: mi tabla bajo el brazo
MP.steal = null; MP.carry = null;
const ghosts = [];                                   // objetos sueltos que se quedan atrás a la deriva
const RET_APPROACH = 1.4, RET_HOP = 0.62, RET_SIDE = 1.3;
const vEstela = V3(0, 0, 0);

// mi tabla se pinta como la robada (también después de crear el muñeco de otro jugador, que la deja como la mía)
function stealLook() { if (MP.steal) { const v = CHARS.find(x => x.id === MP.steal.chId); if (v) { paintBoard(v); setBoardShape(v); } } }
escuchar('rig-hecho', stealLook);

export function stealStart(R) {
  if (canCarry(G.CH)) {                                                            // mi tabla, para llevarla bajo el brazo
    const carryTex = texFromCanvas(deckCv);
    MP.carry = makeCarry(carryTex, boardMesh.scale.clone()); MP.carry.userData.tex = carryTex; rider.add(MP.carry);
  }
  MP.steal = { chId: R.ch.id, id: R.id, t: 0 }; G.rideCh = R.ch; stealLook(); MP.sendT = 0;
  splash(boardRoot.position, 30, 0.8);
  const p = addPts(200); chip('🏄 ¡Le has robado la tabla a ' + (R.nm || R.ch.name) + '! +' + p);
}
// un objeto suelto (sin surfista) donde estoy yo: lo robado que se pierde, o mi vehículo que vuelve navegando solo
function ghostOf(ch) {
  const rig = buildRig(ch);
  rig.rider.visible = false; if (rig.human) rig.human.root.visible = false;
  rig.root.visible = true; rig.root.position.copy(boardRoot.position); rig.root.quaternion.copy(boardRoot.quaternion);
  return rig;
}
// se acaba el robo. back = el otro ha vuelto a coger ola: si estoy surfeando, la vuelta a lo mío va con detalle
// (1: si es un vehículo, llega navegando por mi costado; 2: saltito, lo mío se mete debajo y caigo encima)
export function stealEnd(back) {
  if (!MP.steal) return;
  const riding = G.state === 'ride' && !G.air;
  if (back && riding && !MP.steal.ret) {
    const veh = seatedC(G.CH);
    MP.steal.ret = { phase: veh ? 'approach' : 'hop', t: 0, g: veh ? ghostOf(G.CH) : null, wake: 0 };
    if (veh) chip('🛥️ Tu ' + (G.CH.jetski ? 'moto' : G.CH.kayak ? 'kayak' : 'zodiac') + ' vuelve navegando');
    return;
  }
  stealSwap(back && riding);
  rider.position.set(0, 0, 0);
  MP.steal = null;
}
// el cambio de objeto (en mitad del saltito, o de golpe si me han tirado)
function stealSwap(withGhost) {
  const S = MP.steal;
  if (!S) return;
  if (S.ret && S.ret.g) { disposeRig(S.ret.g); S.ret.g = null; }
  const stolen = CHARS.find(x => x.id === S.chId);
  if (withGhost && stolen) {                                                   // lo robado se queda donde estaba y se va quedando atrás
    const g = ghostOf(stolen);
    ghosts.push({ t: 0, g, y0: g.root.position.y, q0: g.root.quaternion.clone(), vx: G.curlSpeed * 0.55, vz: -0.5, spin: rnd(-0.5, 0.5) });
  }
  G.rideCh = null; paintBoard(G.CH); setBoardShape(G.CH); MP.sendT = 0;
  if (MP.carry) { rider.remove(MP.carry); MP.carry.material.dispose(); MP.carry.userData.tex.dispose(); MP.carry = null; }
  S.swapped = true;
  if (withGhost && G.state === 'ride') { splash(boardRoot.position, 34, 0.8); chip(seatedC(G.CH) ? '🛥️ ¡De vuelta a lo tuyo!' : '🏄 Tiras su objeto y vuelves a tu tabla'); }
}
function stealReturn(dt) {
  const S = MP.steal, R2 = S.ret;
  if (G.state !== 'ride') { stealSwap(false); rider.position.set(0, 0, 0); MP.steal = null; return; }
  R2.t += dt;
  const b = boardRoot.position, t = performance.now() / 1000;
  if (R2.phase === 'approach') {
    // llega desde atrás por mi costado, cabeceando y dejando estela, y frena hasta ponerse a mi altura
    const k = sm(0, RET_APPROACH, R2.t), g = R2.g.root;
    g.position.set(b.x - 10 * (1 - k) * (1 - k), b.y + 0.05 * Math.sin(t * 7), b.z + RET_SIDE);
    g.quaternion.copy(boardRoot.quaternion); g.rotateX(0.07 * Math.sin(t * 5)); g.rotateZ(0.05 * Math.sin(t * 6.3) - 0.08 * (1 - k));
    if ((R2.wake -= dt) <= 0) { R2.wake = 0.07; vEstela.copy(g.position); vEstela.x -= 0.9; splash(vEstela, 5, 0.35); }
    if (R2.t >= RET_APPROACH) { R2.phase = 'hop'; R2.t = 0; }
    return;
  }
  // el saltito: subo, lo mío se mete debajo, cambio en lo alto y caigo encima
  const k = clamp(R2.t / RET_HOP, 0, 1);
  rider.position.set(0, 0.9 * Math.sin(Math.PI * k), 0);
  if (R2.g) {
    const g = R2.g.root, side = RET_SIDE * (1 - sm(0, 0.5, k));
    g.position.set(b.x, b.y + 0.05 * Math.sin(t * 7), b.z + side); g.quaternion.copy(boardRoot.quaternion);
  }
  if (!S.swapped && k >= 0.5) stealSwap(true);
  if (k >= 1) { rider.position.set(0, 0, 0); splash(boardRoot.position, 22, 0.6); MP.steal = null; }
}
// cada fotograma (después de que la partida haya puesto mi postura en poseA)
export function updateRobo(dt) {
  if (MP.steal) {
    const S = MP.steal, V = MP.remotes.get(S.id);
    S.t += dt;
    const back = V && (V.st === 'ride' || V.st === 'air') && S.t > 1.5;
    if (S.ret) stealReturn(dt);
    else if (back || S.t > 20 || !V || (G.state !== 'ride' && G.state !== 'popup')) stealEnd(back);
    else if (G.state === 'ride' && MP.carry) applyPose(carryPose(poseA, MP.carry));
  }
  // lo robado se queda atrás flotando a la deriva, cabeceando, y se hunde detrás de la ola
  for (let i = ghosts.length - 1; i >= 0; i--) {
    const o = ghosts[i], r = o.g.root; o.t += dt;
    o.vx *= Math.exp(-dt * 1.2); r.position.x += o.vx * dt; r.position.z += o.vz * dt;
    r.position.y = o.y0 + 0.06 * Math.sin(o.t * 5) - 0.45 * sm(1.0, 3.0, o.t);
    r.quaternion.copy(o.q0); r.rotateY(o.t * o.spin); r.rotateX(0.18 * Math.sin(o.t * 3.3)); r.rotateZ(0.12 * Math.sin(o.t * 2.6) + 0.25 * sm(1.5, 3.0, o.t));
    if (o.t > 3.2) { disposeRig(o.g); ghosts.splice(i, 1); }
  }
}
