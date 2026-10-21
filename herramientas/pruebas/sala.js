// Guion: con la ola pública llena (12 surfistas), un jugador nuevo tiene que ir a pantalan-2.
//   (antes hay que llenar v2/salas/pantalan/players en el emulador; lo hace herramientas/pruebas/sala.mjs)
const MP = window.__surf.MP;
const t0 = performance.now();
while (!MP.connected && performance.now() - t0 < 15000) await new Promise(r => setTimeout(r, 100));
return { conectado: MP.connected, sala: MP.sala, menu: document.getElementById('mpMenu').textContent };
