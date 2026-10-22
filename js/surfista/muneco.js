// El muñeco del surfista: cabeza con su cara, pelo, gafas, gorra, barba, pies… y applyPose, que lo coloca en una postura.
// El cuerpo con esqueleto (cuerpo.js) sustituye a las piezas sencillas en cuanto carga.
import { TAU, V3 } from '../nucleo/util.js';
import { escuchar } from '../nucleo/eventos.js';
import { G } from '../nucleo/estado.js';
import { rideC, seatedC } from '../datos/personajes.js';
import { cyl, setLimb, sph, tv, UP } from '../mundo/formas.js';
import { HUMAN, poseHuman } from './cuerpo.js';
import { placePaddle } from './posturas.js';
import { boardRoot } from './raiz.js';
import { paddle } from './vehiculos.js';

export const matSuit = new THREE.MeshStandardMaterial({ color: 0x18222e, roughness: 0.55 });
export const matShorts = new THREE.MeshStandardMaterial({ color: 0xe8743b, roughness: 0.7 });
export const matSkin = new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: 0.65 });
export const matHair = new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.9 });
export const matShin = new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: 0.65 });     // piel o neopreno largo
export const matForearm = new THREE.MeshStandardMaterial({ color: 0xc58a62, roughness: 0.65 });
export const matUpperArm = new THREE.MeshStandardMaterial({ color: 0x18222e, roughness: 0.55 });  // paneles de hombro (Bruno: azul)
// pecho del neopreno con su dibujo (Bruno: negro con raya verde fosforito)
export const torsoCv = document.createElement('canvas'); torsoCv.width = torsoCv.height = 64;
export const torsoTex = new THREE.CanvasTexture(torsoCv);
// neopreno con rayas blancas (Litos): textura con una franja a lo largo de cada pieza
const stripeCv = document.createElement('canvas'); stripeCv.width = stripeCv.height = 64;
{ const x = stripeCv.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#121314'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#f2f2ee'; x.fillRect(38, 0, 5, 64); x.fillRect(46, 0, 2, 64); }
const stripeTex = new THREE.CanvasTexture(stripeCv);
export function setSuitMap(mat, on, color) {
  const want = on ? stripeTex : null;
  if (mat.map !== want) { mat.map = want; mat.needsUpdate = true; }
  mat.color.setHex(on ? 0xffffff : color);
}
// casco blanco de kayak
export const matHelmet = new THREE.MeshStandardMaterial({ color: 0xf1f1ef, roughness: 0.35 });
export const helmet = new THREE.Group(); helmet.visible = false;
{
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.142, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), matHelmet); dome.position.y = 0.012; helmet.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.146, 0.146, 0.035, 22, 1, true), matHelmet); brim.position.y = 0.0; helmet.add(brim);
  for (const z of [-0.06, 0, 0.06]) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.018), new THREE.MeshStandardMaterial({ color: 0x222326 })); v.position.set(-0.02, 0.135, z); helmet.add(v); }
}
export const rider = new THREE.Group(); boardRoot.add(rider);
rider.add(paddle);
function limb(mat, r) { const m = new THREE.Mesh(cyl, mat); m.userData.r = r; rider.add(m); return m; }
function ball(mat, r) { const m = new THREE.Mesh(sph, mat); m.scale.setScalar(r); rider.add(m); return m; }
export const L = {
  thB: limb(matShorts, 0.085), thF: limb(matShorts, 0.085), shB: limb(matShin, 0.058), shF: limb(matShin, 0.058), pony: limb(matHair, 0.05),
  torso: limb(matSuit, 0.15), neck: limb(matSkin, 0.05), hips: limb(matShorts, 0.11), shoulders: limb(matSuit, 0.075),
  uaB: limb(matUpperArm, 0.055), uaF: limb(matUpperArm, 0.055), faB: limb(matForearm, 0.045), faF: limb(matForearm, 0.045)
};
export const J = {
  kB: ball(matShorts, 0.075), kF: ball(matShorts, 0.075), eB: ball(matSuit, 0.05), eF: ball(matSuit, 0.05),
  hB: ball(matSkin, 0.05), hF: ball(matSkin, 0.05), head: ball(matSkin, 0.115), chest: ball(matSuit, 0.16)
};
export const hair = new THREE.Mesh(new THREE.SphereGeometry(0.125, 18, 8, 0, TAU, 0, Math.PI * 0.42), matHair); rider.add(hair);
// complementos de la cabeza (gafas de sol, barba, pelo despeinado); la cara mira hacia donde va
export const headG = new THREE.Group(); rider.add(headG);
const faceYaw = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), 0.9);
   // 0 = mira a la cámara, 0.9 = mira hacia donde va
const matGlass = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.15, metalness: 0.4 });
export const glasses = new THREE.Group(); headG.add(glasses);
for (const sx of [-0.047, 0.047]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.014), matGlass); l.position.set(sx, 0.02, 0.112); glasses.add(l); }
{ const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.012), matGlass); br.position.set(0, 0.03, 0.114); glasses.add(br);
  for (const sx of [-0.098, 0.098]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.01, 0.11), matGlass); t.position.set(sx, 0.025, 0.06); glasses.add(t); } }
// gorra plana con su logo
const matCap = new THREE.MeshStandardMaterial({ color: 0x1b2440, roughness: 0.8 });
export const cap = new THREE.Group(); headG.add(cap); cap.visible = false;
headG.add(helmet);
{ const dome = new THREE.Mesh(new THREE.SphereGeometry(0.134, 20, 8, 0, TAU, 0, Math.PI * 0.46), matCap); dome.position.set(0, 0.022, 0); cap.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 20, 1, false, -Math.PI / 2, Math.PI), matCap);
  brim.scale.set(1.05, 1, 1.25); brim.position.set(0, 0.07, 0.085); brim.rotation.x = 0.08; cap.add(brim);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }));
  logo.position.set(0, 0.105, 0.098); logo.rotation.x = -0.75; cap.add(logo); }
export const matBeard = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 });
export const beard = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10, Math.PI / 2 - 1.15, 2.3, Math.PI * 0.45, Math.PI * 0.42), matBeard);
beard.scale.set(0.108, 0.11, 0.108); beard.position.set(0, 0.005, 0.012); headG.add(beard);
// cara real: la foto de cada surfista pegada en la parte frontal de la cabeza
export const faceMat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
export const faceMesh = new THREE.Mesh(new THREE.SphereGeometry(0.119, 28, 18, Math.PI / 2 - 1.0, 2.0, Math.PI * 0.3, Math.PI * 0.56), faceMat);
faceMesh.visible = false; headG.add(faceMesh);
export const faceTex = {};
// melena de surfero: pelo que cae por detrás y por los lados hasta las orejas
export const mane = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 10, Math.PI * 1.5 - 1.75, 3.5, Math.PI * 0.15, Math.PI * 0.55), matHair);
mane.scale.set(1.04, 1.25, 1.05); mane.position.set(0, -0.005, -0.005); headG.add(mane);
// melena larga (Froskin): mechones que cuelgan quieta y ondean hacia atrás con el viento al surfear
export const strandG = new THREE.Group(); rider.add(strandG); strandG.visible = false;
export const NSTR = 9, NSEG = 6, SEGL = 0.075, strands = [];
for (let i = 0; i < NSTR; i++) {
  const segs = [];
  for (let k = 0; k < NSEG; k++) { const m = new THREE.Mesh(cyl, matHair); m.userData.r = 0.034 * (1 - k / NSEG * 0.55); strandG.add(m); segs.push(m); }
  strands.push(segs);
}

const sA = V3(0, 0, 0), sB = V3(0, 0, 0), sD = V3(0, 0, 0);
function updateStrands(o) {
  if (!strandG.visible) return;
  const t = performance.now() / 1000;
  for (let i = 0; i < NSTR; i++) {
    const a = (i / (NSTR - 1) - 0.5) * 2.4;          // reparto alrededor de la nuca
    sA.set(o.hd.x - 0.05 - Math.cos(a) * 0.04, o.hd.y + 0.04 - Math.abs(a) * 0.035, o.hd.z - 0.03 + Math.sin(a) * 0.1);
    for (let k = 0; k < NSEG; k++) {
      const flap = Math.sin(t * 9 + k * 0.9 + i * 1.7) * 0.4 * G.windAmt;
      sD.set(-(0.2 + 1.1 * G.windAmt), -(1.0 - 0.8 * G.windAmt) + Math.cos(t * 7 + k + i) * 0.18 * G.windAmt, Math.sin(a) * 0.28 + flap).normalize();
      sB.copy(sA).addScaledVector(sD, SEGL);
      setLimb(strands[i][k], sA, sB); sA.copy(sB);
    }
  }
}
export const spikes = new THREE.Group(); headG.add(spikes);
for (let i = 0; i < 9; i++) {
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.1, 5), matHair);
  const a = i / 9 * TAU, r = 0.05 + (i % 3) * 0.02;
  sp.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r + 0.02);
  sp.rotation.set(Math.sin(a) * 0.5 + 0.3, 0, -Math.cos(a) * 0.5);
  spikes.add(sp);
}
const footGeo = new THREE.BoxGeometry(0.11, 0.06, 0.25);
export const footB = new THREE.Mesh(footGeo, matSkin), footF = new THREE.Mesh(footGeo, matSkin); rider.add(footB, footF);
export const matFlipper = new THREE.MeshStandardMaterial({ color: 0x1f2a22, roughness: 0.5 });
const hipC = V3(0, 0, 0);
// partes del muñeco antiguo que sustituye el cuerpo nuevo
function useHumanBody(on) {
  for (const k in L) if (k !== 'pony') L[k].visible = !on;
  for (const k in J) if (k !== 'head') J[k].visible = !on;
}
escuchar('cuerpo-listo', () => useHumanBody(true));

export function applyPose(o) {
  hipC.addVectors(o.hB, o.hF).multiplyScalar(0.5);
  setLimb(L.thB, o.hB, o.kB); setLimb(L.thF, o.hF, o.kF);
  setLimb(L.shB, o.kB, o.fB); setLimb(L.shF, o.kF, o.fF);
  setLimb(L.torso, hipC, o.ch); setLimb(L.neck, o.ch, o.hd);
  setLimb(L.hips, o.hB, o.hF); setLimb(L.shoulders, o.sB, o.sF);
  setLimb(L.uaB, o.sB, o.eB); setLimb(L.uaF, o.sF, o.eF);
  setLimb(L.faB, o.eB, o.aB); setLimb(L.faF, o.eF, o.aF);
  J.kB.position.copy(o.kB); J.kF.position.copy(o.kF); J.eB.position.copy(o.eB); J.eF.position.copy(o.eF);
  J.hB.position.copy(o.aB); J.hF.position.copy(o.aF); J.head.position.copy(o.hd); J.chest.position.copy(o.ch);
  hair.position.copy(o.hd);
  tv.subVectors(o.hd, o.ch).normalize(); hair.quaternion.setFromUnitVectors(UP, tv);
  faceYaw.setFromAxisAngle(UP, seatedC(rideC()) && G.faceTurn > 0.5 ? 1.5 * Math.sign(rider.scale.z) : G.faceTurn);
  placePaddle(paddle, o);
  headG.position.copy(o.hd); headG.quaternion.copy(hair.quaternion).multiply(faceYaw);
  footB.position.copy(o.fB); footF.position.copy(o.fF);
  updateStrands(o);
  if (L.pony.visible) { ponyA.set(o.hd.x - 0.03, o.hd.y + 0.04, o.hd.z - 0.1); ponyB.set(o.hd.x - 0.07, o.hd.y - 0.2, o.hd.z - 0.27); setLimb(L.pony, ponyA, ponyB); }
  if (HUMAN.local) poseHuman(HUMAN.local, o, rider);
}
const ponyA = V3(0, 0, 0), ponyB = V3(0, 0, 0);
