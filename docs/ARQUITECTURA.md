# Arquitectura — Surf Puerto de Sagunto

Estructura a la que migra el juego en la fase 2 del [plan](PLAN.md). Es la referencia para decidir **dónde va cada cosa** al añadir o cambiar algo.

## Principios

1. **Sin compilación.** Módulos nativos del navegador (`import` / `export`). Lo que está en el repo es lo que se publica.
2. **Archivos pequeños con un solo trabajo.** Ninguno pasa de ~400 líneas. Si crece más, se parte.
3. **Capas con una sola dirección.** Cada carpeta solo importa de las que están por debajo (ver tabla). Si algo de abajo tiene que avisar a algo de arriba, usa **eventos**, nunca un import hacia arriba.
4. **Los datos separados del código.** Personajes, tablas, trucos y textos son listas de datos; añadir uno nuevo no debería obligar a tocar la lógica.
5. **Nadie reescribe funciones de otro módulo.** Si un módulo necesita enterarse de algo (un truco, el fin de la sesión), se suscribe a un evento.

## Carpetas

```
index.html              solo HTML de la interfaz + <script type="module" src="js/main.js">
version.json            número de versión (lo lee el aviso de "hay versión nueva")
css/estilo.css
img/personajes/<id>/    cara.jpg, foto.jpg, tabla.jpg de cada personaje
modelos/                cuerpo.glb (y en el futuro, la costa)
audio/                  musica.mp4
vendor.js               three.js + postprocessing ya empaquetados (window.THREE, window.POSTFX)
js/
  main.js               arranque: crea cada pieza, las conecta y lanza el bucle
  three.js              export const THREE = window.THREE (el único sitio que lee vendor.js)
  nucleo/               ← no sabe nada de three.js ni del HTML
    config.js           constantes (duración de sesión, temporada, Firebase, calidad…)
    util.js             clamp, lerp, rnd, sm…
    eventos.js          avisos entre módulos: on('truco', fn) / emit('truco', datos)
    guardado.js         todo lo que se guarda en el móvil (localStorage), con sus claves en un solo sitio
    estado.js           la partida: puntos, multiplicador, ola actual, estado de la máquina
  datos/
    personajes.js       la lista de personajes (antes CHARS)
    tablas.js           diseños de tablas y quillas (antes DECKS, FINS)
    trucos.js           nombres y puntos de los trucos
  mundo/                ← la escena 3D; no conoce las reglas del juego
    motor.js            renderer, luces, efectos de cámara, calidad automática
    camara.js
    shaders.js          GLSL compartido
    cielo.js  mar.js  ola.js  particulas.js  costa.js  delfines.js
  surfista/
    cuerpo.js           cargar cuerpo.glb y mover los huesos
    posturas.js         posturas base (de pie, tumbado, shaka…)
    tabla.js            pintar la tabla y las quillas
    rig.js              montar el muñeco completo de un personaje (el mío o el de otro jugador)
    vehiculos/          un archivo por forma de surfear (ver más abajo)
      surf.js  longboard.js  bodyboard.js  motoagua.js  kayak.js  zodiac.js  index.js
  juego/
    sesion.js           máquina de estados: menú, remar, ponerse de pie, surfear, caída, fin
    fisica.js           movimiento por la ola, giros, saltos, tubo
    trucos.js           detectar trucos y dar puntos
  entrada/
    controles.js        táctil y teclado → una sola "intención" (girar, subir, truco)
  interfaz/
    menu.js  hud.js  chat.js  records.js  pantalla.js  musica.js
  online/
    red.js              conectar con Firebase (y login anónimo en la fase 3)
    protocolo.js        formato de los mensajes de red, en un solo sitio
    jugadores.js        enviar mi estado y dibujar a los demás
    mensajes.js         chat, notas de voz, empujones
    salas.js            elegir sala (y abrir otra cuando esté llena)
  modos/
    bots.js
    disputa.js          Disputa por el Pico
  debug.js              herramientas para probar (antes window.__surf)
```

### Quién puede importar de quién

| Carpeta | Puede importar de |
|---|---|
| `nucleo/` | nada (solo de sí misma) |
| `datos/` | `nucleo/` |
| `mundo/`, `surfista/` | `nucleo/`, `datos/` |
| `juego/`, `entrada/` | todo lo anterior |
| `interfaz/`, `online/`, `modos/` | todo lo anterior |
| `main.js` | todo |

## Las piezas clave

### Eventos (`nucleo/eventos.js`)
Un tablón de avisos muy simple. Por ejemplo: `juego/trucos.js` hace `emit('truco', { nombre, puntos })`, y `interfaz/hud.js` y `interfaz/records.js` se enteran sin que `trucos.js` sepa que existen. Esto sustituye a los parches actuales que reescriben `showTrick`, `endSession` y `showMenu`.

Eventos previstos: `truco`, `ola-cogida`, `caida`, `fin-sesion`, `cambio-estado`, `menu`, `personaje`, `empujon`, `disputa`.

### Máquina de estados (`juego/sesion.js`)
Ahora el juego pregunta `if (state === 'ride')` y similares en más de 70 sitios. En la nueva estructura, cada estado es un objeto con tres funciones:

```js
remar: {
  entrar() { … },        // al empezar a remar
  actualizar(dt) { … },  // cada fotograma
  salir() { … },         // al dejar de remar
}
```

Los estados son: `menu`, `escaparate` (elegir personaje), `remar`, `fallo`, `dePie`, `surfear`, `caida`, `entreOlas`, `disputa` y `fin`. Para añadir un estado nuevo (un minijuego, por ejemplo) basta con escribir un objeto así; no hay que tocar los demás.

### Vehículos (`surfista/vehiculos/`)
Ahora la moto, el kayak, la zodiac y el bodyboard se distinguen con cadenas tipo `CH.jetski ? … : CH.zodiac ? … : …` en 38 sitios. En la nueva estructura, cada forma de surfear es un archivo con lo que la hace distinta:

```js
export default {
  id: 'kayak',
  postura(pose, ctx) { … },     // cómo va colocado el cuerpo al surfear
  remar(pose, ctx) { … },       // cómo rema
  forma: 'kayak',               // forma de la tabla/barco
  fisica: { giro: 0.8, … },     // si se mueve distinto
}
```

El personaje solo dice `vehiculo: 'kayak'`. Para añadir un vehículo nuevo (paddle surf, por ejemplo), se crea un archivo nuevo y se registra en `index.js`.

### Personajes (`datos/personajes.js` + `img/personajes/<id>/`)
Cada personaje es una ficha de datos: nombre, colores, tabla, vehículo, estadísticas y sus fotos en la carpeta con su `id`. Añadir un personaje = añadir una ficha y una carpeta de fotos.

### Protocolo de red (`online/protocolo.js`)
Un solo sitio que define qué se envía y en qué formato (`dx`, `h`, `th`…). Cada mensaje lleva un número de versión (`v`), para que dos versiones distintas del juego no se líen si se cruzan en la misma ola mientras se actualiza.

### Guardado (`nucleo/guardado.js`)
Todas las claves de `localStorage` (`surf-sagunto-char`, `surf-sagunto-nick`, `surf-dev`…) en un solo sitio, con el `try/catch` hecho una vez. **No se cambian los nombres de las claves**, o los jugadores perderían su personaje, su nombre y sus récords.

## Dónde va cada cosa

| Quiero… | Toco… |
|---|---|
| Añadir un personaje | `datos/personajes.js` + `img/personajes/<id>/` |
| Añadir un diseño de tabla | `datos/tablas.js` |
| Añadir un truco | `datos/trucos.js` y, si tiene movimiento propio, `juego/trucos.js` |
| Un vehículo nuevo | archivo nuevo en `surfista/vehiculos/` |
| Cambiar cómo se ve el mar, la ola o el cielo | `mundo/mar.js`, `mundo/ola.js`, `mundo/cielo.js` |
| Algo del Pantalán o la costa | `mundo/costa.js` |
| Cambiar cómo se mueve el surfista | `juego/fisica.js` |
| Un botón o panel nuevo | `index.html` + `css/estilo.css` + su módulo en `interfaz/` |
| Algo del online | `online/` (y las reglas en `firebase-reglas.json`) |
| Un modo de juego nuevo | archivo nuevo en `modos/` + su estado en `juego/sesion.js` |

## Cosas a tener en cuenta

- **Caché de GitHub Pages:** guarda los archivos ~10 minutos. Justo después de publicar, un móvil podría mezclar módulos viejos y nuevos. Para un juego entre amigos es aceptable; si da problemas, se resuelve con un service worker (fase 5).
- **Los módulos necesitan servidor:** igual que ahora, hay que probar con `python -m http.server`, no abriendo el archivo con doble clic.
- **`vendor.js` sigue como está** (`window.THREE`). Los módulos lo leen a través de un pequeño `js/three.js` que hace `export const THREE = window.THREE`, para poder cambiarlo en el futuro en un solo sitio.
