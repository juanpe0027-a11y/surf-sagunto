import { rnd, TAU, V3 } from '../nucleo/util.js';
import { G } from '../nucleo/estado.js';
import { camLook, camPos, world } from './motor.js';
import { splash } from './particulas.js';

// ---------- delfines: de vez en cuando salta un grupo en el mar ----------
const dolphins = [], dolMat = new THREE.MeshStandardMaterial({ color: 0x5b6773, roughness: 0.35, metalness: 0.1 });
const dolBelly = new THREE.MeshStandardMaterial({ color: 0xc9cfd3, roughness: 0.4 });
function makeDolphin() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), dolMat); body.scale.set(1.15, 0.3, 0.3); g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), dolBelly); belly.scale.set(0.95, 0.22, 0.24); belly.position.set(0.05, -0.08, 0); g.add(belly);
  const beak = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.35, 8), dolMat); beak.rotation.z = Math.PI / 2; beak.position.set(1.22, -0.04, 0); g.add(beak);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), dolMat); fin.scale.z = 0.25; fin.rotation.z = -0.55; fin.position.set(-0.05, 0.38, 0); g.add(fin);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 0.5, 8), dolMat); ped.rotation.z = Math.PI / 2; ped.position.set(-1.25, 0, 0); g.add(ped);
  const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.85), dolMat); fluke.position.set(-1.52, 0, 0); g.add(fluke);
  for (const sz of [-1, 1]) { const fl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.22), dolMat); fl.position.set(0.45, -0.18, sz * 0.3); fl.rotation.set(sz * 0.4, 0, -0.3); g.add(fl); }
  g.visible = false; world.add(g);
  return { g, t: -1, x: 0, z: 0, dx: 1, dz: 0, delay: 0, vy: 7, sp: 8, splashed: false };
}
for (let i = 0; i < 3; i++) dolphins.push(makeDolphin());
let dolTimer = 6 + Math.random() * 6;
const dFwd = V3(0, 0, 0);
export function spawnDolphins() {
  // delante de la cámara, en el agua (nunca en tierra)
  dFwd.subVectors(camLook, camPos); dFwd.y = 0; if (dFwd.lengthSq() < 1e-4) dFwd.set(0, 0, -1); dFwd.normalize();
  let bx, bz;
  if (G.state === 'title') {
    // en el menú: siempre en el lado del mar, delante de la cámara
    if (dFwd.z > 0.2) { bx = camPos.x + rnd(-30, 30); bz = camPos.z - rnd(22, 45); }
    else { const dist = rnd(30, 60), side = rnd(-15, 15); bx = camPos.x + dFwd.x * dist - dFwd.z * side; bz = Math.min(40, camPos.z + dFwd.z * dist + dFwd.x * side); }
  } else {
    // surfeando: por delante de la ola, un poco más adelante del surfista (se ven a la izquierda de la pantalla)
    bx = camPos.x + rnd(7, 15); bz = camPos.z - rnd(11, 16);
  }
  const ang = G.state === 'title' ? rnd(0, TAU) : rnd(-0.35, 0.35), n = 2 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < 3; i++) {
    const d = dolphins[i];
    if (i >= n) { d.t = -1; d.g.visible = false; continue; }
    d.x = bx + rnd(-3, 3) - Math.cos(ang) * i * 2.2; d.z = bz + rnd(-3, 3) - Math.sin(ang) * i * 2.2;
    d.dx = Math.cos(ang); d.dz = Math.sin(ang); d.delay = i * 0.28 + rnd(0, 0.1); d.t = 0; d.vy = rnd(6.5, 8); d.sp = rnd(7, 9.5); d.splashed = false;
  }
}
export function updateDolphins(dt) {
  dolTimer -= dt;
  if (dolTimer <= 0) { spawnDolphins(); dolTimer = rnd(12, 24); }
  for (const d of dolphins) {
    if (d.t < 0) continue;
    if (d.delay > 0) { d.delay -= dt; continue; }
    d.t += dt;
    const air = 2 * d.vy / 9.8, t = d.t;
    if (t > air + 0.1) { d.t = -1; d.g.visible = false; splash(V3(d.x + d.dx * d.sp * air, 0.1, d.z + d.dz * d.sp * air), 24, 0.6); continue; }
    if (!d.splashed) { d.splashed = true; splash(V3(d.x, 0.1, d.z), 18, 0.5); }
    const y = -0.4 + d.vy * t - 4.9 * t * t, vy = d.vy - 9.8 * t;
    d.g.visible = true;
    d.g.position.set(d.x + d.dx * d.sp * t, y, d.z + d.dz * d.sp * t);
    d.g.rotation.set(0, -Math.atan2(d.dz, d.dx), Math.atan2(vy, d.sp));
  }
}
