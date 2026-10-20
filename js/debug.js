import { G, ptr } from './nucleo/estado.js';
import { camera, camLook, camPos, toScreen } from './mundo/motor.js';
import { north } from './mundo/costa.js';
import { spawnDolphins } from './mundo/delfines.js';
import { boardRoot } from './surfista/tabla.js';
import { steerTarget } from './juego/fisica.js';
import { MP } from './online/red.js';
import { upsertPeer } from './online/jugadores.js';
import { tryPush } from './online/empujones.js';
import { onMsg } from './online/mensajes.js';
import { DUEL, duelCount, duelSwing, startDuel } from './modos/disputa.js';

window.__surf = { spawnDolphins, upsertPeer, onMsg, MP, startDuel, DUEL, duelSwing, duelCount, tryPush, camPos, camLook, camera, north, get state() { return G.state; }, get score() { return G.score; }, get dx() { return G.px - G.curlX; }, get s() { return G.s; }, get h() { return G.h; }, get air() { return G.air; }, ptr, get theta() { return G.theta; }, get v() { return G.v; }, get tgt() { return steerTarget(); }, get bp() { return toScreen(boardRoot.position.x, boardRoot.position.y, boardRoot.position.z); }, };
