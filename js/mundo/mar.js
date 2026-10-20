import { world } from './motor.js';
import { commonUniforms, GLSL_COMMON } from './shaders.js';

// ---------- mar ----------
export const oceanMat = new THREE.ShaderMaterial({
  uniforms: commonUniforms(), fog: false,
  vertexShader: `varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: GLSL_COMMON + `varying vec3 vPos;
  void main(){
    vec2 p = vPos.xz;
    float dist = length(cameraPosition - vPos);
    vec2 drift = vec2(time*0.06, time*0.35);
    float e = 0.35;
    float h0 = fbm(p*0.22 + drift), hx = fbm((p+vec2(e,0.0))*0.22 + drift), hz = fbm((p+vec2(0.0,e))*0.22 + drift);
    vec3 N = normalize(vec3((h0-hx)*2.4, 1.0, (h0-hz)*2.4));
    N = normalize(mix(N, vec3(0.0,1.0,0.0), smoothstep(80.0, 1400.0, dist)));
    vec3 V = normalize(cameraPosition - vPos);
    float fres = 0.03 + 0.97*pow(1.0 - max(dot(N, V), 0.0), 5.0);
    vec3 deep = vec3(0.02, 0.15, 0.26);
    float shore = smoothstep(30.0, 78.0, vPos.z);
    vec3 body = mix(deep, vec3(0.10, 0.45, 0.48), shore);
    body += vec3(0.05, 0.25, 0.25) * pow(max(dot(-V, sunDir), 0.0), 3.0) * 0.4;
    vec3 col = mix(body, skyCol(reflect(-V, N)), fres);
    float sp = pow(max(dot(reflect(-sunDir, N), V), 0.0), 380.0);
    col += vec3(1.0, 0.86, 0.6) * sp * 3.0;
    col += vec3(1.0, 0.75, 0.5) * pow(max(dot(reflect(-sunDir, N), V), 0.0), 30.0) * 0.18;
    float sf = smoothstep(70.0, 79.0, vPos.z) * smoothstep(0.45, 0.65, fbm(vec2(p.x*0.15 + time*0.2, p.y*0.6)));
    col = mix(col, vec3(0.95), sf * 0.85);
    // espumas de olas anteriores en primer plano, avanzando hacia la orilla
    float ph = fract((vPos.z - time * 1.7) / 13.0);
    float band = smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.1, 0.42, ph));
    float fw = band * smoothstep(9.0, 15.0, vPos.z) * (1.0 - smoothstep(45.0, 72.0, vPos.z))
             * smoothstep(0.3, 0.62, fbm(vec2(p.x * 0.11, vPos.z * 0.25 - time * 0.2)));
    col = mix(col, vec3(0.92, 0.96, 0.96), fw * 0.85);
    col = applyFog(col, vPos);
    gl_FragColor = vec4(tone(col), 1.0);
  }`
});
export const ocean = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1), oceanMat);
ocean.rotation.x = -Math.PI / 2; ocean.position.y = -0.05; world.add(ocean);
