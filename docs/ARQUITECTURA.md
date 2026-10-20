# Arquitectura — Surf Puerto de Sagunto

Cómo está organizado el código y **dónde va cada cosa** al añadir o cambiar algo.

## Principios

1. **Sin compilación.** Módulos nativos del navegador (`import` / `export`). Lo que está en el repo es lo que se publica.
2. **Archivos pequeños con un solo trabajo.** Si uno pasa de ~400 líneas, se parte.
3. **Capas con una sola dirección.** Cada carpeta solo importa de las que están por debajo (ver tabla). Si algo de abajo tiene que avisar a algo de arriba, usa **avisos** (`avisar` / `escuchar`), nunca un import hacia arriba. `node herramientas/capas.mjs` lo comprueba.
4. **Los datos separados del código.** Personajes, diseños de tablas y posturas por vehículo son tablas de datos; añadir uno no obliga a tocar la lógica.
5. **Nadie reescribe funciones de otro módulo.** Si un módulo necesita enterarse de algo (un truco, el fin de la sesión), escucha un aviso.

## Cómo arranca

`index.html` carga `vendor.js` (three.js, que queda global como `THREE`), Firebase y `js/main.js`.
`main.js` comprueba que el navegador tiene WebGL y carga `js/inicio.js`, que importa todos los módulos en orden de capas y arranca el juego. `js/bucle.js` es el bucle principal: cada fotograma avanza la partida, mueve la cámara y dibuja.

## Capas y carpetas

| Capa | Carpeta | Qué hay | Puede importar de |
|---|---|---|---|
| 1 | `nucleo/` | utilidades, avisos, ajustes, **estado de la partida (`G`)**, guardado en el móvil | nada |
| 2 | `datos/` | personajes y diseños pintados | 1 |
| 3 | `mundo/` | escena 3D: motor, cielo, mar, ola, partículas, costa, delfines | 1–2 |
| 4 | `surfista/` | el muñeco, su cuerpo, posturas, tabla y vehículos | 1–3 |
| 5 | `juego/` | sesión, física, trucos, puntos y marcadores en pantalla | 1–4 |
| 6 | `online/` y `modos/` | Firebase, otros jugadores, mensajes · bots y Disputa por el Pico (se usan entre sí) | 1–6 |
| 7 | `interfaz/` | menú, récords, música, pantalla completa | 1–7 |
| 8 | `entrada/` | controles (táctil y teclado) | 1–8 |
| — | `js/` | `main.js`, `inicio.js`, `bucle.js`, `debug.js` | todo |

Dentro de una misma carpeta los módulos pueden usarse entre sí (por ejemplo `juego/fisica.js` y `juego/trucos.js`).

```
js/
  main.js              arranque: comprueba WebGL y carga inicio.js
  inicio.js            importa todo en orden y arranca
  bucle.js             bucle principal, cámara y dibujo de cada fotograma
  debug.js             window.__surf (para probar desde la consola y para las pruebas automáticas)
  nucleo/
    util.js            $, clamp, lerp, sm, rnd, TAU, V3, angDiff, hex
    eventos.js         avisar / escuchar
    config.js          LOWQ (móvil), PQ, SESSION
    estado.js          G: el estado de la partida, documentado campo a campo; keys, ptr, stick (lo que pide el jugador)
    guardado.js        leer / guardar en el móvil (todas las claves en un sitio)
  datos/
    personajes.js      CHARS (fichas), PHOTOS, FACES
    disenos.js         DECKS (tablas), FINS (quillas), TORSOS (neoprenos), fotos de tablas
  mundo/
    motor.js           renderer, escena, cámara, luces, efectos, calidad automática, world (espejado), toScreen
    formas.js          geometrías y cálculos de orientación reutilizables
    shaders.js         GLSL compartido
    cielo.js  mar.js  ola.js  particulas.js  costa.js  delfines.js
  surfista/
    posturas.js        posturas del cuerpo y tabla POSTURAS por vehículo
    raiz.js            boardRoot: el grupo que lleva tabla, vehículo y surfista
    vehiculos.js       modelos de zodiac, kayak (con pala) y moto de agua
    tabla.js           la tabla pintada y sus quillas
    cuerpo.js          cuerpo con esqueleto (modelos/cuerpo.glb)
    muneco.js          cabeza, pelo, gafas, gorra, pies… y applyPose
    personaje.js       applyChar: viste el muñeco con un personaje; setBoardShape
    rig.js             copias del muñeco para los demás jugadores
  juego/
    sesion.js          estados de la partida (tabla ESTADOS) y sus cambios: remar, ponerse de pie, caer, fin…
    fisica.js          rideStep: movimiento por la ola; spray de la tabla
    trucos.js          saltos, trucos en el aire, caídas, snaps
    puntos.js          addPts, bump (multiplicador)
    hud.js             marcadores, mensajes (say, chip, showTrick, toast) y pantallas
  online/
    red.js             Firebase: login anónimo (firebaseListo), MP, sala, inactividad
    conexion.js        al empezar: bots o conexión a la sala
    jugadores.js       mandar mi estado, dibujar a los demás, choques, clasificación
    empujones.js       empujar y que te empujen
    mensajes.js        chat, frases rápidas, notas de voz
  modos/
    bots.js            simulación con bots (sala #bots)
    disputa.js         Disputa por el Pico
    luchador.js        posturas y dibujo de los luchadores
  interfaz/
    menu.js  records.js  musica.js  pantalla.js
  entrada/
    controles.js       táctil y teclado; trickTap (botón TRUCO)
```

## Las piezas clave

### Estado de la partida (`nucleo/estado.js`)
Un objeto `G` con todo lo que cambian varias partes del juego: `G.state`, `G.score`, `G.px`, `G.curlX`… Cada campo tiene un comentario que dice qué es. Lo que solo usa un módulo se queda como variable de ese módulo.

### Avisos (`nucleo/eventos.js`)
`avisar('truco', nombre, puntos)` y `escuchar('truco', (nombre, puntos) => …)`. Avisos que hay:

| Aviso | Quién avisa | Quién escucha |
|---|---|---|
| `truco` | `juego/hud.js` (showTrick) | `interfaz/records.js` |
| `fin-sesion` | `juego/sesion.js` | `interfaz/records.js` |
| `menu` | `interfaz/menu.js` (showMenu) | `interfaz/records.js` |
| `personaje` | `surfista/personaje.js` (applyChar) | `interfaz/menu.js` («Surfeas con…») |
| `foto-tabla` | `datos/disenos.js` (carga una foto de tabla) | `surfista/personaje.js`, `interfaz/menu.js` |
| `cuerpo-listo` | `surfista/cuerpo.js` | `surfista/muneco.js`, `online/jugadores.js` |
| `tamano` | `mundo/motor.js` (resize) | `mundo/particulas.js` |

### Estados de la partida (`juego/sesion.js`)
`ESTADOS` tiene una función por estado (`title`, `paddle`, `miss`, `popup`, `ride`, `wipe`, `over`) que se ejecuta cada fotograma y devuelve la postura del surfista. Las funciones que cambian de estado (`startPaddle`, `popUp`, `wipeout`, `endSession`…) están en el mismo archivo. La Disputa (`duel`) la lleva `modos/disputa.js`.

### Vehículos (`surfista/posturas.js`)
`vehiculo(c)` dice si un personaje va en `tabla`, `bodyboard`, `moto`, `kayak` o `zodiac`, y `POSTURAS` dice cómo va el cuerpo en cada uno al surfear, remar y posar.

### Personajes (`datos/personajes.js` + `img/personajes/<id>/`)
Cada personaje es una ficha de datos en `CHARS` y sus fotos en la carpeta con su `id`: `foto.jpg` (ficha del menú), `cara.jpg` (cara del muñeco) y, si su tabla sale de una foto, `tabla.jpg`.

### Guardado (`nucleo/guardado.js`)
`leer('personaje')`, `guardar('mejor', 1234)`… Todas las claves de `localStorage` en un sitio. **No se cambian los nombres de las claves**, o los jugadores perderían su personaje, su nombre y sus récords.

## Dónde va cada cosa

| Quiero… | Toco… |
|---|---|
| Añadir un personaje | su ficha en `datos/personajes.js` + sus fotos en `img/personajes/<id>/` (y si tiene tabla pintada nueva, su dibujo en `datos/disenos.js`). Después, `herramientas/pruebas/datos.js` comprueba que no falta nada |
| Cambiar cómo se ve el mar, la ola o el cielo | `mundo/mar.js`, `mundo/ola.js`, `mundo/cielo.js` (y lo común en `mundo/shaders.js`) |
| Algo del Pantalán o la costa | `mundo/costa.js` |
| Cambiar cómo se mueve el surfista | `juego/fisica.js` |
| Un truco nuevo | `juego/trucos.js` (en el aire) o `juego/fisica.js` (en la ola) |
| Un vehículo nuevo | su modelo en `surfista/vehiculos.js`, sus posturas en `POSTURAS` (`surfista/posturas.js`), su forma en `setBoardShape` (`surfista/personaje.js`) y su bandera en la ficha |
| Un mensaje o marcador en pantalla | `juego/hud.js` (+ el HTML en `index.html` y el estilo en `css/estilo.css`) |
| Un botón o panel del menú | `index.html` + `css/estilo.css` + `interfaz/menu.js` |
| Algo del online | `online/` (y si cambia lo que se envía, las reglas en `firebase-reglas.json`: ver [FIREBASE.md](FIREBASE.md)) |
| Un modo de juego nuevo | archivo nuevo en `modos/` + su estado en `G.state` (como la Disputa) |
| Algo que se guarde en el móvil | una clave nueva en `nucleo/guardado.js` |

## Cosas a tener en cuenta

- **`THREE` es global** (lo pone `vendor.js`); los módulos no lo importan.
- **El mundo está espejado en X** (`world.scale.x = -1`): dentro de `world`, +x va hacia la izquierda de la pantalla. Por eso la cámara usa `-camPos.x`.
- **Caché de GitHub Pages:** guarda los archivos ~10 minutos. `herramientas/nueva-version.mjs` pone `?v=` en `js/main.js` y el CSS, pero los demás módulos pueden tardar esos minutos en actualizarse. Para un juego entre amigos es aceptable; si da problemas, se resuelve con un service worker (fase 6 del plan).
- **Los módulos necesitan servidor:** hay que probar con `python -m http.server`, no abriendo el archivo con doble clic.
