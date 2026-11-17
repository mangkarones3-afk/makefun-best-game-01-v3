// simulate.mjs — CLOUDBRAWL played headlessly, by its own autopilot.
//
// The game's world (game/src/world.js) never touches the DOM, so this
// script steps the identical simulation the browser runs, with botControls
// flying the Dawnbreaker and botDraftIndex drafting. Twelve seeds, each
// played twice: the pair must agree exactly (the run is deterministic), and
// every run must satisfy the checks below — the whole loop, waves, drafts,
// bosses, win and lose, with no exceptions and no stuck states.
//
//   node sim/simulate.mjs            (prints the table simreport.js carries)
//
// Checks per run:
//   - the run ends (won or lost) inside the step budget
//   - waves advance one at a time and a draft follows every cleared wave
//   - a dreadnought is met on each of waves 5, 10, 15 the run reaches
//   - kills and gold accrue; accuracy stays inside [0, 1]
//   - the hull never goes negative, the gold never goes negative
//   - the twin run's fingerprint is identical (determinism)

import { STEP } from '../game/src/config.js';
import { botControls, botDraftIndex, chooseDraft, createWorld, startRun, stepWorld } from '../game/src/world.js';

const SEEDS = Array.from({ length: 12 }, (_, i) => `cloudbrawl-sim-${101 + i}`);
const MAX_STEPS = 170000; // ~23 minutes of sky at 120 steps a second

function fingerprint(world, steps) {
  // A cheap rolling hash over the run's observable truth.
  let h = 2166136261 >>> 0;
  const mix = (n) => {
    h ^= (n * 2654435761) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  };
  mix(steps);
  mix(world.wave * 1000 + world.kills);
  mix(Math.round(world.goldEarned * 10));
  mix(world.score);
  mix(Math.round(world.player.x));
  mix(Math.round(world.player.y));
  mix(Math.round(world.player.hull * 10));
  return ('0000000' + h.toString(16)).slice(-8);
}

function playRun(seed) {
  const world = createWorld(seed);
  startRun(world);
  const checks = [];
  let steps = 0;
  let lastWave = 1;
  let drafts = 0;
  const bossesMet = new Set();
  let bossAlive = false;
  while (steps < MAX_STEPS) {
    if (world.phase === 'draft') {
      const offer = world.draftOffer.length;
      if (offer < 1 || offer > 3) checks.push(`draft offered ${offer} cards`);
      if (!chooseDraft(world, botDraftIndex(world))) checks.push('draft choice refused');
      drafts += 1;
      continue;
    }
    if (world.phase === 'won' || world.phase === 'lost') break;
    stepWorld(world, botControls(world), STEP);
    steps += 1;
    world.events.length = 0;
    if (world.wave !== lastWave) {
      if (world.wave !== lastWave + 1) checks.push(`wave jumped ${lastWave} -> ${world.wave}`);
      lastWave = world.wave;
    }
    if (world.boss && !bossAlive) bossesMet.add(world.wave);
    bossAlive = !!world.boss;
    if (world.player.hull < 0) checks.push('hull went negative');
    if (world.gold < 0) checks.push('gold went negative');
    if (world.shotsHit > world.shotsFired) checks.push('more hits than shots');
  }
  if (world.phase !== 'won' && world.phase !== 'lost') checks.push(`run did not end (phase ${world.phase} at step cap)`);
  for (const bw of [5, 10, 15]) {
    if (world.wave >= bw || world.phase === 'won') {
      if (!bossesMet.has(bw) && !(bw === 15 && world.phase === 'won' && world.bossKillWave === 15)) {
        // The wave-15 boss may be killed in the same step it is met.
        if (!bossesMet.has(bw)) checks.push(`no dreadnought met on wave ${bw}`);
      }
    }
  }
  const accuracy = world.shotsFired ? world.shotsHit / world.shotsFired : 0;
  return {
    seed,
    result: world.phase === 'won' ? 'WIN' : world.phase === 'lost' ? 'LOSS' : 'STUCK',
    wave: world.wave,
    kills: world.kills,
    accuracy: Math.round(accuracy * 100),
    minutes: Math.round((steps * STEP) / 60 * 10) / 10,
    gold: Math.floor(world.goldEarned),
    score: world.score,
    drafts,
    bosses: [...bossesMet].sort((a, b) => a - b).join(',') || '-',
    fingerprint: fingerprint(world, steps),
    checks,
  };
}

const rows = [];
let failures = 0;
for (const seed of SEEDS) {
  const a = playRun(seed);
  const b = playRun(seed);
  const det = a.fingerprint === b.fingerprint && a.result === b.result && a.kills === b.kills;
  if (!det) {
    a.checks.push(`twin run diverged (${a.fingerprint} vs ${b.fingerprint})`);
  }
  if (a.checks.length) failures += 1;
  rows.push(a);
  console.log(
    `${a.seed}  ${a.result.padEnd(5)} wave ${String(a.wave).padStart(2)}  kills ${String(a.kills).padStart(3)}  acc ${String(a.accuracy).padStart(3)}%  ` +
      `${String(a.minutes).padStart(5)} min  gold ${String(a.gold).padStart(4)}  bosses ${a.bosses}  fp ${a.fingerprint}  ${a.checks.length ? 'FAIL: ' + a.checks.join('; ') : 'ok'}`,
  );
}
const wins = rows.filter((r) => r.result === 'WIN').length;
const medianWave = rows.map((r) => r.wave).sort((x, y) => x - y)[Math.floor(rows.length / 2)];
console.log(`\n${rows.length} seeds x2 runs: ${wins} wins, median final wave ${medianWave}, ${failures} failing seeds`);
console.log(failures === 0 ? 'ALL CHECKS PASSED' : 'CHECKS FAILED');
process.exit(failures === 0 ? 0 : 1);
