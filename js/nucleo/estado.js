// Estado de la partida, compartido por todos los módulos: G.score, G.state, G.px…
// Aquí van las variables que cambian varias partes del juego. Lo que solo usa un módulo se queda en ese módulo.
// Los nombres vienen del código original (en inglés); el comentario dice qué es cada uno.
export const G = {
  // --- la ola (mundo/ola.js la dibuja; la partida la mueve) ---
  curlX: 0,         // dónde está el tubo (la ola avanza en x)
  XB: 150,          // largo de la ola por delante del tubo (en el online crece con los surfistas que haya)
  grow: 1,          // tamaño de la ola (0,35 cuando se está formando → 1)
  pm: 1,            // cuánto rompe (0 = todavía no rompe, 1 = rompiendo con tubo)
  gtime: 0,         // tiempo para la animación de la espuma

  // --- la partida ---
  CH: null,         // personaje elegido (una ficha de datos/personajes.js); se pone al cargar
  state: 'title',   // en qué momento estamos: title, paddle, miss, popup, ride, wipe, between, duel, over
  menuView: 'main', // pantalla del menú: main, chars, controls, records
  score: 0,         // puntos de la sesión
  best: 0,          // mejor sesión en este móvil
  sessionT: 0,      // segundos que quedan de sesión
  waves: 0,         // olas cogidas en la sesión
  bestWave: 0,      // mejor ola de la sesión
  wavePts: 0,       // puntos de la ola actual (se pierden si te tiran)
  mult: 1,          // multiplicador de puntos (x1 a x3)
  clock: 0,         // reloj del juego (s)
  last: 0,          // instante del fotograma anterior (ms)
  msgTimer: 0,      // tiempo que le queda al mensaje en pantalla

  // --- el surfista en la ola ---
  // la tabla tiene rumbo (theta: 0 = paralela a la orilla, + sube la ola, - baja) y velocidad v en m/s
  px: 0,            // posición a lo largo de la ola
  h: 0.5,           // altura en la cara de la ola (0 = abajo, 1 = cresta)
  vh: 0,            // velocidad subiendo/bajando por la cara
  s: 1.3,           // velocidad relativa a la de la ola
  theta: 0,         // rumbo de la tabla
  v: 10,            // velocidad (m/s)
  omega: 0,         // velocidad de giro
  turnW: 0,         // giro suavizado
  turnLock: 0,      // sentido de una media vuelta ya empezada (bottom turn, cutback…)
  backT: 0,         // tiempo yendo de cara al tubo (para el cutback)
  crouch: 0.3,      // flexión de rodillas (0 de pie, 1 agachado)
  bank: 0,          // inclinación sobre el canto
  twistAmt: 0,      // giro de hombros
  rideT: 0,         // tiempo surfeando esta ola
  rideAngle: 0,     // ángulo de la tabla para el velocímetro
  curlSpeed: 8.5,   // velocidad del tubo (acelera durante la ola)
  pxStart: 0,       // dónde empezó la ola (para la distancia)
  tubeT: 0,         // tiempo dentro del tubo
  snapCD: 0,        // espera entre dos snaps
  pivotAng: 0,      // ángulo girado pivotando en el labio
  landSoft: 0,      // tiempo de recepción suave tras caer de un salto
  landV: 0,         // velocidad al caer
  landT: 1,         // tiempo desde que cayó (la tabla se asienta en 0,2 s)
  lastVh: 0,
  fs: null,         // maniobra TRUCO en marcha (180 · 180), o null
  btnTurn: null,    // rumbo pedido con el botón TRUCO, o null
  faceTurn: 0.9,    // hacia dónde mira la cara (0 = a la cámara, 0,9 = hacia donde va)
  windAmt: 0.2,     // viento en el pelo (0 en calma, 1 en el aire)

  // --- en el aire ---
  // giros pedidos (spinT/flipT) que se completan solos, grab y recepción guiada sobre la ola
  air: false,       // está en el aire
  airT: 0,          // tiempo en el aire
  airDur: 1,        // duración prevista del salto
  aVy: 0,           // velocidad vertical
  airVx: 10,        // velocidad hacia delante
  airTop: 0,        // altura máxima del salto
  airBack: false,   // salto hacia el tubo
  airSteer: 0,
  airHold: 0,       // tiempo con el dedo quieto (para agarrar la tabla)
  airHintShown: false,
  launchY: 0, launchZ: 0, landZ: 0,
  spin: 0, spinT: 0, // giro hecho y giro pedido (360, 720…)
  flip: 0, flipT: 0, // mortal hecho y pedido (rodeo, backflip)
  grab: 0, grabT: 0, // agarre de la tabla y tiempo agarrado
  trickTaps: 0,     // toques de TRUCO seguidos en el aire (1 = 360, 2 = rodeo…)
  trickWin: 0,      // tiempo para seguir contando toques
  supT: 0,          // tiempo de Superman (moto, kayak y zodiac)
  lastTrick: '',    // último truco (variar de truco premia)

  // --- remar, ponerse de pie, caerse ---
  pt: 0,            // tiempo remando
  windowOpen: false, // ya se puede tocar para ponerse de pie
  paddlePh: 0,      // fase de la remada
  popT: 0,          // tiempo poniéndose de pie
  missT: 0,         // tiempo tras perder la ola
  wipeT: 0,         // tiempo tras caerse

  // --- menú ---
  autoT: 1.3, autoSpin: 0, // el surfista que surfea solo de fondo en el menú
  titleT: 0,        // tiempo en el menú (mueve la cámara)
  showT: 0,         // tiempo en la ficha de personajes (el surfista posa)
};

// --- lo que pide el jugador (lo rellena entrada/controles.js) ---
export const keys = { up: false, down: false, left: false, right: false };
export const ptr = { down: false, id: null, x: 0, y: 0, ax: 0, ay: 0 };       // dedo izquierdo: trucos
export const stick = { id: null, x: 0, y: 0 };                                   // dedo derecho: rumbo de la tabla (-1..1)
