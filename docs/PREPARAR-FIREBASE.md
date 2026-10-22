# Preparar Firebase para la versión nueva (instrucciones para el Claude de Juanpe)

Claude: Juanpe te ha pedido que hagas esto con él. **Juanpe no es programador.** Guíale tú, en español sencillo, **un paso cada vez**, y espera a que te diga «hecho» (o te mande una captura) antes de pasar al siguiente. No le hables de «reglas», «autenticación» ni «JSON» sin explicarlo; describe los botones por lo que pone en ellos.

Esto **no cambia nada del juego que hay ahora en la web**: sigue funcionando igual antes y después. Lo que hace es dejar Firebase preparado para cuando se publique la versión nueva del juego (la rama `mejoras`). No toques `main` ni publiques nada: solo esto.

## Por qué hace falta (cuéntaselo a Juanpe así, más o menos)

> El modo online y el ranking guardan los datos en Firebase. Ahora mismo esa base de datos está abierta: cualquiera que sepa un poco puede borrar a otros jugadores, inventarse récords o llenarla de basura, y si se llena, Firebase corta el online hasta el mes siguiente.
>
> La versión nueva le pone una cerradura. Cada móvil recibe una «llave» automática e invisible (el jugador no tiene que registrarse ni ver nada), y unas normas dicen quién puede escribir qué: cada uno solo lo suyo, y los récords nunca pueden bajar.
>
> Esas dos cosas, la llave y las normas, solo las puede activar el dueño del proyecto en la página de Firebase. Son dos ajustes, unos 5 minutos, y no cambian nada del juego de ahora.

## Paso 1 — Activar la «llave» (login anónimo)

1. Que Juanpe abra https://console.firebase.google.com con la cuenta de Google con la que creó el juego, y entre en el proyecto **surf-sagunto**.
2. En el menú de la izquierda, **Authentication** (puede estar dentro de un grupo llamado «Compilación» o «Build»). Si sale un botón **Comenzar** (o «Get started»), que lo pulse.
3. Pestaña **Método de inicio de sesión** (o «Sign-in method»). En la lista de proveedores, **Anónimo** (o «Anonymous»).
4. Activar el interruptor **Habilitar** y pulsar **Guardar**.

## Paso 2 — Poner las normas nuevas (reglas de la base de datos)

1. En el menú de la izquierda, **Realtime Database** y arriba la pestaña **Reglas** (o «Rules»). Verá un cuadro con texto.
2. En otra pestaña del navegador, que abra este enlace (es el texto de las normas nuevas):
   https://raw.githubusercontent.com/juanpe0027-a11y/surf-sagunto/mejoras/firebase-reglas.json
   y pulse **Ctrl+A** (seleccionar todo) y **Ctrl+C** (copiar). En Mac, Cmd en vez de Ctrl.
3. Vuelve a la pestaña de Firebase, que haga clic dentro del cuadro de texto, **Ctrl+A** y **Ctrl+V** (pegar encima de todo lo que había).
4. Pulsar **Publicar** (o «Publish»). Si sale un aviso, aceptarlo.

Que no cambie nada más en la consola de Firebase. Si se pierde (la página no se parece a lo que le dices), pídele una captura de pantalla y guíale desde lo que ve.

## Paso 3 — Comprobar que ha quedado bien

Si puedes ejecutar comandos en el repo:

```
git fetch origin
git worktree add ../surf-comprobar origin/mejoras
node ../surf-comprobar/herramientas/comprobar-firebase.mjs
git worktree remove ../surf-comprobar
```

Tiene que salir **«Todo listo: se puede publicar la versión nueva»**. Si sale algo con ✗, dice qué falta: repite ese paso con Juanpe. La comprobación se hace pasar por un jugador un momento y luego lo borra todo; no toca el ranking ni las salas de verdad.

Si no puedes ejecutar comandos, no pasa nada: dile a Juanpe que avise de que está hecho, y lo comprueban quienes revisan el código.

## Al terminar

Dile a Juanpe, en una frase, que ya está y que avise a quien le ayuda con la revisión del código: con esto ya se puede publicar la versión nueva del juego. Desde ese momento, el online de la versión nueva funcionará; el juego de ahora sigue igual hasta entonces.
