// Sombra del surfista sobre el agua: una mancha oscura y suave bajo la tabla (o el vehículo) que lo «apoya» en la ola.
// Va dentro de boardRoot, así que las copias de los demás surfistas (rig.js) también la llevan.
// En el aire se esconde: la tabla se separa del agua (bucle.js y online/jugadores.js).
import { boardRoot } from './raiz.js';

const cv = document.createElement('canvas'); cv.width = cv.height = 64;
{
  const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
}
const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: 0x02121c, transparent: true, opacity: 0.5,
  depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
export const sombra = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.85), mat);
sombra.name = 'sombra';
sombra.rotation.x = -Math.PI / 2;      // tumbada bajo la tabla
sombra.position.y = -0.012;            // justo por encima del agua (la tabla va 2 cm por encima de la cara de la ola)
sombra.renderOrder = 2;                // después de la ola, que es transparente
boardRoot.add(sombra);

// largo y ancho según lo que lleve: tabla corta, longboard, bodyboard, tabla de planchar, moto, kayak o zodiac
const TAMANOS = { long: [1.4, 1.1], body: [0.6, 1.2], iron: [1, 0.72], jet: [1.45, 1.5], kayak: [1.3, 1.0], zodiac: [1.65, 1.6] };
export function tamanoSombra(c) {
  const [l, a] = TAMANOS[c.board] || [1, 1];
  sombra.scale.set(l, a, 1);
  sombra.position.x = c.board === 'body' ? 0.18 : c.board === 'jet' ? -0.15 : 0;
}
