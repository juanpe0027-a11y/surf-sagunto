// Mensajes: frases rápidas, texto y notas de voz.
import { $ } from '../nucleo/util.js';
import { say } from '../juego/hud.js';
import { gotPushed } from './empujones.js';
import { mensaje } from './protocolo.js';
import { chatLog, chatP, MP } from './red.js';
import { botReply } from '../modos/bots.js';
import { duelCount, duelGotHit, startDuel } from '../modos/disputa.js';

function cleanText(text) { return (text || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁤]/g, '').trim().slice(0, 80); }
function showMine(text) { const me = $('myBub'); me.textContent = text; me.hidden = false; MP.myMsgT = 5; }
export function logMsg(who, text) {
  const d = document.createElement('div');
  const w = document.createElement('b'); w.textContent = who + ': '; const s = document.createElement('span'); s.textContent = text;
  d.append(w, s); chatLog.prepend(d);
  while (chatLog.children.length > 4) chatLog.lastChild.remove();
  setTimeout(() => d.classList.add('old'), 9000);
}
export function pushMsg(obj) {
  if (MP.sim) { if (obj.tx) botReply(); return; }
  if (!MP.base) { say('Sin conexión al modo online', 2); return; }
  MP.base.child('msgs').push(mensaje(obj)).catch(() => say('No se ha podido enviar', 2));
  // limpieza: los mensajes de hace más de 3 minutos se borran
  MP.base.child('msgs').orderByChild('at').endAt(Date.now() - 180000).limitToFirst(20).once('value', s => s.forEach(c => { c.ref.remove(); }));
}
function sendText(text) {
  text = cleanText(text); if (!text) return;
  showMine(text); logMsg('Tú', text); chatP.hidden = true;
  pushMsg({ tx: text });
}
const voiceEl = $('voice');
export function onMsg(m) {
  if (!m || m.id === MP.myId) return;
  if (typeof m.at === 'number' && m.at < MP.startAt - 3000) return;    // solo lo nuevo
  const R = MP.remotes.get(m.id), who = (typeof m.nm === 'string' && m.nm.slice(0, 20)) || (R && R.ch.name) || 'Surfista';
  if (m.ev === 'push') { if (m.to === MP.myId) { gotPushed(who); duelCount(R); } return; }
  if (m.ev === 'duel') { if (m.to === MP.myId && R) setTimeout(() => startDuel(R), 1200); return; }
  if (m.ev === 'hit') { if (m.to === MP.myId) duelGotHit(m.id, m.ty); return; }
  if (typeof m.tx === 'string') {
    const text = cleanText(m.tx);
    if (R) { const b = R.label.querySelector('.mpbub'); b.textContent = text; b.hidden = false; R.msgT = 5; }
    logMsg(who, text);
  } else if (typeof m.au === 'string' && /^data:audio\/[a-z0-9.+;=-]+;base64,/i.test(m.au)) {
    if (R) { const b = R.label.querySelector('.mpbub'); b.textContent = '🔊 Nota de voz'; b.hidden = false; R.msgT = 5; }
    logMsg(who, '🔊 nota de voz');
    try { voiceEl.src = m.au; voiceEl.volume = 1; const p = voiceEl.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
}
$('hudChat').addEventListener('click', () => { chatP.hidden = !chatP.hidden; if (!chatP.hidden) $('chatIn').focus({ preventScroll: true }); });
chatP.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => sendText(b.dataset.q)));
$('chatForm').addEventListener('submit', e => { e.preventDefault(); const i = $('chatIn'); sendText(i.value); i.value = ''; });
$('chatClose').addEventListener('click', () => { chatP.hidden = true; });

// notas de voz: mantener pulsado 🎤, hablar y soltar (máx. 8 s)
const micBtn = $('hudMic');
let rec = null, recChunks = [], recTimer = 0, micStream = null, recMime = '';
const VOZ_MAX = 73000;   // bytes; en base64 ocupa 4/3 y tiene que caber en los 100.000 caracteres de las reglas
function unlockVoice() { try { voiceEl.muted = true; const p = voiceEl.play(); if (p && p.then) p.then(() => { voiceEl.pause(); voiceEl.muted = false; }).catch(() => { voiceEl.muted = false; }); } catch (e) {} }
window.addEventListener('pointerdown', unlockVoice, { once: true, capture: true });
async function startRec(e) {
  e.preventDefault();
  if (rec) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) { say('Este navegador no permite grabar audio', 2.5); return; }
  try { if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (err) { say('Sin permiso para el micrófono', 2.5); return; }
  recMime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  recChunks = [];
  rec = new MediaRecorder(micStream, recMime ? { mimeType: recMime, audioBitsPerSecond: 16000 } : undefined);
  // las reglas de Firebase no admiten notas de más de ~73 KB: si el móvil graba con más calidad
  // de la pedida (el iPhone lo hace), se corta antes de los 8 s
  let recBytes = 0;
  rec.ondataavailable = ev => { if (ev.data && ev.data.size) { recChunks.push(ev.data); recBytes += ev.data.size; if (recBytes > VOZ_MAX - 6000) stopRec(); } };
  rec.onstop = () => {
    const blob = new Blob(recChunks, { type: rec.mimeType || recMime || 'audio/webm' });
    rec = null; micBtn.classList.remove('rec');
    if (blob.size < 1500) return;                       // pulsación demasiado corta
    if (blob.size > VOZ_MAX) { say('Nota de voz demasiado larga', 2); return; }
    const fr = new FileReader();
    fr.onload = () => { pushMsg({ au: String(fr.result) }); showMine('🎤 Nota de voz'); logMsg('Tú', '🎤 nota de voz'); };
    fr.readAsDataURL(blob);
  };
  rec.start(500); micBtn.classList.add('rec');
  clearTimeout(recTimer); recTimer = setTimeout(stopRec, 8000);
}
function stopRec() { clearTimeout(recTimer); if (rec && rec.state === 'recording') rec.stop(); }
micBtn.addEventListener('pointerdown', startRec);
micBtn.addEventListener('pointerup', stopRec);
micBtn.addEventListener('pointercancel', stopRec);
micBtn.addEventListener('pointerleave', stopRec);
micBtn.addEventListener('contextmenu', e => e.preventDefault());
