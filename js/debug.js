// Herramientas para probar desde la consola del navegador (y para herramientas/probar.mjs): window.__surf.
import { G, ptr } from './nucleo/estado.js';
import { DECKS, FINS, TORSOS } from './datos/disenos.js';
import { CHARS, FACES, PHOTOS } from './datos/personajes.js';
import { north } from './mundo/costa.js';
import { spawnDolphins } from './mundo/delfines.js';
import { camera, camLook, camPos, toScreen } from './mundo/motor.js';
import { HUMAN } from './surfista/cuerpo.js';
import { vehiculo } from './surfista/posturas.js';
import { boardRoot } from './surfista/raiz.js';
import { steerTarget } from './juego/fisica.js';
import { tryPush } from './online/empujones.js';
import { stealEnd, stealStart } from './online/robo.js';
import { upsertPeer } from './online/jugadores.js';
import { onMsg } from './online/mensajes.js';
import { MP } from './online/red.js';
import { DUEL, duelCount, duelSwing, startDuel } from './modos/disputa.js';

window.__HUMAN = HUMAN;
window.__surf = { datos: { CHARS, FACES, PHOTOS, DECKS, FINS, TORSOS, vehiculo }, spawnDolphins, upsertPeer, onMsg, MP, startDuel, DUEL, duelSwing, duelCount, tryPush, robo: { stealStart, stealEnd }, camPos, camLook, camera, north, get state() { return G.state; }, get score() { return G.score; }, get dx() { return G.px - G.curlX; }, get s() { return G.s; }, get h() { return G.h; }, get air() { return G.air; }, ptr, get theta() { return G.theta; }, get v() { return G.v; }, get airTop() { return G.airTop; }, get aVy() { return G.aVy; }, get tgt() { return steerTarget(); }, get bp() { return toScreen(boardRoot.position.x, boardRoot.position.y, boardRoot.position.z); }, };
