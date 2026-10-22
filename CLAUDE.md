# Surf Puerto de Sagunto — guía para Claude

Juego de surf 3D de navegador (three.js + Firebase). Lo mantiene **Juanpe, que no es programador** y trabaja siempre a través de Claude: explícale los cambios en lenguaje sencillo, en español, y sin dar por hecho que conoce git o JavaScript. Otras personas revisan el código después (ver «Revisión»).

Qué leer según lo que te pidan:
- **Lo normal (un personaje, un truco, un ajuste, un texto…): [docs/RECETAS.md](docs/RECETAS.md)**, con los pasos concretos de cada cosa.
- **Dónde va cada cosa en el código: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**: mapa de los módulos, capas y una tabla de «quiero… → toco…».
- **Mejoras grandes (gráficos, rendimiento, online…): [docs/PLAN.md](docs/PLAN.md)**: fases, en cuál estamos y qué falta. Si terminas una tarea del plan, márcala como hecha.

⚠️ **El `index.html` antiguo ya no existe.** Hasta el 21-10-2026 todo el juego estaba en un único `index.html` de ~1 MB (código, estilos y fotos en base64). Ahora el código está en `js/`, por módulos. Si Juanpe te pasa código, un archivo o una conversación de antes de esa fecha, **no lo copies ni lo pegues encima**: entiende qué hacía y rehazlo en el módulo que toque.

## Cómo habla Juanpe

Juanpe pide las cosas como las ve en el juego, no en términos de programación: «el bicho» o «el muñeco» es el surfista, «que salte más alto», «que este lleve una moto de agua», «que la ola no sea tan grande». Tu trabajo es traducirlo a cambios en el código. Algunos ejemplos:

| Juanpe dice… | Qué es | Dónde |
|---|---|---|
| «que salte más alto» | La fuerza del salto (`G.aVy`) | `launch()` en `js/juego/trucos.js` ([RECETAS](docs/RECETAS.md) 5) |
| «que X lleve una moto de agua» (o kayak, zodiac, bodyboard, longboard) | Las banderas de su ficha: moto = `jetski: true, board: 'jet', deck: 'jetski'` | Su ficha en `js/datos/personajes.js` ([RECETAS](docs/RECETAS.md) 2 y 3; copia la de JuanP, Raúl, Krre, Gallu o Gutty) |
| «que la ola no sea tan grande» | La altura de la ola (`HW`, en metros) | `js/mundo/ola.js` |
| «que vaya más rápido / más lento» | La velocidad del tubo y del surfista, o la estadística `vel` del personaje | `rideStep` en `js/juego/fisica.js`, o su ficha |
| «que dure más la partida» | `SESSION` (segundos) | `js/nucleo/config.js` |
| «mete a fulano, te paso su foto» | Personaje nuevo | [RECETAS](docs/RECETAS.md) 1 |
| «que los bots no me tiren tanto» | Probabilidad y espera del empujón de los bots | `js/modos/bots.js` |
| «que el truco tal dé más puntos» | Los puntos al caer | `land()` en `js/juego/trucos.js` |

- Si la petición se puede entender de varias formas, hazle **una sola pregunta sencilla**, con opciones en sus palabras («¿Quieres que salte un poco más o mucho más?»). Si no, haz lo más razonable y dile cómo pedir que lo ajustes («si lo quieres aún más alto, dímelo»).
- Para cosas de números, cambia poco (un 20–30 %), publica y que Juanpe lo pruebe: es más fácil para él decir «más» o «menos» que dar un número.
- **Nunca le pidas que haga cosas técnicas.** Si algo hay que hacerlo fuera del código (en la consola de Firebase, en GitHub…), guíale clic a clic, un paso cada vez, esperando a que te diga «hecho», y pídele una captura si se pierde. Ejemplo: [docs/PREPARAR-FIREBASE.md](docs/PREPARAR-FIREBASE.md).

## Cómo trabajar cada petición de Juanpe

1. **Ponte al día:** `git checkout main && git pull`. Trabaja siempre sobre la última versión.
2. **Rama nueva:** `git checkout -b juanpe/<tema-corto>` (por ejemplo `juanpe/personaje-pepe`).
3. **Haz el cambio** en su módulo, siguiendo [docs/RECETAS.md](docs/RECETAS.md). Solo lo que te han pedido: no reformatees ni reorganices otros archivos.
4. **Prueba** (ver «Cómo probar»): como mínimo `capas.mjs`, `datos.js` y `partida.js`; y `bots.js` u online si lo has tocado. Si no puedes ejecutarlas, díselo a Juanpe y pídele que abra `herramientas/pruebas.html`.
5. **Guarda** con un commit en español que diga qué y por qué (`git commit -m "Nuevo personaje: Pepe (longboard)"`).
6. **Si has cambiado `firebase-reglas.json`:** antes de publicar, guía a Juanpe para que publique las reglas en la consola de Firebase (como el paso 2 de [docs/PREPARAR-FIREBASE.md](docs/PREPARAR-FIREBASE.md), pero con el enlace a `main`) y comprueba con `node herramientas/comprobar-firebase.mjs` que han quedado bien.
7. **Publica:** `git checkout main && git merge --no-ff juanpe/<tema>`, luego `node herramientas/nueva-version.mjs`, `git commit -am "Versión <número>"` y `git push origin main`. En uno o dos minutos está en la web y los móviles con el juego abierto se recargan solos.
8. **Cuéntale a Juanpe** qué ha cambiado y cómo verlo, en dos o tres frases. Si algo falla en la web, deshazlo como dice la receta 10 de [docs/RECETAS.md](docs/RECETAS.md).

Si la petición es grande o arriesgada (cambiar la física entera, el online, muchos archivos), propón antes a Juanpe un plan corto y apúntalo en [docs/PLAN.md](docs/PLAN.md).

## Lo que rompe el juego a los jugadores (no lo hagas)

- **Cambiar el `id` de un personaje** (el nombre visible sí se puede cambiar): los móviles guardan el personaje elegido y el ranking por `id`.
- **Cambiar los nombres de las claves de guardado** (`js/nucleo/guardado.js`): todos perderían personaje, nombre y récords.
- **Mandar un campo nuevo por la red sin sus reglas publicadas** en Firebase: se rechaza en silencio.
- **Borrar una foto o un modelo que el código todavía usa**, o escribir una ruta con mayúsculas distintas a las del archivo (en Windows funciona y en GitHub Pages da 404).
- **Subir a `main` sin `nueva-version.mjs`**: los móviles se quedan con archivos viejos mezclados con nuevos.
- **`git push --force` o `git reset` sobre `main`.**

## Revisión

Otras personas auditan el código después de cada cambio y corrigen lo que se salga de estas normas. Para ponérselo fácil: un tema por rama y por commit, mensajes claros, y si alguna vez te saltas una regla por un buen motivo, explícalo en el mensaje del commit.

## Reglas que no se rompen

1. **Todo gratis.** Firebase se queda en el plan **Spark** (gratuito); nunca propongas pasar a Blaze ni usar servicios de pago. Hosting: GitHub Pages. Cloud Storage de Firebase **no** está disponible en Spark: no lo uses.
2. **Sin paso de compilación.** Nada de npm, Vite, webpack ni TypeScript. Archivos que el navegador carga tal cual. `vendor.js` es la única excepción (ya viene empaquetado; no se regenera salvo para actualizar three.js).
3. **Nada de imágenes o audio en base64 dentro del código.** Van como archivos en `img/` (o `audio/`) y se cargan por URL.
4. **Cada cosa en su módulo, y las capas en orden.** El código va en `js/`, en el módulo que le toca según [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Ningún módulo importa de una capa de arriba (`node herramientas/capas.mjs` lo comprueba); para avisar hacia arriba se usa `avisar` / `escuchar`. Si un archivo pasa de ~400 líneas, pártelo.
5. **Trabaja en una rama, nunca directamente en `main`.** `main` se publica sola en GitHub Pages: lo que se sube ahí lo juega la gente al momento. Cada tarea va en su rama y se une a `main` solo cuando ha pasado las pruebas (ver «Cómo trabajar cada petición de Juanpe»).
6. **Un cambio cada vez, y probado.** Después de cada cambio, pasa las pruebas de abajo antes de seguir.
7. **Si cambias lo que se envía por la red** (un campo nuevo en el jugador o en un mensaje), añádelo también a `firebase-reglas.json` y a sus pruebas: las reglas rechazan los campos que no conocen. Ver [docs/FIREBASE.md](docs/FIREBASE.md).

## Cómo está montado

| Archivo | Qué es |
|---|---|
| `index.html` | El HTML del juego (menú, marcadores, paneles); carga `vendor.js`, Firebase y `js/main.js` |
| `js/` | El código, en módulos por capas: ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) |
| `css/estilo.css` | Estilos del menú, marcadores, paneles y la Disputa |
| `img/personajes/<id>/` | `foto.jpg` (ficha del menú), `cara.jpg` (cara del muñeco 3D), `tabla.jpg` (si la tabla sale de una foto) |
| `vendor.js` | three.js 0.186.1 + GLTFLoader + SkeletonUtils + postprocessing 6.39.5 (deja `THREE` y `POSTFX` globales) |
| `modelos/cuerpo.glb` | Cuerpo humano con esqueleto (Xbot de three.js, huesos `mixamorig…`). La cabeza no es del modelo: la dibuja `surfista/muneco.js` con la foto `cara.jpg` |
| `audio/musica.mp4`, `icono.png` | Música e icono |
| `version.json` | Número de la versión publicada |
| `firebase-reglas.json` | Reglas de la Realtime Database. **Cambiarlas aquí no hace nada**: hay que publicarlas en la consola de Firebase ([docs/FIREBASE.md](docs/FIREBASE.md)) |
| `firebase.json`, `.firebaserc` | Configuración de la herramienta de Firebase (emulador local y publicar reglas) |
| `herramientas/` | Pruebas y utilidades para desarrollar (el juego no las usa) |

**Online:** no hay ola compartida. Cada jugador simula su propia ola y publica en `v2/salas/<sala>/players/<uid>` su posición *relativa al tubo* (~7 veces/s, solo lo que cambia; formato en `js/online/protocolo.js`). Los demás lo dibujan en ese punto de su ola. Eventos (empujón, disputa, golpe), chat y notas de voz van por `v2/salas/<sala>/msgs`. Récords en `v2/records/<temporada>/<uid>`. `<uid>` es el del login anónimo de Firebase (`firebaseListo()` en `js/online/red.js`). La sala se elige con `#nombre` en la URL; sin nombre es la ola pública `pantalan`, que con 12 surfistas se reparte en `pantalan-2`, `-3`… (`#bots` juega con bots sin conexión). Detalles y reglas: [docs/FIREBASE.md](docs/FIREBASE.md).

Opciones en la URL: `#sala`, `#bots`, `?emulador` (usa el emulador local de Firebase), `?sinred` (no se conecta a nada; lo usan las pruebas).

## Publicación

- Este repo (`juanpe0027-a11y/surf-sagunto`, público) es el único con el que se trabaja. GitHub Pages publica la rama **`main`** en **https://juanpe0027-a11y.github.io/surf-sagunto/**.
- ⚠️ **Subir a `main` = publicar al momento para todos los jugadores.** Por eso no se trabaja en `main`: se trabaja en una rama, se prueba, y se une a `main` solo cuando funciona.
- El repo `surf-sagunto-privado` era una copia; ya no se usa.
- Al publicar una versión nueva, ejecuta `node herramientas/nueva-version.mjs`: pone el mismo número nuevo en `BUILD_ID` (al final de `index.html`) y en `version.json`, y añade `?v=` a `js/main.js` y al CSS. Así los móviles que tienen el juego abierto se recargan solos y no se quedan con archivos viejos de la caché. Sin Node, cambia a mano el número en esos sitios (el mismo en todos, y mayor que el anterior).
- El repo es público: no metas aquí contraseñas ni datos personales (la configuración de Firebase sí puede estar, es normal que sea pública).

## Cómo probar

### Sin instalar nada: `herramientas/pruebas.html`

Sirve la carpeta (`python -m http.server 8000`) y abre `http://localhost:8000/herramientas/pruebas.html` (o, ya publicado, `https://juanpe0027-a11y.github.io/surf-sagunto/herramientas/pruebas.html`). Pulsa «Empezar las pruebas»: el juego se juega solo con cada personaje, con bots y en la Disputa, y cada prueba sale en verde o en rojo con lo que ha fallado. No se conecta al online.

### Pruebas automáticas (con Node)

Necesitan Node 22 o más y Chrome o Edge. Abren el juego en un Chrome sin ventana, juegan solas y avisan de cualquier error. **Por defecto bloquean Firebase**, así que no ensucian la base de datos real.

```
node herramientas/capas.mjs                                            # nadie importa de una capa de arriba
node herramientas/probar.mjs herramientas/pruebas/datos.js             # fotos, diseños y vehículo de cada personaje
node herramientas/probar.mjs herramientas/pruebas/partida.js           # una ola con cada personaje, menú y récords
node herramientas/probar.mjs herramientas/pruebas/bots.js --hash=bots  # bots y Disputa por el Pico
node herramientas/probar.mjs herramientas/pruebas/vista.js --capturas=carpeta   # capturas para comparar cambios visuales
node herramientas/probar.mjs herramientas/pruebas/fps.js --hash=bots           # fps surfeando con 11 bots
```

Tienen que acabar con `"errores": []` y sin `"problemas"`. Con `--capturas=carpeta` guardan capturas de pantalla para ver cómo queda.

Online y reglas, contra el **emulador** de Firebase (necesita Java; ver [docs/FIREBASE.md](docs/FIREBASE.md)):

```
firebase emulators:start --only auth,database                       # en otra terminal
node herramientas/pruebas/reglas.mjs                                 # 52 pruebas de las reglas
node herramientas/probar.mjs herramientas/pruebas/online.js --emulador --jugadores=2 --hash=pruebas   # dos jugadores: chat, empujón, Disputa, récords
node herramientas/pruebas/sala.mjs                                   # la ola pública llena manda al nuevo a pantalan-2
node herramientas/probar.mjs herramientas/pruebas/red.js --emulador --jugadores=3 --hash=pruebas      # cuánto gasta el online ("red": bytes)
```

Y para saber si el Firebase **real** está preparado (login anónimo activado y reglas publicadas): `node herramientas/comprobar-firebase.mjs`. Se hace pasar por un jugador un momento y lo borra todo después.

### A mano

Hay que servir la carpeta (abrir el archivo con doble clic no deja cargar los módulos):

```
python -m http.server 8000
```

y abrir `http://localhost:8000/#pruebas` (**usa siempre una sala de pruebas** como `#pruebas`: la base de datos es la misma que la del juego real). Para jugar contra bots: `http://localhost:8000/#bots`. Para usar el emulador: `http://localhost:8000/?emulador#pruebas`.

⚠️ Sin el emulador ni `?sinred`, los récords que hagas probando se guardan en el ranking real.

### Lista de pruebas después de cada cambio

- [ ] Las pruebas automáticas o `herramientas/pruebas.html` pasan (si no se pueden usar, todo lo de abajo)
- [ ] Carga sin errores en la consola del navegador (F12 → Consola)
- [ ] Menú: se ven las fichas de todos los personajes con su cara
- [ ] Remar, coger la ola, girar, tubo, salto con truco y caída
- [ ] Un personaje especial: Gallu (bodyboard), JuanP (moto), Raúl (kayak) o Krre (zodiac)
- [ ] Con `#bots`: aparecen los bots, se puede empujar y entrar en la Disputa por el Pico
- [ ] Chat: mandar una frase rápida
- [ ] 🏆 Récords: se abre el ranking
- [ ] En móvil (o con el simulador de móvil del navegador, en horizontal): controles táctiles y fps fluidos

## Estilo del código

- Comentarios y textos del juego en **español**, explicando el *porqué* en una línea. Cada módulo empieza con un comentario que dice para qué sirve.
- El estado compartido de la partida va en `G` (`js/nucleo/estado.js`), con un comentario por campo. Lo que solo usa un módulo se queda en ese módulo.
- Personajes: los datos de cada uno van en `CHARS` (y fotos en `img/personajes/<id>/`); añadir un personaje no debería requerir tocar la física ni el online.
- No dupliques código para un personaje o vehículo concreto: usa las banderas de la ficha (`bodyboard`, `jetski`, `kayak`, `zodiac`, `board: 'long'`…) y la tabla `POSTURAS` (`js/surfista/posturas.js`).
- Si tienes que cambiar el comportamiento de una función de otro módulo, cámbiala en su sitio; no la reescribas por encima. Para enterarte de algo que pasa en otro módulo, usa `escuchar`.
- Lo que se guarda en el móvil, con `leer` / `guardar` (`js/nucleo/guardado.js`); nunca `localStorage` directamente.
- `index.html` tiene finales de línea de Windows (CRLF). Edítalo con la herramienta de edición, **no con `sed -i`**: lo convierte todo a LF y git ve el archivo entero como cambiado.
