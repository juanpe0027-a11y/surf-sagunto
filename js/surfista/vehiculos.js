// Vehículos: zodiac de rescate (Krre), kayak con su pala (Raúl), moto de agua (JuanP) y las patas de la tabla de planchar (Akeny).
import { V3 } from '../nucleo/util.js';
import { boardRoot } from './raiz.js';

// zodiac de rescate (Krre): tubos rojos, casco blanco, motor fueraborda con la bandera y rótulos S.O.S
export const zodiacG = new THREE.Group(); boardRoot.add(zodiacG); zodiacG.visible = false;
{
  const mR = new THREE.MeshStandardMaterial({ color: 0xd8212b, roughness: 0.45 });
  const mW = new THREE.MeshStandardMaterial({ color: 0xe9e9e6, roughness: 0.4 });
  const mG = new THREE.MeshStandardMaterial({ color: 0x9ea2a6, roughness: 0.5 });
  const mM = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.2 });
  // casco rígido en V (blanco)
  const sh = new THREE.Shape(); sh.moveTo(-1.35, -0.48); sh.lineTo(0.7, -0.5); sh.quadraticCurveTo(1.45, -0.35, 1.6, 0); sh.quadraticCurveTo(1.45, 0.35, 0.7, 0.5); sh.lineTo(-1.35, 0.48); sh.lineTo(-1.35, -0.48);
  const hg = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 14 });
  hg.rotateX(-Math.PI / 2); const hull = new THREE.Mesh(hg, mW); hull.position.y = 0.02; zodiacG.add(hull);
  // tubos neumáticos: laterales y la proa redonda
  for (const z of [-0.52, 0.52]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 2.15, 18), mR); t.rotation.z = Math.PI / 2; t.position.set(-0.27, 0.3, z); zodiacG.add(t);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 10), mR); cap.position.set(-1.35, 0.3, z); zodiacG.add(cap);
    const rub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 8), mG); rub.rotation.z = Math.PI / 2; rub.position.set(-0.25, 0.24, z * 1.38); zodiacG.add(rub);
  }
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.21, 14, 24, Math.PI), mR); bow.rotation.x = Math.PI / 2; bow.rotation.z = -Math.PI / 2; bow.position.set(0.8, 0.3, 0); zodiacG.add(bow);
  // suelo
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.85), mG); floor.position.set(-0.3, 0.2, 0); zodiacG.add(floor);
  // rótulos en los costados
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const cx = cv.getContext('2d');
  cx.fillStyle = '#d8212b'; cx.fillRect(0, 0, 512, 96); cx.fillStyle = '#fff'; cx.font = 'bold 56px sans-serif'; cx.textBaseline = 'middle'; cx.fillText('S.O.S', 14, 50);
  cx.fillRect(200, 14, 300, 68); cx.fillStyle = '#111'; cx.font = 'bold 26px sans-serif'; cx.fillText('AJUNTAMENT', 214, 34); cx.fillText('SAGUNT IV', 214, 64);
  const lt = new THREE.CanvasTexture(cv);
  for (const z of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.18), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.5 }));
    pl.position.set(-0.75, 0.33, z * 0.735); if (z < 0) pl.rotation.y = Math.PI; zodiacG.add(pl);
  }
  // motor fueraborda con la bandera
  const mot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.3), mM); mot.position.set(-1.55, 0.62, 0); zodiacG.add(mot);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mM); top.scale.set(1, 0.6, 0.85); top.position.set(-1.55, 0.8, 0); zodiacG.add(top);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.08), mM); leg.position.set(-1.55, 0.2, 0); zodiacG.add(leg);
  const tiller = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), mM); tiller.rotation.z = Math.PI / 2 - 0.25; tiller.position.set(-1.1, 0.62, 0); zodiacG.add(tiller);
  const fc = document.createElement('canvas'); fc.width = 60; fc.height = 40; const fx = fc.getContext('2d');
  fx.fillStyle = '#c60b1e'; fx.fillRect(0, 0, 60, 40); fx.fillStyle = '#ffc400'; fx.fillRect(0, 10, 60, 20);
  const ft = new THREE.CanvasTexture(fc);
  for (const z of [-1, 1]) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ map: ft })); fl.position.set(-1.55, 0.66, z * 0.152); if (z < 0) fl.rotation.y = Math.PI; zodiacG.add(fl); }
}
// tabla de planchar (Akeny): las patas plegadas asoman por los dos extremos (la tabla es la normal, más estrecha)
export const ironG = new THREE.Group(); boardRoot.add(ironG); ironG.visible = false;
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.35, metalness: 0.6 });
  const loop = pts => { const cv = new THREE.CatmullRomCurve3(pts.map(q => V3(q[0], q[1], q[2]))); ironG.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 30, 0.017, 6, false), mat)); };
  loop([[-0.7, -0.03, -0.17], [-1.0, -0.04, -0.24], [-1.16, -0.04, -0.16], [-1.16, -0.04, 0.16], [-1.0, -0.04, 0.24], [-0.7, -0.03, 0.17]]);   // cola recta
  loop([[0.55, -0.03, -0.1], [0.92, -0.04, -0.2], [1.1, -0.04, -0.09], [1.1, -0.04, 0.09], [0.92, -0.04, 0.2], [0.55, -0.03, 0.1]]);       // punta
}
// kayak (Raúl): casco naranja alargado, bañera negra con cubrebañeras y pala de doble hoja
export const kayakG = new THREE.Group(); boardRoot.add(kayakG); kayakG.visible = false;
{
  const mO = new THREE.MeshStandardMaterial({ color: 0xf2621f, roughness: 0.38 });
  const mK = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6 });
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16), mO); hull.scale.set(1.25, 0.2, 0.33); hull.position.y = 0.16; kayakG.add(hull);
  const deck = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), mO); deck.scale.set(1.1, 0.16, 0.3); deck.position.set(0.05, 0.2, 0); kayakG.add(deck);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 28), mK); rim.rotation.x = Math.PI / 2; rim.scale.set(1.5, 1, 1); rim.position.set(-0.12, 0.33, 0); kayakG.add(rim);
  const skirt = new THREE.Mesh(new THREE.CircleGeometry(0.24, 28), mK); skirt.rotation.x = -Math.PI / 2; skirt.scale.set(1.5, 1, 1); skirt.position.set(-0.12, 0.335, 0); kayakG.add(skirt);
}
const matPaddle = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.45 });
export const paddle = new THREE.Group(); paddle.visible = false;
{
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.0, 8), matPaddle); paddle.add(shaft);
  for (const sgn of [-1, 1]) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.44, 0.014), matPaddle);
    bl.position.y = sgn * 0.98; bl.rotation.y = sgn * 0.55; paddle.add(bl);
  }
}
// moto de agua (JuanP): casco negro, cuerpo blanco, cubierta y capó lima, asiento verde y manillar
export const jetG = new THREE.Group(); boardRoot.add(jetG); jetG.visible = false;
{
  const mW = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.35 });
  const mK = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5 });
  const mL = new THREE.MeshStandardMaterial({ color: 0xc8f230, roughness: 0.35 });
  const mS = new THREE.MeshStandardMaterial({ color: 0x26b33a, roughness: 0.7 });
  const hull = (k) => { const sh = new THREE.Shape();
    sh.moveTo(-1.3 * k, -0.5 * k); sh.lineTo(0.55 * k, -0.56 * k); sh.quadraticCurveTo(1.35 * k, -0.4 * k, 1.6 * k, 0);
    sh.quadraticCurveTo(1.35 * k, 0.4 * k, 0.55 * k, 0.56 * k); sh.lineTo(-1.3 * k, 0.5 * k); sh.lineTo(-1.3 * k, -0.5 * k); return sh; };
  const ext = (sh, h, mat, y) => { const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2, curveSegments: 12 });
    g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.y = y; jetG.add(m); return m; };
  ext(hull(0.92), 0.14, mK, 0.0);
  ext(hull(1.0), 0.2, mW, 0.14);
  ext(hull(0.88), 0.03, mL, 0.36);
  const hood = new THREE.Shape(); hood.moveTo(0.4, -0.36); hood.lineTo(0.95, -0.3); hood.quadraticCurveTo(1.35, -0.12, 1.42, 0); hood.quadraticCurveTo(1.35, 0.12, 0.95, 0.3); hood.lineTo(0.4, 0.36); hood.lineTo(0.4, -0.36);
  ext(hood, 0.2, mL, 0.38);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.17, 0.38), mS); seat.position.set(-0.42, 0.48, 0); jetG.add(seat);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.32, 8), mK); col.position.set(0.4, 0.66, 0); col.rotation.z = 0.35; jetG.add(col);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.66, 8), mK); bar.rotation.x = Math.PI / 2; bar.position.set(0.36, 0.8, 0); jetG.add(bar);
  for (const z of [-0.535, 0.535]) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.01), mK); st.position.set(-0.3, 0.25, z); jetG.add(st);
    const ls = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.012), mL); ls.position.set(0.55, 0.26, z * 0.98); ls.rotation.y = z > 0 ? -0.2 : 0.2; jetG.add(ls); }
  jetG.position.x = -0.15;
}
