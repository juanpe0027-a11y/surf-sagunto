// Cuerpo humano realista: modelo con esqueleto (modelos/cuerpo.glb) que se mueve con nuestras posturas.
import { V3 } from '../nucleo/util.js';
import { avisar } from '../nucleo/eventos.js';
import { G } from '../nucleo/estado.js';
import { boardRoot } from './tabla.js';

// El modelo (cuerpo.glb) tiene huesos de verdad; cada fotograma se ponen en reposo y se orientan hacia las
// articulaciones que calculan stance/prone/bodyRide/jetRide. La cabeza es la nuestra (foto, pelo, gafas, gorra).
const BODY_URL = 'modelos/cuerpo.glb';
export const HUMAN = { tpl: null, local: null, legLen: 0.888 };
const H_BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
function boneCat(n) {
  n = n.replace(/^mixamorig:?/, '');
  if (/Hand|Thumb|Index|Middle|Ring|Pinky|Head|Neck|Eye/.test(n)) return 0;   // piel
  if (/ForeArm/.test(n)) return 1;                                               // antebrazo
  if (/Arm/.test(n)) return 2;                                                   // brazo
  if (/Hips|UpLeg/.test(n)) return 4;                                            // bañador / muslos
  if (/Leg/.test(n)) return 5;                                                   // espinillas
  if (/Foot|Toe/.test(n)) return 6;                                              // pies
  return 3;                                                                      // tronco
}
function humanColors(c) {
  const hx = x => new THREE.Color(x);
  const suit = c.suit, skin = c.skin;
  return [hx(skin), hx(c.forearm || (c.longSuit && !c.sleeveless ? suit : skin)), hx(c.upperArm || suit), hx(suit), hx(c.shorts || suit),
    hx(c.longSuit ? (c.legs || suit) : skin), hx(c.bodyboard ? 0x1f2a22 : skin)];
}
export function makeHuman(c) {
  if (!HUMAN.tpl) return null;
  const sc = THREE.SkeletonUtils.clone(HUMAN.tpl);
  const root = new THREE.Group(); root.add(sc);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05 });
  const meshes = [];
  sc.traverse(o => { if (o.isSkinnedMesh) { o.geometry = o.geometry.clone(); o.material = mat; o.frustumCulled = false; o.castShadow = false; meshes.push(o); } });
  const b = {};
  for (const n of H_BONES) b[n] = sc.getObjectByName('mixamorig' + n);
  const h = { root, sc, b, meshes, mat, rest: {} };
  for (const n of H_BONES) h.rest[n] = b[n].quaternion.clone();
  b.Head.scale.setScalar(0.001);                 // la cabeza la ponemos nosotros (con la foto)
  colorHuman(h, c);
  return h;
}
// lee la componente k del vértice i (r128 no trae getComponent; los pesos pueden venir normalizados en bytes)
const ATTR_GET = ['getX', 'getY', 'getZ', 'getW'];
function attrComp(at, i, k) {
  let v = at[ATTR_GET[k]](i);
  if (at.normalized) { const arr = at.array; v /= arr instanceof Uint8Array ? 255 : arr instanceof Uint16Array ? 65535 : 1; }
  return v;
}
export function colorHuman(h, c) {
  if (!h) return;
  const cols = humanColors(c);
  for (const m of h.meshes) {
    const g = m.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = si.count;
    if (!m.userData.cat) m.userData.cat = m.skeleton.bones.map(bn => boneCat(bn.name));
    const cat = m.userData.cat;
    let col = g.attributes.color;
    if (!col) { col = new THREE.BufferAttribute(new Float32Array(n * 3), 3); g.setAttribute('color', col); }
    const a = col.array;
    for (let i = 0; i < n; i++) {
      let r = 0, gg = 0, bb = 0;
      for (let k = 0; k < 4; k++) {
        const w = attrComp(sw, i, k); if (!w) continue;
        const cc = cols[cat[attrComp(si, i, k)]] || cols[3];
        r += cc.r * w; gg += cc.g * w; bb += cc.b * w;
      }
      a[i * 3] = r; a[i * 3 + 1] = gg; a[i * 3 + 2] = bb;
    }
    col.needsUpdate = true;
  }
  h.mat.roughness = c.longSuit || /suit/.test(c.tag || '') ? 0.42 : 0.55;
}
// ---- orientar huesos hacia las articulaciones de la postura ----
// Todo se calcula en el espacio del propio cuerpo (no en el del mundo, que va espejado en X).
const hv = { a: V3(0, 0, 0), b: V3(0, 0, 0), c: V3(0, 0, 0), d: V3(0, 0, 0), t: V3(0, 0, 0), X: V3(0, 0, 0), Y: V3(0, 0, 0), Z: V3(0, 0, 0), m: new THREE.Matrix4() };
const hq = { a: new THREE.Quaternion(), b: new THREE.Quaternion(), c: new THREE.Quaternion(), r: new THREE.Quaternion() };
const hM = { inv: new THREE.Matrix4(), t: new THREE.Matrix4(), s: V3(0, 0, 0) };
function relPos(obj, out) { return out.setFromMatrixPosition(obj.matrixWorld).applyMatrix4(hM.inv); }
function relQuat(obj, out) { hM.t.multiplyMatrices(hM.inv, obj.matrixWorld); hM.t.decompose(hv.d, out, hM.s); return out; }
function setBoneRelQuat(bone, q) { relQuat(bone.parent, hq.c); bone.quaternion.copy(hq.c.invert()).multiply(q); bone.updateMatrixWorld(true); }
// gira el hueso para que su hijo apunte al punto T
function aimBone(bone, child, T) {
  relPos(bone, hv.a); relPos(child, hv.b);
  hv.b.sub(hv.a); hv.t.copy(T).sub(hv.a);
  if (hv.b.lengthSq() < 1e-10 || hv.t.lengthSq() < 1e-10) return;
  hq.a.setFromUnitVectors(hv.b.normalize(), hv.t.normalize());
  relQuat(bone, hq.b);
  setBoneRelQuat(bone, hq.a.multiply(hq.b));
}
const hw = {}; for (const k of ['hB', 'hF', 'kB', 'kF', 'fB', 'fF', 'ch', 'hd', 'sB', 'sF', 'eB', 'eF', 'aB', 'aF', 'hip', 'sh', 'toeL', 'toeR', 'fw']) hw[k] = V3(0, 0, 0);
export function poseHuman(h, o, par) {
  if (!h) return;
  const b = h.b;
  par.updateMatrix();
  // articulaciones en el espacio del cuerpo (el cuerpo cuelga del mismo padre que el surfista)
  for (const k of ['hB', 'hF', 'kB', 'kF', 'fB', 'fF', 'ch', 'hd', 'sB', 'sF', 'eB', 'eF', 'aB', 'aF']) hw[k].copy(o[k]).applyMatrix4(par.matrix);
  hw.hip.addVectors(hw.hB, hw.hF).multiplyScalar(0.5);
  hw.sh.addVectors(hw.sB, hw.sF).multiplyScalar(0.5);
  hw.fw.copy(o.fw || V3(0, 0, 1)).add(o.hB).applyMatrix4(par.matrix).sub(hw.hB).normalize();
  // base del cuerpo: arriba = cadera → hombros; delante = hacia donde mira el pecho; X = su izquierda
  hv.Y.subVectors(hw.sh, hw.hip).normalize();
  hv.Z.copy(hw.fw).addScaledVector(hv.Y, -hw.fw.dot(hv.Y)).normalize();
  hv.X.crossVectors(hv.Y, hv.Z).normalize();
  const fLeft = hv.a.subVectors(hw.hF, hw.hB).dot(hv.X) >= 0;
  const L = fLeft ? 'F' : 'B', R = fLeft ? 'B' : 'F';
  // todo en reposo
  for (const n of H_BONES) b[n].quaternion.copy(h.rest[n]);
  h.root.updateMatrixWorld(true);
  hM.inv.copy(h.root.matrixWorld).invert();
  // cadera: posición y orientación (en reposo el modelo mira +Z con la izquierda en +X)
  hM.t.multiplyMatrices(hM.inv, b.Hips.parent.matrixWorld).invert();
  b.Hips.position.copy(hw.hip).applyMatrix4(hM.t);
  b.Hips.updateMatrixWorld(true);
  relQuat(b.Hips, hq.r);
  hv.m.makeBasis(hv.X, hv.Y, hv.Z); hq.a.setFromRotationMatrix(hv.m);
  setBoneRelQuat(b.Hips, hq.a.multiply(hq.r));
  // columna hacia los hombros y giro para alinear la línea de hombros
  aimBone(b.Spine, b.Neck, hw.sh);
  relPos(b.LeftArm, hv.a); relPos(b.RightArm, hv.b);
  const sp = hv.c.subVectors(hw.sh, hw.hip).normalize();
  const cur = hv.a.sub(hv.b); cur.addScaledVector(sp, -cur.dot(sp)).normalize();
  const tgt = hv.t.subVectors(hw['s' + L], hw['s' + R]); tgt.addScaledVector(sp, -tgt.dot(sp)).normalize();
  if (cur.lengthSq() > 0.5 && tgt.lengthSq() > 0.5) { hq.a.setFromUnitVectors(cur, tgt); relQuat(b.Spine1, hq.b); setBoneRelQuat(b.Spine1, hq.a.multiply(hq.b)); }
  aimBone(b.Neck, b.Head, hw.hd);
  // brazos
  aimBone(b.LeftArm, b.LeftForeArm, hw['e' + L]); aimBone(b.LeftForeArm, b.LeftHand, hw['a' + L]);
  aimBone(b.RightArm, b.RightForeArm, hw['e' + R]); aimBone(b.RightForeArm, b.RightHand, hw['a' + R]);
  // piernas y pies (puntas hacia donde mira el cuerpo)
  aimBone(b.LeftUpLeg, b.LeftLeg, hw['k' + L]); aimBone(b.LeftLeg, b.LeftFoot, hw['f' + L]);
  aimBone(b.RightUpLeg, b.RightLeg, hw['k' + R]); aimBone(b.RightLeg, b.RightFoot, hw['f' + R]);
  hw.toeL.copy(hw['f' + L]).addScaledVector(hv.Z, 0.16); hw.toeR.copy(hw['f' + R]).addScaledVector(hv.Z, 0.16);
  aimBone(b.LeftFoot, b.LeftToeBase, hw.toeL); aimBone(b.RightFoot, b.RightToeBase, hw.toeR);
}
export function loadHuman() {
  if (!THREE.GLTFLoader || !THREE.SkeletonUtils) return;
  const onBody = g => {
    const sc = g.scene; sc.updateMatrixWorld(true);
    const pa = V3(0, 0, 0), pb = V3(0, 0, 0), pc = V3(0, 0, 0);
    sc.getObjectByName('mixamorigLeftUpLeg').getWorldPosition(pa); sc.getObjectByName('mixamorigLeftLeg').getWorldPosition(pb); sc.getObjectByName('mixamorigLeftFoot').getWorldPosition(pc);
    HUMAN.legLen = pa.distanceTo(pb) + pb.distanceTo(pc);
    sc.scale.setScalar(0.96 / HUMAN.legLen);      // misma longitud de pierna que nuestras posturas
    HUMAN.tpl = sc;
    HUMAN.local = makeHuman(G.CH);
    boardRoot.add(HUMAN.local.root);
    avisar('cuerpo-listo');   // el muñeco esconde sus piezas sencillas y se rehacen los demás surfistas
  };
  new THREE.GLTFLoader().load(BODY_URL, onBody);   // si no carga, se queda el muñeco sencillo
}
