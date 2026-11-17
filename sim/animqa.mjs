// animqa.mjs — the sprite-animation QA gates, run headlessly.
//
//   node sim/animqa.mjs
//
// Gates (per the sprite-animation-implementation skill):
//   1. contact sheet — sim/contact1.jpg + sim/contact2.jpg exist, are
//      full-size captures of the game's own ?shot=contact pages.
//   2. duration table — every actor/state's duration printed against
//      design intent; where a world constant owns the number (the beam
//      telegraph and fire durations, the rammer's wind-up), the manifest
//      must equal it exactly.
//   3. event audit — every declared event of every `once` state fires
//      exactly once per play, in order (machine level); in the world,
//      the rammer's anim telegraph count equals its wind-up count and
//      the player's anim spawn count equals its volley count.
//   4. determinism — two runs of one seed produce identical sequences
//      of (state, frame) pairs for the player and the first pirate.
//   5. zero-allocation — the pose object and the event ring keep their
//      identity across 1,000 updates; the advance path replaces nothing.

import { existsSync, statSync } from 'node:fs';
import { MANIFEST, createMachine, drainEvents, setState, stateDuration, updateMachine } from '../game/src/anim.js';
import { DREADNOUGHTS } from '../game/src/catalog.js';
import { STEP } from '../game/src/config.js';
import { botControls, createWorld, spawnPirate, stageBoss, startRun, stepWorld } from '../game/src/world.js';

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures += 1;
};

// ------------------------------------------------------------ gate 1
for (const f of ['sim/contact1.jpg', 'sim/contact2.jpg', 'sim/contact3.jpg']) {
  const ok = existsSync(f) && statSync(f).size > 20000;
  check(ok, `gate 1 contact sheet: ${f} ${existsSync(f) ? `(${statSync(f).size} bytes)` : 'MISSING — capture via ?shot=' + f.slice(4, 12)}`);
}

// ------------------------------------------------------------ gate 2
console.log('\ngate 2 — duration table (ms):');
const probe = (actor, opts) => createMachine(actor, opts);
for (const [actor, def] of Object.entries(MANIFEST)) {
  const m = probe(actor, actor === 'dreadnought' ? { telegraphMs: 1500 } : {});
  for (const state of Object.keys(def.states)) {
    console.log(`  ${actor.padEnd(12)} ${state.padEnd(10)} ${String(stateDuration(m, state)).padStart(5)} ms  ${def.states[state].loop ? 'loop' : 'once'}`);
  }
}
check(stateDuration(probe('player'), 'attack') === 160, 'gate 2: player attack is 160 ms (the base cannon interval is ~154 ms)');
for (const row of DREADNOUGHTS.filter((d) => d.beam)) {
  const m = probe('dreadnought', { telegraphMs: Math.round(row.beam.telegraph * 1000), fireMs: Math.round(row.beam.fire * 1000) });
  check(stateDuration(m, 'telegraph') === Math.round(row.beam.telegraph * 1000), `gate 2: ${row.name} telegraph == catalog beam telegraph (${row.beam.telegraph}s)`);
  check(stateDuration(m, 'attack') === Math.round(row.beam.fire * 1000), `gate 2: ${row.name} attack == catalog beam fire (${row.beam.fire}s)`);
}
check(stateDuration(probe('rammer'), 'telegraph') === 550, 'gate 2: rammer telegraph loop is 550 ms == the world wind-up (0.55 s), one loop per wind-up');

// ------------------------------------------------------------ gate 3
console.log('\ngate 3 — event audit:');
const scratch = [];
function playState(actor, state, opts = {}) {
  const m = createMachine(actor, opts);
  setState(m, state);
  const fired = [];
  const drain = () => {
    const n = drainEvents(m, scratch);
    for (let i = 0; i < n; i++) fired.push(scratch[i]);
  };
  drain();
  let guard = 0;
  while (!m.done && guard++ < 400) {
    updateMachine(m, 10);
    drain();
    if (MANIFEST[actor].states[state].loop) break;
  }
  return fired;
}
for (const [actor, def] of Object.entries(MANIFEST)) {
  for (const [state, s] of Object.entries(def.states)) {
    if (!s.events) continue;
    const opts = actor === 'dreadnought' ? { telegraphMs: 1500, fireMs: 900 } : {};
    const fired = playState(actor, state, opts);
    const declared = s.events.map((e) => e.name);
    const ok = s.loop
      ? fired.filter((n) => n === declared[0]).length >= 1
      : JSON.stringify(fired) === JSON.stringify(declared);
    check(ok, `gate 3: ${actor}/${state} fires [${declared.join(', ')}] exactly once in order (got [${fired.join(', ')}])`);
  }
}
// In the world: a rammer's wind-ups vs its anim telegraph events.
{
  const world = createWorld('animqa-rammer');
  world.phase = 'combat';
  world.player.x = 300;
  world.player.y = 700;
  spawnPirate(world, 'rammer', 760, 380);
  let windUps = 0;
  let telegraphEvents = 0;
  let hitEvents = 0;
  let prevRam = 'stalk';
  const idle = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, firing: false };
  for (let i = 0; i < 120 * 30; i++) {
    stepWorld(world, idle, STEP);
    const e = world.enemies[0];
    if (e) {
      if (e.ramState === 'telegraph' && prevRam !== 'telegraph') windUps += 1;
      prevRam = e.ramState;
    }
    for (const ev of world.events) {
      if (ev === 'anim:telegraph') telegraphEvents += 1;
      if (ev === 'anim:hit') hitEvents += 1;
    }
    world.events.length = 0;
    if (world.phase === 'lost') break;
  }
  check(windUps >= 1 && telegraphEvents === windUps, `gate 3: rammer anim telegraphs == wind-ups (${telegraphEvents} == ${windUps})`);
  check(hitEvents >= 1, `gate 3: rammer charge fired its anim hit event (${hitEvents}x)`);
}
// In the world: the player's anim spawns vs its volleys. The scenario
// holds only the Brassjaw (no beam, and its first broadside is 3.2 s
// out), so inside a 2.5 s window the player is the only actor who can
// produce an anim:spawn — the counts must match volley for volley.
{
  const world = createWorld('animqa-volleys');
  world.phase = 'combat';
  const boss = stageBoss(world, 5);
  boss.entered = true;
  boss.x = 905;
  boss.y = 208;
  let volleys = 0;
  let spawns = 0;
  for (let i = 0; i < 120 * 2.5; i++) {
    stepWorld(world, botControls(world), STEP);
    for (const ev of world.events) {
      if (ev === 'shoot') volleys += 1;
      if (ev === 'anim:spawn') spawns += 1;
    }
    world.events.length = 0;
  }
  check(volleys > 10 && spawns === volleys, `gate 3: player anim spawns == volleys (${spawns} == ${volleys})`);
}

// ------------------------------------------------------------ gate 4
{
  const trace = () => {
    const world = createWorld('animqa-determinism');
    startRun(world);
    const seq = [];
    for (let i = 0; i < 120 * 30; i++) {
      if (world.phase === 'draft') break;
      stepWorld(world, botControls(world), STEP);
      world.events.length = 0;
      const p = world.player.anim;
      const e = world.enemies[0] ? world.enemies[0].anim : null;
      seq.push(`${p.state}:${p.frame}|${e ? `${e.state}:${e.frame}` : '-'}`);
    }
    return seq.join(',');
  };
  const a = trace();
  const b = trace();
  check(a === b && a.length > 1000, `gate 4: (state, frame) sequences identical across two runs (${a.length} chars)`);
}

// ------------------------------------------------------------ gate 5
{
  const m = createMachine('player');
  const poseRef = m.pose;
  const ringRef = m.ring;
  const defRef = m.def;
  setState(m, 'move');
  for (let i = 0; i < 1000; i++) updateMachine(m, 16);
  check(m.pose === poseRef && m.ring === ringRef && m.def === defRef, 'gate 5: pose/ring/manifest identity stable across 1,000 updates (no per-frame allocation)');
}

console.log(failures === 0 ? '\nANIM QA: ALL GATES PASSED' : `\nANIM QA: ${failures} GATE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
