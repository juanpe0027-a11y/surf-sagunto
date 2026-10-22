// Posturas del cuerpo: de pie en la tabla, tumbado, sentado en la moto, el kayak o la zodiac, remando y saludando.
// Una postura es un objeto con la posición de cada articulación (manos, rodillas, pies, pecho, cabeza…).
import { V3 } from '../nucleo/util.js';
import { G } from '../nucleo/estado.js';
import { UP } from '../mundo/formas.js';

const KEYS_POSE = ['hB', 'hF', 'kB', 'kF', 'fB', 'fF', 'ch', 'hd', 'sB', 'sF', 'eB', 'eF', 'aB', 'aF', 'fw'];
export const mkPose = () => { const o = {}; for (const k of KEYS_POSE) o[k] = V3(0, 0, 0); return o; };
export const poseA = mkPose(), poseB = mkPose(), poseOut = mkPose();
// c = flexión (0 de pie, 1 agachado a tope); lean = inclinación del cuerpo hacia la ola (-) o hacia fuera (+)
export function stance(o, c, grab, t, lean, twist) {
  lean = lean || 0;
  const hy = 0.98 - 0.42 * c, lz = lean * 0.12;
  o.fw.set(0, 0, 1);
  o.hB.set(-0.13 + 0.02 * c, hy, 0.02 + lz); o.hF.set(0.1 - 0.02 * c, hy, 0.02 + lz);
  o.fB.set(-0.42, 0.1, 0); o.fF.set(0.34, 0.1, 0);
  o.kB.set(-0.31, 0.54 - 0.18 * c, 0.13 + 0.22 * c + lz * 0.6); o.kF.set(0.24, 0.54 - 0.18 * c, 0.13 + 0.22 * c + lz * 0.6);
  o.ch.set(0.03 + 0.1 * c, hy + 0.5 - 0.13 * c, 0.05 + 0.26 * c + lean * 0.22);
  o.hd.set(o.ch.x + 0.09, o.ch.y + 0.26 - 0.03 * c, o.ch.z + 0.06);
  o.sB.set(o.ch.x - 0.17, o.ch.y - 0.02, o.ch.z - 0.02); o.sF.set(o.ch.x + 0.17, o.ch.y - 0.02, o.ch.z + 0.02);
  o.eB.set(-0.45, o.ch.y - 0.16 - 0.05 * c, o.ch.z + 0.1 - lean * 0.12);
  o.aB.set(-0.7, o.ch.y - 0.32 + 0.05 * Math.sin(t * 2) - 0.1 * c, o.ch.z + 0.14 - lean * 0.3);
  o.eF.set(0.44, o.ch.y - 0.06 - 0.06 * c, o.ch.z + 0.14 + lean * 0.1);
  o.aF.set(0.74, o.ch.y - 0.12 + 0.04 * Math.sin(t * 2 + 1) - 0.12 * c, o.ch.z + 0.22 + lean * 0.3);
  if (grab > 0) {
    // agarre estilizado: muy flexionado, mano delantera al canto y el brazo de atrás estirado
    const dn = 0.14 * grab;
    o.hB.y -= dn; o.hF.y -= dn; o.ch.y -= dn * 1.1; o.hd.y -= dn * 1.1; o.sB.y -= dn * 1.1; o.sF.y -= dn * 1.1;
    o.kB.y += 0.06 * grab; o.kF.y += 0.06 * grab; o.kB.z += 0.1 * grab; o.kF.z += 0.1 * grab;
    o.ch.z += 0.08 * grab; o.hd.z += 0.1 * grab;
    o.eF.lerp(V3(0.2, o.ch.y - 0.28, o.ch.z + 0.22), grab);
    o.aF.lerp(V3(0.12, 0.12, 0.27), grab);
    o.eB.lerp(V3(-0.4, o.ch.y + 0.08, o.ch.z - 0.22), grab);
    o.aB.lerp(V3(-0.72, o.ch.y + 0.32, o.ch.z - 0.3), grab);
  }
  if (twist) {
    // los hombros y los brazos se adelantan al giro (la tabla sigue a la mirada)
    const cs = Math.cos(twist), sn = Math.sin(twist);
    for (const k of TWIST_KEYS) {
      const p = o[k], dx = p.x - o.ch.x, dz = p.z - o.ch.z;
      p.x = o.ch.x + dx * cs - dz * sn; p.z = o.ch.z + dx * sn + dz * cs;
    }
  }
  return o;
}
const TWIST_KEYS = ['sB', 'sF', 'eB', 'eF', 'aB', 'aF', 'hd'];
// postura de floater (encima de la de surf): muy agachado, el peso delante y los brazos abiertos para equilibrarse
export function floaterPose(o, t) {
  o.hB.y -= 0.12; o.hF.y -= 0.12; o.ch.y -= 0.14; o.hd.y -= 0.14; o.sB.y -= 0.14; o.sF.y -= 0.14; o.ch.z += 0.1; o.hd.z += 0.12;
  o.eB.set(-0.45, o.ch.y + 0.05, o.ch.z - 0.1); o.aB.set(-0.78, o.ch.y + 0.22 + 0.04 * Math.sin(t * 3), o.ch.z - 0.05);
  o.eF.set(0.38, o.ch.y - 0.1, o.ch.z + 0.2); o.aF.set(0.62, o.ch.y - 0.28 + 0.04 * Math.cos(t * 3), o.ch.z + 0.38);
  return o;
}
// saludo surfero (shaka) con la mano de delante
export function shaka(o) {
  o.eF.set(o.ch.x + 0.24, o.ch.y - 0.04, o.ch.z + 0.26);
  o.aF.set(o.ch.x + 0.22, o.ch.y + 0.2, o.ch.z + 0.44);
  return o;
}
export function prone(o, ph, power) {
  o.fw.set(0, -1, 0);
  o.hB.set(-0.28, 0.2, -0.1); o.hF.set(-0.28, 0.2, 0.1);
  o.kB.set(-0.68, 0.17, -0.09); o.kF.set(-0.68, 0.17, 0.09);
  o.fB.set(-1.05, 0.22 + 0.06 * Math.sin(ph * 2), -0.08); o.fF.set(-1.05, 0.22 + 0.06 * Math.cos(ph * 2), 0.08);
  o.ch.set(0.22, 0.31, 0); o.hd.set(0.5, 0.47, 0);
  o.sB.set(0.27, 0.33, -0.19); o.sF.set(0.27, 0.33, 0.19);
  const arm = (a, e, s, phi, zs) => {
    a.set(0.25 + 0.5 * Math.cos(phi), 0.05 - 0.32 * Math.sin(phi) * (0.6 + 0.4 * power), zs * 0.4);
    e.set((s.x + a.x) / 2, Math.max(s.y, a.y) + 0.08, zs * 0.32);
  };
  arm(o.aB, o.eB, o.sB, ph, -1); arm(o.aF, o.eF, o.sF, ph + Math.PI, 1);
  return o;
}
export function bodyRide(o, c, grab, t, lean, twist) {
  lean = lean || 0; c = c || 0;
  const lz = lean * 0.1, kick = Math.sin(t * 6) * 0.05;
  o.fw.set(0, -1, 0);
  o.hB.set(-0.24, 0.17, -0.1 - lz); o.hF.set(-0.24, 0.17, 0.1 - lz);
  o.kB.set(-0.6, 0.2, -0.13 - lz); o.kF.set(-0.6, 0.2, 0.13 - lz);
  o.fB.set(-0.9, 0.36 + kick, -0.12 - lz); o.fF.set(-0.9, 0.36 - kick, 0.12 - lz);
  o.ch.set(0.17, 0.32 + 0.05 * (1 - c), lz); o.hd.set(0.45, 0.55 + 0.04 * (1 - c), lz * 1.2);
  o.sB.set(0.22, 0.35, -0.19 + lz); o.sF.set(0.22, 0.35, 0.19 + lz);
  o.eB.set(0.27, 0.2, -0.33); o.eF.set(0.27, 0.2, 0.33);
  o.aB.set(0.62, 0.08, -0.2); o.aF.set(0.62, 0.08, 0.2);
  if (grab > 0) { o.fB.y += 0.2 * grab; o.fF.y += 0.2 * grab; o.kB.y += 0.08 * grab; o.kF.y += 0.08 * grab; }
  return o;
}
const SUPERMAN = { hB: [-0.62, 1.04, -0.1], hF: [-0.62, 1.04, 0.1], kB: [-1.0, 1.1, -0.13], kF: [-1.0, 1.1, 0.13], fB: [-1.38, 1.14, -0.15], fF: [-1.38, 1.14, 0.15],
  ch: [-0.16, 1.02, 0], hd: [0.2, 1.14, 0], fw: [0.15, -1, 0], sB: [0.04, 1.02, -0.2], sF: [0.04, 1.02, 0.2], eB: [0.22, 0.95, -0.3], eF: [0.22, 0.95, 0.3], aB: [0.36, 0.82, -0.3], aF: [0.36, 0.82, 0.3] };
export function jetRide(o, c, grab, t, lean, twist) {
  lean = lean || 0; c = c || 0; grab = grab || 0; t = t || 0;
  jetSeat(o, c, t, lean);
  if (grab > 0.001) for (const k in SUPERMAN) { const p = SUPERMAN[k]; o[k].x += (p[0] - o[k].x) * grab; o[k].y += (p[1] - o[k].y) * grab; o[k].z += (p[2] - o[k].z) * grab; }
  return o;
}
function jetSeat(o, c, t, lean) {
  o.fw.set(1, 0, 0);
  const up = 0.14 * (1 - c), lz = lean * 0.12, bob = Math.sin(t * 7) * 0.012;
  o.hB.set(-0.38, 0.66 + up, -0.12); o.hF.set(-0.38, 0.66 + up, 0.12);
  o.kB.set(-0.05, 0.66 + up * 0.5, -0.25); o.kF.set(-0.05, 0.66 + up * 0.5, 0.25);
  o.fB.set(-0.2, 0.44, -0.3); o.fF.set(-0.2, 0.44, 0.3);
  o.ch.set(-0.18, 1.14 + up + bob, lz); o.hd.set(-0.08, 1.42 + up + bob, lz * 1.3);
  o.sB.set(-0.16, 1.16 + up, -0.2 + lz); o.sF.set(-0.16, 1.16 + up, 0.2 + lz);
  o.eB.set(0.1, 0.98 + up * 0.5, -0.32); o.eF.set(0.1, 0.98 + up * 0.5, 0.32);
  o.aB.set(0.36, 0.82, -0.3); o.aF.set(0.36, 0.82, 0.3);
  return o;
}
export function kayakRide(o, c, grab, t, lean, twist) {
  lean = lean || 0; c = c || 0; grab = grab || 0; t = t || 0;
  const ph = t * 3.2, sn = Math.sin(ph), cs = Math.cos(ph), lz = lean * 0.1;
  o.fw.set(1, 0, 0);
  o.hB.set(-0.16, 0.36, -0.13); o.hF.set(-0.16, 0.36, 0.13);
  o.kB.set(0.3, 0.52, -0.17); o.kF.set(0.3, 0.52, 0.17);
  o.fB.set(0.72, 0.34, -0.12); o.fF.set(0.72, 0.34, 0.12);
  o.ch.set(-0.05, 0.86 - 0.04 * c, lz); o.hd.set(0.03, 1.13 - 0.03 * c, lz * 1.2);
  o.sB.set(-0.04 - 0.08 * sn, 0.88, -0.2 + lz); o.sF.set(-0.04 + 0.08 * sn, 0.88, 0.2 + lz);
  // la pala barre de delante a atrás metiendo una hoja en el agua y luego la otra
  const a = sn * 0.75;
  const dx = 0.16 * cs, dy = -Math.sin(a), dz = Math.cos(a), l = Math.hypot(dx, dy, dz);
  const cx = 0.3 + 0.1 * cs, cy = 0.8, cz = 0;
  o.aF.set(cx + dx / l * 0.34, cy + dy / l * 0.34, cz + dz / l * 0.34);
  o.aB.set(cx - dx / l * 0.34, cy - dy / l * 0.34, cz - dz / l * 0.34);
  o.eB.set((o.sB.x + o.aB.x) / 2 - 0.05, (o.sB.y + o.aB.y) / 2 - 0.12, (o.sB.z + o.aB.z) / 2 - 0.1);
  o.eF.set((o.sF.x + o.aF.x) / 2 - 0.05, (o.sF.y + o.aF.y) / 2 - 0.12, (o.sF.z + o.aF.z) / 2 + 0.1);
  if (grab > 0.001) for (const k in SUPERMAN) { if (k[0] === 'a' || k[0] === 'e') continue; const p = SUPERMAN[k]; o[k].x += (p[0] - 0.2 - o[k].x) * grab; o[k].y += (p[1] - 0.3 - o[k].y) * grab; o[k].z += (p[2] - o[k].z) * grab; }
  return o;
}
export function zodiacRide(o, c, grab, t, lean, twist) {
  lean = lean || 0; c = c || 0; grab = grab || 0; t = t || 0;
  const lz = lean * 0.12, bob = Math.sin(t * 6) * 0.015, up = 0.1 * (1 - c);
  o.fw.set(1, 0, 0);
  o.hB.set(-0.55, 0.62 + up, -0.12); o.hF.set(-0.55, 0.62 + up, 0.12);
  o.kB.set(-0.2, 0.3, -0.2); o.kF.set(-0.2, 0.3, 0.2);
  o.fB.set(-0.62, 0.24, -0.18); o.fF.set(-0.62, 0.24, 0.18);
  o.ch.set(-0.42, 1.12 + up + bob, lz); o.hd.set(-0.32, 1.4 + up + bob, lz * 1.3);
  o.sB.set(-0.44, 1.14 + up, -0.2 + lz); o.sF.set(-0.44, 1.14 + up, 0.2 + lz);
  o.eB.set(-0.72, 0.88, -0.24); o.eF.set(-0.1, 0.95, 0.3);
  o.aB.set(-0.85, 0.66, -0.06); o.aF.set(0.18, 0.72, 0.34);
  if (grab > 0.001) for (const k in SUPERMAN) { const p = SUPERMAN[k]; o[k].x += (p[0] - 0.4 - o[k].x) * grab; o[k].y += (p[1] - o[k].y) * grab; o[k].z += (p[2] - o[k].z) * grab; }
  return o;
}
// colocar la pala entre las dos manos
const pdA = V3(0, 0, 0), pdB = V3(0, 0, 0);
export function placePaddle(pd, o) {
  if (!pd.visible) return;
  pd.position.addVectors(o.aB, o.aF).multiplyScalar(0.5);
  pdA.subVectors(o.aF, o.aB).normalize();
  pd.quaternion.setFromUnitVectors(UP, pdA);
}
// Qué hace el cuerpo en cada vehículo: surfear (de pie, tumbado o sentado), remar a por la ola y posar en el menú.
// Un vehículo nuevo necesita: sus posturas aquí, su modelo en vehiculos.js y su bandera en la ficha del personaje.
export const vehiculo = c => c.jetski ? 'moto' : c.zodiac ? 'zodiac' : c.kayak ? 'kayak' : c.bodyboard ? 'bodyboard' : 'tabla';
const POSTURAS = {
  //           surfear             remar (t = reloj, ph = fase de la brazada, f = fuerza)   posar en la ficha del menú
  tabla:     { surf: stance,     remar: (o, t, ph, f) => prone(o, ph, f),        posar: (o, t) => shaka(stance(o, 0.2, 0, t, 0)) },
  bodyboard: { surf: bodyRide,   remar: (o, t, ph, f) => prone(o, ph, f),        posar: (o, t) => bodyRide(o, 0.2, 0, t, 0) },
  moto:      { surf: jetRide,    remar: (o, t) => jetRide(o, 0.3, 0, t),         posar: (o, t) => jetRide(o, 0.2, 0, t, 0) },
  kayak:     { surf: kayakRide,  remar: (o, t) => kayakRide(o, 0.3, 0, t * 1.9), posar: (o, t) => kayakRide(o, 0.2, 0, t * 0.6, 0) },
  zodiac:    { surf: zodiacRide, remar: (o, t) => zodiacRide(o, 0.3, 0, t),      posar: (o, t) => zodiacRide(o, 0.2, 0, t, 0) },
};
export const posturas = c => POSTURAS[vehiculo(c)];
// postura de surfear: de pie (surf), tumbado (bodyboard) o sentado (moto de agua, kayak, zodiac)
export function poseFor(c) { return posturas(c).surf; }
export function riderStance(o, c, grab, t, lean, twist) { return poseFor(G.CH)(o, c, grab, t, lean, twist); }
export function lerpPose(a, b, t, out) { for (const k of KEYS_POSE) out[k].lerpVectors(a[k], b[k], t); return out; }
