// Copias del muñeco para los demás jugadores (cada una con sus propios materiales y texturas).
import { V3 } from '../nucleo/util.js';
import { G } from '../nucleo/estado.js';
import { setLimb, UP } from '../mundo/formas.js';
import { world } from '../mundo/motor.js';
import { HUMAN, makeHuman, poseHuman } from './cuerpo.js';
import { footB, footF, hair, headG, J, L, rider, SEGL, strandG, strands, torsoCv, torsoTex } from './muneco.js';
import { applyChar } from './personaje.js';
import { mkPose, placePaddle } from './posturas.js';
import { boardRoot } from './raiz.js';
import { sombra } from './sombra.js';
import { boardMesh, deckCv, deckTex, finCv, finTex } from './tabla.js';
import { paddle } from './vehiculos.js';

function objMap(a, b, m) { m.set(a, b); for (let i = 0; i < a.children.length; i++) objMap(a.children[i], b.children[i], m); return m; }
function texFromCanvas(src) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
export function buildRig(c) {
  const keep = G.CH, keepVis = boardRoot.visible, keepPos = boardRoot.position.clone(), keepQ = boardRoot.quaternion.clone();
  applyChar(c); boardRoot.visible = true;
  const myBody = HUMAN.local && HUMAN.local.root; if (myBody) boardRoot.remove(myBody);   // el cuerpo con esqueleto se clona aparte
  const r = boardRoot.clone(true);
  const m = objMap(boardRoot, r, new Map());
  if (myBody) boardRoot.add(myBody);
  const texMaker = new Map([[deckTex, () => texFromCanvas(deckCv)], [torsoTex, () => texFromCanvas(torsoCv)]]);
  finTex.forEach((t, i) => texMaker.set(t, () => texFromCanvas(finCv[i])));
  const matMap = new Map(), texDone = new Map();
  r.traverse(o => {
    if (!o.isMesh) return;
    const om = o.material;
    if (!matMap.has(om)) {
      const nm = om.clone();
      if (om.map && texMaker.has(om.map)) { if (!texDone.has(om.map)) texDone.set(om.map, texMaker.get(om.map)()); nm.map = texDone.get(om.map); }
      matMap.set(om, nm);
    }
    o.material = matMap.get(om);
  });
  applyChar(keep); boardRoot.visible = keepVis; boardRoot.position.copy(keepPos); boardRoot.quaternion.copy(keepQ);
  const g = x => m.get(x);
  const rig = { root: r, L: {}, J: {}, hair: g(hair), headG: g(headG), footB: g(footB), footF: g(footF), strandG: g(strandG),
    strands: strands.map(s => s.map(g)), pony: g(L.pony), pose: mkPose(), faceYaw: new THREE.Quaternion(), mats: [...matMap.values()], texs: [...texDone.values()] };
  for (const k in L) rig.L[k] = g(L[k]);
  for (const k in J) rig.J[k] = g(J[k]);
  rig.rider = g(rider); rig.sombra = g(sombra); rig.paddle = g(paddle); rig.board = g(boardMesh);
  rig.human = makeHuman(c); if (rig.human) r.add(rig.human.root);
  r.visible = false; world.add(r);
  return rig;
}
export function disposeRig(rig) { world.remove(rig.root); rig.mats.forEach(m => m.dispose()); rig.texs.forEach(t => t.dispose());
  if (rig.human) { rig.human.meshes.forEach(m => m.geometry.dispose()); rig.human.mat.dispose(); } }
const rHip = V3(0, 0, 0), rTv = V3(0, 0, 0), rA = V3(0, 0, 0), rB = V3(0, 0, 0), rD = V3(0, 0, 0);
export function applyPoseRig(R, o, wind, turn, t) {
  const Lr = R.L, Jr = R.J;
  rHip.addVectors(o.hB, o.hF).multiplyScalar(0.5);
  setLimb(Lr.thB, o.hB, o.kB); setLimb(Lr.thF, o.hF, o.kF);
  setLimb(Lr.shB, o.kB, o.fB); setLimb(Lr.shF, o.kF, o.fF);
  setLimb(Lr.torso, rHip, o.ch); setLimb(Lr.neck, o.ch, o.hd);
  setLimb(Lr.hips, o.hB, o.hF); setLimb(Lr.shoulders, o.sB, o.sF);
  setLimb(Lr.uaB, o.sB, o.eB); setLimb(Lr.uaF, o.sF, o.eF);
  setLimb(Lr.faB, o.eB, o.aB); setLimb(Lr.faF, o.eF, o.aF);
  Jr.kB.position.copy(o.kB); Jr.kF.position.copy(o.kF); Jr.eB.position.copy(o.eB); Jr.eF.position.copy(o.eF);
  Jr.hB.position.copy(o.aB); Jr.hF.position.copy(o.aF); Jr.head.position.copy(o.hd); Jr.chest.position.copy(o.ch);
  R.hair.position.copy(o.hd);
  rTv.subVectors(o.hd, o.ch).normalize(); R.hair.quaternion.setFromUnitVectors(UP, rTv);
  R.faceYaw.setFromAxisAngle(UP, turn);
  R.headG.position.copy(o.hd); R.headG.quaternion.copy(R.hair.quaternion).multiply(R.faceYaw);
  R.footB.position.copy(o.fB); R.footF.position.copy(o.fF);
  if (R.strandG.visible) {
    for (let i = 0; i < R.strands.length; i++) {
      const a = (i / (R.strands.length - 1) - 0.5) * 2.4;
      rA.set(o.hd.x - 0.05 - Math.cos(a) * 0.04, o.hd.y + 0.04 - Math.abs(a) * 0.035, o.hd.z - 0.03 + Math.sin(a) * 0.1);
      for (let k = 0; k < R.strands[i].length; k++) {
        const flap = Math.sin(t * 9 + k * 0.9 + i * 1.7) * 0.4 * wind;
        rD.set(-(0.2 + 1.1 * wind), -(1.0 - 0.8 * wind) + Math.cos(t * 7 + k + i) * 0.18 * wind, Math.sin(a) * 0.28 + flap).normalize();
        rB.copy(rA).addScaledVector(rD, SEGL); setLimb(R.strands[i][k], rA, rB); rA.copy(rB);
      }
    }
  }
  if (R.pony.visible) { rA.set(o.hd.x - 0.03, o.hd.y + 0.04, o.hd.z - 0.1); rB.set(o.hd.x - 0.07, o.hd.y - 0.2, o.hd.z - 0.27); setLimb(R.pony, rA, rB); }
  if (R.paddle) placePaddle(R.paddle, o);
  if (R.human) poseHuman(R.human, o, R.rider);
}
