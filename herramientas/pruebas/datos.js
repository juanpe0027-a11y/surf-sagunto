// Guion de prueba de los datos: que cada personaje tenga sus fotos, su diseño de tabla y quillas, y un vehículo válido.
// Si añades un personaje y algo falla aquí, es que falta una foto o un nombre está mal escrito.
const { CHARS, FACES, PHOTOS, DECKS, FINS, TORSOS, vehiculo } = window.__surf.datos;
const res = { personajes: CHARS.length, problemas: [] };
const mal = t => res.problemas.push(t);
const existe = url => fetch(url, { method: 'HEAD', cache: 'no-store' }).then(r => r.ok, () => false);
const ids = new Set();
for (const c of CHARS) {
  if (ids.has(c.id)) mal(`id repetido: ${c.id}`); ids.add(c.id);
  if (!/^[a-z0-9]+$/.test(c.id)) mal(`${c.id}: el id solo puede tener minúsculas y números`);
  for (const k of ['name', 'tag', 'skin', 'hair', 'suit', 'deck', 'sw']) if (c[k] === undefined) mal(`${c.id}: falta ${k}`);
  for (const k of ['vel', 'air', 'tubo']) if (!(c[k] >= 1 && c[k] <= 5)) mal(`${c.id}: ${k} tiene que ir de 1 a 5`);
  if (!DECKS[c.deck]) mal(`${c.id}: no existe el diseño de tabla «${c.deck}»`);
  if (c.deck === 'photo' && !DECKS[c.deckFallback]) mal(`${c.id}: deck 'photo' necesita un deckFallback que exista`);
  for (const f of c.fins || []) if (!FINS[f]) mal(`${c.id}: no existe la quilla «${f}»`);
  if (c.torso && !TORSOS[c.torso]) mal(`${c.id}: no existe el dibujo de neopreno «${c.torso}»`);
  if (!vehiculo(c)) mal(`${c.id}: vehículo desconocido`);
  if (PHOTOS[c.id] && !(await existe(PHOTOS[c.id]))) mal(`${c.id}: no se encuentra ${PHOTOS[c.id]}`);
  if (FACES[c.id] && !(await existe(FACES[c.id]))) mal(`${c.id}: no se encuentra ${FACES[c.id]}`);
  if (c.deck === 'photo' && !(await existe(`img/personajes/${c.id}/tabla.jpg`))) mal(`${c.id}: deck 'photo' pero no hay img/personajes/${c.id}/tabla.jpg`);
}
return res;
