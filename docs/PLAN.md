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

- [x] Rama `mejoras` para todo el trabajo (el juego en vivo no se toca hasta que esté probado)
- [x] `CLAUDE.md` con las reglas del proyecto y este plan
- [ ] Aclarar cómo se pasa el juego del repo privado al público (`surf-sagunto`, el que publica GitHub Pages)
- [ ] Medir el punto de partida: peso de la página, tiempo de carga y fps en un móvil y en un ordenador, para comparar después

**Hecho cuando:** Juanpe sabe en qué rama trabajar y cómo publicar, y tenemos las medidas iniciales apuntadas aquí.

## Fase 1 — Limpieza rápida ⬜

Cambios sin riesgo que hacen el juego bastante más ligero. El juego debe verse y jugarse **exactamente igual**.

- Sacar las 29 fotos en base64 de `index.html` a la carpeta `img/` y quitar las repetidas (`index.html` pasa de ~1 MB a ~100 KB y el navegador guarda las fotos en caché)
- Sacar el CSS a `css/estilo.css`
- Cambiar la comprobación de versión nueva: ahora descarga el `index.html` entero (1 MB) en cada visita; pasará a leer un `version.json` de pocos bytes
- Actualizar el README

**Hecho cuando:** la lista de pruebas de `CLAUDE.md` pasa entera y la página pesa mucho menos.

## Fase 2 — Separar el código en módulos ⬜

Partir el script de ~3.500 líneas en archivos pequeños usando módulos nativos del navegador (`<script type="module">`), **sin herramientas de compilación**. Es la fase más importante: después de ella, cada cambio toca un archivo de 200–400 líneas en vez del archivo gigante, y Claude se equivoca mucho menos.

Estructura objetivo:

```
index.html          solo el HTML
css/estilo.css
img/                fotos de caras y tablas
js/
  main.js           arranque y bucle principal
  estado.js         estado compartido del juego (puntos, posición, modo…)
  util.js           clamp, lerp, rnd…
  motor.js          renderer, cámara, luces, efectos, calidad automática
  cielo.js  mar.js  ola.js  particulas.js  costa.js  delfines.js
  surfista.js       cuerpo, posturas, tablas
  personajes.js     la lista CHARS (solo datos)
  fisica.js         remar, coger la ola, giros, saltos, trucos, caídas
  controles.js      táctil y teclado
  ui.js             menú, HUD, música, pantalla completa
  online.js  bots.js  disputa.js  records.js
```

Cómo hacerlo sin romper nada:
1. Pasar el script tal cual a `js/main.js` como módulo y comprobar que todo funciona.
2. Sacar las piezas de una en una, empezando por las que menos dependen del resto (utilidades → personajes → tablas → costa → cielo/mar/ola → partículas → surfista → récords → bots → disputa → online → física). **Probar después de cada una.**
3. El estado que comparten muchas partes (puntos, posición, `state`…) se agrupa en `estado.js` en vez de variables sueltas.
4. Quitar los parches que reescriben funciones de otras secciones (p. ej. `showTrick` en récords) y cambiarlos por llamadas directas o avisos simples.

**Hecho cuando:** `index.html` no tiene lógica, ningún archivo de `js/` pasa de ~500 líneas, y la lista de pruebas pasa entera.

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

- ¿Cómo se sincronizan el repo privado y el público? (¿se sube a los dos a la vez? ¿se copia a mano?) Lo ideal sería un solo sitio desde el que se publique.
