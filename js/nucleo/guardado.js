// Lo que se guarda en el navegador del jugador (localStorage), todo en un sitio.
// ⚠️ Los nombres de las claves NO se cambian: si cambian, cada jugador pierde su personaje, su nombre,
// la música y sus récords.
const CLAVES = {
  personaje: 'surf-sagunto-char',
  nombre: 'surf-sagunto-nick',
  musica: 'surf-sagunto-music',
  volumen: 'surf-sagunto-vol',
  mejor: 'surf-sagunto-best3d',
  records: 'surf-sagunto-stats',
  temporada: 'surf-sagunto-season',
};
// en modo privado o con el almacenamiento bloqueado, leer da null y guardar no hace nada: el juego sigue igual
export function leer(clave) { try { return localStorage.getItem(CLAVES[clave]); } catch (e) { return null; } }
export function guardar(clave, valor) { try { localStorage.setItem(CLAVES[clave], valor); } catch (e) {} }
