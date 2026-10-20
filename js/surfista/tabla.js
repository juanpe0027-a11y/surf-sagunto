import { DECKS, FINS } from '../datos/disenos.js';
import { world } from '../mundo/motor.js';
import { helmet, matHelmet } from './muneco.js';
import { jetG, kayakG, paddle, zodiacG } from './vehiculos.js';

// ---------- el surfista ----------
export const boardRoot = new THREE.Group(); world.add(boardRoot);
export let boardMesh = null; const finMeshes = [];
const matBoard = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.35 });
const matStripe = new THREE.MeshStandardMaterial({ color: 0xff5a4e, roughness: 0.4 });

// ---------- diseños pintados de tablas y quillas ----------
export const deckCv = document.createElement('canvas'); deckCv.width = 1024; deckCv.height = 300;
export const deckTex = new THREE.CanvasTexture(deckCv); deckTex.anisotropy = 4;
matBoard.map = deckTex; matBoard.color.set(0xffffff);
export const finCv = [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = c.height = 128; return c; });
export const finTex = finCv.map(c => new THREE.CanvasTexture(c));
const matFins = finTex.map(t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, side: THREE.DoubleSide }));
export function paintBoard(c) {
  const x = deckCv.getContext('2d');
  (DECKS[c.deck] || DECKS.plain)(x, deckCv.width, deckCv.height, c);
  deckTex.needsUpdate = true;
  (c.fins || []).forEach((f, i) => { const fx = finCv[i].getContext('2d'); (FINS[f] || FINS.plain)(fx, c); finTex[i].needsUpdate = true; });
}
{
  const s = new THREE.Shape();
  s.moveTo(-0.97, 0);
  s.bezierCurveTo(-0.97, 0.15, -0.7, 0.26, -0.2, 0.265);
  s.bezierCurveTo(0.4, 0.265, 0.86, 0.15, 0.99, 0);
  s.bezierCurveTo(0.86, -0.15, 0.4, -0.265, -0.2, -0.265);
  s.bezierCurveTo(-0.7, -0.26, -0.97, -0.15, -0.97, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.022, bevelSegments: 3, curveSegments: 20 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0.018, 0);
  // UV de la tabla: u a lo largo (cola → punta), v a lo ancho; así se pinta el diseño de cada surfista
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 0.99) / 1.98, (pos.getZ(i) + 0.29) / 0.58);
  uv.needsUpdate = true;
  boardMesh = new THREE.Mesh(g, matBoard); boardRoot.add(boardMesh);
  // tres quillas (thruster), cada una con su dibujo
  const fs = new THREE.Shape();
  fs.moveTo(0, 0); fs.quadraticCurveTo(0.015, 0.075, -0.065, 0.125); fs.quadraticCurveTo(0.045, 0.095, 0.1, 0); fs.lineTo(0, 0);
  const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.008, bevelEnabled: false, curveSegments: 10 });
  const fp = fg.attributes.position, fu = fg.attributes.uv;
  for (let i = 0; i < fp.count; i++) fu.setXY(i, (fp.getX(i) + 0.065) / 0.165, fp.getY(i) / 0.125);
  fg.translate(0, 0, -0.004); fg.rotateX(Math.PI);
  [[-0.6, 0.165, 0.08], [-0.6, -0.165, -0.08], [-0.86, 0, 0]].forEach(([x, z, toe], i) => {
    const m = new THREE.Mesh(fg, matFins[i]); m.position.set(x, 0.005, z); m.rotation.y = toe; m.userData.p = [x, z]; boardRoot.add(m); finMeshes.push(m);
  });
}
// longboard: 9 pies (2,75 m), algo más ancha y con una sola quilla grande
export function setBoardShape(c) {
  const lg = c.board === 'long', bb = c.board === 'body', jet = c.board === 'jet', kay = c.board === 'kayak', zod = c.board === 'zodiac';
  boardMesh.visible = !jet && !kay && !zod; jetG.visible = jet; kayakG.visible = kay; zodiacG.visible = zod;
  matHelmet.color.setHex(c.helmetColor || 0xf1f1ef); paddle.visible = kay; helmet.visible = !!c.helmet;
  boardMesh.scale.set(lg ? 1.4 : bb ? 0.56 : 1, bb ? 1.7 : 1, lg ? 1.1 : bb ? 1.18 : 1);
  boardMesh.position.x = bb ? 0.18 : 0;
  finMeshes.forEach((m, i) => {
    const [fx, fz] = m.userData.p;
    if (bb || jet || kay || zod) { m.visible = false; }
    else if (lg) { m.visible = i === 2; m.position.set(-1.25, 0.005, 0); m.scale.setScalar(1.7); }
    else { m.visible = true; m.position.set(fx, 0.005, fz); m.scale.setScalar(1); }
  });
}
