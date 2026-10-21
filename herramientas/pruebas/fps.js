// Guion: fps surfeando durante 8 s (con #bots, con 11 bots en el agua). Mide el tiempo de cada fotograma.
const S = window.__surf, $ = id => document.getElementById(id);
const esperar = ms => new Promise(r => setTimeout(r, ms));
const tecla = (code, tipo = 'keydown') => window.dispatchEvent(new KeyboardEvent(tipo, { code, bubbles: true }));
$('start').click();
for (let i = 0; i < 80 && S.state !== 'ride'; i++) { if (S.state === 'paddle') { tecla('Space'); await esperar(50); tecla('Space', 'keyup'); } await esperar(100); }
const tiempos = []; let t0 = performance.now(), prev = t0;
await new Promise(r => { const f = now => { tiempos.push(now - prev); prev = now; now - t0 < 8000 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
tiempos.sort((a, b) => a - b);
const media = tiempos.reduce((s, x) => s + x, 0) / tiempos.length;
return { fps: Math.round(1000 / media), peor1pc: Math.round(tiempos[Math.floor(tiempos.length * 0.99)]) + ' ms', estado: S.state, bots: S.MP.remotes.size };
