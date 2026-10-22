# Recetas — lo que Juanpe suele pedir, paso a paso

Cada receta dice qué archivos tocar y en qué orden. Antes de empezar, sigue el flujo de trabajo de `CLAUDE.md` (rama nueva, pruebas, publicar). Si lo que te piden no está aquí, busca en la tabla «Quiero… → toco…» de [ARQUITECTURA.md](ARQUITECTURA.md).

---

## 1. Añadir un personaje

Ejemplo real: Akeny (con tabla de planchar), OG Young Rubén y OG Young Blasco.

**1. Las fotos.** Pide a Juanpe las fotos **como archivo** (que te diga la ruta o las ponga en la carpeta del proyecto). Prepáralas con lo que tengas a mano (por ejemplo Python con Pillow) y guárdalas como JPG en `img/personajes/<id>/`:

| Archivo | Tamaño | Qué es | ¿Obligatorio? |
|---|---|---|---|
| `foto.jpg` | 320×400 | Su foto para la ficha del menú (vertical, la persona entera o de medio cuerpo) | Sí |
| `cara.jpg` | 256×320 | La cara, centrada en un óvalo, con el borde difuminado a color piel. Se pega en la cabeza del muñeco 3D | Recomendado (sin ella, el muñeco no tiene cara) |
| `tabla.jpg` | 1024×300 | La tabla vista desde arriba, en horizontal, **punta a la derecha y cola a la izquierda**, recortada a su silueta | Solo si su tabla sale de una foto (`deck: 'photo'`) |

Cada foto debería pesar menos de ~40 KB (calidad JPG 80 basta). **Nunca** en base64 dentro del código.

**2. La ficha**, en `CHARS` de [js/datos/personajes.js](../js/datos/personajes.js), con un comentario encima que lo describa (copia una ficha parecida y cámbiala). Y su línea en `PHOTOS` y `FACES` del mismo archivo; si tiene `tabla.jpg`, también en `BOARD_PHOTOS` de [js/datos/disenos.js](../js/datos/disenos.js).

| Campo | Qué es |
|---|---|
| `id` | Minúsculas y números, único. **No se cambia nunca después**: es lo que guarda el móvil del jugador y el ranking. El nombre visible sí se puede cambiar |
| `name`, `tag` | Nombre y lema de la ficha |
| `goofy` | `true` = pie derecho delante |
| `vel`, `air`, `tubo` | Estadísticas de 1 a 5 (velocidad, altura de salto, aguante en el tubo) |
| `skin`, `hair` | Colores de piel y pelo (`0xRRGGBB`) |
| `style` | Peinado: `'fade'` (corto), `'curly'` (rizado), `'messy'` (despeinado), `'surfer'`, `'long'` (melena al viento), `'pony'` (coleta), `'bald'` (calvo) |
| `beard`, `beardFull`, `beardColor`, `glasses`, `cap`, `helmet`, `helmetColor` | Barba, gafas de sol, gorra, casco |
| `suit`, `shorts`, `upperArm`, `forearm`, `legs` | Colores del neopreno por partes (sin neopreno: pon el color de la piel) |
| `longSuit`, `sleeveless`, `suitStripes`, `torso` | Neopreno largo, sin mangas, con rayas, o con dibujo propio (`TORSOS` en `disenos.js`) |
| `deck` | Dibujo de la tabla: uno de `DECKS` en `disenos.js`, o `'photo'` (+ `deckFallback: 'plain', deckPhoto: true`) si sale de `tabla.jpg` |
| `board` | Forma: sin poner = tabla corta; `'long'` longboard, `'body'` bodyboard, `'iron'` tabla de planchar, `'jet'`, `'kayak'`, `'zodiac'` |
| `jetski`, `kayak`, `zodiac`, `bodyboard` | Va sentado o tumbado en ese vehículo (cambia posturas y trucos) |
| `fins` | Tres quillas, de `FINS` en `disenos.js` (normalmente `['black', 'black', 'black']`) |
| `sw` | Colores de las bolitas de la ficha del menú |

Los personajes salen solos en orden alfabético (el primero es el que llevan los nuevos que no eligen).

**3. Prueba:** `node herramientas/probar.mjs herramientas/pruebas/datos.js` (avisa si falta una foto o un nombre está mal) y `partida.js` (juega una ola con cada uno).

## 2. Cambiar algo de un personaje que ya existe

Nombre, lema, colores, peinado o estadísticas: solo su ficha en `personajes.js`. Fotos: sustituye el archivo en `img/personajes/<id>/` con el mismo nombre y tamaño. **El `id` no se toca.**

## 3. Una tabla o un vehículo nuevo

Ejemplo real: la tabla de planchar de Akeny (`board: 'iron'`).

1. El modelo 3D (si lleva piezas propias): un grupo nuevo en [js/surfista/vehiculos.js](../js/surfista/vehiculos.js), como `ironG`.
2. Su forma: en `setBoardShape` de [js/surfista/personaje.js](../js/surfista/personaje.js), qué se ve, la escala de la tabla y si lleva quillas.
3. Su sombra: el tamaño en `TAMANOS` de [js/surfista/sombra.js](../js/surfista/sombra.js).
4. Si va sentado o tumbado: su postura en `POSTURAS` de [js/surfista/posturas.js](../js/surfista/posturas.js) y su bandera en `vehiculo()`.

Si es un modelo hecho en Blender: expórtalo a `.glb`, guárdalo en `modelos/` y cárgalo con `THREE.GLTFLoader` como hace `surfista/cuerpo.js`. Que pese poco (idealmente menos de 1 MB): se descarga en el móvil.

## 4. Un truco nuevo o cambiar los trucos

- En el aire: `doTrick` (qué hace cada número de toques) y `land` (cómo se llama y cuántos puntos da) en [js/juego/trucos.js](../js/juego/trucos.js). Los giros se piden con `G.spinT` (vueltas) y `G.flipT` (mortales); `G.supT` agarra la tabla un rato.
- En la ola: [js/juego/fisica.js](../js/juego/fisica.js) (`rideStep`).
- La postura del cuerpo: [js/surfista/posturas.js](../js/surfista/posturas.js).
- **Textos que hay que cambiar a la vez:** el panel de ayuda en `index.html` (busca `<b>Trucos</b>`), el aviso del primer salto (`say(...)` en `launch()` de `trucos.js`) y, si aplica, lo que gritan los bots (`modos/bots.js`).
- El nombre del truco se guarda en los récords: corto (menos de 30 letras) y sin `. # $ [ ] /`.

## 5. Ajustar cómo se juega (números)

| Qué | Dónde |
|---|---|
| Duración de la sesión | `SESSION` en [js/nucleo/config.js](../js/nucleo/config.js) |
| Altura de los saltos | `launch()` en `juego/trucos.js` (`G.aVy`) |
| Velocidad del tubo, giros, caídas | `rideStep` en `juego/fisica.js` |
| Cómo se cae de un salto | `LAND_A`, `LAND_SOFT` en `juego/fisica.js` |
| Puntos | `land()` en `juego/trucos.js`, `addPts` / `bump` en `juego/puntos.js` |
| Empujones (distancia, protección) | `PUSH_DIST`, `SAFE_T` en `online/empujones.js` |
| Bots | `modos/bots.js` |

Cambia un número cada vez y prueba.

## 6. Algo del modo online

1. Lo que se envía está descrito en [js/online/protocolo.js](../js/online/protocolo.js). Un campo nuevo va ahí.
2. **Y también** en [firebase-reglas.json](../firebase-reglas.json) (copia una línea parecida) y un caso en `herramientas/pruebas/reglas.mjs`. Las reglas rechazan los campos que no conocen.
3. ⚠️ **Antes de publicar el juego, Juanpe tiene que publicar las reglas nuevas** en la consola de Firebase ([FIREBASE.md](FIREBASE.md), paso 2). Explícale los pasos y espera a que te diga que está hecho. Si publicas el juego antes, ese dato se pierde sin avisar.
4. Cuidado con el gasto: el plan gratis tiene 10 GB al mes de descarga. No mandes cosas en cada fotograma; mira cómo lo hace `mandarSurfista` (solo lo que cambia) y mide con `red.js` si dudas.

## 7. Textos, botones y paneles

- El HTML de menús, marcadores y paneles está en `index.html` (tiene finales de línea CRLF: edítalo con la herramienta de edición, no con `sed`). Los estilos, en `css/estilo.css`.
- Lo que hace un botón del menú: `js/interfaz/menu.js`.
- Mensajes durante la partida: `say` (texto grande), `chip` (etiqueta pequeña), `showTrick` (nombre de truco con puntos) y `toast` (aviso), en `js/juego/hud.js`.

## 8. Imágenes, música y sonidos

Archivos en `img/` o `audio/` y se cargan por su ruta. Nunca en base64 dentro del código. Que pesen poco: el juego se descarga en móviles.

## 9. Algo del mar, el cielo o la costa

`js/mundo/`: `mar.js`, `ola.js`, `cielo.js`, `costa.js` (Pantalán, Alto Horno…), `delfines.js`. Lo común de los shaders está en `shaders.js`. Comprueba antes y después con `vista.js --capturas=carpeta` y los fps con `fps.js`.

## 10. Se ha publicado algo que falla

No borres nada a la fuerza (nada de `git push --force` ni `git reset` en `main`). Deshaz el cambio con un commit nuevo:

```
git checkout main && git pull
git revert -m 1 <commit de la unión>     # o: git revert <commit>, si no fue una unión
node herramientas/nueva-version.mjs
git commit -am "Versión <número>: se deshace <lo que falló>"
git push origin main
```

Luego arregla el fallo con calma en una rama.
