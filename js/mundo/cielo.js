import { world } from './motor.js';
import { commonUniforms, GLSL_COMMON } from './shaders.js';

// ---------- cielo ----------
export const skyMat = new THREE.ShaderMaterial({
  uniforms: commonUniforms(), side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = (modelMatrix * vec4(position, 0.0)).xyz; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: GLSL_COMMON + `varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    vec3 c = skyCol(d);
    float sd = max(dot(d, sunDir), 0.0);
    c += vec3(1.0, 0.94, 0.80) * smoothstep(0.99935, 0.99965, sd) * 1.6;
    if (d.y > 0.0) {
      vec2 uv = d.xz / (d.y + 0.12);
      float cl = fbm(uv * vec2(0.9, 2.6) + vec2(time * 0.004, 0.0));
      cl = smoothstep(0.55, 0.85, cl) * smoothstep(0.0, 0.08, d.y) * (1.0 - smoothstep(0.25, 0.6, d.y));
      vec3 cc = mix(vec3(1.0, 0.72, 0.62), vec3(1.0, 0.9, 0.78), pow(sd, 4.0));
      c = mix(c, cc, cl * 0.75);
    }
    gl_FragColor = vec4(tone(c), 1.0);
  }`
});
export const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), skyMat);
sky.renderOrder = -1; world.add(sky);
