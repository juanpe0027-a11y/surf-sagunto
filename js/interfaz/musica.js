import { $ } from '../nucleo/util.js';

// ---------- música: «Fiesta surfera» de Bruno Fumumo ----------
const music = $('music'), musicBtn = $('musicBtn');
music.volume = 0.55;
let musicOn = true;
try { musicOn = localStorage.getItem('surf-sagunto-music') !== 'off'; } catch (e) {}
function setMusicBtn() {
  musicBtn.textContent = 'Música: ' + (musicOn ? 'sí' : 'no'); musicBtn.setAttribute('aria-pressed', musicOn);
  const hm = $('hudMute'); hm.setAttribute('aria-pressed', !musicOn); hm.setAttribute('aria-label', musicOn ? 'Silenciar música' : 'Activar música');
}
function tryPlay() { if (!musicOn || !music.paused || document.hidden) return; const p = music.play(); if (p && p.catch) p.catch(() => {}); }
music.addEventListener('error', async () => {
  // si el visor no deja reproducir el archivo directamente, se carga como blob
  if (music.dataset.fallback) { $('nowPlaying').textContent = 'No se ha podido cargar la música'; return; }
  music.dataset.fallback = '1';
  try { const r = await fetch('audio/musica.mp4'); if (!r.ok) throw 0; music.src = URL.createObjectURL(await r.blob()); tryPlay(); }
  catch (e) { $('nowPlaying').textContent = 'No se ha podido cargar la música'; }
});
function setMusic(on) {
  musicOn = on; setMusicBtn();
  try { localStorage.setItem('surf-sagunto-music', musicOn ? 'on' : 'off'); } catch (e) {}
  if (musicOn) tryPlay(); else music.pause();
}
musicBtn.addEventListener('click', () => setMusic(!musicOn));
$('hudMute').addEventListener('click', () => setMusic(!musicOn));
// volumen
const volEl = $('vol');
try { const v = localStorage.getItem('surf-sagunto-vol'); if (v !== null) volEl.value = v; } catch (e) {}
music.volume = volEl.value / 100;
volEl.addEventListener('input', () => {
  music.volume = volEl.value / 100;
  try { localStorage.setItem('surf-sagunto-vol', volEl.value); } catch (e) {}
  if (volEl.value > 0 && !musicOn) setMusic(true);
});
window.addEventListener('pointerdown', tryPlay, true);
window.addEventListener('keydown', tryPlay, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) music.pause(); else tryPlay(); });
setMusicBtn();
