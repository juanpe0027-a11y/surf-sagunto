# Surf Puerto de Sagunto — guía para Claude

Juego de surf 3D de navegador (three.js + Firebase). Lo mantiene **Juanpe, que no es programador**: explícale los cambios en lenguaje sencillo, en español, y sin dar por hecho que conoce git o JavaScript.

**Antes de hacer cualquier cambio, lee [docs/PLAN.md](docs/PLAN.md)**: ahí están las fases de mejora, en cuál estamos y qué falta. Si terminas una tarea del plan, márcala como hecha en ese archivo.

**Para saber dónde va cada cosa en el código, lee [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).** Describe la estructura a la que estamos migrando; mientras la migración no termine, el código viejo sigue en `index.html`.

## Reglas que no se rompen

1. **Todo gratis.** Firebase se queda en el plan **Spark** (gratuito); nunca propongas pasar a Blaze ni usar servicios de pago. Hosting: GitHub Pages. Cloud Storage de Firebase **no** está disponible en Spark: no lo uses.
2. **Sin paso de compilación.** Nada de npm, Vite, webpack ni TypeScript. Archivos que el navegador carga tal cual. `vendor.js` es la única excepción (ya viene empaquetado; no se regenera salvo para actualizar three.js).
3. **Nada de imágenes o audio en base64 dentro del código.** Van como archivos en `img/` (o `audio/`) y se cargan por URL.
4. **No hagas crecer `index.html`.** En cuanto empiece la fase 3 del plan, el código nuevo va en su módulo de `js/`, no en el script gigante.
5. **Trabaja en una rama, nunca directamente en `main`.** `main` se publica sola en GitHub Pages: lo que se sube ahí lo juega la gente al momento. Las mejoras van en la rama `mejoras` (o una rama nueva por tarea) y se unen a `main` solo cuando se han probado.
6. **Un cambio cada vez, y probado.** Después de cada cambio, pasa las pruebas de abajo antes de seguir.
7. **Si cambias lo que se envía por la red** (un campo nuevo en el jugador o en un mensaje), añádelo también a `firebase-reglas.json` y a sus pruebas: las reglas rechazan los campos que no conocen. Ver [docs/FIREBASE.md](docs/FIREBASE.md).

## Cómo está montado (a día de hoy)

| Archivo | Qué es |
|---|---|
| `index.html` | El juego entero: CSS, HTML y un único script de ~3.500 líneas (+ ~900 KB de fotos en base64 que hay que sacar) |
| `vendor.js` | three.js 0.186.1 + GLTFLoader + SkeletonUtils + postprocessing 6.39.5 (expone `window.THREE` y `window.POSTFX`) |
| `cuerpo.glb` | Cuerpo humano con esqueleto (Xbot de three.js) |
| `musica.mp4`, `icono.png` | Música e icono |
| `firebase-reglas.json` | Reglas de la Realtime Database. **Cambiarlas aquí no hace nada**: hay que publicarlas en la consola de Firebase ([docs/FIREBASE.md](docs/FIREBASE.md)) |
| `firebase.json`, `.firebaserc` | Configuración de la herramienta de Firebase (emulador local y publicar reglas) |
| `herramientas/` | Pruebas automáticas (no las carga el juego) |

Secciones del script (buscar el comentario `// ---------- nombre ----------`): utilidades, motor, efectos de cámara, GLSL compartido, cielo, mar, la ola, partículas, el surfista, diseños de tablas, cuerpo humano, la costa, estado del juego, personajes (`CHARS`), música, pantalla completa, física de la ola, bucle principal, delfines, controles, MODO ONLINE, SIMULACIÓN CON BOTS, DISPUTA POR EL PICO, RÉCORDS.

**Online:** no hay ola compartida. Cada jugador simula su propia ola y publica en `v2/salas/<sala>/players/<uid>` su posición *relativa al tubo* (~8 veces/s). Los demás lo dibujan en ese punto de su ola. Eventos (empujón, disputa, golpe), chat y notas de voz van por `v2/salas/<sala>/msgs`. Récords en `v2/records/<temporada>/<uid>`. `<uid>` es el del login anónimo de Firebase (`firebaseListo()`). La sala se elige con `#nombre` en la URL (por defecto `pantalan`; `#bots` juega con bots sin conexión). Detalles y reglas: [docs/FIREBASE.md](docs/FIREBASE.md).

## Publicación

- Este repo (`juanpe0027-a11y/surf-sagunto`, público) es el único con el que se trabaja. GitHub Pages publica la rama **`main`** en **https://juanpe0027-a11y.github.io/surf-sagunto/**.
- ⚠️ **Subir a `main` = publicar al momento para todos los jugadores.** Por eso no se trabaja en `main`: se trabaja en una rama, se prueba, y se une a `main` solo cuando funciona.
- El repo `surf-sagunto-privado` era una copia; ya no se usa.
- Al publicar una versión nueva, sube el número de `BUILD_ID` al final de `index.html`: así los móviles que tienen el juego abierto se recargan solos.
- El repo es público: no metas aquí contraseñas ni datos personales (la configuración de Firebase sí puede estar, es normal que sea pública).

## Cómo probar

### Pruebas automáticas (recomendado)

Necesitan Node 22 o más y Chrome o Edge. Abren el juego en un Chrome sin ventana, juegan solas y avisan de cualquier error. **Por defecto bloquean Firebase**, así que no ensucian la base de datos real.

```
node herramientas/probar.mjs herramientas/pruebas/partida.js        # una ola con cada personaje, menú y récords
node herramientas/probar.mjs herramientas/pruebas/bots.js --hash=bots  # bots y Disputa por el Pico
```

Tienen que acabar con `"errores": []` y sin `"problemas"`. Con `--capturas=carpeta` guardan capturas de pantalla para ver cómo queda.

Online y reglas, contra el **emulador** de Firebase (necesita Java; ver [docs/FIREBASE.md](docs/FIREBASE.md)):

```
firebase emulators:start --only auth,database                       # en otra terminal
node herramientas/pruebas/reglas.mjs                                 # 47 pruebas de las reglas
node herramientas/probar.mjs herramientas/pruebas/online.js --emulador --jugadores=2 --hash=pruebas
```

### A mano

Hay que servir la carpeta (abrir el archivo con doble clic no deja cargar `cuerpo.glb`):

```
python -m http.server 8000
```

y abrir `http://localhost:8000/#pruebas` (**usa siempre una sala de pruebas** como `#pruebas`: la base de datos es la misma que la del juego real). Para jugar contra bots: `http://localhost:8000/#bots`. Para usar el emulador: `http://localhost:8000/?emulador#pruebas`.

⚠️ Sin el emulador, los récords que hagas probando se guardan en el ranking real.

### Lista de pruebas después de cada cambio

- [ ] Las pruebas automáticas pasan (o, si no se pueden usar, todo lo de abajo)
- [ ] Carga sin errores en la consola del navegador (F12 → Consola)
- [ ] Menú: se ven las fichas de todos los personajes con su cara
- [ ] Remar, coger la ola, girar, tubo, salto con truco y caída
- [ ] Un personaje especial: Gallu (bodyboard), JuanP (moto), Raúl (kayak) o Krre (zodiac)
- [ ] Con `#bots`: aparecen los bots, se puede empujar y entrar en la Disputa por el Pico
- [ ] Chat: mandar una frase rápida
- [ ] 🏆 Récords: se abre el ranking
- [ ] En móvil (o con el simulador de móvil del navegador, en horizontal): controles táctiles y fps fluidos

## Estilo del código

- Comentarios y nombres de la interfaz en **español**, explicando el *porqué* en una línea, como el código actual.
- Personajes: los datos de cada uno van en `CHARS` (y fotos en `img/`); añadir un personaje no debería requerir tocar la física ni el online.
- No dupliques código para un personaje concreto: usa las banderas que ya existen (`bodyboard`, `jetski`, `kayak`, `zodiac`, `board: 'long'`…).
- Si tienes que cambiar el comportamiento de una función de otra sección, cámbiala en su sitio; no la reescribas por encima (`showTrick = function…` es un ejemplo de lo que no hay que hacer).
