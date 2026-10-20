// Arranque: comprueba que el navegador puede con el juego y lo carga (js/inicio.js trae el resto de módulos).
// Mapa de los módulos: docs/ARQUITECTURA.md
const wrap = document.getElementById('wrap');
const aviso = txt => wrap.insertAdjacentHTML('beforeend', '<div class="err">' + txt + '</div>');
const hayWebGL = () => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } };
if (!window.THREE) aviso('No se ha podido cargar el motor 3D. Revisa la conexión y recarga la página.');
else if (!hayWebGL()) aviso('Tu navegador no tiene WebGL activado, y el juego lo necesita.');
else import('./inicio.js');
