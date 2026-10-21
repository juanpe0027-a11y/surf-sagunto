// Animación del empujón: los brazos del que empuja hacia el otro, y el empujado saliendo volando separado de su tabla.
// Sirve para mi surfista (boardRoot + rider) y para las copias de los demás (rig.root + rig.rider).
import { clamp, rnd, V3 } from '../nucleo/util.js';
import { stance } from './posturas.js';

export const PUSH_T = 0.45, FLY_T = 1.5;   // lo que dura estirar los brazos y lo que dura el vuelo
const armT = V3(0, 0, 0), armD = V3(0, 0, 0), armA = V3(0, 0, 0), armM = new THREE.Matrix4();
const flyP = V3(0, 0, 0), flyM = new THREE.Matrix4(), flyQ = new THREE.Quaternion(), flyQ2 = new THREE.Quaternion();

// estira los dos brazos hacia el pecho del otro (target, en coordenadas del mundo); t = tiempo desde que empujó
export function pushArms(o, board, rider, target, t) {
  if (!target) return;
  const k = Math.sin(Math.PI * clamp(t / PUSH_T, 0, 1));
  board.updateMatrix(); rider.updateMatrix();
  armM.multiplyMatrices(board.matrix, rider.matrix).invert();
  armT.copy(target); armT.y += 1.0; armT.applyMatrix4(armM);                 // el pecho del otro, visto desde su cuerpo
  armD.subVectors(armT, o.ch); armD.y = clamp(armD.y, -0.3, 0.3); armD.normalize();
  for (const [a, e, s] of [[o.aF, o.eF, o.sF], [o.aB, o.eB, o.sB]]) {
    armA.copy(s).addScaledVector(armD, 0.72); armA.y = o.ch.y + 0.02; a.lerp(armA, k);
    armA.addVectors(s, a).multiplyScalar(0.5); armA.y -= 0.05; e.lerp(armA, k);
  }
}
// empieza el vuelo: away = hacia qué lado sale despedido (+1 / -1), v = velocidad que llevaba
export function startFly(board, away, v) {
  return { t: 0, P0: board.position.clone(), Q0: board.quaternion.clone(),
    vBody: V3(away * 2.2 + v * 0.75, 4.2, 1.6), vBoard: V3(v * 0.65 - away * 0.8, 1.4, -0.8),   // con la ola, para que se vea la caída
    ax: V3(rnd(-1, 1), rnd(-0.3, 0.3), 1).normalize(), bx: V3(1, rnd(-0.5, 0.5), rnd(-0.5, 0.5)).normalize() };
}
// la tabla por un lado dando vueltas y el cuerpo por otro, agitando brazos y piernas
export function flyStep(f, board, rider, o) {
  const t = f.t;
  board.position.copy(f.P0).addScaledVector(f.vBoard, t); board.position.y = f.P0.y + f.vBoard.y * t - 4.9 * t * t;
  flyQ.setFromAxisAngle(f.bx, t * 7); board.quaternion.copy(f.Q0).multiply(flyQ);
  flyP.copy(f.P0).addScaledVector(f.vBody, t); flyP.y = f.P0.y + f.vBody.y * t - 4.9 * t * t;
  board.updateMatrix(); flyM.copy(board.matrix).invert(); flyP.applyMatrix4(flyM);
  rider.position.copy(flyP);
  flyQ2.setFromAxisAngle(f.ax, t * 5); rider.quaternion.copy(board.quaternion).invert().multiply(f.Q0).multiply(flyQ2);
  stance(o, 0.15, 0, t);
  const w = Math.sin(t * 14), w2 = Math.cos(t * 13);
  o.aF.set(o.ch.x + 0.25, o.ch.y + 0.5 + 0.12 * w, o.ch.z + 0.4); o.aB.set(o.ch.x - 0.3, o.ch.y + 0.45 + 0.12 * w2, o.ch.z - 0.35);
  o.eF.set(o.ch.x + 0.2, o.ch.y + 0.18, o.ch.z + 0.3); o.eB.set(o.ch.x - 0.25, o.ch.y + 0.15, o.ch.z - 0.28);
  o.fF.y += 0.25 + 0.15 * w2; o.fB.y += 0.1 + 0.15 * w; o.kF.y += 0.15; o.kF.z += 0.15;
  return o;
}
// el surfista vuelve a su sitio sobre la tabla
export function endFly(rider) { rider.position.set(0, 0, 0); rider.quaternion.identity(); }
