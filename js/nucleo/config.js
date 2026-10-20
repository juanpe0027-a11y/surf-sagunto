// móviles (iPhone/Android): menos resolución de partida y efectos más ligeros; luego se ajusta solo según los fps
export const LOWQ = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
export const PQ = LOWQ ? 0.55 : 1;   // cantidad de spray y espuma

// ---------- estado del juego ----------
export const SESSION = 180;                       // segundos de sesión
