import { angDiff, clamp, lerp, rnd, sm, TAU, V3 } from '../nucleo/util.js';
import { G, keys, ptr, stick } from '../nucleo/estado.js';
import { basisQuat, vF, vN, vT, vZ } from '../mundo/formas.js';
import { face, faceAt, HW } from '../mundo/ola.js';
import { acc, emit, splash } from '../mundo/particulas.js';
import { boardRoot } from '../surfista/tabla.js';
import { addPts, bump } from './puntos.js';
import { doTrick, land, LAND_H, launch, lipSpray, snap } from './trucos.js';
import { wipeout } from './sesion.js';
import { chip, showTrick } from '../interfaz/hud.js';

export const LAND_A = 0.15, LAND_SOFT = 1.4;   // al caer: tabla casi horizontal y un rato de recepción suave
export const qLandPose = new THREE.Quaternion(), qLand = new THREE.Quaternion(), qAirBase = new THREE.Quaternion();
export const aPos = V3(0, 0, 0), qLaunch = new THREE.Quaternion(), qRide = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), qTmp2 = new THREE.Quaternion();
// en la ola, TRUCO gira la tabla 180°: hacia el tubo (en contra de la ola) y, otra vez, hacia fuera

// la tabla apunta exactamente hacia donde va y se inclina sobre el canto según la fuerza del giro
function rideOrientation() {
  vT.set(0, face.ty, face.tz);
  vF.set(Math.cos(G.theta), 0, 0).addScaledVector(vT, Math.sin(G.theta)).normalize();
  basisQuat(vF, V3(0, -face.tz, face.ty), qRide);
  qTmp.setFromAxisAngle(V3(1, 0, 0), G.bank);
  qRide.multiply(qTmp);
  G.rideAngle = Math.abs(G.theta) * 57.3;
}
export function placeBoardOnFace() {
  faceAt(G.px, G.h);
  rideOrientation();
  if (G.state !== 'popup') {
    if (G.landT < 0.2) THREE.Quaternion.slerp(qLand, qRide, boardRoot.quaternion, sm(0, 0.2, G.landT));   // recepción suave
    else boardRoot.quaternion.copy(qRide);
  }
  boardRoot.position.set(G.px, face.y + 0.02, face.z);
}
// el dedo marca hacia dónde quieres que apunte la tabla (relativo al surfista en pantalla)
export function steerTarget() {
  if (G.btnTurn !== null) {
    if (G.air || G.state !== 'ride' || Math.abs(angDiff(G.btnTurn, G.theta)) < 0.12) G.btnTurn = null;
    else return G.btnTurn;
  }
  // teclas: ← sigue la ola, → vuelve hacia el tubo, ↑ sube, ↓ baja (combinables)
  if (keys.up || keys.down || keys.left || keys.right) {
    const back = keys.right || (!keys.left && Math.cos(G.theta) < 0);
    const a = keys.up ? 1.0 : keys.down ? -1.0 : 0;
    return back ? (a >= 0 ? Math.PI - a : -Math.PI - a) : a;
  }
  // joystick: la punta de la tabla apunta hacia donde llevas el círculo
  // (izquierda = sigue la ola, arriba = sube, abajo = baja, derecha = de punta hacia el tubo)
  if (stick.id === null || stick.x * stick.x + stick.y * stick.y < 0.09) return null;
  return Math.atan2(-stick.y, -stick.x);
}

// ---------- física de la ola ----------
export function rideStep(dt, hT) {
  G.rideT += dt;
  G.curlSpeed = 8.5 + Math.min(3.5, G.rideT * 0.035);
  G.curlX += G.curlSpeed * dt;
  G.snapCD = Math.max(0, G.snapCD - dt);
  if (!G.air) {
    // giro: la tabla rota hacia el rumbo pedido con velocidad de giro limitada (trazadas en arco)
    // giro: la tabla rota hacia el rumbo pedido por el camino más corto, con velocidad de giro
    // limitada (trazadas en arco). Rumbo completo de 360°: se puede volver de punta hacia el tubo.
    const prev = G.theta;
    // tras caer, si no llevas el círculo, la tabla se endereza y sigue recta por la ola (no se va al plano)
    if (hT === null && G.landSoft > 0 && !G.fs) hT = Math.cos(G.theta) < 0 ? Math.PI : 0;
    if (G.fs) {
      // maniobra TRUCO: 180 rápido en el sitio → recto hacia el tubo a la misma altura → 180 de vuelta
      G.fs.t += dt;
      const RATE = 10.5;                                      // ~0,3 s por cada 180
      if (G.fs.ph === 1) {
        G.theta -= RATE * dt;                                   // la punta barre hacia abajo y la cola lanza agua arriba
        if (G.theta <= -Math.PI) { G.theta = Math.PI; G.fs.ph = 2; G.fs.t = 0; }
      } else if (G.fs.ph === 2) {
        G.theta = Math.PI;
        if (G.fs.t > 0.9 || G.px - G.curlX < 7) { G.fs.ph = 3; G.fs.t = 0; G.theta = -Math.PI; }
      } else {
        G.theta += RATE * dt;
        if (G.theta >= 0) {
          G.theta = 0; G.fs = null; G.turnLock = 0; G.backT = -9;
          const pts = addPts(450 + G.v * 30); chip('180 · 180 +' + pts); showTrick('Doble 180', pts); bump(0.15);
        }
      }
    } else if (hT !== null) {
      let d = angDiff(hT, G.theta);
      // media vuelta: abajo se gira subiendo (bottom turn), arriba se gira bajando (cutback)
      if (Math.abs(d) > 1.6) {
        if (!G.turnLock) {
          // abajo del todo: bottom turn subiendo. En el labio, si vuelves hacia el tubo: re-entry, la tabla
          // pivota por encima de la cresta sin salir de la ola. En medio de la cara: cutback bajando.
          // en medio de la cara: por el camino más corto (giro libre)
          if (G.h >= 0.2 && G.h <= 0.72) G.turnLock = Math.sign(d);
          else {
            const wantUp = G.h < 0.2 || (G.h > 0.72 && Math.cos(hT) < 0);
            G.turnLock = (Math.sin(G.theta + d / 2) > 0) === wantUp ? Math.sign(d) : -Math.sign(d);
          }
        }
        if (Math.sign(d) !== G.turnLock) d -= Math.sign(d) * TAU;   // mantiene el sentido del giro empezado
      } else G.turnLock = 0;
      const rate = (6.2 + 0.18 * G.v) * (G.btnTurn !== null ? 1.35 : 1);   // más velocidad = giros más rápidos; TRUCO pivota aún más rápido
      // la velocidad de giro arranca y frena suave (sin tirones)
      G.turnW = lerp(G.turnW, clamp(d * 8, -rate, rate), 1 - Math.exp(-dt * 14));
      G.theta += G.turnW * dt;
    } else { G.turnW *= Math.exp(-dt * 10); G.theta += G.turnW * dt; }
    G.theta = angDiff(G.theta, 0);
    G.omega = lerp(G.omega, angDiff(G.theta, prev) / Math.max(dt, 1e-3), 1 - Math.exp(-dt * 10));
    faceAt(G.px, G.h);
    const Hc = face.Hc, dxw = G.px - G.curlX, cs = Math.cos(G.theta), sn = Math.sin(G.theta);
    // energía: la gravedad en la pendiente de la cara y el empuje de la ola cerca del tubo
    // la ola empuja en toda la cara (más cuanto más alta), y aún más en el pocket junto al tubo
    const cv = 0.85 + 0.05 * G.CH.vel, hf = 0.5 + 0.5 * sm(0.1, 0.6, G.h), fwd = 0.55 + 0.45 * Math.max(cs, 0);
    const pushNear = 4.0 * (1 - sm(4, 30, dxw)) * Math.max(G.pm, 0.4);
    const pushFace = 4.6 * clamp(Hc / HW, 0.3, 1) * sm(-1, 3, dxw);
    const push = (pushNear + pushFace) * cv * hf * fwd;
    // bombear: subir y bajar con giros suaves en la cara da velocidad; los giros bruscos la quitan
    const aw = Math.abs(G.omega), pump = (G.h > 0.15 && G.h < 0.9 ? 1 : 0.3) * (aw < 3 ? aw * 0.55 : 1.65 - (aw - 3) * 0.45);
    // abajo, en el plano, la ola no empuja y el agua frena: te quedas más lento que la ola y el tubo te alcanza.
    // A media altura y arriba de la cara se va más rápido.
    const low = 1 - sm(0.2, 0.45, G.h);
    const zone = -0.8 + 3.2 * sm(0.06, 0.5, G.h) - 1.0 * sm(0.9, 1, G.h);
    // justo después de caer de un salto: la pendiente apenas tira y el agua frena un poco (recepción suave)
    const soft = G.landSoft > 0 ? G.landSoft / LAND_SOFT : 0; G.landSoft = Math.max(0, G.landSoft - dt);
    G.v += (-9.8 * 0.55 * sn * (1 - 0.8 * soft) + push * (1 - 0.45 * low) * (1 - 0.5 * soft) + pump + zone - 0.033 * G.v * G.v - 0.22 * G.v * low - 0.5 * G.v * soft) * dt;
    G.v = clamp(G.v, 2, 19);
    if (soft > 0) G.v = Math.min(G.v, G.landV + 3 * (1 - soft));      // tras caer, la velocidad vuelve poco a poco
    if (G.fs) {
      // misma línea: la altura no cambia y la tabla derrapa sin perder casi velocidad
      G.v = Math.max(G.fs.v0 * (G.fs.ph === 2 ? 0.92 : 0.85), 6);
      G.px += G.v * cs * (G.fs.ph === 2 ? 1 : 0.55) * dt;
      if (G.fs.ph !== 2) lipSpray(dt * 0.8);
    } else {
      G.px += G.v * cs * dt;
      G.h += G.v * sn / (Hc * 1.25) * dt;
    }
    G.vh = G.v * sn / (Hc * 1.25);
    if (G.h < 0.03) { G.h = 0.03; if (sn < -0.05) G.theta = cs >= 0 ? -0.05 : -Math.PI + 0.05; }
    if (G.h >= 1) {
      if (sn > 0.35 && G.v > 6.5 && !G.turnLock && G.state !== 'popup' && G.state !== 'title' || (G.state === 'title' && sn > 0.35)) launch();
      else { G.h = 1; if (!G.turnLock && sn > -0.05) G.theta = cs >= 0 ? -0.05 : -Math.PI + 0.05; G.v *= 1 - (G.turnLock ? 0.9 : 0.5) * dt; }
    }
    // giro en el labio: mientras la tabla pivota arriba, abanico de spray; al bajar se puntúa
    if (!G.air && G.state === 'ride') {
      const pivoting = G.h > 0.72 && (G.turnLock !== 0 || Math.abs(G.omega) > 2.5);
      if (pivoting) { G.pivotAng += Math.abs(angDiff(G.theta, prev)); if (Math.abs(G.omega) > 2) lipSpray(dt); }
      else if (G.pivotAng > 0) {
        if (G.snapCD <= 0 && G.pivotAng > 1.0) snap(G.pivotAng);
        G.pivotAng = 0;
      }
    }
    // rebote en la espuma: si vuelves de punta hacia el tubo y llegas a la espuma, rebotas y sigues
    // en el labio, junto al tubo, la ola te arrastra mientras giras (re-entry en el pocket)
    if (!G.air && G.state === 'ride' && G.h > 0.75 && (G.turnLock || G.pivotAng > 0) && G.px - G.curlX < 3) G.px = G.curlX + 3;
    if (!G.air && G.state === 'ride' && G.h <= 0.75 && Math.cos(G.theta) < -0.2 && G.px - G.curlX < 1.2) {
      if (G.v > 5) {
        if (G.backT > 0.35) { const c = addPts(200 + G.v * 25); chip('Cutback +' + c); showTrick('Cutback + rebote', c); bump(0.12); }
        G.theta = Math.PI - G.theta; G.theta = angDiff(G.theta, 0); G.omega = 0; G.crouch = 1; G.backT = 0; G.turnLock = 0;
        G.v = Math.max(G.v * 0.9, G.curlSpeed + 3.5);           // la espuma te empuja y sales disparado
        splash(boardRoot.position, 40, 1.1);
        const p = addPts(250); chip('Rebote en la espuma +' + p); bump(0.12);
      } else wipeout('Te has metido en la espuma sin velocidad');
    }
    G.s = G.v * Math.cos(G.theta) / 8.5;
    // inclinación sobre el canto y flexión de rodillas según la fuerza del giro
    const g = G.omega * G.v;
    G.bank = lerp(G.bank, clamp(-g * 0.05, -0.85, 0.85), 1 - Math.exp(-dt * 8));
    G.twistAmt = lerp(G.twistAmt, clamp(G.omega * 0.32, -0.7, 0.7), 1 - Math.exp(-dt * 6));
    G.crouch = lerp(G.crouch, clamp(0.25 + Math.abs(g) * 0.06 + (G.h < 0.15 ? 0.15 : 0), 0, 1), 1 - Math.exp(-dt * 7));
    // cutback: completar una vuelta de cara al tubo y volver a salir
    if (G.state === 'ride' && !G.fs) {
      if (Math.cos(G.theta) < -0.3) G.backT += dt;
      else if (G.backT > 0.25 && Math.cos(G.theta) > 0.3) {
        const p = addPts(200 + G.v * 25); chip('Cutback +' + p); showTrick('Cutback', p); bump(0.12); G.backT = 0;
      } else if (Math.cos(G.theta) > 0.3) G.backT = 0;
    }
  } else {
    G.airT += dt;
    G.aVy -= 9.8 * dt; aPos.y += G.aVy * dt; G.airTop = Math.max(G.airTop, aPos.y - G.launchY);
    let grabbing = false;
    if (G.state !== 'title') {
      // gestos: deslizar a un lado = 360 en ese sentido (hasta 720), deslizar abajo = rodeo, dedo quieto = grab
      // botón TRUCO: las pulsaciones seguidas eligen el truco; mantenerlo pulsado agarra la tabla
      if (G.trickTaps && (G.trickWin -= dt) <= 0) { doTrick(G.trickTaps); G.trickTaps = 0; }
      if (ptr.down) G.airHold += dt; else G.airHold = 0;
      G.supT = Math.max(0, G.supT - dt);
      grabbing = (ptr.down && G.airHold > 0.22) || keys.up || G.supT > 0;
    }
    // giros suaves: arrancan con fuerza y frenan justo al cerrar, siempre a tiempo de caer
    const left = Math.max(0.22, (G.airDur - G.airT) * 0.8);
    const sR = Math.max(8, Math.abs(G.spinT - G.spin) / left) * (0.9 + 0.03 * G.CH.air), fR = Math.max(7, Math.abs(G.flipT - G.flip) / left);
    G.spin += clamp((G.spinT - G.spin) * 10 * dt, -sR * dt, sR * dt);
    G.flip += clamp((G.flipT - G.flip) * 10 * dt, -fR * dt, fR * dt);
    if (Math.abs(G.spinT - G.spin) < 0.02) G.spin = G.spinT;
    if (Math.abs(G.flipT - G.flip) < 0.02) G.flip = G.flipT;
    G.grab = lerp(G.grab, grabbing ? 1 : 0, 1 - Math.exp(-dt * 12));
    if (grabbing) G.grabT += dt;
  }
  if (G.air) {
    G.px += G.airVx * dt;
    G.crouch = lerp(G.crouch, 0.95, 1 - Math.exp(-dt * 6));
    aPos.x = G.px;
    faceAt(G.px, LAND_H);
    aPos.z = lerp(G.launchZ, face.z, sm(0, G.airDur, G.airT));
    if (G.aVy < 0 && aPos.y <= face.y + 0.1) land();
  }
}
// spray de la tabla al cortar y estela de la moto de agua y la zodiac
export function estelaTabla(dt) {
  if (!G.air && (G.state === 'ride' || G.state === 'title' || G.state === 'popup') && Math.abs(G.omega * G.v) > 1.2) {
    acc.board += dt * 34 * Math.abs(G.omega * G.v);
    vF.set(1, 0, 0).applyQuaternion(boardRoot.quaternion);
    vN.set(0, 1, 0).applyQuaternion(boardRoot.quaternion);
    vZ.set(0, 0, 1).applyQuaternion(boardRoot.quaternion);
    const bx = boardRoot.position.x - vF.x * 0.8, by = boardRoot.position.y + 0.05, bz = boardRoot.position.z - vF.z * 0.8;
    while (acc.board >= 1) {
      acc.board--;
      const a = rnd(2, 4.5), b = rnd(1.5, 4.5), c = rnd(0.5, 3);
      emit(bx, by, bz, vZ.x * a + vN.x * b - vF.x * c, vZ.y * a + vN.y * b - vF.y * c + 1, vZ.z * a + vN.z * b - vF.z * c, rnd(0.45, 0.8), rnd(0.15, 0.45), 0.85, 1);
    }
  }
  if ((G.CH.jetski || G.CH.zodiac) && !G.air && (G.state === 'ride' || G.state === 'popup' || G.state === 'title')) {
    acc.jet = (acc.jet || 0) + dt * 110 * Math.min(1.5, G.v / 9);
    vF.set(1, 0, 0).applyQuaternion(boardRoot.quaternion);
    const sx = boardRoot.position.x - vF.x * 1.45, sy = boardRoot.position.y + 0.15, sz = boardRoot.position.z - vF.z * 1.45;
    while (acc.jet >= 1) { acc.jet--; emit(sx, sy, sz, -vF.x * rnd(3, 6) + rnd(-0.6, 0.6), rnd(2.5, 5.5), -vF.z * rnd(3, 6) + rnd(-0.6, 0.6), rnd(0.5, 0.9), rnd(0.15, 0.4), 0.85, 1); }
  }
  if (G.state === 'paddle' && Math.random() < dt * 8) {
    emit(boardRoot.position.x + rnd(-0.3, 0.3), boardRoot.position.y, boardRoot.position.z + rnd(-0.5, 0.5), rnd(-0.5, 0.5), rnd(0.5, 1.5), rnd(0, 1), 0.5, rnd(0.15, 0.35), 0.7, 1);
  }
}
