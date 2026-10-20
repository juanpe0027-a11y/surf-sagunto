# Surf Puerto de Sagunto — guía para Claude

Juego de surf 3D de navegador (three.js + Firebase). Lo mantiene **Juanpe, que no es programador**: explícale los cambios en lenguaje sencillo, en español, y sin dar por hecho que conoce git o JavaScript.

**Antes de hacer cualquier cambio, lee [docs/PLAN.md](docs/PLAN.md)**: ahí están las fases de mejora, en cuál estamos y qué falta. Si terminas una tarea del plan, márcala como hecha en ese archivo.

## Reglas que no se rompen

1. **Todo gratis.** Firebase se queda en el plan **Spark** (gratuito); nunca propongas pasar a Blaze ni usar servicios de pago. Hosting: GitHub Pages. Cloud Storage de Firebase **no** está disponible en Spark: no lo uses.
2. **Sin paso de compilación.** Nada de npm, Vite, webpack ni TypeScript. Archivos que el navegador carga tal cual. `vendor.js` es la única excepción (ya viene empaquetado; no se regenera salvo para actualizar three.js).
3. **Nada de imágenes o audio en base64 dentro del código.** Van como archivos en `img/` (o `audio/`) y se cargan por URL.
4. **No hagas crecer `index.html`.** Mientras dure la fase 2 del plan, el código nuevo va en su módulo de `js/`, no en el script gigante.
5. **Trabaja en una rama, no en `main`.** `main` es lo que juega la gente. Las mejoras grandes van en la rama `mejoras` (o una rama nueva por tarea) y se unen a `main` solo cuando se han probado.
6. **Un cambio cada vez, y probado.** Después de cada cambio, pasa la lista de pruebas de abajo antes de seguir.

## Cómo está montado (a día de hoy)

| Archivo | Qué es |
|---|---|
| `index.html` | El juego entero: CSS, HTML y un único script de ~3.500 líneas (+ ~900 KB de fotos en base64 que hay que sacar) |
| `vendor.js` | three.js 0.186.1 + GLTFLoader + SkeletonUtils + postprocessing 6.39.5 (expone `window.THREE` y `window.POSTFX`) |
| `cuerpo.glb` | Cuerpo humano con esqueleto (Xbot de three.js) |
| `musica.mp4`, `icono.png` | Música e icono |
| `firebase-reglas.json` | Reglas de la Realtime Database. **Cambiarlas aquí no hace nada**: hay que pegarlas en la consola de Firebase (Realtime Database → Reglas → Publicar) |

Secciones del script (buscar el comentario `// ---------- nombre ----------`): utilidades, motor, efectos de cámara, GLSL compartido, cielo, mar, la ola, partículas, el surfista, diseños de tablas, cuerpo humano, la costa, estado del juego, personajes (`CHARS`), música, pantalla completa, física de la ola, bucle principal, delfines, controles, MODO ONLINE, SIMULACIÓN CON BOTS, DISPUTA POR EL PICO, RÉCORDS.

**Online:** no hay ola compartida. Cada jugador simula su propia ola y publica en `salas/<sala>/players/<id>` su posición *relativa al tubo* (~8 veces/s). Los demás lo dibujan en ese punto de su ola. Eventos (empujón, disputa, golpe), chat y notas de voz van por `salas/<sala>/msgs`. Récords en `stats/<id del móvil>`. La sala se elige con `#nombre` en la URL (por defecto `pantalan`; `#bots` mete bots).

## Publicación

- El juego en vivo es **https://juanpe0027-a11y.github.io/surf-sagunto/**, servido por GitHub Pages desde el repo **público** `juanpe0027-a11y/surf-sagunto` (rama `main`).
- Este repo (`surf-sagunto-privado`) es donde se desarrolla. Lo que se cambie aquí **no llega al juego en vivo** hasta que se copia al repo público.
- Al publicar una versión nueva, sube el número de `BUILD_ID` al final de `index.html`: así los móviles que tienen el juego abierto se recargan solos.

## Cómo probar

Hay que servir la carpeta (abrir el archivo con doble clic no deja cargar `cuerpo.glb`):

```
python -m http.server 8000
```

y abrir `http://localhost:8000/#pruebas` (**usa siempre una sala de pruebas** como `#pruebas`: la base de datos es la misma que la del juego real). Para jugar contra bots: `http://localhost:8000/#bots`.

⚠️ Los récords que hagas probando se guardan en el ranking real.

### Lista de pruebas después de cada cambio

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
