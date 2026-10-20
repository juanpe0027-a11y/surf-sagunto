# Plan de mejoras — Surf Puerto de Sagunto

Objetivo: que el juego sea más fácil de mantener y ampliar, se vea mejor y aguante más jugadores, **sin dejar de ser un juego de navegador sencillo y sin pagar nada**.

Estado de cada fase: ⬜ pendiente · 🟡 en curso · ✅ hecha.
Las fases se hacen en orden: cada una se apoya en la anterior. Antes de empezar una fase se descompone en tareas pequeñas (se apuntan aquí mismo, debajo de la fase).

## Límites gratuitos con los que trabajamos

| Servicio | Límite gratis | Qué significa para el juego |
|---|---|---|
| GitHub Pages | Repos públicos, 1 GB, 100 GB/mes de tráfico | De sobra para el juego |
| Firebase Realtime Database (plan Spark) | 100 conexiones a la vez, 1 GB guardado, **10 GB/mes de descarga** | La descarga es el límite real del online |
| Firebase Authentication (login anónimo) | Gratis | Sirve para proteger la base de datos |
| Firebase Cloud Storage | ❌ Requiere plan de pago | Las notas de voz siguen en la base de datos, pero limitadas a ~73 KB |

Si el plan Spark se queda corto, Firebase **corta el servicio** hasta el mes siguiente; nunca cobra. Por eso no se pasa nunca a Blaze.

Consumo estimado (cada jugador recibe ~8 actualizaciones/s de cada uno de los demás):

| Jugadores en la misma ola | Descarga aprox. | Horas de juego que caben en 10 GB/mes |
|---|---|---|
| 5 | 150 MB/h | ~65 h |
| 10 | 650 MB/h | ~15 h |
| 20 | 2,7 GB/h | ~4 h |

---

## Fase 0 — Preparación ✅

- [x] Trabajar sobre el repo público `surf-sagunto` (el que publica GitHub Pages); el privado era una copia
- [x] Rama `mejoras` para todo el trabajo (`main` es el juego en vivo y no se toca hasta que esté probado)
- [x] `CLAUDE.md`, este plan y [ARQUITECTURA.md](ARQUITECTURA.md)
- [x] Pruebas automáticas (`herramientas/`, ver `CLAUDE.md`): juegan una ola con cada personaje, prueban bots, Disputa, online con dos jugadores y las reglas de Firebase
- [x] Punto de partida medido en ordenador: `index.html` pesa 1,05 MB (+ 1,1 MB de `vendor.js`, 2,9 MB del cuerpo y 5,1 MB de música); ~108 fps a 1280×720 con una gráfica integrada Intel
- [ ] Medir fps en un móvil de referencia (lo hace Juanpe con su móvil)

## Fase 1 — Online seguro 🟡

Que nadie pueda borrar a otros jugadores, inventarse récords ni llenar la base de datos desde la consola del navegador. Ver [FIREBASE.md](FIREBASE.md).

- [x] Login anónimo de Firebase (el jugador no ve nada); su identificador sustituye al número aleatorio del móvil
- [x] Reglas nuevas bajo `v2/`: cada uno solo escribe su jugador, sus mensajes y sus récords; todos los campos validados; los récords no pueden bajar; no se aceptan campos desconocidos
- [x] Los mensajes viejos y los jugadores «fantasma» los puede limpiar cualquiera, pero solo pasado un tiempo
- [x] Notas de voz a 16 kbps y cortadas antes de ~73 KB (antes podían ocupar 280 KB)
- [x] Ranking: descarga solo los 20 mejores en vez de todas las puntuaciones
- [x] Al conectar se recuperan los récords de la nube (por si se borran los datos del navegador)
- [x] Emulador local (`?emulador`) y 47 pruebas de reglas que pasan
- [ ] **Juanpe:** activar el login anónimo en la consola de Firebase ([FIREBASE.md](FIREBASE.md), paso 1)
- [ ] **Juanpe:** publicar `firebase-reglas.json` en la consola de Firebase (paso 2). Se puede hacer ya: las rutas antiguas siguen abiertas y el juego en vivo no se rompe
- [ ] Unir la rama a `main` (publicar) y subir `BUILD_ID`
- [ ] Una semana después de publicar: quitar de las reglas las rutas antiguas `salas` y `stats` y borrar sus datos (paso 3)

**Nota:** el ranking empieza vacío en `v2`. Cada jugador vuelve a aparecer en cuanto abre la versión nueva, porque su móvil sube los récords que tiene guardados.

## Fase 2 — Limpieza rápida ⬜

Cambios sin riesgo que hacen el juego bastante más ligero. El juego debe verse y jugarse **exactamente igual**.

- Sacar las 29 fotos en base64 de `index.html` a `img/personajes/<id>/` y quitar las repetidas (`index.html` pasa de ~1 MB a ~100 KB y el navegador guarda las fotos en caché)
- Mover `cuerpo.glb` a `modelos/` y `musica.mp4` a `audio/`
- Sacar el CSS a `css/estilo.css`
- Cambiar la comprobación de versión nueva: ahora descarga el `index.html` entero (1 MB) en cada visita; pasará a leer un `version.json` de pocos bytes
- Quitar código que no hace nada en GitHub Pages: el botón «Descargar juego» (solo funcionaba dentro de Claude y pide un `descarga.txt` que no existe)
- Actualizar el README

**Hecho cuando:** las pruebas automáticas y la lista de `CLAUDE.md` pasan, y la página pesa mucho menos.

## Fase 3 — Estructura sólida (refactor) ⬜

Pasar del script único de ~3.500 líneas a la estructura descrita en **[ARQUITECTURA.md](ARQUITECTURA.md)**: módulos nativos del navegador, sin compilación, organizados en capas, con eventos en vez de parches, una máquina de estados, y los vehículos y personajes como datos.

Es la fase más importante. Después de ella:
- cada cambio toca un archivo de 100–400 líneas, y Claude se equivoca mucho menos;
- añadir un personaje es añadir una ficha y unas fotos; un vehículo o un modo de juego, un archivo nuevo;
- las fases 4 y 5 se hacen sobre módulos concretos (`online/`, `mundo/`) sin riesgo de romper el resto.

**Regla de oro de esta fase: el juego no cambia.** Ni física, ni colores, ni textos. Solo se mueve código de sitio. Si se ve algo que mejorar, se apunta para después.

⚠️ **Mientras dure esta fase, Juanpe no debería cambiar `index.html` en `main`**: cada cambio suyo en el archivo grande habría que trasladarlo a mano a los módulos nuevos. Si necesita cambiar algo, mejor hacerlo sobre la rama `mejoras`, o avisar para traerlo antes del siguiente paso.

Pasos (cada uno es un commit, y después de cada uno se pasan las pruebas):

| Paso | Qué se hace | Riesgo |
|---|---|---|
| 3.1 | **Convertir a módulo.** El script pasa tal cual a `js/main.js` y se carga con `<script type="module">`. Crear `js/three.js`. | Bajo |
| 3.2 | **Red de seguridad.** Página `pruebas.html` que carga los módulos y comprueba cosas básicas: que cada personaje tiene sus fotos y un vehículo válido, que la física no da números raros (`NaN`). Crecerá con cada paso. | Bajo |
| 3.3 | **Núcleo.** Sacar `util.js`, `config.js`, `guardado.js` (todas las claves de `localStorage` en un sitio, **sin cambiar sus nombres**) y `eventos.js`. | Bajo |
| 3.4 | **Quitar los parches.** `records` deja de reescribir `showTrick`, `endSession` y `showMenu`; pasa a escuchar los eventos `truco`, `fin-sesion` y `menu`. | Medio |
| 3.5 | **Datos.** Sacar `personajes.js`, `tablas.js` y `trucos.js` a `datos/`. | Bajo |
| 3.6 | **Mundo.** Sacar a `mundo/` el motor, la cámara, los shaders, el cielo, el mar, la ola, las partículas, la costa y los delfines. Cada uno recibe la escena; no toca el estado del juego. | Medio |
| 3.7 | **Surfista y vehículos.** Sacar cuerpo, posturas, tabla y rig a `surfista/`. Sustituir las 38 cadenas `CH.jetski ? … : CH.zodiac ? …` por `vehiculos/<tipo>.js`. | Medio |
| 3.8 | **Estado de la partida.** Juntar las ~60 variables sueltas (`score`, `px`, `air`, `mult`…) en `nucleo/estado.js`. Es un cambio mecánico, pero toca muchas líneas. | Alto |
| 3.9 | **Máquina de estados y física.** Partir `update()` en estados con `entrar` / `actualizar` / `salir` (`juego/sesion.js`) y sacar `fisica.js` y `trucos.js`. | Alto |
| 3.10 | **Interfaz y controles.** Sacar menú, HUD, chat, récords, pantalla completa, música y controles. | Medio |
| 3.11 | **Online y modos.** Sacar `online/` (con `protocolo.js` como único sitio del formato de red), `modos/bots.js` y `modos/disputa.js`. | Medio |
| 3.12 | **Cierre.** `window.__surf` pasa a `debug.js`, `index.html` queda solo con HTML, se actualizan `CLAUDE.md` y `ARQUITECTURA.md` con lo que haya cambiado, y se publica. | Bajo |

Para los pasos de riesgo alto (3.8 y 3.9): además de las pruebas automáticas, jugar una sesión entera de 3 minutos a mano.

Se puede publicar (unir a `main`) al terminar cualquier paso que deje el juego funcionando, sin esperar al final. Recomendado: publicar tras 3.5, tras 3.9 y al terminar.

**Hecho cuando:** `index.html` no tiene lógica, ningún archivo de `js/` pasa de ~400 líneas, no queda ninguna función reescrita por otro módulo, y todas las pruebas pasan.

## Fase 4 — Online para más gente ⬜

- **Salas con tope**: máximo ~10–12 jugadores por ola; si está llena, se abre `pantalan-2` automáticamente
- **Mensajes más ligeros**: menos actualizaciones por segundo cuando no hace falta (el juego ya suaviza el movimiento entre una y otra) y solo lo que cambia
- Medir el consumo real en la consola de Firebase (Realtime Database → Uso) antes y después

**Hecho cuando:** una partida de 10 jugadores gasta claramente menos que ahora, y con 30 personas a la vez se reparten solas en varias olas.

## Fase 5 — Gráficos ⬜

Siempre comprobando que en móvil sigue fluido (la calidad automática ya baja la resolución si hace falta).

- **Color de cine**: tone mapping (ACES o AgX) y espacio de color sRGB. Es la mejora visual más grande con menos código, pero cambia todos los colores y hay que reajustarlos
- **Reflejos del cielo** en el agua, la tabla y el neopreno (mapa de entorno generado a partir del propio cielo)
- **Sombra del surfista** sobre la ola (una sombra suave y barata, no sombras completas)
- **Costa más realista**: modelos 3D sencillos (`.glb`) del Pantalán y del Alto Horno en lugar de cajas. Se pueden hacer gratis con Blender
- **Rendimiento con muchos jugadores**: los demás surfistas comparten geometría y materiales, y los lejanos se dibujan simplificados

**Hecho cuando:** se ve claramente mejor y en el móvil de referencia sigue a ≥ 50 fps.

## Fase 6 — Hacer crecer el juego (ideas, a decidir) ⬜

- **Instalable y sin conexión** (PWA con service worker): se instala como app y se juega offline contra bots. También resuelve la caché de GitHub Pages al publicar
- **Añadir un personaje fácil**: ficha de datos + fotos en `img/`, con una guía paso a paso en este repo
- Más condiciones de mar (tamaño de ola, viento, hora del día) o más playas
- Logros y temporadas del ranking

---

## Cómo trabajar cada fase

1. Antes de empezar, traer lo último de `main` a la rama (`git fetch` y `git rebase origin/main`), por si Juanpe ha publicado algo.
2. Descomponer la fase en tareas pequeñas y apuntarlas aquí, debajo de la fase.
3. Después de cada tarea, pasar las pruebas automáticas y la lista de `CLAUDE.md`, y hacer un commit con un mensaje claro.
4. Marcar la tarea como hecha en este archivo.
5. Al terminar la fase, unirla a `main`, subir `BUILD_ID` y anotar aquí lo que haya cambiado.

## Decisiones abiertas

- ¿Archivar o borrar el repo `surf-sagunto-privado` en GitHub, ahora que no se usa? (Lo decide Juanpe.)
