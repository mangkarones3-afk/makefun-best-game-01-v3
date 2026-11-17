// upgrades.js — the between-wave draft: offer three, take one, fly better.
//
// The draft is the run's build. Fourteen drafts across fifteen waves, twelve
// upgrades in the pool, stack caps in catalog.js: no two runs assemble the
// same ship, and the results screen reads the build back as part of the
// score's story. The offer is dealt from the run's seeded generator, with
// two fairness rules: a card at its stack cap is never offered, and an
// offer is never three cards of one tag while the pool can deal otherwise.

import { UPGRADES, upgradeById } from './catalog.js';
import { shuffled } from './rng.js';

/** The ship stats a fresh run starts with (world.js copies this). */
export function baseStats() {
  return {
    fireRateMul: 1,
    bulletDamage: 0, // added onto config's base damage
    extraShot: 0,
    bulletSpeedMul: 1,
    maxHull: 0, // added onto config's base hull
    repairMul: 1,
    speedMul: 1,
    spreadMul: 1,
    magnetMul: 1,
    goldMul: 1,
    splash: 0,
    secondWind: 0,
  };
}

/** How many stacks of an upgrade the run already holds. */
export function stacksOf(build, id) {
  return build.filter((b) => b === id).length;
}

/** The cards the pool can still deal this run (under their stack caps). */
export function livePool(build) {
  return UPGRADES.filter((u) => stacksOf(build, u.id) < u.max);
}

/**
 * Deal a draft offer of `count` cards for the run's build so far.
 * Deterministic in the run's rng. Returns upgrade rows (catalog objects).
 */
export function dealDraft(build, rng, count = 3) {
  const pool = livePool(build);
  if (pool.length === 0) return [];
  const dealt = shuffled(rng, pool);
  const offer = dealt.slice(0, Math.min(count, dealt.length));
  // Fairness: if all offered cards share one tag and the pool holds another
  // tag undealt, swap the last card for the first undealt of a new tag.
  if (offer.length > 1 && offer.every((u) => u.tags[0] === offer[0].tags[0])) {
    const other = dealt.slice(offer.length).find((u) => u.tags[0] !== offer[0].tags[0]);
    if (other) offer[offer.length - 1] = other;
  }
  return offer;
}

/**
 * Apply a chosen card to the run: returns the stat delta description the
 * world uses ({ stat, mode, amount }) — world.js owns the numbers, this
 * module owns the choosing. Mend-on-pick for Ironwood Hull is handled by
 * the caller through the same delta (maxHull adds, and world heals by the
 * same amount, per the card's text).
 */
export function applyUpgrade(build, id) {
  const row = upgradeById(id);
  if (!row) return null;
  if (stacksOf(build, id) >= row.max) return null;
  build.push(id);
  return { stat: row.apply, mode: row.mode, amount: row.amount, row };
}

/** The build as the results screen lists it: "Rapid Cannons ×2 · Heavy Shot". */
export function buildSummary(build) {
  const counts = new Map();
  for (const id of build) counts.set(id, (counts.get(id) ?? 0) + 1);
  const parts = [];
  for (const [id, n] of counts) {
    const row = upgradeById(id);
    if (row) parts.push(n > 1 ? `${row.name} ×${n}` : row.name);
  }
  return parts.length ? parts.join(' · ') : 'Stock rigging — no upgrades taken';
}
