# Plan de mejoras — Surf Puerto de Sagunto

Objetivo: que el juego sea más fácil de mantener y ampliar, se vea mejor y aguante más jugadores, **sin dejar de ser un juego de navegador sencillo y sin pagar nada**.

Estado de cada fase: ⬜ pendiente · 🟡 en curso · ✅ hecha.
Las fases se hacen en orden: cada una se apoya en la anterior. Antes de empezar una fase se descompone en tareas pequeñas (se apuntan aquí mismo, debajo de la fase).

## ▶ Estado actual y cómo seguir (21-10-2026)

Todo el trabajo está en la rama **`mejoras`**, en local: **todavía no se ha subido a GitHub** (la cuenta que lo hizo no tenía permiso de escritura en el repo). Nada de esto está en el juego en vivo.

**Hecho:** fases 0 a 4 completas y la mayor parte de la 5. Todas las pruebas pasan (12 personajes, bots, Disputa, online con 2 y 3 jugadores contra el emulador, 47 reglas, capas).

**Para publicar (en este orden):**
1. Subir la rama `mejoras` a GitHub y probar a mano (ver «Cómo probar» en `CLAUDE.md`, o `herramientas/pruebas.html`).
2. Juanpe: activar el login anónimo y publicar las reglas en Firebase ([FIREBASE.md](FIREBASE.md), pasos 1 y 2). Se puede hacer antes de publicar: el juego viejo sigue funcionando.
3. Unir `mejoras` a `main` y ejecutar `node herramientas/nueva-version.mjs` (los móviles se recargan solos).
4. Una semana después: cerrar las rutas antiguas de Firebase ([FIREBASE.md](FIREBASE.md), paso 3).

**Pendiente:** lo que queda sin marcar en las fases 5 y 6, y comprobar fps y consumo reales (móvil y consola de Firebase).

**Cuidado:** si Juanpe cambia `index.html` en `main` antes de unir la rama, ese cambio hay que pasarlo a mano al módulo que toque en `js/` (ver [ARQUITECTURA.md](ARQUITECTURA.md)).

---

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

## Fase 2 — Limpieza rápida ✅

Cambios sin riesgo que hacen el juego bastante más ligero. El juego debe verse y jugarse **exactamente igual**.

- [x] Sacar las 27 fotos en base64 de `index.html` a `img/personajes/<id>/` (no había repetidas): `index.html` pasa de 1.048 KB a 242 KB, y el navegador guarda las fotos en caché
- [x] Mover `cuerpo.glb` a `modelos/` y `musica.mp4` a `audio/`
- [x] Sacar el CSS a `css/estilo.css`
- [x] Comprobación de versión nueva con `version.json` (antes descargaba el `index.html` entero, 1 MB, en cada visita), y `herramientas/nueva-version.mjs` para publicar
- [x] Quitar el botón «Descargar juego» (solo funcionaba dentro de Claude y pedía un `descarga.txt` que no existe) y los textos que lo mencionaban
- [x] Actualizar el README

**Hecho cuando:** las pruebas automáticas y la lista de `CLAUDE.md` pasan, y la página pesa mucho menos. ✅

## Fase 3 — Estructura sólida (refactor) ✅

El script único de ~3.500 líneas es ahora **45 módulos** en `js/`, organizados por capas: ver **[ARQUITECTURA.md](ARQUITECTURA.md)**. El juego se juega igual: todas las pruebas pasan (los 12 personajes, bots, Disputa, online con dos jugadores y las 47 reglas).

Cómo se hizo: primero se preparó el código dentro del archivo único (avisos en vez de parches, `update()` partido en funciones), y después se partió con una herramienta que analiza el código (qué usa cada parte, qué variables se escriben desde varios sitios), para no dejarse ninguna referencia. Luego se pulió a mano cada módulo.

- [x] 3.1 El script pasa a módulos (`js/main.js` comprueba WebGL y carga `js/inicio.js`). No hizo falta `js/three.js`: `THREE` sigue siendo global
- [x] 3.2 Red de seguridad: `herramientas/pruebas.html` (en el navegador, sin instalar nada) y `herramientas/pruebas/datos.js` (fotos, diseños y vehículo de cada personaje)
- [x] 3.3 Núcleo: `util.js`, `eventos.js`, `config.js`, `estado.js` y `guardado.js` (todas las claves del móvil en un sitio, con los mismos nombres)
- [x] 3.4 Fuera los parches: los récords escuchan los avisos `truco`, `fin-sesion` y `menu`
- [x] 3.5 Datos: `datos/personajes.js` y `datos/disenos.js`
- [x] 3.6 Mundo: motor, shaders, cielo, mar, ola, partículas, costa y delfines
- [x] 3.7 Surfista: posturas, cuerpo, muñeco, tabla, vehículos, personaje y rig. Las cadenas `CH.jetski ? … : CH.zodiac ? …` de las posturas son ahora la tabla `POSTURAS` (un archivo por vehículo no compensaba: cada vehículo son tres líneas)
- [x] 3.8 Estado de la partida: 79 variables en `G` (`nucleo/estado.js`), documentadas una a una
- [x] 3.9 Estados de la partida como tabla `ESTADOS` (una función por estado) en `juego/sesion.js`; física y trucos aparte
- [x] 3.10 Interfaz y controles
- [x] 3.11 Online y modos (el `protocolo.js` con el formato de red pasa a la fase 4, que es cuando se va a cambiar ese formato)
- [x] 3.12 Cierre: `debug.js`, `index.html` solo con HTML, CSS y HTML de la Disputa en su sitio, `herramientas/capas.mjs` y documentación al día

Cambios pequeños que sí se notan (a propósito): el kayak rema igual de rápido cuando pierde la ola que cuando rema (antes iba más lento esos 2 segundos); y se han quitado el botón «Descargar juego» y la carga de `cuerpo.txt`, que solo funcionaban dentro de Claude.

⚠️ Los cambios que Juanpe haga a partir de ahora en `main` sobre el `index.html` antiguo no encajan directamente en los módulos: hay que trasladarlos a mano al módulo que toque. Lo mejor es unir esta rama a `main` cuanto antes y seguir ya sobre la estructura nueva.

## Fase 4 — Online para más gente ✅

- [x] **`online/protocolo.js`**: el formato de lo que se envía por la red, en un solo sitio
- [x] **Salas con tope**: la ola pública admite 12 surfistas; si está llena, el siguiente entra en `pantalan-2`, `pantalan-3`… Las salas con nombre (`#amigos`) no tienen tope
- [x] **Mensajes más ligeros**: solo se manda lo que cambia (`update` en vez de `set`), la hora cada 2 s y los puntos como mucho una vez por segundo; ~7 envíos por segundo surfeando (antes 8), 4 remando y 10 en la Disputa
- [x] Medido con el emulador (3 jugadores surfeando ~30 s, `herramientas/pruebas/red.js`): cada jugador recibía **92 KB** y ahora **42 KB (−55 %)**. Con 10 jugadores, las ~15 h de juego al mes del plan gratuito pasan a más de 30 h
- [ ] Comprobar el consumo real en la consola de Firebase (Realtime Database → Uso) cuando esté publicado

**Hecho cuando:** una partida de 10 jugadores gasta claramente menos que ahora, y con 30 personas a la vez se reparten solas en varias olas.

## Fase 5 — Gráficos 🟡

Siempre comprobando que en móvil sigue fluido (la calidad automática ya baja la resolución si hace falta). Para comparar: `herramientas/pruebas/vista.js` (capturas) y `herramientas/pruebas/fps.js` (fps).

- [x] **Sombra del surfista** sobre el agua (`surfista/sombra.js`): mancha suave bajo la tabla o el vehículo; también la llevan los demás jugadores y se esconde en el aire
- [x] **Reflejos del cielo** en tablas, neoprenos, vehículos y costa (`mundo/cielo.js`, mapa de entorno sacado del propio cielo; fuerza en `REFLEJOS` de `nucleo/config.js`)
- [x] **Rendimiento con muchos jugadores**: los surfistas fuera de la pantalla no se dibujan ni se les mueve el esqueleto. Con 11 bots: 69 → 74 fps (gráfica integrada Intel, 1280×720)
- [ ] **Color de cine (tone mapping AgX/ACES)**: probado y **descartado tal cual**. Los shaders del juego ya hacen su propio ajuste de tono (`tone()` en `mundo/shaders.js`); poner AgX encima lo deja gris y apagado. Para hacerlo bien hay que quitar `tone()` de todos los shaders, pasar a sRGB y reajustar a mano todos los colores: es una decisión de estilo que tiene que ver Juanpe
- [ ] **Costa más realista**: modelos 3D (`.glb`) del Pantalán y del Alto Horno en lugar de cajas. Hay que hacerlos en Blender (gratis); el código solo tendría que cargarlos en `mundo/costa.js` como se carga `modelos/cuerpo.glb`
- [ ] Medir fps en un móvil de verdad

Medidas (ordenador, gráfica integrada Intel): solo 83 → 79 fps; con 11 bots 71 → 74 fps.

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
