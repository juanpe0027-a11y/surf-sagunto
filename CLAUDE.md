# Surf Puerto de Sagunto — guía para Claude

Juego de surf 3D de navegador (three.js + Firebase). Lo mantiene **Juanpe, que no es programador**: explícale los cambios en lenguaje sencillo, en español, y sin dar por hecho que conoce git o JavaScript.

**Antes de hacer cualquier cambio, lee [docs/PLAN.md](docs/PLAN.md)**: ahí están las fases de mejora, en cuál estamos y qué falta. Si terminas una tarea del plan, márcala como hecha en ese archivo.

**Para saber dónde va cada cosa en el código, lee [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).** Tiene el mapa de los módulos, las capas y una tabla de «quiero… → toco…».

## Reglas que no se rompen

1. **Todo gratis.** Firebase se queda en el plan **Spark** (gratuito); nunca propongas pasar a Blaze ni usar servicios de pago. Hosting: GitHub Pages. Cloud Storage de Firebase **no** está disponible en Spark: no lo uses.
2. **Sin paso de compilación.** Nada de npm, Vite, webpack ni TypeScript. Archivos que el navegador carga tal cual. `vendor.js` es la única excepción (ya viene empaquetado; no se regenera salvo para actualizar three.js).
3. **Nada de imágenes o audio en base64 dentro del código.** Van como archivos en `img/` (o `audio/`) y se cargan por URL.
4. **Cada cosa en su módulo, y las capas en orden.** El código va en `js/`, en el módulo que le toca según [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Ningún módulo importa de una capa de arriba (`node herramientas/capas.mjs` lo comprueba); para avisar hacia arriba se usa `avisar` / `escuchar`. Si un archivo pasa de ~400 líneas, pártelo.
5. **Trabaja en una rama, nunca directamente en `main`.** `main` se publica sola en GitHub Pages: lo que se sube ahí lo juega la gente al momento. Las mejoras van en la rama `mejoras` (o una rama nueva por tarea) y se unen a `main` solo cuando se han probado.
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
| `modelos/cuerpo.glb` | Cuerpo humano con esqueleto (Xbot de three.js) |
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
node herramientas/pruebas/reglas.mjs                                 # 47 pruebas de las reglas
node herramientas/probar.mjs herramientas/pruebas/online.js --emulador --jugadores=2 --hash=pruebas   # dos jugadores: chat, empujón, Disputa, récords
node herramientas/pruebas/sala.mjs                                   # la ola pública llena manda al nuevo a pantalan-2
node herramientas/probar.mjs herramientas/pruebas/red.js --emulador --jugadores=3 --hash=pruebas      # cuánto gasta el online ("red": bytes)
```

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
