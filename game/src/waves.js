// waves.js — how a wave is composed: the run's fifteen arguments.
//
// A wave is a spawn schedule: a list of { at, cls, side } entries the world
// works through, `at` in seconds from the wave's start. Composition is
// procedural but authored: each wave has a hand-set roster (the counts
// below), and the seed only deals the spawn sides, the exact seconds and
// the small jitter in the counts — so wave 7 always *means* the same fight,
// while no two runs of it arrive from quite the same sky. Boss waves swap
// the roster's tail for the dreadnought and a trickle of escorts.
//
// Roster reading: [skiffs, bombers, rammers, snipers, carriers]. The totals
// climb 8 → 46 hull-bearing pirates; with catalog.js's per-wave hull growth
// the total pirate hull per wave runs ~300 → ~2,600, the curve the balance
// argument in catalog.js promises.

import { dreadnoughtFor } from './catalog.js';
import { intRange, range } from './rng.js';

/** The authored rosters, waves 1–15. */
export const ROSTERS = [
  [6, 0, 0, 0, 0], // 1: skiffs only — learn to aim
  [8, 1, 0, 0, 0], // 2: a bomber to prioritise
  [8, 1, 2, 0, 0], // 3: rammers arrive — keep moving
  [9, 2, 2, 1, 0], // 4: first sniper kite
  [7, 2, 2, 1, 0], // 5: the Brassjaw's escort
  [11, 2, 3, 1, 0], // 6
  [10, 3, 3, 2, 1], // 7: first carrier
  [12, 3, 4, 2, 1], // 8
  [12, 4, 4, 3, 1], // 9: the press before the Coalbaron
  [9, 3, 3, 2, 1], // 10: the Coalbaron's escort
  [14, 4, 5, 3, 1], // 11
  [14, 5, 5, 3, 2], // 12: two carriers
  [16, 5, 6, 4, 2], // 13
  [16, 6, 6, 4, 2], // 14: the full fleet
  [10, 4, 4, 3, 1], // 15: the Skyfall's honour guard
];

const CLASS_KEYS = ['skiff', 'bomber', 'rammer', 'sniper', 'carrier'];

/** The spawn sides a pirate can arrive from, weighted to the open sky. */
const SIDES = ['right', 'right', 'top', 'left', 'top-right', 'top-left'];

/**
 * Build one wave's spawn schedule.
 * Returns { spawns: [{at, cls}], boss: <catalog row or null>, total: n }.
 * The schedule is sorted by `at`; escorts on a boss wave keep arriving in
 * small packs while the dreadnought fights, so the boss is never a duel.
 */
export function buildWave(wave, rng) {
  const roster = ROSTERS[wave - 1] ?? ROSTERS[ROSTERS.length - 1];
  const boss = dreadnoughtFor(wave);
  const spawns = [];
  let cursor = 0.8; // the first pirate is never instant
  roster.forEach((count, ci) => {
    const cls = CLASS_KEYS[ci];
    const n = Math.max(0, count + (count >= 6 ? intRange(rng, -1, 1) : 0));
    for (let k = 0; k < n; k++) {
      spawns.push({ at: cursor, cls, side: SIDES[Math.floor(rng() * SIDES.length)] });
      // Packs breathe: same-class pirates arrive in loose groups, classes
      // interleave because each class keeps its own cursor offset below.
      cursor += range(rng, 0.55, 1.5) * (cls === 'skiff' ? 0.7 : 1.15);
    }
    cursor += range(rng, 0.4, 1.2); // a breath between classes
  });
  spawns.sort((a, b) => a.at - b.at);
  // Renormalise: whatever the dealing did, the wave's arrivals should span
  // roughly 8–40 seconds — a wave is a siege, not a ambush or a drought.
  const span = boss ? 55 : Math.min(40, 6 + spawns.length * 1.15);
  const last = spawns.length ? spawns[spawns.length - 1].at : 1;
  for (const s of spawns) s.at = 0.8 + (s.at / last) * span;
  return { spawns, boss, total: spawns.length + (boss ? 1 : 0) };
}

/** Where a spawn of a given side enters the sky (just off-frame). */
export function spawnPoint(side, rng, view) {
  const m = 70; // how far off-frame they form up
  switch (side) {
    case 'left':
      return { x: -m, y: range(rng, 90, view.h * 0.62) };
    case 'top':
      return { x: range(rng, view.w * 0.2, view.w * 0.95), y: -m };
    case 'top-left':
      return { x: range(rng, -m, view.w * 0.25), y: -m };
    case 'top-right':
      return { x: range(rng, view.w * 0.6, view.w + m), y: -m };
    case 'right':
    default:
      return { x: view.w + m, y: range(rng, 90, view.h * 0.62) };
  }
}

/** A one-line manifest of a wave for the HUD's threat panel: "×14 Skiff · ×5 Bomber". */
export function waveManifest(wave) {
  const roster = ROSTERS[wave - 1] ?? ROSTERS[ROSTERS.length - 1];
  const names = ['Skiff', 'Bomber', 'Rammer', 'Sniper', 'Carrier'];
  const parts = [];
  roster.forEach((n, i) => {
    if (n > 0) parts.push(`×${n} ${names[i]}`);
  });
  const boss = dreadnoughtFor(wave);
  if (boss) parts.push(boss.name.replace('DREADNOUGHT ', '⚠ '));
  return parts.join(' · ');
}
