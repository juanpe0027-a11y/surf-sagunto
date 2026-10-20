import { FOG, fogHex, sunDir } from './motor.js';

// ---------- GLSL compartido ----------
export const GLSL_COMMON = `
uniform vec3 sunDir;
uniform float time;
uniform vec3 fogColor;
uniform float fogDensity;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*noise(p); p = p*2.03 + 1.7; a *= 0.5; } return v; }
vec3 skyCol(vec3 d){
  d = normalize(d);
  float h = d.y;
  vec3 zen = vec3(0.22, 0.40, 0.66);
  vec3 mid = vec3(0.60, 0.70, 0.82);
  vec3 hor = vec3(1.00, 0.84, 0.68);
  vec3 c;
  if (h > 0.0) c = mix(mix(hor, mid, smoothstep(0.0, 0.16, h)), zen, smoothstep(0.12, 0.75, h));
  else c = mix(hor*0.9, vec3(0.10, 0.30, 0.42), smoothstep(0.0, 0.2, -h));
  float sd = max(dot(d, sunDir), 0.0);
  c += vec3(1.0, 0.68, 0.38) * pow(sd, 6.0) * 0.40;
  c += vec3(1.0, 0.86, 0.62) * pow(sd, 64.0) * 0.70;
  return c;
}
vec3 applyFog(vec3 col, vec3 wp){
  float d = length(cameraPosition - wp);
  float f = 1.0 - exp(-pow(d * fogDensity, 2.0));
  return mix(col, fogColor, clamp(f, 0.0, 1.0));
}
vec3 tone(vec3 c){ c = max(c, 0.0); return c / (1.0 + 0.18*max(max(c.r, c.g), c.b)) * 1.06; }
`;
export const commonUniforms = () => ({
  sunDir: { value: sunDir }, time: { value: 0 },
  fogColor: { value: new THREE.Color(fogHex) }, fogDensity: { value: FOG }
});
