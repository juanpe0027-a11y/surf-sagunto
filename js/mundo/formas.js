import { V3 } from '../nucleo/util.js';

export const cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
export const sph = new THREE.SphereGeometry(1, 14, 10);
export const UP = V3(0, 1, 0), tv = V3(0, 0, 0);
export function setLimb(m, a, b) {
  tv.subVectors(b, a); const len = tv.length() || 0.001;
  m.position.copy(a).addScaledVector(tv, 0.5);
  m.scale.set(m.userData.r, len, m.userData.r * 0.92);
  m.quaternion.setFromUnitVectors(UP, tv.divideScalar(len));
}

// orientación de la tabla sobre la cara de la ola
export const vF = V3(0, 0, 0), vN = V3(0, 0, 0), vZ = V3(0, 0, 0), vT = V3(0, 0, 0), mB = new THREE.Matrix4();
export function basisQuat(F, Nn, out) {
  vN.copy(Nn).addScaledVector(F, -F.dot(Nn)).normalize();
  vZ.crossVectors(F, vN).normalize();
  mB.makeBasis(F, vN, vZ); out.setFromRotationMatrix(mB); return out;
}
