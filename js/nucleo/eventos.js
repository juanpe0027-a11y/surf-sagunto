// Avisos entre partes del juego, para que una no tenga que conocer a la otra:
//   escuchar('truco', (nombre, puntos) => …)   para enterarse
//   avisar('truco', nombre, puntos)             para contarlo
// Avisos que hay: truco, fin-sesion, menu, personaje, foto-tabla, cuerpo-listo, tamano.
const oyentes = {};
export function escuchar(ev, fn) { (oyentes[ev] = oyentes[ev] || []).push(fn); }
export function avisar(ev, ...datos) { for (const fn of oyentes[ev] || []) fn(...datos); }
