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
| Firebase Cloud Storage | ❌ Requiere plan de pago | Las notas de voz siguen en la base de datos, pero más cortas |

Si el plan Spark se queda corto, Firebase **corta el servicio** hasta el mes siguiente; nunca cobra. Por eso no se pasa nunca a Blaze.

Consumo estimado ahora (cada jugador recibe ~8 actualizaciones/s de cada uno de los demás):

| Jugadores en la misma ola | Descarga aprox. | Horas de juego que caben en 10 GB/mes |
|---|---|---|
| 5 | 150 MB/h | ~65 h |
| 10 | 650 MB/h | ~15 h |
| 20 | 2,7 GB/h | ~4 h |

---

## Fase 0 — Preparación 🟡

Dejar el terreno listo para trabajar sin miedo a romper el juego.

- [x] Trabajar sobre el repo público `surf-sagunto` (el que publica GitHub Pages); el privado era una copia
- [x] Rama `mejoras` para todo el trabajo (`main` es el juego en vivo y no se toca hasta que esté probado)
- [x] `CLAUDE.md`, este plan y [ARQUITECTURA.md](ARQUITECTURA.md)
- [ ] Medir el punto de partida: peso de la página, tiempo de carga y fps en un móvil y en un ordenador, para comparar después

**Hecho cuando:** tenemos las medidas iniciales apuntadas aquí.

## Fase 1 — Limpieza rápida ⬜

Cambios sin riesgo que hacen el juego bastante más ligero. El juego debe verse y jugarse **exactamente igual**.

- Sacar las 29 fotos en base64 de `index.html` a `img/personajes/<id>/` y quitar las repetidas (`index.html` pasa de ~1 MB a ~100 KB y el navegador guarda las fotos en caché)
- Mover `cuerpo.glb` a `modelos/` y `musica.mp4` a `audio/`
- Sacar el CSS a `css/estilo.css`
- Cambiar la comprobación de versión nueva: ahora descarga el `index.html` entero (1 MB) en cada visita; pasará a leer un `version.json` de pocos bytes
- Quitar código que no hace nada en GitHub Pages: el botón «Descargar juego» (solo funcionaba dentro de Claude y pide un `descarga.txt` que no existe)
- Actualizar el README

**Hecho cuando:** la lista de pruebas de `CLAUDE.md` pasa entera y la página pesa mucho menos.

## Fase 2 — Estructura sólida (refactor) ⬜

Pasar del script único de ~3.500 líneas a la estructura descrita en **[ARQUITECTURA.md](ARQUITECTURA.md)**: módulos nativos del navegador, sin compilación, organizados en capas, con eventos en vez de parches, una máquina de estados y los vehículos y personajes como datos.

Es la fase más importante. Después de ella:
- cada cambio toca un archivo de 100–400 líneas, y Claude se equivoca mucho menos;
- añadir un personaje es añadir una ficha y unas fotos; un vehículo o un modo de juego, un archivo nuevo;
- las fases 3 y 4 se hacen sobre módulos concretos (`online/`, `mundo/`) sin riesgo de romper el resto.

**Regla de oro de esta fase: el juego no cambia.** Ni física, ni colores, ni textos. Solo se mueve código de sitio. Si se ve algo que mejorar, se apunta para después.

Pasos (cada uno es un commit, y después de cada uno se pasa la lista de pruebas):

| Paso | Qué se hace | Riesgo |
|---|---|---|
| 2.1 | **Convertir a módulo.** El script pasa tal cual a `js/main.js` y se carga con `<script type="module">`. Crear `js/three.js`. | Bajo |
| 2.2 | **Red de seguridad.** Página `pruebas.html` que carga los módulos y comprueba cosas básicas: que cada personaje tiene sus fotos y un vehículo válido, que la física no da números raros (`NaN`). Crecerá con cada paso. | Bajo |
| 2.3 | **Núcleo.** Sacar `util.js`, `config.js`, `guardado.js` (todas las claves de `localStorage` en un sitio, **sin cambiar sus nombres**) y `eventos.js`. | Bajo |
| 2.4 | **Quitar los parches.** `records` deja de reescribir `showTrick`, `endSession` y `showMenu`; pasa a escuchar los eventos `truco`, `fin-sesion` y `menu`. | Medio |
| 2.5 | **Datos.** Sacar `personajes.js`, `tablas.js` y `trucos.js` a `datos/`. | Bajo |
| 2.6 | **Mundo.** Sacar a `mundo/` el motor, la cámara, los shaders, el cielo, el mar, la ola, las partículas, la costa y los delfines. Cada uno recibe la escena; no toca el estado del juego. | Medio |
| 2.7 | **Surfista y vehículos.** Sacar cuerpo, posturas, tabla y rig a `surfista/`. Sustituir las 38 cadenas `CH.jetski ? … : CH.zodiac ? …` por `vehiculos/<tipo>.js`. | Medio |
| 2.8 | **Estado de la partida.** Juntar las ~60 variables sueltas (`score`, `px`, `air`, `mult`…) en `nucleo/estado.js`. Es un cambio mecánico, pero toca muchas líneas. | Alto |
| 2.9 | **Máquina de estados y física.** Partir `update()` en estados con `entrar` / `actualizar` / `salir` (`juego/sesion.js`) y sacar `fisica.js` y `trucos.js`. | Alto |
| 2.10 | **Interfaz y controles.** Sacar menú, HUD, chat, récords, pantalla completa, música y controles. | Medio |
| 2.11 | **Online y modos.** Sacar `online/` (con `protocolo.js` como único sitio del formato de red), `modos/bots.js` y `modos/disputa.js`. | Medio |
| 2.12 | **Cierre.** `window.__surf` pasa a `debug.js`, `index.html` queda solo con HTML, se actualizan `CLAUDE.md` y `ARQUITECTURA.md` con lo que haya cambiado, y se publica. | Bajo |

Para los pasos de riesgo alto (2.8 y 2.9): probar también con bots (`#bots`), con la Disputa y con cada vehículo, y si se puede, jugar una sesión entera de 3 minutos.

Se puede publicar (unir a `main`) al terminar cualquier paso que deje el juego funcionando, no hace falta esperar al final. Recomendado: publicar tras 2.5, tras 2.9 y al terminar.

**Hecho cuando:** `index.html` no tiene lógica, ningún archivo de `js/` pasa de ~400 líneas, no queda ninguna función reescrita por otro módulo, `pruebas.html` pasa y la lista de pruebas de `CLAUDE.md` pasa entera.

## Fase 3 — Online seguro y dentro del plan gratis ⬜

- **Login anónimo de Firebase** (el jugador no ve nada) y reglas nuevas: cada uno solo puede escribir su propio jugador y sus propios récords. Ahora cualquiera puede borrar a otros o inventarse récords desde la consola del navegador.
- Límites razonables en las reglas: puntos máximos posibles en una sesión de 3 minutos, tamaño de mensajes.
- **Notas de voz** más cortas (máx. ~8 s) y con menos calidad, para que no gasten la descarga mensual.
- **Ranking**: descargar solo el top 50 en vez de todas las puntuaciones.
- **Salas con tope**: máximo ~10–12 jugadores por ola; si está llena, se abre `pantalan-2` automáticamente.
- **Mensajes más ligeros**: menos actualizaciones por segundo cuando no hace falta (el juego ya suaviza el movimiento entre una y otra).
- Revisar el consumo real en la consola de Firebase (Realtime Database → Uso) antes y después.

⚠️ Las reglas nuevas y el código nuevo se publican **a la vez**: con reglas nuevas, las versiones viejas del juego dejan de poder escribir. Subir `BUILD_ID` para que los móviles se recarguen solos.

**Hecho cuando:** las reglas no dejan escribir datos ajenos, y una partida de 10 jugadores gasta bastante menos que ahora.

## Fase 4 — Gráficos ⬜

Siempre comprobando que en móvil sigue fluido (la calidad automática ya baja la resolución si hace falta).

- **Color de cine**: tone mapping (ACES o AgX) y espacio de color sRGB. Es la mejora visual más grande con menos código, pero cambia todos los colores y hay que reajustarlos.
- **Reflejos del cielo** en el agua, la tabla y el neopreno (mapa de entorno generado a partir del propio cielo).
- **Sombra del surfista** sobre la ola (una sombra suave y barata, no sombras completas).
- **Costa más realista**: modelos 3D sencillos (`.glb`) del Pantalán y del Alto Horno en lugar de cajas. Se pueden hacer gratis con Blender.
- **Rendimiento con muchos jugadores**: los demás surfistas comparten geometría y materiales, y los lejanos se dibujan simplificados.

**Hecho cuando:** se ve claramente mejor y en el móvil de referencia sigue a ≥ 50 fps.

## Fase 5 — Hacer crecer el juego (ideas, a decidir) ⬜

- **Instalable y sin conexión** (PWA con service worker): se instala como app y se juega offline contra bots.
- **Añadir un personaje fácil**: ficha de datos + fotos en `img/`, con una guía paso a paso en este repo.
- Más condiciones de mar (tamaño de ola, viento, hora del día) o más playas.
- Logros y temporadas del ranking.

---

## Cómo trabajar cada fase

1. Antes de empezar, descomponer la fase en tareas pequeñas y apuntarlas aquí, debajo de la fase.
2. Trabajar en la rama `mejoras` (o en una rama por tarea si es grande).
3. Después de cada tarea, pasar la lista de pruebas de `CLAUDE.md` y hacer un commit con un mensaje claro.
4. Marcar la tarea como hecha en este archivo.
5. Al terminar la fase, unirla a `main`, publicarla y anotar aquí lo que haya cambiado.

## Decisiones abiertas

- ¿Archivar o borrar el repo `surf-sagunto-privado` en GitHub, ahora que no se usa? (Lo decide Juanpe.)
