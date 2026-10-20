# Surf Puerto de Sagunto · Online

Juego de surf en 3D en la playa del Pantalán del Puerto de Sagunto, con modo online (Firebase).

**Jugar:** https://juanpe0027-a11y.github.io/surf-sagunto/ (o con bots: añade `#bots` al final del enlace).

## Qué hay

- Surfistas con su cara, su tabla y su postura (regular o goofy). Además: Gutty, Jose NL y Xitano en longboard, Gallu en bodyboard, JuanP en moto de agua, Raúl en kayak, Krre en zodiac de rescate y Alex con su tabla Lemon.
- Física de la ola: el tubo, el labio, re-entry, cutback, rebote, doble 180 y trucos en el aire (360, rodeo, 720, indy…).
- Online para todos en la misma ola, sin límite de jugadores. Cada personaje solo puede llevarlo una persona a la vez, y la ola se alarga cuantos más surfistas hay.
- Empujar con TRUCO tira al otro, que pierde los puntos de la ola. Con 3 empujones entre los mismos dos se activa la **Disputa por el Pico**: pelea en el agua junto al Pantalán, 5 golpes y el ganador es el LOCAL LEGEND.
- Chat, frases rápidas y notas de voz.
- 🏆 Récords: ranking de todos, mejor ola y los trucos de cada uno, guardados por móvil.
- En el móvil se juega en horizontal y a pantalla completa. Los jugadores inactivos y los «fantasma» se quitan solos de la ola.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | El juego completo, ya montado (el modo online va dentro) |
| `vendor.js` | three.js 0.186.1 + GLTFLoader + SkeletonUtils + postprocessing 6.39.5 (empaquetado con esbuild) |
| `cuerpo.glb` | Cuerpo humano con esqueleto (Xbot de los ejemplos de three.js) |
| `musica.mp4` | «Fiesta surfera» de Bruno Fumumo |
| `icono.png` | Icono para la pantalla de inicio |
| `firebase-reglas.json` | Reglas de seguridad de la Realtime Database (proyecto `surf-sagunto`) |

Para probarlo en local hay que servir la carpeta con un servidor web (por ejemplo `python -m http.server`), porque abriendo el archivo directamente el navegador no deja cargar `cuerpo.glb`.
