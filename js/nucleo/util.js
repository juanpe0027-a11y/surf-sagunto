// Utilidades pequeñas que usa todo el juego: matemáticas, vectores y acceso al HTML.
// THREE es global (lo pone vendor.js antes de cargar los módulos).

export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
// transición suave de 0 a 1 cuando x va de a a b
export const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const TAU = Math.PI * 2;
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// diferencia de ángulo más corta (-π..π)
export function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
// color 0xrrggbb → '#rrggbb' para el HTML
export const hex = n => '#' + n.toString(16).padStart(6, '0');
