// rng.js — CLOUDBRAWL's deterministic random source.
//
// Every random choice in a run — wave composition, spawn sides, pirate weave,
// gold scatter, draft offers — comes from one seeded generator, so a seed is a
// whole run: the same seed flown twice plays out the same, and the headless
// simulator (sim/simulate.mjs) can replay a run exactly. The generator is
// mulberry32: a 32-bit state, a period of 2^32, and fast enough to seed every
// cloud in the sky without a second thought.

/** Hash a string seed ("cloudbrawl-15") into a 32-bit integer, FNV-1a style. */
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A seeded generator: call it for a float in [0, 1). */
export function makeRng(seed) {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed >>> 0) || 2654435769;
  const rng = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.state = () => state >>> 0;
  return rng;
}

/** A float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max], both ends included. */
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** True with probability p. */
export function chance(rng, p) {
  return rng() < p;
}

/** One element of a non-empty array. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** A shuffled copy of a list (Fisher–Yates), the original untouched. */
export function shuffled(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

/** A point at a random angle and radius around (x, y). */
export function around(rng, x, y, radius) {
  const a = rng() * Math.PI * 2;
  const r = Math.sqrt(rng()) * radius;
  return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
}
