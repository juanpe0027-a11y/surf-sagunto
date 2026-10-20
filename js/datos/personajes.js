// Los personajes: aspecto, tabla, vehículo y estadísticas de cada uno, y sus fotos.
// Para añadir uno: su ficha en CHARS y sus fotos en img/personajes/<id>/ (ver docs/ARQUITECTURA.md).
import { G } from '../nucleo/estado.js';
import { leer } from '../nucleo/guardado.js';

export const seatedC = c => !!(c.jetski || c.kayak || c.zodiac);
// surfistas: aspecto y estilo (1–5). vel = empuje de la ola, air = altura y giro, tubo = aguante y puntos en el tubo
// fotos reales de cada surfista para su ficha de selección
export const PHOTOS = {
  jowi: 'img/personajes/jowi/foto.jpg',
  bruno: 'img/personajes/bruno/foto.jpg',
  litos: 'img/personajes/litos/foto.jpg',
  froskin: 'img/personajes/froskin/foto.jpg',
  gutty: 'img/personajes/gutty/foto.jpg',
  josenl: 'img/personajes/josenl/foto.jpg',
  xitano: 'img/personajes/xitano/foto.jpg',
  gallu: 'img/personajes/gallu/foto.jpg',
  juanp: 'img/personajes/juanp/foto.jpg',
  raul: 'img/personajes/raul/foto.jpg',
  krre: 'img/personajes/krre/foto.jpg',
  alex: 'img/personajes/alex/foto.jpg'
};
export const FACES = {
  jowi: 'img/personajes/jowi/cara.jpg',
  bruno: 'img/personajes/bruno/cara.jpg',
  litos: 'img/personajes/litos/cara.jpg',
  froskin: 'img/personajes/froskin/cara.jpg',
  gutty: 'img/personajes/gutty/cara.jpg',
  josenl: 'img/personajes/josenl/cara.jpg',
  xitano: 'img/personajes/xitano/cara.jpg',
  gallu: 'img/personajes/gallu/cara.jpg',
  raul: 'img/personajes/raul/cara.jpg',
  krre: 'img/personajes/krre/cara.jpg',
  alex: 'img/personajes/alex/cara.jpg'
};
export const CHARS = [
  // Jowi: neopreno largo azul con piernas azul marino, gafas de sol, barba y pelo despeinado; tabla NL Surfboard
  { id: 'jowi', goofy: true,  name: 'Jowi',  tag: 'Tabla Bradley Bell · neopreno azul', skin: 0xc48c6e, hair: 0x3a2618, style: 'messy', beard: false, glasses: false,
    suit: 0x1f4fc4, shorts: 0x172342, legs: 0x172342, longSuit: true, deck: 'photo', deckFallback: 'jowiBell', deckPhoto: true, fins: ['bruno', 'bruno', 'bruno'], sw: [0x1f4fc4, 0x172342, 0x8c918e], vel: 4, air: 3, tubo: 3 },
  // Litos: melena castaña con puntas aclaradas, barba de pocos días, neopreno largo negro con rayas blancas; tabla Bradley
  { id: 'litos', goofy: false, name: 'Litos', tag: 'Tabla Bradley · neopreno negro', skin: 0xd69c80, hair: 0x7a5636, style: 'surfer', beard: false, beardColor: 0x8a6748, glasses: false,
    suit: 0x121314, shorts: 0x121314, legs: 0x121314, longSuit: true, suitStripes: true, deck: 'litos', fins: ['litos', 'litos', 'litos'], sw: [0x121314, 0xf2f2ee, 0xf6f6f2], vel: 3, air: 4, tubo: 3 },
  // Bruno: pelo negro corto con degradado, barba negra poblada, neopreno negro con hombros azules y raya verde; tabla crema
  { id: 'bruno', goofy: false, name: 'Bruno', tag: 'Tabla Bell · rey del aéreo', skin: 0xc9987c, hair: 0x14100d, style: 'fade', beard: false, beardFull: true, glasses: false,
    suit: 0x111214, shorts: 0x111214, legs: 0x111214, upperArm: 0x1e3f9e, torso: 'bruno', longSuit: true, deck: 'bruno', fins: ['bruno', 'bruno', 'bruno'], sw: [0x111214, 0x1e3f9e, 0xf5f4ef], vel: 3, air: 5, tubo: 2 },
  // Froskin: rubia con melena larga al viento, neopreno largo negro; tabla blanca pintada a mano con círculo turquesa
  { id: 'froskin', goofy: true, name: 'Froskin', tag: 'Tabla pintada a mano', skin: 0xe2aa8c, hair: 0xd9b25f, style: 'long', beard: false, glasses: false,
    suit: 0x121316, shorts: 0x121316, legs: 0x121316, longSuit: true, deck: 'froskin', fins: ['froskin', 'froskin', 'froskin'], sw: [0x121316, 0xd9b25f, 0x39b3b8], vel: 3, air: 3, tubo: 4 },
  // Gutty: pelo canoso corto, neopreno negro sin mangas y piernas largas; longboard de resina multicolor (la más larga)
  { id: 'gutty', goofy: false, name: 'Gutty', tag: 'Longboard multicolor · la más larga', skin: 0xc48c6c, hair: 0x8e8b88, style: 'fade', beard: false, glasses: false,
    suit: 0x131416, shorts: 0x131416, legs: 0x2a2c30, longSuit: true, sleeveless: true, upperArm: 0xc48c6c, deck: 'photo', deckFallback: 'plain', deckPhoto: true,
    board: 'long', fins: ['smoke', 'smoke', 'smoke'], sw: [0x131416, 0x2fa35a, 0xe23b2e, 0xf2b51d], vel: 2, air: 1, tubo: 5 },
  // Jose NL: pelo moreno corto, top azul de manga corta con logo verde; longboard amarilla con la cola verde menta
  { id: 'josenl', goofy: false, name: 'Jose NL', tag: 'Longboard amarilla y menta', skin: 0xcd9676, hair: 0x231a14, style: 'fade', beard: false, glasses: false,
    suit: 0x1f3fae, shorts: 0x1a2240, upperArm: 0x1f3fae, deck: 'joseNL', board: 'long', fins: ['black', 'black', 'black'], sw: [0x1f3fae, 0xe9ec4a, 0xa8e6cf], vel: 2, air: 2, tubo: 4 },
  // Xitano: gorra H2O, gafas de espejo, perilla canosa y melena revuelta; neopreno azul marino con hombros azules; longboard azul
  { id: 'xitano', goofy: false, name: 'Xitano', tag: 'Longboard azul · gorra H2O', skin: 0xc48e70, hair: 0x4b4540, style: 'long', beard: false, glasses: false, cap: true,
    suit: 0x14213d, shorts: 0x14213d, legs: 0x14213d, upperArm: 0x2c5fae, longSuit: true, deck: 'photo', deckFallback: 'plain', deckPhoto: true,
    board: 'long', fins: ['black', 'black', 'black'], sw: [0x14213d, 0x2c5fae, 0x1c43b8], vel: 3, air: 2, tubo: 4 },
  // Gallu: bodyboarder; calvo con barba, licra amarilla flúor; va tumbado con aletas y también hace trucos
  { id: 'gallu', goofy: false, bodyboard: true, name: 'Gallu', tag: 'Bodyboard · va tumbado', skin: 0xc89270, hair: 0x1d1712, style: 'bald', beard: true, beardFull: true, beardColor: 0x1d1712, glasses: false,
    suit: 0xd4f53c, shorts: 0x1d2140, upperArm: 0xd4f53c, deck: 'galluBB', board: 'body', fins: ['black', 'black', 'black'], sw: [0xd4f53c, 0x2b2a7a, 0xe8432e], vel: 3, air: 4, tubo: 5 },
  // JuanP: no lleva tabla, va en su moto de agua Sea-Doo lima; barba, pelo rizado, gafas de sol y chaleco naranja
  { id: 'juanp', goofy: false, jetski: true, name: 'JuanP', tag: 'Moto de agua Sea-Doo', skin: 0xb07a5c, hair: 0x17110d, style: 'curly', beard: true, beardFull: true, beardColor: 0x17110d, glasses: true,
    suit: 0xee6a3a, torso: 'juanp', shorts: 0x15171a, upperArm: 0xb07a5c, deck: 'jetski', board: 'jet', fins: ['black', 'black', 'black'], sw: [0xc8f230, 0x26b33a, 0xee6a3a], vel: 5, air: 4, tubo: 2 },
  // Raúl: kayak naranja Jackson, pala negra de doble hoja, casco blanco, chaleco rojo sobre top negro
  { id: 'raul', goofy: false, kayak: true, helmet: true, name: 'Raúl', tag: 'Kayak Jackson naranja', skin: 0xbe886a, hair: 0x2a1d16, style: 'fade', beard: true, beardColor: 0x2a1d16, glasses: false,
    suit: 0xb3263a, upperArm: 0x15171c, forearm: 0x15171c, shorts: 0x15171c, legs: 0x15171c, longSuit: true, deck: 'kayak', board: 'kayak', fins: ['black', 'black', 'black'], sw: [0xf2621f, 0xb3263a, 0x15171c], vel: 3, air: 4, tubo: 4 },
  // Krre: zodiac de rescate roja (S.O.S Ajuntament de Sagunt); casco rojo, gafas de sol, chaleco naranja abierto y neopreno negro
  { id: 'krre', goofy: false, zodiac: true, helmet: true, helmetColor: 0xd8262b, name: 'Krre', tag: 'Zodiac de rescate S.O.S', skin: 0xcd9674, hair: 0x231811, style: 'fade', beard: false, glasses: false,
    suit: 0xf07a2c, upperArm: 0xcd9674, forearm: 0xcd9674, shorts: 0x15171c, legs: 0x15171c, longSuit: true, deck: 'zodiac', board: 'zodiac', fins: ['black', 'black', 'black'], sw: [0xd8212b, 0xf07a2c, 0x15171c], vel: 4, air: 3, tubo: 2 },
  // Alex: melena larga morena al viento y barba; neopreno negro de manga larga y pierna corta; tabla Lemon color arena con cola de pez
  { id: 'alex', goofy: true, name: 'Alex', tag: 'Tabla Lemon fish · melena al viento', skin: 0xc48c6c, hair: 0x2a1d14, style: 'long', beard: true, beardColor: 0x2a1d14, glasses: false,
    suit: 0x121316, upperArm: 0x121316, forearm: 0x121316, shorts: 0x121316, deck: 'photo', deckFallback: 'plain', deckPhoto: true, fins: ['black', 'black', 'black'], sw: [0x121316, 0xcfc2a6, 0x2a1d14], vel: 3, air: 3, tubo: 5 }
];
G.CH = CHARS.find(c => c.id === leer('personaje')) || CHARS[0];
