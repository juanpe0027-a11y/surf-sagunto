// La costa del Puerto de Sagunto: playa, paseo, Pantalán, Alto Horno, puerto y montañas al fondo.
import { clamp, rnd, TAU, V3 } from '../nucleo/util.js';
import { cyl, setLimb, sph } from './formas.js';
import { world } from './motor.js';

export const coast = new THREE.Group(); world.add(coast);
export const north = new THREE.Group(); world.add(north);   // Pantalán, Alto Horno y puerto: -x interno = derecha de la pantalla
const SM = (c, r = 0.9, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, flatShading: true });
function box(w, h, d, mat, x, y, z, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || coast).add(m); return m; }
function cylm(rt, rb, h, mat, x, y, z, parent, seg) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat); m.position.set(x, y, z); (parent || coast).add(m); return m; }
{
  // arena, paseo
  // el pueblo (playa, paseo, fincas y palmeras) empieza al lado del Pantalán, en la dirección contraria al puerto
  box(3000, 2, 130, SM(0xe2c08e), 1520, -0.6, 143, north);
  box(70, 2, 160, SM(0xe2c08e), -14, -0.6, 158, north);           // arena a la derecha del espigón
  box(70, 2, 8, SM(0xb99b6f), -14, -0.85, 79, north);
  box(3000, 2, 8, SM(0xb99b6f), 1520, -0.85, 79, north);
  box(3000, 1.6, 12, SM(0xcdb79a), 1520, 0.2, 213, north);
  box(3000, 1, 60, SM(0xc9b38a, 1), 1520, -0.2, 245, north);   // franja abierta detrás del paseo
  // fachada de apartamentos con ventanas
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const c2 = cv.getContext('2d');
  c2.fillStyle = '#ffffff'; c2.fillRect(0, 0, 64, 64);
  c2.fillStyle = '#5d7486';
  for (const yy of [6, 38]) for (const xx of [6, 38]) c2.fillRect(xx, yy, 20, 18);
  c2.fillStyle = '#d8d2c8'; c2.fillRect(0, 27, 64, 4); c2.fillRect(0, 59, 64, 4);
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const facade = [0xf1e8d8, 0xe9d4b2, 0xf5f1ea, 0xdcc6a6, 0xeadccb].map(c => new THREE.MeshStandardMaterial({ color: c, map: tex, roughness: 0.85 }));
  {
    const houseGeo = new THREE.BoxGeometry(1, 1, 1), hu = houseGeo.attributes.uv;
    for (let i = 0; i < hu.count; i++) hu.setXY(i, hu.getX(i) * 2, hu.getY(i) * 1.4);
    const NH = 520, houses = new THREE.InstancedMesh(houseGeo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), NH);
    const roofGeo = new THREE.ConeGeometry(0.75, 1, 4, 1); roofGeo.rotateY(Math.PI / 4);
    const roofs = new THREE.InstancedMesh(roofGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), NH);
    const wallC = [0xf3ece0, 0xe9dcc4, 0xf6f3ee, 0xe2cfb2, 0xefe2cf, 0xd9c7a8].map(c => new THREE.Color(c));
    const roofC = [0xb4583c, 0xa44d34, 0xc0684a, 0x9c4a33].map(c => new THREE.Color(c));
    const od = new THREE.Object3D(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
    let nh = 0, nr = 0;
    for (let row = 0; row < 4; row++) {
      let x = 45 + rnd(0, 10);
      while (x < 1500 && nh < NH) {
        const tall = row < 2 && Math.random() < (x < 450 ? 0.03 : x < 700 ? 0.2 : 0.5);
        const w = tall ? rnd(16, 26) : rnd(7, 14), dpt = tall ? 16 : rnd(8, 13), h = tall ? rnd(20, 32) : rnd(5.5, 9.5);
        const z = 275 + row * 22 + rnd(-3, 3);
        if (tall) {
          const g = new THREE.BoxGeometry(w, h, dpt), uv = g.attributes.uv;
          for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 7, uv.getY(i) * h / 6.5);
          const m = new THREE.Mesh(g, facade[Math.floor(Math.random() * facade.length)]); m.position.set(x + w / 2, h / 2, z); north.add(m);
        } else {
          od.position.set(x + w / 2, h / 2, z); od.rotation.set(0, 0, 0); od.scale.set(w, h, dpt); od.updateMatrix();
          houses.setMatrixAt(nh, od.matrix); houses.setColorAt(nh, wallC[(Math.random() * wallC.length) | 0]); nh++;
          if (Math.random() < 0.7) {                     // tejado de teja a cuatro aguas; el resto, azotea
            od.position.set(x + w / 2, h + 1.1, z); od.scale.set(w * 1.02, 2.2, dpt * 1.02); od.updateMatrix();
            roofs.setMatrixAt(nr, od.matrix); roofs.setColorAt(nr, roofC[(Math.random() * roofC.length) | 0]); nr++;
          }
        }
        x += w + rnd(0.5, 4);
      }
    }
    for (let i = nh; i < NH; i++) houses.setMatrixAt(i, hide);
    for (let i = nr; i < NH; i++) roofs.setMatrixAt(i, hide);
    houses.instanceColor.needsUpdate = true; roofs.instanceColor.needsUpdate = true;
    north.add(houses, roofs);
  }
  // palmeras del paseo
  const n = 120, trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 9, 7); trunkGeo.translate(0, 4.5, 0);
  const frondGeo = new THREE.ConeGeometry(0.55, 4.6, 4); frondGeo.translate(0, 2.3, 0); frondGeo.scale(1, 1, 0.25);
  const trunks = new THREE.InstancedMesh(trunkGeo, SM(0x6b5640), n);
  const fronds = new THREE.InstancedMesh(frondGeo, SM(0x3f6b3a), n * 7);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const px = 40 + Math.floor(i / 2) * 22 + rnd(-3, 3), pz = i % 2 ? 204 : 221, lean = rnd(-0.08, 0.08);
    d.position.set(px, 0.6, pz); d.rotation.set(lean, 0, rnd(-0.08, 0.08)); d.scale.setScalar(rnd(0.85, 1.15)); d.updateMatrix(); trunks.setMatrixAt(i, d.matrix);
    for (let k = 0; k < 7; k++) {
      d.position.set(px + lean * 9, 9.6 * d.scale.y, pz + lean * 9);
      d.rotation.set(0, k / 7 * TAU + rnd(-0.2, 0.2), 0); d.rotateZ(rnd(1.2, 1.9));
      d.updateMatrix(); fronds.setMatrixAt(i * 7 + k, d.matrix);
    }
  }
  north.add(trunks, fronds);

  // ---- lado norte (a la derecha mirando a la playa desde el agua): Pantalán, Alto Horno y puerto ----
  const iron = SM(0x37302d, 0.75, 0.4), ironRust = SM(0x6a4232, 0.85, 0.3);
  const steel = SM(0x4a4643, 0.7, 0.35), rust = SM(0x8a5236, 0.85, 0.25);

  // El Pantalán (fotos de 2019–2024): tablero de hormigón a ~8 m sobre caballetes de patas de hierro
  // abiertas, cada ~22 m. Primer tramo rehabilitado en 2024 (tarima, barandilla blanca, farolas, pérgolas);
  // el resto con la barandilla tubular vieja a trozos y las tolvas de mineral oxidadas.
  const pier = new THREE.Group(); pier.position.set(-34, 0, 0); north.add(pier);
  {
    const conc = SM(0xbdb6aa, 0.95), concDark = SM(0x8f897f, 0.95), leg = SM(0x2c2826, 0.8, 0.3);
    const wood = SM(0xa77d55, 0.85), white = SM(0xf1f0eb, 0.5), oldRail = SM(0x5f5a54, 0.7, 0.4), black = SM(0x1d1d1f, 0.6, 0.3);
    const Z0 = 82, LEN = 720, SPAN = 22, DY = 8.0, HALF = 4.2, NEW = 180;
    const ROCK_END = -45;   // hasta aquí, desde la orilla, el Pantalán va sobre un espigón de rocas
    const nSpans = Math.floor(LEN / SPAN);
    const postGeo = new THREE.BoxGeometry(0.07, 1.1, 0.07), balGeo = new THREE.BoxGeometry(0.035, 1.0, 0.035);
    const posts = [], bals = [];
    for (let i = 0; i <= nSpans; i++) {
      const z = Z0 - i * SPAN;
      // caballete: viga ancha y 4 patas, las de fuera abiertas (solo donde ya no hay espigón de rocas)
      if (z <= ROCK_END) {
        box(11.5, 1.3, 1.8, concDark, 0, DY - 1.9, z, pier);
        for (const [x0, x1] of [[-1.7, -1.7], [1.7, 1.7], [-4.6, -6.6], [4.6, 6.6]]) {
          const top = V3(x0, DY - 2.5, z), bot = V3(x1, -2, z);
          const m = new THREE.Mesh(cyl, leg); m.userData.r = 0.42; setLimb(m, top, bot); pier.add(m);
        }
      }
      if (i === nSpans) break;
      const zc = z - SPAN / 2, isNew = i * SPAN < NEW;
      if (zc > ROCK_END) box(HALF * 2 - 0.4, 3.4, SPAN + 0.05, concDark, 0, DY - 2.4, zc, pier);   // muro sobre el espigón
      // tablero
      box(HALF * 2, 0.45, SPAN + 0.05, isNew ? wood : conc, 0, DY, zc, pier);
      box(0.5, 1.5, SPAN, conc, -HALF + 0.25, DY - 0.95, zc, pier);
      box(0.5, 1.5, SPAN, conc, HALF - 0.25, DY - 0.95, zc, pier);
      box(HALF * 2 - 1, 0.2, SPAN, concDark, 0, DY - 1.5, zc, pier);
      // barandillas
      for (const sx of [-1, 1]) {
        const x = sx * (HALF - 0.1);
        if (isNew) {
          box(0.09, 0.09, SPAN, white, x, DY + 1.25, zc, pier);
          box(0.06, 0.06, SPAN, white, x, DY + 0.3, zc, pier);
          for (let k = 0; k < SPAN; k += 0.14) bals.push([x, DY + 0.75, z - k]);
        } else {
          const r = Math.sin(i * 12.9898 + sx * 78.233) * 43758.5453 % 1;
          if (Math.abs(r) < 0.62) {
            box(0.08, 0.08, SPAN, oldRail, x, DY + 1.25, zc, pier);
            box(0.06, 0.06, SPAN, oldRail, x, DY + 0.75, zc, pier);
            for (let k = 0; k < SPAN; k += 2.2) posts.push([x, DY + 0.75, z - k]);
          } else if (Math.abs(r) < 0.8) {
            for (let k = 0; k < SPAN; k += 2.2) posts.push([x, DY + 0.75, z - k]);
          }
        }
      }
      // farolas negras en el tramo nuevo
      if (isNew && i % 1 === 0) for (const sx of [-1, 1]) {
        cylm(0.08, 0.1, 5, black, sx * (HALF - 0.5), DY + 2.7, zc, pier, 6);
        box(0.6, 0.15, 0.25, black, sx * (HALF - 0.75), DY + 5.2, zc, pier);
      }
      // tolvas de mineral oxidadas en la parte vieja
      if (!isNew && i % 3 === 1 && i * SPAN > 260) {
        const t = new THREE.Group(); t.position.set(0.8, DY + 0.2, zc); pier.add(t);
        for (const [px, pz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) box(0.3, 4.2, 0.3, rust, px, 2.1, pz, t);
        const hop = new THREE.Mesh(new THREE.ConeGeometry(3.6, 3.4, 4, 1, true), rust);
        hop.rotation.set(Math.PI, Math.PI / 4, 0); hop.position.y = 4.2; hop.material.side = THREE.DoubleSide; t.add(hop);
        const ch = box(1.2, 0.4, 7, rust, 2.6, 4.6, 2.5, t); ch.rotation.x = -0.45; ch.rotation.y = 0.5;
      }
    }
    // barrotes blancos y postes viejos instanciados
    const d = new THREE.Object3D();
    const ib = new THREE.InstancedMesh(balGeo, white, bals.length);
    bals.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); ib.setMatrixAt(i, d.matrix); });
    const ip = new THREE.InstancedMesh(postGeo, oldRail, posts.length);
    posts.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); ip.setMatrixAt(i, d.matrix); });
    pier.add(ib, ip);
    // pérgolas del arranque
    for (const pz of [70, 52]) {
      for (const [px, qz] of [[-2.6, -3], [2.6, -3], [-2.6, 3], [2.6, 3]]) cylm(0.12, 0.12, 3.4, black, px, DY + 1.9, pz + qz, pier, 6);
      box(7.6, 0.25, 8.5, SM(0x3b2f2a), 0, DY + 3.7, pz, pier);
    }
    // asientos tipo huevo amarillos, negros y blancos
    const eggs = [0xf4cc2a, 0x151515, 0xf4f3ee];
    for (let k = 0; k < 9; k++) {
      const e = new THREE.Mesh(sph, SM(eggs[k % 3], 0.35)); e.scale.set(0.45, 0.4, 0.45);
      e.position.set((k % 2 ? 1 : -1) * rnd(1.5, 2.8), DY + 0.6, 40 - k * 14); pier.add(e);
    }
    // arranque en tierra y escollera
    box(12, DY, 30, concDark, 0, DY / 2 - 0.5, Z0 + 14, pier);
    box(HALF * 2, 0.45, 30, wood, 0, DY, Z0 + 14, pier);
    // espigón: montón de rocas grandes, ancho abajo y estrecho arriba, con la punta redondeada
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const NR = 1300, top = DY - 2.8;
    const rocksA = new THREE.InstancedMesh(rockGeo, SM(0x8c6f53), NR), rocksB = new THREE.InstancedMesh(rockGeo, SM(0x6b5440), NR);
    for (let i = 0; i < NR * 2; i++) {
      const z = rnd(ROCK_END - 7, Z0 + 26);
      const endK = clamp((z - (ROCK_END - 7)) / 12, 0.25, 1);          // la punta se estrecha
      const w = 12 * Math.sqrt(endK);
      const xr = rnd(-1, 1), x = xr * w;
      const hgt = top * (1 - Math.pow(Math.abs(xr), 1.5)) * Math.min(1, endK + 0.2) - rnd(0, 1.4);
      d.position.set(x, Math.max(-1.2, hgt), z);
      d.rotation.set(rnd(0, TAU), rnd(0, TAU), rnd(0, TAU));
      const sc = rnd(1.1, 2.4); d.scale.set(sc * rnd(0.9, 1.3), sc * rnd(0.7, 1.0), sc * rnd(0.9, 1.3));
      d.updateMatrix(); (i % 2 ? rocksB : rocksA).setMatrixAt(i >> 1, d.matrix);
    }
    pier.add(rocksA, rocksB);
  }

  {
    // explanada de hormigón vacía justo detrás del arranque del Pantalán
    box(170, 1.2, 150, SM(0xbcb7ad, 0.95), -131, -0.05, 158, north);
    box(170, 0.12, 9, SM(0x5d5a56), -131, 0.6, 96, north);                       // vial junto a la escollera
    for (let k = 0; k < 6; k++) box(0.4, 0.13, 150, SM(0xa8a399), -200 + k * 40, 0.6, 158, north);   // juntas del hormigón
    // descampado: tierra con matorral bajo
    box(320, 1, 1500, SM(0x9a8b62, 1), -110, -0.3, 980, north);
    const shrub = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), SM(0x6f7a45, 1), 900);
    const dd = new THREE.Object3D();
    for (let i = 0; i < 900; i++) {
      dd.position.set(rnd(-260, 42), 0.3, rnd(240, 1700)); dd.scale.set(rnd(1, 3.5), rnd(0.6, 1.6), rnd(1, 3.5));
      dd.rotation.y = rnd(0, TAU); dd.updateMatrix(); shrub.setMatrixAt(i, dd.matrix);
    }
    north.add(shrub);
    // escollera de rocas a lo largo de la orilla de la explanada
    const rev = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), SM(0x7d6249), 520);
    for (let i = 0; i < 520; i++) {
      const xx = rnd(-215, -47), t = Math.random();
      dd.position.set(xx, -0.6 + t * 1.8, 72 + t * 14 + rnd(-2, 2));
      dd.rotation.set(rnd(0, TAU), rnd(0, TAU), rnd(0, TAU)); const sc = rnd(1.2, 2.4); dd.scale.set(sc, sc * 0.8, sc);
      dd.updateMatrix(); rev.setMatrixAt(i, dd.matrix);
    }
    north.add(rev);
    // el puerto: gran plataforma de hormigón ganada al mar, contenedores y los dos tanques blancos de gas
    box(620, 3, 560, SM(0xb2ada3, 0.95), -540, -0.2, 40, north);
    const cc = [0xa0453b, 0x2f6a8a, 0xc79a3c, 0x3d7a4f, 0xd8d4cc];
    for (let i = 0; i < 70; i++) box(12, 2.6 * (1 + (i % 3)), 2.5, SM(cc[i % 5]), -300 - (i % 10) * 16, 1.3 + 1.3 * (i % 3), 60 + Math.floor(i / 10) * 12, north);
    for (const [tx, tz] of [[-470, -150], [-525, -150]]) {
      cylm(22, 22, 30, SM(0xf2f1ec, 0.5), tx, 16, tz, north, 32);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(22, 32, 10, 0, TAU, 0, Math.PI * 0.32), SM(0xf2f1ec, 0.5)); dome.position.set(tx, 21, tz); north.add(dome);
    }
  }

  // Alto Horno nº 2: torre única con estructura metálica y la rampa del skip
  const ah = new THREE.Group(); ah.position.set(-60, 0, 760); ah.rotation.y = 0.5; ah.scale.setScalar(1.3); north.add(ah);
  box(30, 3, 30, SM(0xc9c1b4), 0, 1.5, 0, ah);
  const ctr = box(26, 9, 15, SM(0xf2efe8, 0.6), 22, 5, 14, ah); ctr.rotation.y = 0.35; ctr.rotation.z = 0.06;
  const furnace = new THREE.Group(); ah.add(furnace);
  const prof = [[4.6, 3], [5.4, 10], [5.8, 20], [5.0, 32], [4.0, 42], [3.2, 47]];
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
    cylm(r1, r0, y1 - y0, i % 2 ? steel : rust, 0, (y0 + y1) / 2, 0, furnace, 20);
  }
  for (let y = 6; y < 46; y += 4) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(5.6 - Math.max(0, y - 22) * 0.07, 0.22, 6, 24), iron);
    t.rotation.x = Math.PI / 2; t.position.y = y; ah.add(t);
  }
  // marco de cuatro pilares con plataformas
  for (const [cx, cz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) box(1.1, 52, 1.1, iron, cx, 29, cz, ah);
  for (let y = 10; y <= 52; y += 8.4) {
    box(15.2, 0.5, 1.6, iron, 0, y, -7, ah); box(15.2, 0.5, 1.6, iron, 0, y, 7, ah);
    box(1.6, 0.5, 15.2, iron, -7, y, 0, ah); box(1.6, 0.5, 15.2, iron, 7, y, 0, ah);
  }
  for (const [cx, cz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) box(0.8, 15, 0.8, iron, cx, 60, cz, ah);
  box(8, 0.5, 8, iron, 0, 67.5, 0, ah);
  box(4, 4, 4, steel, 0, 70, 0, ah);
  for (const a of [0.8, 2.4, 3.9, 5.5]) {
    const p = cylm(0.55, 0.55, 18, rust, Math.cos(a) * 2.4, 56, Math.sin(a) * 2.4, ah, 8);
    p.rotation.z = Math.cos(a) * -0.08; p.rotation.x = Math.sin(a) * 0.08;
  }
  const dc = cylm(1.1, 1.1, 30, rust, 9, 50, 0, ah, 10); dc.rotation.z = -0.5;
  // rampa del skip: celosía inclinada desde el suelo hasta la boca
  {
    const len = 72, ang = 0.72, sk = new THREE.Group();
    sk.position.set(-6, 52, 0); sk.rotation.z = ang; ah.add(sk);
    for (const sz of [-1.6, 1.6]) { box(len, 0.7, 0.5, iron, -len / 2, 0, sz, sk); box(len, 0.5, 0.5, iron, -len / 2, -2.4, sz, sk); }
    for (let x = -2; x > -len; x -= 3.2) {
      box(0.3, 2.4, 0.3, iron, x, -1.2, -1.6, sk); box(0.3, 2.4, 0.3, iron, x, -1.2, 1.6, sk);
      box(0.3, 0.3, 3.4, iron, x, 0, 0, sk);
    }
    for (const x of [-26, -48]) box(1, 32, 1, iron, x, -16, 0, sk).rotation.z = -ang;
  }
  for (const [x, z] of [[-30, 20], [-22, 26], [30, -14], [34, 30]]) {
    cylm(0.3, 0.4, 10, SM(0x6b5640), x, 5, z, ah, 7);
    for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.6, 5, 4), SM(0x3f6b3a)); f.scale.z = 0.25; f.position.set(x, 10.3, z); f.rotation.set(0, k / 7 * TAU, 1.5); f.translateY(2.4); ah.add(f); }
  }

  {
    const od = new THREE.Object3D();
    // carretera detrás del paseo con coches aparcados
    box(3000, 0.2, 11, SM(0x4a4947, 0.95), 1520, 0.35, 232, north);
    const carC = [0xd9d9d6, 0x2b2f36, 0x8d1f1f, 0x274b7a, 0xa8a8a2, 0x1d1d1d].map(c => new THREE.Color(c));
    const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(4.3, 1.5, 1.9), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }), 140);
    for (let i = 0; i < 140; i++) {
      od.position.set(70 + i * 9.5 + rnd(-1.5, 1.5), 1.2, i % 3 ? 228.5 : 236); od.rotation.set(0, 0, 0); od.scale.set(1, 1, 1); od.updateMatrix();
      cars.setMatrixAt(i, od.matrix); cars.setColorAt(i, carC[(Math.random() * carC.length) | 0]);
    }
    cars.instanceColor.needsUpdate = true; north.add(cars);
    // sombrillas de colores en la playa ancha
    const NP = 260, umbC = [0xe94b3c, 0x2f7fd8, 0xf2c230, 0x2fa36b, 0xffffff, 0xf07b2a, 0x9b59b6].map(c => new THREE.Color(c));
    const umb = new THREE.InstancedMesh(new THREE.ConeGeometry(1.15, 0.55, 10), new THREE.MeshStandardMaterial({ roughness: 0.7 }), NP);
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 5), SM(0xeeeeee), NP);
    for (let i = 0; i < NP; i++) {
      const ux = rnd(70, 1500), uz = rnd(112, 192);
      od.position.set(ux, 2.6, uz); od.rotation.set(rnd(-0.12, 0.12), 0, rnd(-0.12, 0.12)); od.updateMatrix(); umb.setMatrixAt(i, od.matrix);
      umb.setColorAt(i, umbC[(Math.random() * umbC.length) | 0]);
      od.position.set(ux, 1.4, uz); od.rotation.set(0, 0, 0); od.updateMatrix(); poles.setMatrixAt(i, od.matrix);
    }
    umb.instanceColor.needsUpdate = true; north.add(umb, poles);
    // entorno del Alto Horno: rotonda, carreteras y naves industriales en el descampado
    const AHX = -60, AHZ = 760, asph = SM(0x4d4c4a, 0.95);
    const ring = new THREE.Mesh(new THREE.RingGeometry(40, 54, 48), asph); ring.rotation.x = -Math.PI / 2; ring.position.set(AHX, 0.25, AHZ); north.add(ring);
    const isl = new THREE.Mesh(new THREE.CircleGeometry(40, 48), SM(0xcfc5b2)); isl.rotation.x = -Math.PI / 2; isl.position.set(AHX, 0.28, AHZ); north.add(isl);
    box(12, 0.2, 420, asph, AHX, 0.24, AHZ - 260, north);                  // hacia la costa
    box(12, 0.2, 420, asph, AHX, 0.24, AHZ + 260, north);                  // tierra adentro
    box(520, 0.2, 12, asph, AHX + 310, 0.24, AHZ, north);                  // hacia el pueblo
    box(520, 0.2, 12, asph, AHX - 310, 0.24, AHZ, north);                  // hacia el puerto
    const naveC = [0xe3e6e8, 0xcfd8df, 0xe8e6df, 0xd5dde4];
    [[AHX + 120, AHZ - 95, 90, 13, 45], [AHX - 130, AHZ - 80, 70, 11, 40], [AHX + 150, AHZ + 110, 110, 15, 55],
     [AHX - 120, AHZ + 120, 80, 12, 50], [AHX + 30, AHZ + 190, 120, 14, 45], [AHX - 260, AHZ + 20, 60, 10, 35]].forEach(([nx, nz, w, hh, dz], i) => {
      box(w, hh, dz, SM(naveC[i % 4], 0.7), nx, hh / 2, nz, north);
      const r = box(w + 1, 1.4, dz / 2 + 1, SM(0xb9c2c9, 0.6), nx, hh + 0.5, nz - dz / 4, north); r.rotation.x = 0.12;
      const r2 = box(w + 1, 1.4, dz / 2 + 1, SM(0xb9c2c9, 0.6), nx, hh + 0.5, nz + dz / 4, north); r2.rotation.x = -0.12;
    });
    // nave grande junto al arranque del espigón, en la explanada
    box(70, 15, 42, SM(0xdedfdc, 0.7), -150, 7.5, 200, north);
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(21, 21, 70, 28, 1, false, -Math.PI / 2, Math.PI), SM(0xb7bcbf, 0.6));
    vault.rotation.z = Math.PI / 2; vault.scale.set(1, 1, 0.35); vault.position.set(-150, 15, 200); north.add(vault);
  }

  // puerto: dique con grúas, más al norte
  const concrete = SM(0xb9b1a4), craneBlue = SM(0x2f5f8f, 0.6, 0.3), craneWhite = SM(0xe8e6e0, 0.6, 0.2);
  box(26, 6, 560, concrete, -300, 1, -190, north);
  for (const cz of [-20, -90, -160]) {
    const g = new THREE.Group(); g.position.set(-300, 4, cz); g.rotation.y = Math.PI; north.add(g);
    box(2, 34, 2, craneBlue, -8, 17, -10, g); box(2, 34, 2, craneBlue, 8, 17, -10, g);
    box(2, 34, 2, craneBlue, -8, 17, 10, g); box(2, 34, 2, craneBlue, 8, 17, 10, g);
    box(20, 3, 24, craneWhite, 0, 35, 0, g);
    box(70, 2.4, 3, craneBlue, -26, 40, 0, g);
    box(2, 18, 2, craneBlue, 4, 46, 0, g);
  }
  box(18, 10, 140, SM(0x7b2d26), -326, 2, -110, north);
  box(18, 12, 22, SM(0xf0ede6), -326, 13, -165, north);
  // castillo de Sagunto en su monte
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 14), SM(0x9c8b63)); hill.scale.set(650, 150, 260); hill.position.set(2300, -12, 3000); coast.add(hill);
  const stone = SM(0xd8c094);
  for (let xx = -470; xx <= 470; xx += 19) {
    const y = 150 * Math.sqrt(Math.max(0, 1 - (xx / 650) ** 2)) - 14;
    box(19.5, 12, 4, stone, 2300 + xx, y + 2, 3000 - 18);
    if (Math.abs(xx) % 114 < 19) box(11, 24, 11, stone, 2300 + xx, y + 8, 3000 - 18);
  }
  // sierra Calderona al fondo
  const ridge = (z, hmin, hmax, col, seed) => {
    const pts = [], N = 140;
    for (let i = 0; i <= N; i++) {
      const xx = -7000 + i * 14000 / N;
      const hh = hmin + (hmax - hmin) * (0.5 + 0.3 * Math.sin(xx * 0.0011 + seed) + 0.2 * Math.sin(xx * 0.0037 + seed * 2) + 0.1 * Math.sin(xx * 0.011));
      pts.push(xx, 0, z, xx, hh, z + rnd(-40, 40));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const idx = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    g.setIndex(idx); g.computeVertexNormals();
    coast.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })));
  };
  ridge(2300, 60, 230, 0x8e8a86, 1); ridge(3400, 200, 520, 0x9c9db4, 4);
}
