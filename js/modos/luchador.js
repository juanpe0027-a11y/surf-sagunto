// Los luchadores de la Disputa por el Pico: postura de pelea, golpes con lo que llevan (tabla, pala, lata) y su dibujo.
import { clamp, lerp, rnd, sm, TAU, V3 } from '../nucleo/util.js';
import { UP } from '../mundo/formas.js';
import { applyPoseRig, buildRig, disposeRig } from '../surfista/rig.js';
import { DUEL, DUEL_Y, G_PHI, qRoll, SW, XAX, ZAX } from './disputa.js';

function overPhi(type, s) {
  const S = SW[type], up = type === 2 ? -1.1 : -0.8, down = type === 2 ? 2.7 : 2.3, w = S.hit * 0.62;
  if (s < 0) return G_PHI;
  if (s < w) return lerp(G_PHI, up, sm(0, w, s));                  // coge impulso por encima de la cabeza
  if (s < S.hit) return lerp(up, down, (s - w) / (S.hit - w));     // ¡golpe!
  return lerp(down, G_PHI, sm(S.hit, S.dur, s));                   // vuelve a la guardia
}
const hr = V3(0, 0, 0), hd2 = V3(0, 0, 0), hg = V3(0, 0, 0), dg = V3(0, 0, 0);
function weaponState(f) {
  const s = f.sw.t, type = f.sw.type;
  let lean = 0, off = 1, roll = true;
  if (f.block && s < 0) {                                          // cubrirse: el objeto en vertical delante de la cara
    hr.set(0.3, -0.12, 0); hd2.set(0.12, 1, 0).normalize(); lean = -0.06; off = 0.2; roll = false;
  } else if (s >= 0 && (type === 0 || type === 3)) {               // lateral (o giro): barrido de lado a lado
    const S = SW[type];
    let psi;
    if (type === 3) psi = 0.35;
    else if (s < S.hit * 0.55) psi = lerp(0.2, 2.0, sm(0, S.hit * 0.55, s));
    else if (s < S.hit) psi = lerp(2.0, -1.3, (s - S.hit * 0.55) / (S.hit * 0.45));
    else psi = -1.3;
    hr.set(0.45 * Math.cos(psi), -0.12, 0.45 * Math.sin(psi)); hd2.set(Math.cos(psi), 0.12, Math.sin(psi)).normalize();
    lean = 0.06;
    if (s > S.hit && type === 0) {                                 // vuelve a la guardia
      const k = sm(S.hit, S.dur, s), phi = G_PHI;
      hg.set(0.5 * Math.sin(phi), -0.05 + 0.5 * Math.cos(phi), 0); dg.set(Math.sin(phi), Math.cos(phi), 0);
      hr.lerp(hg, k); hd2.lerp(dg, k).normalize();
    }
  } else {                                                         // guardia o de arriba abajo / mazazo
    const phi = overPhi(type, s);
    hr.set(0.5 * Math.sin(phi), -0.05 + 0.5 * Math.cos(phi), 0); hd2.set(Math.sin(phi), Math.cos(phi), 0);
    lean = 0.14 * clamp((phi - 1) / 1.3, 0, 1) - 0.1 * clamp(-phi / 0.8, 0, 1);
  }
  return { lean, off, roll };
}
// postura de pelea: de pie mirando a +x con el objeto agarrado con las dos manos
function duelPose(o, walk, t, hurt, cz, lean, air) {
  const st = Math.sin(t * 10) * walk * 0.2 * (air ? 0 : 1), bob = 0.02 * Math.sin(t * 4) - 0.04 * hurt;
  const lx = lean - 0.22 * hurt, tuck = air ? 0.18 : 0;
  o.fw.set(1, 0, cz);
  o.hB.set(-0.03 + lx * 0.3, 0.93 + bob, -0.1); o.hF.set(0.03 + lx * 0.3, 0.93 + bob, 0.1);
  o.kB.set(-0.1 - st + tuck * 0.5, 0.5 + tuck, -0.14); o.kF.set(0.17 + st + tuck * 0.5, 0.5 + tuck, 0.15);
  o.fB.set(-0.22 - st * 1.6, 0.06 + Math.max(0, -st) * 0.5 + tuck * 1.2, -0.16); o.fF.set(0.3 + st * 1.6, 0.06 + Math.max(0, st) * 0.5 + tuck * 1.2, 0.16);
  o.ch.set(0.03 + lx, 1.42 + bob, 0); o.hd.set(o.ch.x + 0.04 - hurt * 0.08, o.ch.y + 0.27, 0);
  o.sB.set(o.ch.x - 0.02, o.ch.y - 0.02, -0.19); o.sF.set(o.ch.x - 0.02, o.ch.y - 0.02, 0.19);
  o.aF.set(o.ch.x + hr.x, o.ch.y + hr.y, hr.z + 0.05); o.aB.set(o.aF.x - 0.1 * hd2.x, o.aF.y - 0.1 * hd2.y, hr.z - 0.05 - 0.1 * hd2.z);
  o.eB.set((o.sB.x + o.aB.x) / 2 - 0.06, (o.sB.y + o.aB.y) / 2 - 0.12, -0.3);
  o.eF.set((o.sF.x + o.aF.x) / 2 - 0.06, (o.sF.y + o.aF.y) / 2 - 0.12, 0.3);
  return o;
}
const matBuoy = new THREE.MeshStandardMaterial({ color: 0xe0261f, roughness: 0.4 }), buoyGeo = new THREE.CapsuleGeometry(0.1, 0.75, 4, 12);
export function makeFighter(ch) {
  const rig = buildRig(ch);
  rig.root.children.forEach(o => { o.visible = o === rig.rider || (rig.human && o === rig.human.root); });
  rig.rider.scale.set(1, 1, 1); rig.rider.position.set(0, 0, 0); rig.rider.rotation.set(0, 0, 0);   // de pie, sin goofy/regular
  const F = { rig, ch, axis: UP, off: 0.8, weapon: null, extra: null, ph: rnd(0, 5) };
  if (!ch.jetski && !ch.kayak && !ch.zodiac && rig.board) {                 // su tabla
    F.weapon = rig.board; rig.rider.add(F.weapon); F.axis = XAX; F.off = 0.85 * F.weapon.scale.x;
  } else if (ch.zodiac) {                                                    // lata de rescate roja
    F.weapon = F.extra = new THREE.Mesh(buoyGeo, matBuoy); rig.rider.add(F.weapon); F.off = 0.6;
  } else if (rig.paddle) { F.weapon = rig.paddle; F.off = 0.8; }             // pala del kayak / remo
  if (F.weapon) F.weapon.visible = true;
  rig.root.visible = true;
  return F;
}
export function dropFighter(F) { if (!F) return; if (F.extra) F.extra.removeFromParent(); disposeRig(F.rig); }
const dq1 = new THREE.Quaternion(), dq2 = new THREE.Quaternion(), dq3 = new THREE.Quaternion();
export function drawFighter(F, f, oU, t) {
  const rig = F.rig, root = rig.root, right = oU >= f.u;
  f.spinA = f.sw.t >= 0 && f.sw.type === 3 ? TAU * sm(0, SW[3].dur * 0.9, f.sw.t) : 0;       // giro aéreo: vuelta entera
  dq1.setFromAxisAngle(UP, (right ? 0 : Math.PI) + f.spinA); dq2.setFromAxisAngle(ZAX, f.ko * 1.45);
  root.quaternion.copy(dq1).multiply(dq2);
  root.position.set(DUEL.ax + f.u, DUEL_Y + f.jy + f.ko * 0.45 + 0.04 * Math.sin(t * 1.6 + F.ph), DUEL.az);
  const ws = weaponState(f);
  duelPose(rig.pose, f.walk, t + F.ph, f.hurt, right ? 0.45 : -0.45, ws.lean, f.jy > 0.05);
  applyPoseRig(rig, rig.pose, 0.15, (right ? 1.0 : 2.1) + Math.PI + 0.6, t);
  if (F.weapon) {
    const o = rig.pose;
    F.weapon.position.addVectors(o.aB, o.aF).multiplyScalar(0.5).addScaledVector(hd2, F.off * ws.off);
    F.weapon.quaternion.setFromUnitVectors(F.axis, hd2);
    if (F.axis === XAX && ws.roll) F.weapon.quaternion.multiply(qRoll);   // la tabla de cara, no de canto
  }
}
