// Diseños pintados (en un canvas) de las tablas, las quillas y los neoprenos de cada surfista.
// Las tablas que salen de una foto están en img/personajes/<id>/tabla.jpg.
import { avisar } from '../nucleo/eventos.js';

export const TORSOS = {
  juanp(x) { x.fillStyle = '#ee6a3a'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#16171a'; for (const y of [18, 32, 46]) x.fillRect(0, y, 64, 5); x.fillRect(28, 0, 8, 64); },
  bruno(x) { x.fillStyle = '#111214'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#7dff3a'; x.fillRect(0, 10, 64, 4); x.fillStyle = '#1e3f9e'; x.fillRect(0, 0, 64, 6); }
};

// texto legible aunque el mundo vaya espejado
function mirroredText(x, txt, px, py, font, color) {
  x.save(); x.translate(px, py); x.scale(-1, 1); x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.fillText(txt, 0, 0); x.restore();
}
function skeleton(x, cx, cy, len, col) {
  // esqueleto tumbado a lo largo del grip
  x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 3; x.lineCap = 'round';
  const s = len / 180;
  x.beginPath(); x.arc(cx + 80 * s, cy, 11 * s, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(cx + 68 * s, cy); x.lineTo(cx - 10 * s, cy); x.stroke();
  for (let i = 0; i < 5; i++) { const rx = cx + (55 - i * 9) * s; x.beginPath(); x.moveTo(rx, cy - 12 * s); x.quadraticCurveTo(rx - 4 * s, cy, rx, cy + 12 * s); x.stroke(); }
  x.beginPath(); x.moveTo(cx + 60 * s, cy - 4 * s); x.lineTo(cx + 25 * s, cy - 28 * s); x.lineTo(cx - 5 * s, cy - 30 * s); x.stroke();
  x.beginPath(); x.moveTo(cx + 60 * s, cy + 4 * s); x.lineTo(cx + 25 * s, cy + 28 * s); x.lineTo(cx - 5 * s, cy + 30 * s); x.stroke();
  x.beginPath(); x.moveTo(cx - 10 * s, cy - 6 * s); x.lineTo(cx - 55 * s, cy - 16 * s); x.lineTo(cx - 95 * s, cy - 14 * s); x.stroke();
  x.beginPath(); x.moveTo(cx - 10 * s, cy + 6 * s); x.lineTo(cx - 55 * s, cy + 16 * s); x.lineTo(cx - 95 * s, cy + 14 * s); x.stroke();
  x.restore();
}
function tailPad(x, px, py, w, h, bg, fg) {
  x.fillStyle = bg; x.fillRect(px, py, w, h);
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2;
  for (let k = -h; k < w; k += 10) { x.beginPath(); x.moveTo(px + k, py + h); x.lineTo(px + k + h * 0.6, py); x.stroke(); }
  skeleton(x, px + w * 0.5, py + h * 0.5, w * 0.92, fg);
}
// tablas sacadas directamente de la foto de su dueño (ya giradas y recortadas a su silueta)
const BOARD_PHOTOS = {
  jowi: 'img/personajes/jowi/tabla.jpg',
  gutty: 'img/personajes/gutty/tabla.jpg',
  xitano: 'img/personajes/xitano/tabla.jpg',
  alex: 'img/personajes/alex/tabla.jpg',
  ruben: 'img/personajes/ruben/tabla.jpg',
  blanco: 'img/personajes/blanco/tabla.jpg',
  akeny: 'img/personajes/akeny/tabla.jpg'
};
const boardImg = {};
for (const k in BOARD_PHOTOS) {
  const im = new Image();
  im.onload = () => avisar('foto-tabla', k);
  im.src = BOARD_PHOTOS[k]; boardImg[k] = im;
}
export const DECKS = {
  // Jowi: tabla NL Surfboard blanca, larguero, logo arcoíris hacia la punta y dos grips de esqueletos en la cola
  jowi(x, W, H) {
    x.fillStyle = '#f7f7f3'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c8b086'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    x.fillStyle = '#8f8f8f'; x.fillRect(0, 22, 26, H - 44);
    tailPad(x, 26, 24, 200, H / 2 - 26, '#d9d7d0', '#2f2f2f');
    tailPad(x, 26, H / 2 + 2, 200, H / 2 - 26, '#1d1d1d', '#e9e9e4');
    const cx = W * 0.74, cy = H * 0.66;
    ['#e94a8a', '#f2a33a', '#f4e04d', '#45b36b', '#3a8fd6', '#7b4bc4'].forEach((c, i) => { x.strokeStyle = c; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, 30 - i * 3.5, 0, Math.PI * 2); x.stroke(); });
    mirroredText(x, 'N', cx, cy + 8, 'bold 22px Arial', '#2c5a60');
    mirroredText(x, 'NL SURFBOARD', W * 0.42, H * 0.86, 'italic bold 34px Arial', '#1f5058');
  },
  // Litos: tabla Bradley blanca, grip negro en la cola, rayas negras en los cantos de la cola y logo negro
  litos(x, W, H) {
    x.fillStyle = '#f6f6f2'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#cdbf9f'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    x.fillStyle = '#151515';
    for (let i = 0; i < 6; i++) {
      const u = 40 + i * 30;
      x.beginPath(); x.moveTo(u, 0); x.lineTo(u + 14, 0); x.lineTo(u + 44, 46); x.lineTo(u + 30, 46); x.fill();
      x.beginPath(); x.moveTo(u, H); x.lineTo(u + 14, H); x.lineTo(u + 44, H - 46); x.lineTo(u + 30, H - 46); x.fill();
    }
    x.fillStyle = '#161616'; x.fillRect(20, 58, 175, H - 116);
    x.strokeStyle = '#3a3a3a'; x.lineWidth = 4;
    for (let v = 70; v < H - 64; v += 16) { x.beginPath(); x.moveTo(26, v); x.lineTo(188, v); x.stroke(); }
    x.fillStyle = '#2b2b2b'; x.fillRect(150, 58, 45, H - 116);
    const cx = W * 0.62, cy = H * 0.5;
    x.fillStyle = '#161616'; x.beginPath(); x.arc(cx + 95, cy, 20, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#f6f6f2'; x.beginPath(); x.arc(cx + 95, cy, 9, 0, Math.PI * 2); x.fill();
    mirroredText(x, 'Bradley', cx, cy + 12, 'italic bold 36px Georgia', '#161616');
  },
  photo(x, W, H, c) {
    const im = boardImg[c.id];
    if (im && im.complete && im.naturalWidth) x.drawImage(im, 0, 0, W, H);
    else (DECKS[c.deckFallback] || DECKS.plain)(x, W, H, c);
  },
  // Jowi (foto nueva): Bradley «Bell» de cantos negros, cubierta con entramado de rombos, banda gris central
  // con «Bradley» y el logo triangular BELL, protector negro en la punta y grip negro de tres piezas
  jowiBell(x, W, H) {
    x.fillStyle = '#e4e8e5'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#3a403d'; x.lineWidth = 1.6;
    for (let k = -H; k < W + H; k += 13) {
      x.beginPath(); x.moveTo(k, 0); x.lineTo(k + H, H); x.stroke();
      x.beginPath(); x.moveTo(k, H); x.lineTo(k + H, 0); x.stroke();
    }
    x.strokeStyle = 'rgba(58,64,61,.35)'; x.lineWidth = 1;
    for (let u = 0; u < W; u += 6.5) { x.beginPath(); x.moveTo(u, 0); x.lineTo(u, H); x.stroke(); }
    const g = x.createLinearGradient(0, H * 0.38, 0, H * 0.62);
    g.addColorStop(0, '#5f6461'); g.addColorStop(0.5, '#8c918e'); g.addColorStop(1, '#5f6461');
    x.fillStyle = g; x.fillRect(150, H * 0.38, W * 0.78, H * 0.24);
    // logo circular y «Bradley» a lo largo de la banda
    const lx = W * 0.62, ly = H * 0.5;
    x.fillStyle = '#121212'; x.beginPath(); x.arc(lx + 120, ly, 17, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#e4e8e5'; x.beginPath(); x.arc(lx + 120, ly, 7, 0, Math.PI * 2); x.fill();
    mirroredText(x, 'Bradley', lx, ly + 11, 'bold 34px Arial', '#121212');
    // logo BELL
    const bx = W * 0.36;
    x.save(); x.translate(bx, ly); x.rotate(Math.PI / 2);
    x.strokeStyle = '#121212'; x.lineWidth = 8; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(-30, 22); x.lineTo(0, -26); x.lineTo(30, 22); x.closePath(); x.stroke();
    x.restore();
    mirroredText(x, 'BELL', bx - 52, ly + 10, 'bold 26px Arial', '#121212');
    // cantos negros y protector de la punta
    x.fillStyle = '#121212'; x.fillRect(0, 0, W, 16); x.fillRect(0, H - 16, W, 16);
    x.beginPath(); x.moveTo(W * 0.93, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(W * 0.93, H); x.quadraticCurveTo(W * 0.885, H / 2, W * 0.93, 0); x.fill();
    // grip negro de tres piezas
    x.fillStyle = '#141414';
    x.beginPath(); x.moveTo(6, 18); x.lineTo(185, 34); x.lineTo(192, H / 2 - 36); x.lineTo(6, H / 2 - 28); x.fill();
    x.fillRect(6, H / 2 - 22, 196, 44);
    x.beginPath(); x.moveTo(6, H - 18); x.lineTo(185, H - 34); x.lineTo(192, H / 2 + 36); x.lineTo(6, H / 2 + 28); x.fill();
    x.strokeStyle = '#333'; x.lineWidth = 3;
    for (let u = 26; u < 190; u += 20) { x.beginPath(); x.moveTo(u, H / 2 - 16); x.lineTo(u, H / 2 + 16); x.stroke(); }
  },
  // Froskin: tabla blanca, círculo turquesa con hoja en la punta y la mitad de abajo pintada a mano en cuadros de colores
  zodiac(x, W, H) {
    x.fillStyle = '#d8212b'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#e9e9e6'; x.fillRect(W * 0.1, H * 0.3, W * 0.78, H * 0.4);
    x.fillStyle = '#3a3d42'; x.fillRect(0, H * 0.35, W * 0.1, H * 0.3);
    x.fillStyle = '#fff'; x.font = 'bold 64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('S.O.S', W * 0.5, H * 0.5);
  },
  kayak(x, W, H) {
    x.fillStyle = '#f2621f'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#d24d12'; x.fillRect(0, H * 0.82, W, H * 0.18);
    x.fillStyle = '#16171a'; x.beginPath(); x.ellipse(W * 0.45, H * 0.5, W * 0.11, H * 0.3, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('jackson', W * 0.75, H * 0.5);
  },
  jetski(x, W, H) {
    x.fillStyle = '#f2f2f0'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#15171a'; x.fillRect(0, 0, W, H * 0.1); x.fillRect(0, H * 0.9, W, H * 0.1);
    x.fillStyle = '#c8f230'; x.beginPath(); x.moveTo(W * 0.55, H * 0.12); x.lineTo(W, H * 0.5); x.lineTo(W * 0.55, H * 0.88); x.closePath(); x.fill();
    x.fillStyle = '#26b33a'; x.fillRect(W * 0.12, H * 0.3, W * 0.38, H * 0.4);
    x.fillStyle = '#15171a'; x.fillRect(W * 0.5, H * 0.15, W * 0.03, H * 0.7);
  },
  galluBB(x, W, H) {
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#2b2a7a'); g.addColorStop(1, '#5a2f8e');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#e8432e'; x.fillRect(0, 0, W, H * 0.12); x.fillRect(0, H * 0.88, W, H * 0.12);
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 5;
    x.beginPath(); x.ellipse(W * 0.55, H * 0.5, 110, 46, 0, 0, Math.PI * 2); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.7)'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GALLU', W * 0.55, H * 0.5);
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(W * (0.1 + i * 0.05), H * 0.2, 6, H * 0.6); }   // ranuras de la cola
  },
  joseNL(x, W, H) {
    x.fillStyle = '#e9ec4a'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#a8e6cf'; x.fillRect(0, 0, W * 0.3, H);
    x.fillStyle = '#16181c'; x.fillRect(W * 0.3, 0, W * 0.045, H);
    // logo de plumas sobre la franja
    x.save(); x.translate(W * 0.37, H * 0.5); x.fillStyle = '#16181c'; x.strokeStyle = '#f2f2ee'; x.lineWidth = 3;
    x.beginPath(); x.ellipse(0, 0, 44, 20, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(-30, i * 4); x.lineTo(32, i * 5.5); x.stroke(); }
    x.restore();
    // desgaste: manchas de cera y arena
    for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(190,170,120,' + (0.08 + Math.random() * 0.18) + ')'; x.beginPath(); x.ellipse(Math.random() * W, Math.random() * H, 6 + Math.random() * 30, 4 + Math.random() * 14, Math.random() * 3, 0, Math.PI * 2); x.fill(); }
  },
  froskin(x, W, H) {
    x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#cbbd96'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    // cuadros pintados con rotulador (de la cola hasta la mitad)
    const cols = ['#d9534f', '#2f5fb3', '#2e9e6e', '#f4f1e8', '#2f5fb3', '#d9534f', '#2e9e6e', '#3aa6a0'];
    const words = ['LOVE', 'OLA', 'YOUR', 'SURF', 'END', 'TIME', 'FROS', 'MAR'];
    let n = 0;
    for (let u = 120; u < W * 0.56; u += 92) for (let v = 0; v < H; v += 75, n++) {
      x.fillStyle = cols[(n * 3 + (u / 92 | 0)) % cols.length]; x.globalAlpha = 0.85;
      x.fillRect(u + (n % 3) * 3, v + 4, 90, 72); x.globalAlpha = 1;
      x.strokeStyle = 'rgba(20,20,20,.55)'; x.lineWidth = 2;
      for (let s = 0; s < 6; s++) { x.beginPath(); x.moveTo(u + 6 + s * 14, v + 8); x.lineTo(u + 12 + s * 14, v + 70); x.stroke(); }
      mirroredText(x, words[n % words.length], u + 45, v + 48, 'bold 22px "Comic Sans MS", Arial', 'rgba(15,15,15,.75)');
    }
    // grip negro en la cola
    x.fillStyle = '#121212'; x.beginPath(); x.moveTo(4, 30); x.lineTo(118, 40); x.lineTo(118, H - 40); x.lineTo(4, H - 30); x.fill();
    x.strokeStyle = '#2f2f2f'; x.lineWidth = 3;
    for (let v = 50; v < H - 40; v += 18) { x.beginPath(); x.moveTo(12, v); x.lineTo(110, v + 6); x.stroke(); }
    // círculo turquesa y hoja hacia la punta
    const cx = W * 0.8, cy = H * 0.56;
    x.fillStyle = '#39b3b8'; x.beginPath(); x.arc(cx, cy, 70, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#1d4f5a'; x.lineWidth = 4; x.stroke();
    x.fillStyle = '#5fc7c4'; x.strokeStyle = '#1d4f5a'; x.lineWidth = 3;
    x.beginPath(); x.ellipse(cx + 95, cy - 58, 40, 14, -0.6, 0, Math.PI * 2); x.fill(); x.stroke();
  },
  // Bruno (foto nueva): tabla blanca, larguero dorado, pegatina MADHATTER, logo triangular BELL y grip negro de tres piezas
  bruno(x, W, H) {
    x.fillStyle = '#f5f4ef'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c9a54a'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    // grip de tres piezas con ranuras
    x.fillStyle = '#141414';
    x.beginPath(); x.moveTo(8, 40); x.lineTo(190, 52); x.lineTo(196, H / 2 - 40); x.lineTo(8, H / 2 - 30); x.fill();
    x.fillRect(8, H / 2 - 24, 200, 48);
    x.beginPath(); x.moveTo(8, H - 40); x.lineTo(190, H - 52); x.lineTo(196, H / 2 + 40); x.lineTo(8, H / 2 + 30); x.fill();
    x.strokeStyle = '#3a3a3a'; x.lineWidth = 3;
    for (let u = 30; u < 190; u += 22) { x.beginPath(); x.moveTo(u, H / 2 - 18); x.lineTo(u, H / 2 + 18); x.stroke(); }
    // logo BELL: triángulo con hueco
    const bx = W * 0.38, by = H * 0.5;
    x.save(); x.translate(bx, by); x.rotate(Math.PI / 2);
    x.strokeStyle = '#141414'; x.lineWidth = 9; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(-36, 26); x.lineTo(0, -32); x.lineTo(36, 26); x.closePath(); x.stroke();
    x.restore();
    mirroredText(x, 'BELL', bx - 62, by + 12, 'bold 34px Arial', '#141414');
    // pegatina MADHATTER hacia la punta
    const mx = W * 0.7, my = H * 0.5;
    x.fillStyle = '#ffffff'; x.fillRect(mx - 95, my - 34, 190, 68);
    x.strokeStyle = '#141414'; x.lineWidth = 3; x.strokeRect(mx - 95, my - 34, 190, 68);
    mirroredText(x, 'MADHATTER', mx, my - 2, 'bold 30px Arial', '#141414');
    mirroredText(x, 'SURF & SKATE SUPPLY', mx, my + 24, 'bold 15px Arial', '#141414');
  },
  plain(x, W, H, c) {
    x.fillStyle = c.deckColor || '#ffffff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    x.fillStyle = '#1d1d1d'; x.fillRect(10, 30, 190, H - 60);
    mirroredText(x, c.name.toUpperCase(), W * 0.6, H * 0.6, 'bold 46px Arial', 'rgba(0,0,0,.5)');
  }
};
export const FINS = {
  black(x) { x.fillStyle = '#17181b'; x.fillRect(0, 0, 128, 128); },
  smoke(x) { x.fillStyle = '#3c4a45'; x.fillRect(0, 0, 128, 128); },
  jowiA(x) { x.fillStyle = '#2f6fd0'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#f6c431'; x.beginPath(); x.ellipse(70, 70, 70, 34, -0.7, 0, Math.PI * 2); x.fill(); x.fillStyle = '#111'; x.fillRect(40, 92, 18, 14); },
  jowiB(x) { x.fillStyle = '#121212'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#f2f2f2'; x.lineWidth = 7; for (let y = 10; y < 128; y += 24) { x.beginPath(); for (let k = 0; k <= 128; k += 16) x.lineTo(k, y + (k / 16 % 2 ? 9 : -9)); x.stroke(); } },
  jowiC(x) { x.fillStyle = '#121212'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#e6e3da'; x.beginPath(); x.arc(64, 70, 26, 0, Math.PI * 2); x.fill(); x.fillRect(52, 88, 24, 16); x.fillStyle = '#121212'; x.beginPath(); x.arc(54, 68, 7, 0, Math.PI * 2); x.arc(74, 68, 7, 0, Math.PI * 2); x.fill(); x.fillStyle = '#f6c431'; x.fillRect(20, 100, 20, 20); },
  litos(x) { x.fillStyle = '#2e3032'; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(240,240,235,.75)'; x.lineWidth = 3; for (let k = -128; k < 128; k += 18) { x.beginPath(); x.moveTo(k, 128); x.lineTo(k + 128, 0); x.stroke(); } x.fillStyle = '#e9e7df'; x.fillRect(14, 96, 40, 10); },
  froskin(x) { x.fillStyle = '#ecebe6'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#39b3b8'; x.fillRect(0, 100, 128, 10); },
  bruno(x) { x.fillStyle = '#26282b'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, 128, 20); },
  plain(x, c) { x.fillStyle = c.finColor || '#222'; x.fillRect(0, 0, 128, 128); }
};
