# Plan de mejoras — Surf Puerto de Sagunto

Objetivo: que el juego sea más fácil de mantener y ampliar, se vea mejor y aguante más jugadores, **sin dejar de ser un juego de navegador sencillo y sin pagar nada**.

Estado de cada fase: ⬜ pendiente · 🟡 en curso · ✅ hecha.
Antes de empezar una fase se descompone en tareas pequeñas (se apuntan aquí mismo, debajo de la fase).

## ▶ Estado actual y cómo seguir (22-10-2026)

**Publicado el 22-10-2026** (versión 1792694534): la estructura nueva es el juego en vivo, con todo lo que Juanpe había hecho hasta ese día. Juanpe trabaja ya sobre ella con su Claude (`CLAUDE.md` y [RECETAS.md](RECETAS.md)); nosotros revisamos lo que sube. Firebase: login anónimo activado y reglas al día (`node herramientas/comprobar-firebase.mjs` → «Todo listo»).

**Siguiente, por orden:**

1. **Fase 6.1 — Que publicar no rompa el juego a nadie** (service worker). Es lo más urgente: después de cada publicación, durante ~10 minutos un móvil puede mezclar archivos viejos y nuevos y no cargar. Juanpe publica a menudo.
2. **Fase 7 — Personajes realistas**: lo que más se nota al jugar (ahora parecen hechos de bolas). Antes hay que decidir el estilo y quién hace los modelos (7.0).
3. **El 29-10-2026**: cerrar las rutas antiguas de Firebase (fase 1, paso 3 de [FIREBASE.md](FIREBASE.md)).
4. **Medidas reales** (las hace Juanpe): fps en su móvil y consumo en la consola de Firebase.
5. **Siempre**: revisar los cambios que Juanpe suba a `main` (fase 6.4).

**Pendiente de decidir** (ver «Decisiones abiertas» al final): estilo de los personajes, color de cine (tone mapping), y si se instala Blender en el ordenador de desarrollo.

---

## Límites gratuitos con los que trabajamos

| Servicio | Límite gratis | Qué significa para el juego |
|---|---|---|
| GitHub Pages | Repos públicos, 1 GB, 100 GB/mes de tráfico. Los archivos se guardan en caché 10 minutos | De sobra para el juego. La caché obliga a cuidar las publicaciones (fase 6.1) |
| Firebase Realtime Database (plan Spark) | 100 conexiones a la vez, 1 GB guardado, **10 GB/mes de descarga** | La descarga es el límite real del online |
| Firebase Authentication (login anónimo) | Gratis | Sirve para proteger la base de datos |
| Firebase Cloud Storage | ❌ Requiere plan de pago | Las notas de voz siguen en la base de datos, pero limitadas a ~73 KB |

Si el plan Spark se queda corto, Firebase **corta el servicio** hasta el mes siguiente; nunca cobra. Por eso no se pasa nunca a Blaze.

Consumo medido con el emulador (fase 4): cada jugador recibe ~40 KB cada 30 s con 3 jugadores surfeando. Con 10 jugadores en la misma ola caben más de 30 h de juego al mes.

---

## Fase 0 — Preparación ✅

- [x] Trabajar sobre el repo público `surf-sagunto` (el que publica GitHub Pages); el privado era una copia
- [x] `CLAUDE.md`, este plan, [ARQUITECTURA.md](ARQUITECTURA.md) y [RECETAS.md](RECETAS.md)
- [x] Pruebas automáticas (`herramientas/`, ver `CLAUDE.md`): juegan una ola con cada personaje, prueban bots, Disputa, online con varios jugadores y las reglas de Firebase
- [x] Punto de partida medido en ordenador: ~108 fps a 1280×720 con una gráfica integrada Intel
- [ ] Medir fps en el móvil de Juanpe

## Fase 1 — Online seguro 🟡

Que nadie pueda borrar a otros jugadores, inventarse récords ni llenar la base de datos desde la consola del navegador. Ver [FIREBASE.md](FIREBASE.md).

- [x] Login anónimo de Firebase; su identificador sustituye al número aleatorio del móvil
- [x] Reglas nuevas bajo `v2/`: cada uno solo escribe lo suyo, todos los campos validados, los récords no pueden bajar, no se aceptan campos desconocidos (52 pruebas con el emulador)
- [x] Mensajes viejos y jugadores «fantasma» los limpia cualquiera, pero solo pasado un tiempo
- [x] Notas de voz a 16 kbps y cortadas antes de ~73 KB; ranking que descarga solo los 20 mejores; récords recuperados de la nube al conectar
- [x] Juanpe: login anónimo activado y reglas publicadas (22-10-2026), con [PREPARAR-FIREBASE.md](PREPARAR-FIREBASE.md)
- [x] Publicado (22-10-2026)
- [ ] **A partir del 29-10-2026**: quitar de las reglas las rutas antiguas `salas` y `stats` y borrar sus datos ([FIREBASE.md](FIREBASE.md), paso 3). Lo hace Juanpe con su Claude; prepararle una guía como `PREPARAR-FIREBASE.md`

**Nota:** el ranking empezó vacío en `v2`. Cada jugador reaparece en cuanto abre la versión nueva, porque su móvil sube los récords que tiene guardados.

## Fase 2 — Limpieza rápida ✅

- [x] Las 27 fotos en base64 de `index.html` pasan a `img/personajes/<id>/`: `index.html` de 1.048 KB a 242 KB
- [x] `modelos/cuerpo.glb`, `audio/musica.mp4`, `css/estilo.css`
- [x] Comprobación de versión nueva con `version.json` y `herramientas/nueva-version.mjs` para publicar
- [x] Fuera el botón «Descargar juego» (solo funcionaba dentro de Claude); README al día

## Fase 3 — Estructura sólida (refactor) ✅

El script único de ~3.500 líneas es ahora **una cincuentena de módulos** en `js/`, organizados por capas: ver **[ARQUITECTURA.md](ARQUITECTURA.md)**. `herramientas/capas.mjs` comprueba que ningún módulo importa de una capa de arriba. El estado compartido está en `G` (`nucleo/estado.js`), documentado campo a campo; los estados de la partida son la tabla `ESTADOS` (`juego/sesion.js`); las posturas por vehículo, la tabla `POSTURAS`.

## Fase 4 — Online para más gente ✅

- [x] `online/protocolo.js`: el formato de lo que se envía por la red, en un solo sitio; solo se manda lo que cambia
- [x] Salas con tope: la ola pública admite 12 surfistas; si está llena, el siguiente entra en `pantalan-2`, `pantalan-3`…
- [x] Medido con el emulador: de 92 KB a ~40 KB por jugador (−55 %)
- [ ] Comprobar el consumo real en la consola de Firebase (Realtime Database → Uso) unos días después de publicar

## Fase 5 — Gráficos 🟡

- [x] **Sombra del surfista** sobre el agua (`surfista/sombra.js`)
- [x] **Reflejos del cielo** en tablas, neoprenos, vehículos y costa (`mundo/cielo.js`; fuerza en `REFLEJOS` de `nucleo/config.js`)
- [x] **Rendimiento con muchos jugadores**: los surfistas fuera de la pantalla no se dibujan. Con 11 bots: 69 → 74 fps
- [ ] **Color de cine (tone mapping AgX/ACES)**: probado y descartado tal cual (los shaders ya hacen su propio ajuste de tono con `tone()` y AgX encima lo deja gris). Hacerlo bien es reajustar a mano todos los colores: **lo decide Juanpe**
- [ ] **Costa más realista**: modelos 3D (`.glb`) del Pantalán y del Alto Horno en lugar de cajas, cargados en `mundo/costa.js`. Necesita Blender (ver fase 7.0)
- [ ] Medir fps en un móvil de verdad

## Fase 6 — Publicar sin sustos y revisar a Juanpe ⬜

Ahora que Juanpe publica directamente y a menudo, lo importante es que cada publicación llegue limpia a todos los móviles y que nosotros veamos enseguida si algo se ha roto.

- [ ] **6.1 Service worker** (`sw.js` en la raíz, registrado desde `js/main.js`). Problema real comprobado: GitHub Pages deja guardar cada archivo 10 minutos (`Cache-Control: max-age=600`) y solo `main.js` y el CSS llevan `?v=`; los demás módulos no. Tras publicar, un móvil puede cargar el `inicio.js` nuevo con módulos viejos y quedarse en «No se ha podido cargar el juego». Solución: el service worker pide los archivos del juego a la red preguntando si han cambiado (si no, responde «igual» y no se vuelve a descargar) y solo usa la copia guardada si no hay conexión. Probar: publicar dos versiones seguidas y abrir con la caché llena
- [ ] **6.2 Instalable** (`manifest.json` + icono): se añade a la pantalla de inicio como una app y, sin conexión, se juega con bots
- [ ] **6.3 Comprobar la web publicada**: que `herramientas/probar.mjs` pueda abrir la dirección pública (no solo la carpeta local) y jugar una ola, para comprobar en un minuto que lo que ha publicado Juanpe funciona
- [ ] **6.4 Revisión de lo que sube Juanpe**: con cada tanda de cambios en `main`, pasar las pruebas y revisar que sigue las normas de `CLAUDE.md` (módulo correcto, nada de base64, reglas si cambia la red, `nueva-version.mjs`…). Si algo se sale, corregirlo en una rama y explicárselo a Juanpe. Se puede automatizar con una tarea programada que avise cuando haya cambios

## Fase 7 — Personajes realistas ⬜

Lo que más se nota al jugar: los surfistas parecen hechos de bolas. El cuerpo es un maniquí de pruebas de three.js (Xbot, `modelos/cuerpo.glb`) pintado por zonas, y la cabeza la construye el código con esferas (la cara es la foto pegada sobre un trozo de esfera; pelo, barba y gorra son esferas). El navegador puede con modelos realistas hechos en Blender (`.glb`, como ya se carga el cuerpo); los límites son el peso de descarga en el móvil y la potencia con 12 surfistas a la vez.

Objetivo realista: nivel de un buen juego de móvil (cuerpo humano con piel y neopreno, cabeza con forma de cabeza y la cara de cada uno), no fotorrealismo de consola. **Un cuerpo común para todos** y lo propio de cada personaje en colores, texturas y piezas pequeñas.

- [ ] **7.0 Decidir** (Juanpe y nosotros): estilo (semirrealista o más «dibujo»), con 2–3 referencias; y **quién hace los modelos**: instalar Blender (gratis) en el ordenador de desarrollo para que Claude pueda generar parte por línea de comandos, o que alguien los haga a mano
- [ ] **7.1 Cuerpo nuevo**: una base humana realista de licencia libre (MPFB/MakeHuman para Blender) con el esqueleto de nombres `mixamorig…` que ya usa `surfista/cuerpo.js`, así el código que lo mueve sirve tal cual. Presupuesto: ~10–15 mil triángulos y ≤ 3 MB. Neopreno por zonas (como ahora) o con textura
- [ ] **7.2 Cabeza**: una cabeza humana 3D común (dentro del cuerpo o aparte) con la foto `cara.jpg` proyectada, en lugar de la esfera de `surfista/muneco.js`. Probar primero con 2–3 personajes
- [ ] **7.3 Pelo, barba, gorra, gafas y casco**: piezas pequeñas (`.glb`) por estilo (`fade`, `curly`, `long`, `bald`…) en vez de esferas
- [ ] **7.4 Encajar las posturas**: las posturas son puntos (manos, rodillas, pecho…); con otras proporciones hay que reajustar `HUMAN.legLen` y comprobar manos en la tabla, pala del kayak, manillar de la moto
- [ ] **7.5 Medir y decidir**: peso total, fps con 11 bots en ordenador y en el móvil de Juanpe. Si un móvil no puede, se queda con el muñeco actual (calidad baja automática)

## Fase 8 — Hacer crecer el juego (ideas, a decidir) ⬜

- Más condiciones de mar (tamaño de ola, viento, hora del día) o más playas
- Logros y temporadas del ranking
- (Hecho: añadir un personaje es fácil, ver [RECETAS.md](RECETAS.md) 1)

---

## Cómo trabajamos ahora

- **Juanpe** pide cosas a su Claude y publica en `main` (flujo en `CLAUDE.md`).
- **Nosotros**, para cada mejora del plan: rama nueva desde `main` (`git fetch` y `git checkout -b <tema> origin/main`), tareas pequeñas con pruebas, y al terminar volver a traer `main` (por si Juanpe ha publicado algo), unir, `node herramientas/nueva-version.mjs` y subir. Si cambia lo que se envía por la red, Juanpe publica antes las reglas y se comprueba con `comprobar-firebase.mjs`.
- Marcar aquí cada tarea hecha.

## Decisiones abiertas

- **Estilo de los personajes** y si se instala Blender (fase 7.0).
- **Color de cine** (fase 5): ¿reajustar todos los colores con tone mapping o dejarlo como está? Lo decide Juanpe.
- `LEEME-LEO.md` (una nota en broma del Claude de Juanpe) está publicada en la raíz de la web: ¿se deja o se quita?
- ¿Archivar o borrar el repo `surf-sagunto-privado`, ahora que no se usa? (Lo decide Juanpe.)

---

## Registro: cambios de Juanpe pasados a la estructura nueva (antes de publicar)

Mientras se hacía el refactor, Juanpe siguió cambiando el `index.html` antiguo en `main`. Cada cambio se rehízo a mano en su módulo (uniendo `origin/main` a `mejoras` y quedándose con el `index.html` de la rama):

- **21-10-2026** (`9fe51fd`…`2da9ae8`): personajes **OG Young Rubén**, **OG Young Blasco** (`blanco`) y **Akeny** con su **tabla de planchar** (`board: 'iron'`); personajes en **orden alfabético**; trucos con tabla (**switch** con «Revert», **backflip agarrado**; el «Rodeo» pasa a «Backflip»); **empujón** con 4 s de protección al coger la ola (🛡️, campo `pt`), solo pegado (también en el aire) y animación de brazos y vuelo.
- **21-10-2026, tarde** (`563daa5`): 1 toque switch y 2 toques 360; **salto según la inercia** (`G.hMinRun`); al caer, la tabla baja la ola.
- **22-10-2026** (`f812d52`…`635bcdb`): **floater** (`juego/floater.js`); **robar la tabla** en el segundo empujón (`online/robo.js`, campo `sb`); **choques con tambaleo**; el empujón lo **gana el más rápido**.

Al pasarlos se corrigieron dos fallos de `main`: el robo que no terminaba si te tiraban llevando algo robado, y los brazos de otro jugador que se quedaban estirados si empujaba fuera de la pantalla. Detalle de cada uno en el historial de git (`git log --grep=Juanpe`).
