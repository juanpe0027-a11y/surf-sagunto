import { avisar, escuchar } from '../nucleo/eventos.js';
import { G } from '../nucleo/estado.js';
import { TORSOS } from '../datos/disenos.js';
import { CHARS, FACES } from '../datos/personajes.js';
import { beard, cap, faceMat, faceMesh, faceTex, footB, footF, glasses, hair, L, mane, matBeard, matFlipper, matForearm, matHair, matShin, matShorts, matSkin, matSuit, matUpperArm, rider, setSuitMap, spikes, strandG, torsoCv, torsoTex } from './muneco.js';
import { paintBoard, setBoardShape } from './tabla.js';
import { colorHuman, HUMAN } from './cuerpo.js';

export function applyChar(c) {
  matSkin.color.setHex(c.skin); matHair.color.setHex(c.hair); matBeard.color.setHex(c.beardColor || c.hair);
  const st = !!c.suitStripes;
  setSuitMap(matSuit, st, c.suit); setSuitMap(matShorts, st, c.shorts);
  setSuitMap(matUpperArm, st, c.upperArm || c.suit);
  if (c.torso && TORSOS[c.torso]) { TORSOS[c.torso](torsoCv.getContext('2d')); torsoTex.needsUpdate = true; if (matSuit.map !== torsoTex) { matSuit.map = torsoTex; matSuit.needsUpdate = true; } matSuit.color.setHex(0xffffff); }
  setSuitMap(matShin, st && c.longSuit, c.longSuit ? (c.legs || c.suit) : c.skin);
  setSuitMap(matForearm, st && c.longSuit, c.longSuit && !c.sleeveless ? c.suit : c.skin);
  paintBoard(c); setBoardShape(c);
  rider.scale.z = c.goofy ? 1 : -1;
  if (FACES[c.id] && !faceTex[c.id]) faceTex[c.id] = new THREE.TextureLoader().load(FACES[c.id]);
  faceMesh.visible = !!faceTex[c.id];
  if (faceTex[c.id] && faceMat.map !== faceTex[c.id]) { faceMat.map = faceTex[c.id]; faceMat.needsUpdate = true; }
  L.pony.visible = c.style === 'pony';
  spikes.visible = c.style === 'messy'; mane.visible = c.style === 'surfer' || c.style === 'long'; strandG.visible = c.style === 'long';
  glasses.visible = !!c.glasses; beard.visible = !!c.beard; cap.visible = !!c.cap; hair.visible = !c.cap && !c.helmet && c.style !== 'bald';
  colorHuman(HUMAN.local, c);
  for (const ft of [footB, footF]) { ft.visible = !HUMAN.local || !!c.bodyboard; ft.material = c.bodyboard ? matFlipper : matSkin; ft.scale.set(c.bodyboard ? 1.3 : 1, 1, c.bodyboard ? 2.6 : 1); }
  if (c.beardFull) beard.scale.set(0.122, 0.135, 0.122); else beard.scale.set(0.108, c.beardColor ? 0.1 : 0.11, c.beardColor ? 0.104 : 0.108);
  const hs = c.style === 'curly' ? [1.28, 1.18, 1.28] : c.style === 'surfer' ? [1.08, 1.12, 1.08] : c.style === 'fade' ? [1.0, 0.82, 1.0] : [1, 1, 1];
  hair.scale.set(hs[0], hs[1], hs[2]);
  avisar('personaje', c);
}
// cuando carga la foto de una tabla, se repinta si es la del surfista elegido
escuchar('foto-tabla', k => { if (G.CH.id === k) paintBoard(G.CH); });
for (const c of CHARS) if (FACES[c.id] && !faceTex[c.id]) faceTex[c.id] = new THREE.TextureLoader().load(FACES[c.id]);
