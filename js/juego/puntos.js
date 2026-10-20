import { G } from '../nucleo/estado.js';

export function bump(a) { G.mult = Math.min(3, G.mult + a); }
export function addPts(p) { const q = p * G.mult; G.score += q; G.wavePts += q; return Math.round(q); }
