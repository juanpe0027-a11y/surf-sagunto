# Firebase — cómo está montado y qué hay que hacer en la consola

El modo online y los récords usan Firebase (proyecto `surf-sagunto`), en el **plan Spark, gratuito**. No hay que pasar nunca al plan Blaze.

## Qué hay en la base de datos

| Ruta | Qué guarda | Quién puede escribir |
|---|---|---|
| `v2/salas/<sala>/players/<uid>` | Dónde va cada jugador en la ola (~7 veces/s, solo lo que cambia) | Solo ese jugador. Cualquiera puede borrar a un «fantasma» que lleve más de 45 s sin dar señales |
| `v2/salas/<sala>/msgs/<id>` | Chat, notas de voz, empujones, golpes de la Disputa | Cada uno manda los suyos y no puede cambiarlos. Cualquiera puede borrar los de hace más de 2 minutos |
| `v2/records/<temporada>/<uid>` | Récords de cada móvil (ranking) | Solo ese móvil, y nunca puede bajar un récord |
| `salas/…` y `stats/…` | Lo mismo, del juego antiguo | Cualquiera. **Se borran en el paso 3** |

`<uid>` es el identificador del **login anónimo**: Firebase se lo da a cada navegador la primera vez que abre el juego, sin pedir nada al jugador. Se guarda en el navegador; si se borran sus datos, ese móvil empieza con un uid nuevo.

Las reglas están en [`firebase-reglas.json`](../firebase-reglas.json). **Cambiar ese archivo no cambia nada en Firebase**: hay que publicarlo (paso 2).

## Paso 1 — Activar el login anónimo (una sola vez)

1. Entra en https://console.firebase.google.com y abre el proyecto **surf-sagunto**.
2. Menú de la izquierda: **Authentication** (si es la primera vez, pulsa **Comenzar**).
3. Pestaña **Método de inicio de sesión** → **Anónimo** → activa **Habilitar** → **Guardar**.

Es gratis y no cambia nada del juego actual.

## Paso 2 — Publicar las reglas

1. En la consola: **Realtime Database** → pestaña **Reglas**.
2. Borra todo lo que hay y pega el contenido entero de `firebase-reglas.json`.
3. Pulsa **Publicar**.

Se puede hacer ya, antes de publicar el juego nuevo: las rutas antiguas (`salas`, `stats`) siguen abiertas, así que el juego que hay ahora en la web sigue funcionando igual.

Con la herramienta de Firebase en el ordenador (opcional), el mismo paso es `firebase deploy --only database`, después de `firebase login` con la cuenta de Google del proyecto.

## Paso 3 — Cerrar las rutas antiguas (una semana después de publicar el juego nuevo)

Cuando ya nadie use la versión vieja:

1. En `firebase-reglas.json`, borra los bloques `"salas": {…}` y `"stats": {…}` que hay **al final**, fuera de `"v2"`. Publica las reglas otra vez (paso 2).
2. En la consola: **Realtime Database** → pestaña **Datos** → borra los nodos `salas` y `stats`.

## Comprobar que los pasos 1 y 2 están hechos

```
node herramientas/comprobar-firebase.mjs
```

Dice si el login anónimo está activado, si las reglas publicadas aceptan todo lo que manda la versión nueva y si el juego antiguo sigue pudiendo conectarse. Se hace pasar por un jugador un momento y lo borra todo después. (Con `--emulador`, lo comprueba contra el emulador local.)

Para Juanpe hay una guía paso a paso que puede seguir con su Claude: [PREPARAR-FIREBASE.md](PREPARAR-FIREBASE.md).

## Si algo falla

- **«No se ha podido conectar al modo online»** en el menú: casi siempre es que falta el paso 1. Si la clave de API tiene restricciones (Google Cloud → Credenciales), tiene que permitir *Identity Toolkit API* y *Token Service API*.
- **Se ve a los demás pero no se guarda algo** (los récords, un mensaje…): las reglas lo están rechazando. En la consola del navegador (F12) sale `permission_denied` con la ruta.

## Cambiar lo que se envía por la red

Las reglas solo aceptan los campos que conocen. Todo lo que se manda está descrito en **`js/online/protocolo.js`**. **Si añades un campo nuevo** (por ejemplo, en la Disputa), hay que:

1. Añadirlo en `js/online/protocolo.js` y en `firebase-reglas.json` (copiando una línea parecida, con su tipo y sus límites).
2. Añadir un caso en `herramientas/pruebas/reglas.mjs` y pasar las pruebas con el emulador.
3. Publicar las reglas **antes o a la vez** que el juego; si no, ese mensaje se rechaza en silencio.

## Probar sin tocar la base de datos real

Con Java y la herramienta de Firebase instalados:

```
firebase emulators:start --only auth,database
node herramientas/pruebas/reglas.mjs
```

Y para jugar contra el emulador, abre el juego con `?emulador` en la dirección: `http://localhost:8000/?emulador#pruebas`.
