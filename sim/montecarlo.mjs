// montecarlo.mjs — CLOUDBRAWL's balance evidence: Monte Carlo combat.
//
// Per the combat-sim-tuning discipline: every reported matchup number in
// this file's output comes from >= 10,000 simulated battles on a declared
// seed block, with Wilson 95% confidence intervals and duration
// percentiles. Tuning decisions are made on the AUDIT block and verified
// on a disjoint VERIFY block — never the same seeds twice.
//
// A "battle" is one wave fought by the game's own world module
// (game/src/world.js) under a declared pilot policy, starting at full
// hull with the policy build for that point of the run (the draft
// policy's own preference order, applied against the real pool and its
// stack caps). The full-run harness (sim/simulate.mjs) measures the
// worn-arrival reality end to end; these encounters isolate the fight
// itself: is this wall fair for the build that is supposed to meet it?
//
//   node sim/montecarlo.mjs <matchup> <seedStart> <count> [variant]
//   node sim/montecarlo.mjs ledger <runs>
//
// Matchups: boss5, boss10, boss15, wave13 (the full-fleet press).
// Variants: base | bosshull-up | bosshull-down | output-up | output-down
//           | degraded (aim wobble + sluggish thrust pilot cohort).
// Output: one JSON object on stdout.

import { STEP } from '../game/src/config.js';
import { buildWave } from '../game/src/waves.js';
import { applyUpgrade } from '../game/src/upgrades.js';
import { botControls, createWorld, stageBoss, stepWorld } from '../game/src/world.js';

// The draft policy's preference order, mirrored from world.js's
// botDraftIndex: damage first, then rate, then survival, then the rest.
const POLICY_PREFERENCE = [
  'heavy-shot', 'rapid-cannons', 'twin-mount', 'ironwood-hull',
  'powder-flares', 'keel-fins', 'swift-rigging', 'forge-pact',
  'gilded-magnet', 'salvage-crews', 'second-wind', 'long-barrels',
];

/** The build the draft policy holds after `drafts` drafts: its own
 *  preference order dealt against the real pool, caps respected. */
export function policyBuild(drafts) {
  const build = [];
  for (const id of POLICY_PREFERENCE) {
    while (build.length < drafts) {
      const probe = build.slice();
      const delta = applyUpgrade(probe, id);
      if (!delta) break;
      build.push(id);
    }
    if (build.length >= drafts) break;
  }
  return build;
}

/** Apply a build to a fresh world exactly as world.chooseDraft does. */
function applyBuild(world, build) {
  for (const id of build) {
    const delta = applyUpgrade(world.build, id);
    if (!delta) continue;
    const s = world.stats;
    if (delta.mode === 'mul') s[delta.stat] *= delta.amount;
    else s[delta.stat] += delta.amount;
    if (delta.stat === 'maxHull') {
      world.player.maxHull += delta.amount;
      world.player.hull = Math.min(world.player.maxHull, world.player.hull + delta.amount);
    }
  }
  world.player.hull = world.player.maxHull; // encounters start fresh
}

/** Set a world up at the start of `wave`, exactly as beginWave does. */
function beginEncounter(world, wave) {
  world.wave = wave;
  world.waveTime = 0;
  world.phase = 'combat';
  world.phaseTime = 0;
  const built = buildWave(wave, world.rng);
  world.schedule = built.spawns;
  world.spawnIndex = 0;
  world.waveTotal = built.total;
  world.boss = null;
  if (built.boss) world.boss = stageBoss(world, wave);
  return world.boss;
}

const MATCHUPS = {
  boss5: { wave: 5, drafts: 4 },
  boss10: { wave: 10, drafts: 9 },
  boss15: { wave: 15, drafts: 14 },
  wave13: { wave: 13, drafts: 12 },
};

const MAX_SECONDS = 420;

/** One battle. Returns { win, seconds, hullFrac, kills, gold, bossDmgFrac }. */
export function fight(seed, matchup, variant = 'base') {
  const spec = MATCHUPS[matchup];
  const world = createWorld(`cloudbrawl-mc-${seed}`);
  applyBuild(world, policyBuild(spec.drafts));
  const boss = beginEncounter(world, spec.wave);
  if (variant === 'bosshull-up' && boss) { boss.maxHull = Math.round(boss.maxHull * 1.2); boss.hull = boss.maxHull; }
  if (variant === 'bosshull-down' && boss) { boss.maxHull = Math.round(boss.maxHull * 0.8); boss.hull = boss.maxHull; }
  if (variant === 'output-up') world.stats.fireRateMul *= 1.2;
  if (variant === 'output-down') world.stats.fireRateMul *= 0.85;
  const bossMax = boss ? boss.maxHull : 0;
  let steps = 0;
  const maxSteps = Math.round(MAX_SECONDS / STEP);
  while (steps < maxSteps) {
    let controls = botControls(world);
    if (variant === 'degraded') {
      // The novice cohort: aim wobbles around the target, thrust is
      // sluggish. Same ship, same build — a worse pair of hands.
      const p = world.player;
      const ang = Math.sin(world.time * 1.7 + seed) * 0.09;
      const dx = controls.aimX - p.x;
      const dy = controls.aimY - p.y;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      controls = {
        moveX: controls.moveX * 0.7,
        moveY: controls.moveY * 0.7,
        aimX: p.x + dx * cos - dy * sin,
        aimY: p.y + dx * sin + dy * cos,
        firing: controls.firing,
      };
    }
    stepWorld(world, controls, STEP);
    steps += 1;
    // Particles and floaters are presentation; they never gate an
    // outcome, and clearing them keeps 10,000 battles affordable.
    world.motes.length = 0;
    world.texts.length = 0;
    world.events.length = 0;
    if (world.phase === 'won' || world.phase === 'intermission') break;
    if (world.phase === 'lost') break;
  }
  const win = world.phase === 'won' || world.phase === 'intermission';
  return {
    win,
    seconds: steps * STEP,
    hullFrac: Math.max(0, world.player.hull) / world.player.maxHull,
    kills: world.kills,
    gold: Math.floor(world.goldEarned),
    bossDmgFrac: bossMax ? (boss ? 1 - Math.max(0, boss.hull) / bossMax : 1) : null,
  };
}

function wilson(wins, n, z = 1.96) {
  if (n === 0) return [0, 0];
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - m) / d, (c + m) / d];
}

function pct(sorted, q) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function aggregate(results) {
  const n = results.length;
  const wins = results.filter((r) => r.win).length;
  const [lo, hi] = wilson(wins, n);
  const durs = results.map((r) => r.seconds).sort((a, b) => a - b);
  const winDurs = results.filter((r) => r.win).map((r) => r.seconds).sort((a, b) => a - b);
  const hulls = results.map((r) => r.hullFrac).sort((a, b) => a - b);
  return {
    battles: n,
    wins,
    winRate: Math.round((wins / n) * 1000) / 10,
    wilson95: [Math.round(lo * 1000) / 10, Math.round(hi * 1000) / 10],
    durationS: { p10: Math.round(pct(durs, 0.1)), p50: Math.round(pct(durs, 0.5)), p90: Math.round(pct(durs, 0.9)) },
    winDurationP50S: Math.round(pct(winDurs, 0.5)),
    hullLeftP50: Math.round(pct(hulls, 0.5) * 100) / 100,
    meanGold: Math.round(results.reduce((a, r) => a + r.gold, 0) / n),
  };
}

// ------------------------------------------------------------------ ledger

/** The economy ledger: analytic gold sources per wave (roster x catalog
 *  drop means + boss purses) against what full bot runs actually bank. */
export function ledger(runs) {
  return import('../game/src/catalog.js').then(async ({ PIRATES, DREADNOUGHTS }) => {
    const { ROSTERS } = await import('../game/src/waves.js');
    const { startRun, chooseDraft, botDraftIndex } = await import('../game/src/world.js');
    const keys = ['skiff', 'bomber', 'rammer', 'sniper', 'carrier'];
    // Catalog gold drops are [min, max] ranges; the mean of a uniform
    // roll over the range is its midpoint.
    const mean = (d) => (d[0] + d[d.length - 1]) / 2;
    const analytic = ROSTERS.map((roster, i) => {
      let g = 0;
      roster.forEach((count, ci) => { g += count * mean(PIRATES[keys[ci]].gold); });
      const boss = DREADNOUGHTS.find((d) => d.wave === i + 1);
      if (boss) g += mean(boss.gold);
      return Math.round(g * 10) / 10;
    });
    const banked = [];
    let wins = 0;
    for (let i = 0; i < runs; i++) {
      const world = createWorld(`cloudbrawl-ledger-${7000 + i}`);
      startRun(world);
      let steps = 0;
      while (steps < 170000) {
        if (world.phase === 'draft') { chooseDraft(world, botDraftIndex(world)); continue; }
        if (world.phase === 'won' || world.phase === 'lost') break;
        stepWorld(world, botControls(world), STEP);
        steps += 1;
        world.motes.length = 0;
        world.texts.length = 0;
        world.events.length = 0;
      }
      if (world.phase === 'won') wins += 1;
      banked.push(Math.floor(world.goldEarned));
    }
    banked.sort((a, b) => a - b);
    const totalAnalytic = analytic.reduce((a, b) => a + b, 0);
    return {
      runs,
      wins,
      analyticGoldPerWave: analytic,
      analyticTotal: Math.round(totalAnalytic),
      bankedP50: pct(banked, 0.5),
      bankedMean: Math.round(banked.reduce((a, b) => a + b, 0) / runs),
      note: 'Gold has one sink by design: unbanked coins blow away after 9 s, and the draft is free — gold is the run score and the draft is the spender of waves, not of coin. Banked < analytic is mostly unreached gold (the rich purses sit in waves 10 and 15; the median run ends around wave 9–13) plus coins expiring unbanked under fire — not a leak.',
    };
  });
}

// --------------------------------------------------------------------- cli

const [mode, a, b, variant = 'base'] = process.argv.slice(2);
if (mode === 'ledger') {
  const out = await ledger(Number(a) || 200);
  console.log(JSON.stringify(out));
} else if (MATCHUPS[mode]) {
  const start = Number(a);
  const count = Number(b);
  const results = [];
  for (let i = 0; i < count; i++) results.push(fight(start + i, mode, variant));
  console.log(JSON.stringify({ matchup: mode, variant, seedBlock: [start, start + count - 1], ...aggregate(results) }));
} else {
  console.error('usage: montecarlo.mjs <boss5|boss10|boss15|wave13> <seedStart> <count> [variant] | ledger <runs>');
  process.exit(2);
}
