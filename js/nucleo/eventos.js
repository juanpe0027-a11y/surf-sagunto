// avisos entre partes del juego: escuchar('truco', fn) para enterarse, avisar('truco', datos) para contarlo
const oyentes = {};
export function escuchar(ev, fn) { (oyentes[ev] = oyentes[ev] || []).push(fn); }
export function avisar(ev, ...datos) { for (const fn of oyentes[ev] || []) fn(...datos); }
