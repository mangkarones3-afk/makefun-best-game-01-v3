// world.js — CLOUDBRAWL's simulation: the ship, the pirates, the sky itself.
//
// Everything that *happens* in a run happens here, in fixed steps, from one
// seeded generator — and nothing here touches the canvas, the DOM or the
// clock. render.js draws the state this module keeps; main.js feeds it
// controls; sim/simulate.mjs feeds it an autopilot and the identical run
// plays out headlessly. That split is what makes the game provable.
//
// The run's shape: fifteen waves (waves.js composes them). Clear a wave and
// the sky breathes for a moment, then offers a draft of upgrades
// (upgrades.js). Dreadnoughts ride waves 5, 10 and 15. Sink the third and
// the run is won; lose the hull and it is lost — unless Second Wind was
// drafted, once.

import { createMachine, drainEvents, retrigger, setState, updateMachine } from './anim.js';
import { DREADNOUGHTS, PIRATES, dreadnoughtFor, upgradeById, waveScale } from './catalog.js';
import { ECONOMY, FORGE, GRADES, RUN, SHIP, STEP, VIEW_H, VIEW_W } from './config.js';
import { burst, floatText, glint, makeMote, smoke, stepParticles } from './particles.js';
import { around, chance, intRange, makeRng, range } from './rng.js';
import { applyUpgrade, baseStats, dealDraft } from './upgrades.js';
import { buildWave, spawnPoint } from './waves.js';

// ------------------------------------------------------------------ setup

/** A fresh run's whole state. `phase` starts at 'ready'; startRun launches it. */
export function createWorld(seed) {
  const rng = makeRng(seed);
  const world = {
    rng,
    seed,
    time: 0,
    phase: 'ready', // ready | combat | intermission | draft | won | lost
    phaseTime: 0,
    wave: 0,
    waveTime: 0,
    schedule: [],
    spawnIndex: 0,
    waveTotal: 0,
    player: {
      x: 430,
      y: 430,
      vx: 0,
      vy: 0,
      hull: SHIP.hull,
      maxHull: SHIP.hull,
      fireCd: 0,
      hurtCd: 0,
      aimAngle: 0,
      anim: createMachine('player'),
      animHurt: false,
    },
    stats: baseStats(),
    build: [],
    draftOffer: [],
    enemies: [],
    boss: null,
    bullets: [], // the player's shots
    shells: [], // pirate shots and bombs
    coins: [],
    motes: [],
    texts: [],
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    gold: 0,
    goldEarned: 0,
    score: 0,
    shake: 0,
    hitStop: 0,
    events: [],
    secondWindUsed: false,
    bossKillWave: 0,
    clouds: [],
    islets: [],
    forgeSmokeCd: 0,
  };
  // The sky's furniture, dealt once from the seed: three cloud layers and a
  // few far islets. render.js drifts them; the world only deals them.
  for (let i = 0; i < 30; i++) {
    world.clouds.push({
      x: rng() * VIEW_W,
      y: rng() * VIEW_H * 0.92,
      s: range(rng, 0.5, 1.9),
      layer: i % 3,
      puff: intRange(rng, 3, 6),
    });
  }
  for (let i = 0; i < 6; i++) {
    world.islets.push({ x: rng() * VIEW_W, y: range(rng, 120, 560), s: range(rng, 0.5, 1.3) });
  }
  return world;
}

/** Launch the run: wave 1's schedule is built and the sky goes live. */
export function startRun(world) {
  world.phase = 'combat';
  beginWave(world, 1);
}

function beginWave(world, wave) {
  world.wave = wave;
  world.waveTime = 0;
  const built = buildWave(wave, world.rng);
  world.schedule = built.spawns;
  world.spawnIndex = 0;
  world.waveTotal = built.total;
  world.boss = null;
  if (built.boss) {
    world.boss = makeBoss(built.boss);
    world.events.push('boss');
  }
  world.events.push('wave');
}

/** A dreadnought enters from the right sky and takes its hover station. */
function makeBoss(row) {
  return {
    isBoss: true,
    cls: 'dreadnought',
    name: row.name,
    row,
    x: VIEW_W + 190,
    y: 205,
    vx: 0,
    vy: 0,
    hull: row.hull,
    maxHull: row.hull,
    radius: row.radius,
    t: 0,
    broadsideCd: 3.2,
    beamState: row.beam ? 'idle' : 'none', // idle | telegraph | fire
    beamT: 0,
    beamAngle: 0,
    beamCd: 5.5,
    launchCd: 4,
    contactCd: 0,
    entered: false,
    anim: createMachine('dreadnought', {
      telegraphMs: row.beam ? Math.round(row.beam.telegraph * 1000) : 1500,
      fireMs: row.beam ? Math.round(row.beam.fire * 1000) : 700,
    }),
    animHull: row.hull,
  };
}

/** The forge ring's live radius: the Forge Pact widens it as it speeds it. */
export function forgeRingRadius(world) {
  return SHIP.forgeRing * (1 + 0.25 * (world.stats.repairMul - 1));
}

/** Staging and testing: set a wave's dreadnought as the world's boss. */
export function stageBoss(world, wave) {
  const row = dreadnoughtFor(wave);
  if (!row) return null;
  world.boss = makeBoss(row);
  return world.boss;
}

/** Staging and testing: add one pirate of a class at a point. */
export function spawnPirate(world, cls, x, y) {
  const e = makeEnemy(world, cls, x, y);
  world.enemies.push(e);
  return e;
}

/** Spawn one pirate of a class at a point, scaled to the wave. */
function makeEnemy(world, cls, x, y) {
  const base = PIRATES[cls];
  const scale = waveScale(world.wave);
  const hull = Math.round(base.hull * scale.hull);
  return {
    isBoss: false,
    cls,
    x,
    y,
    vx: 0,
    vy: 0,
    hull,
    maxHull: hull,
    radius: base.radius,
    speed: base.speed * scale.speed * range(world.rng, 0.9, 1.1),
    damageScale: scale.damage,
    fireCd: range(world.rng, 0.4, 1.6),
    t: range(world.rng, 0, 10), // a private phase for weave and orbit
    orbitDir: chance(world.rng, 0.5) ? 1 : -1,
    launchCd: range(world.rng, 3, 5), // carriers
    ramState: 'stalk', // rammers: stalk | telegraph | charge | recover
    ramT: 0,
    ramDx: 0,
    ramDy: 0,
    contactCd: 0,
    anim: createMachine(cls === 'rammer' ? 'rammer' : 'pirate'),
    animHull: hull,
  };
}

// ---------------------------------------------------------------- helpers

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampToSky(world, e, margin) {
  e.x = Math.max(-margin, Math.min(VIEW_W + margin, e.x));
  e.y = Math.max(-margin, Math.min(VIEW_H + margin, e.y));
}

/** The pirate leash: no pirate may ever be more than 30 units past the
 *  sky's edge. They form up off-frame and fly in, but a retreating sniper
 *  slides along the wall inside the player's bullet reach — a fight can
 *  never park itself somewhere the Dawnbreaker cannot shoot. */

/** Damage the player, with the run's one mercy: Second Wind. */
function hurtPlayer(world, amount) {
  const p = world.player;
  if (world.phase !== 'combat' || p.hurtCd > 0) return;
  p.hull -= amount;
  p.hurtCd = 0.12;
  world.shake = Math.min(1, world.shake + 0.34);
  world.hitStop = Math.max(world.hitStop, 0.05);
  world.events.push('hurt');
  p.animHurt = true;
  burst(world.motes, world.rng, p.x, p.y, 10, '#e8b04b', 240);
  if (p.hull <= 0) {
    if (world.stats.secondWind > 0 && !world.secondWindUsed) {
      world.secondWindUsed = true;
      p.hull = 35;
      world.shells.length = 0;
      for (const e of world.enemies) {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.x += Math.cos(a) * 190;
        e.y += Math.sin(a) * 190;
      }
      burst(world.motes, world.rng, p.x, p.y, 60, '#ffd94d', 420, 4);
      floatText(world.texts, p.x, p.y - 54, 'SECOND WIND!', '#c98f12', 26);
      world.events.push('secondwind');
    } else {
      p.hull = 0;
      world.phase = 'lost';
      world.phaseTime = 0;
      burst(world.motes, world.rng, p.x, p.y, 90, '#e8762b', 460, 4.4);
      smoke(world.motes, world.rng, p.x, p.y, 16, true);
      world.events.push('lose');
    }
  }
}

/** Drop a killed pirate's gold as coins that drift, then blow away. */
function dropGold(world, x, y, amount) {
  const n = Math.max(1, Math.min(16, Math.round(amount)));
  for (let i = 0; i < n; i++) {
    const at = around(world.rng, x, y, 26);
    world.coins.push({
      x: at.x,
      y: at.y,
      vx: range(world.rng, -30, 30),
      vy: range(world.rng, -30, 30),
      t: 0,
      life: ECONOMY.coinLife,
      value: amount / n,
    });
  }
}

/** A pirate (or the dreadnought) dies: fire, gold, score, splash. */
function killEnemy(world, e) {
  world.kills += 1;
  const base = e.isBoss ? null : PIRATES[e.cls];
  const goldRow = e.isBoss ? e.row.gold : base.gold;
  const goldAmount = intRange(world.rng, goldRow[0], goldRow[1]) * world.stats.goldMul;
  world.score += e.isBoss ? e.row.score : base.score;
  dropGold(world, e.x, e.y, goldAmount);
  burst(world.motes, world.rng, e.x, e.y, e.isBoss ? 110 : 26, e.isBoss ? '#e8762b' : '#f2a33d', e.isBoss ? 480 : 330, e.isBoss ? 4.6 : 3.6);
  smoke(world.motes, world.rng, e.x, e.y, e.isBoss ? 18 : 5, e.isBoss);
  floatText(world.texts, e.x, e.y - e.radius - 8, `+${Math.round(goldAmount)} gold`, '#c98f12', e.isBoss ? 24 : 15);
  world.hitStop = Math.max(world.hitStop, e.isBoss ? 0.12 : 0.04);
  world.shake = Math.min(1, world.shake + (e.isBoss ? 0.55 : 0.14));
  world.events.push(e.isBoss ? 'bosskill' : 'explosion');
  if (world.stats.splash > 0 && !e.isBoss) {
    for (const other of world.enemies) {
      if (other !== e && other.hull > 0 && Math.hypot(other.x - e.x, other.y - e.y) < 120) {
        other.hull -= world.stats.splash;
        floatText(world.texts, other.x, other.y - other.radius, String(world.stats.splash), '#e8762b', 14);
      }
    }
  }
  if (e.isBoss) {
    world.bossKillWave = world.wave;
    world.boss = null;
  }
}

// -------------------------------------------------------------- the draft

/** Choose draft card i (main.js on a click, the simulator by policy). */
export function chooseDraft(world, index) {
  if (world.phase !== 'draft') return false;
  const offer = world.draftOffer[index];
  if (!offer) return false;
  const delta = applyUpgrade(world.build, offer.id);
  if (!delta) return false;
  const s = world.stats;
  if (delta.mode === 'mul') s[delta.stat] *= delta.amount;
  else s[delta.stat] += delta.amount;
  if (delta.stat === 'maxHull') {
    world.player.maxHull += delta.amount;
    world.player.hull = Math.min(world.player.maxHull, world.player.hull + delta.amount);
  }
  world.draftOffer = [];
  world.events.push('pick');
  beginWave(world, world.wave + 1);
  world.phase = 'combat';
  return true;
}

function openDraft(world) {
  world.phase = 'draft';
  world.phaseTime = 0;
  world.draftOffer = dealDraft(world.build, world.rng, ECONOMY.draftChoices);
  world.events.push('draft');
  if (world.draftOffer.length === 0) {
    // The pool is exhausted (a very long, very built run): fly on.
    beginWave(world, world.wave + 1);
    world.phase = 'combat';
  }
}

// ------------------------------------------------------------ the pirates

function steer(e, tx, ty, speed, dt, agility = 3.2) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const want = speed;
  e.vx += ((dx / d) * want - e.vx) * Math.min(1, agility * dt);
  e.vy += ((dy / d) * want - e.vy) * Math.min(1, agility * dt);
  e.x += e.vx * dt;
  e.y += e.vy * dt;
}

/** Fire one aimed shell from a pirate at the player (with a little lead). */
function pirateShoot(world, e, speed, damage, kind = 'shot') {
  const p = world.player;
  const d = dist(e, p);
  const lead = Math.min(0.45, d / Math.max(200, speed));
  const tx = p.x + p.vx * lead;
  const ty = p.y + p.vy * lead;
  const a = Math.atan2(ty - e.y, tx - e.x) + range(world.rng, -0.045, 0.045);
  world.shells.push({
    x: e.x + Math.cos(a) * (e.radius + 4),
    y: e.y + Math.sin(a) * (e.radius + 4),
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    r: kind === 'bomb' ? 9 : 5,
    dmg: damage,
    kind,
    t: 0,
  });
  world.events.push('enemyshoot');
}

function stepSkiff(world, e, dt) {
  const p = world.player;
  const d = dist(e, p);
  const orbit = e.orbitDir * 120;
  const tx = p.x + Math.cos(e.t * 0.9) * orbit * 0.4 + (d > 300 ? (p.x - e.x) * 0.4 : 0);
  const ty = p.y + Math.sin(e.t * 1.3) * 90;
  steer(e, d > 310 ? p.x : tx, d > 310 ? p.y : ty, e.speed, dt);
  e.fireCd -= dt;
  if (e.fireCd <= 0 && d < 430) {
    pirateShoot(world, e, 330, PIRATES.skiff.shotDamage * e.damageScale);
    e.fireCd = 1 / PIRATES.skiff.fireRate + range(world.rng, 0, 0.5);
  }
}

function stepBomber(world, e, dt) {
  const p = world.player;
  const d = dist(e, p);
  steer(e, d > 370 ? p.x : p.x + Math.cos(e.t * 0.5) * 160, d > 370 ? p.y : p.y - 60 + Math.sin(e.t * 0.7) * 60, e.speed, dt);
  e.fireCd -= dt;
  if (e.fireCd <= 0 && d < 520) {
    pirateShoot(world, e, 265, PIRATES.bomber.shotDamage * e.damageScale, 'bomb');
    e.fireCd = 1 / PIRATES.bomber.fireRate + range(world.rng, 0, 0.6);
  }
}

function stepRammer(world, e, dt) {
  const p = world.player;
  e.ramT -= dt;
  if (e.ramState === 'stalk') {
    steer(e, p.x, p.y, e.speed, dt);
    if (dist(e, p) < 330 && e.ramT <= 0) {
      e.ramState = 'telegraph';
      e.ramT = 0.7;
    }
  } else if (e.ramState === 'telegraph') {
    e.vx *= 1 - 4 * dt;
    e.vy *= 1 - 4 * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    e.ramDx = Math.cos(a);
    e.ramDy = Math.sin(a);
    if (e.ramT <= 0) {
      e.ramState = 'charge';
      e.ramT = 0.85;
      world.events.push('ramcharge');
    }
  } else if (e.ramState === 'charge') {
    e.vx = e.ramDx * 470;
    e.vy = e.ramDy * 470;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.ramT <= 0) {
      e.ramState = 'recover';
      e.ramT = 1.3;
    }
  } else {
    e.vx *= 1 - 2.2 * dt;
    e.vy *= 1 - 2.2 * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.ramT <= 0) {
      e.ramState = 'stalk';
      e.ramT = range(world.rng, 0.6, 1.6);
    }
  }
}

function stepSniper(world, e, dt) {
  const p = world.player;
  const d = dist(e, p);
  let tx = e.x;
  let ty = e.y;
  if (d < 380) {
    tx = e.x + (e.x - p.x);
    ty = e.y + (e.y - p.y) * 0.6;
  } else if (d > 470) {
    tx = p.x;
    ty = p.y;
  } else {
    tx = e.x + Math.cos(e.t * 0.6) * 60;
    ty = e.y + Math.sin(e.t * 0.8) * 46;
  }
  steer(e, tx, ty, e.speed, dt);
  e.fireCd -= dt;
  if (e.fireCd <= 0 && d < 640) {
    pirateShoot(world, e, 470, PIRATES.sniper.shotDamage * e.damageScale);
    e.fireCd = 1 / PIRATES.sniper.fireRate + range(world.rng, 0, 0.7);
  }
}

function stepCarrier(world, e, dt) {
  const p = world.player;
  const d = dist(e, p);
  steer(e, d > 400 ? p.x : e.x + Math.cos(e.t * 0.4) * 90, d > 400 ? p.y : e.y + Math.sin(e.t * 0.5) * 50, e.speed, dt);
  e.launchCd -= dt;
  const children = world.enemies.filter((o) => o.parent === e).length;
  if (e.launchCd <= 0 && children < 4) {
    const child = makeEnemy(world, 'skiff', e.x - 20, e.y + 30);
    child.parent = e;
    world.enemies.push(child);
    e.launchCd = range(world.rng, 4, 5.5);
    world.events.push('launch');
  }
  e.fireCd -= dt;
  if (e.fireCd <= 0 && d < 460) {
    pirateShoot(world, e, 300, PIRATES.carrier.shotDamage * e.damageScale);
    e.fireCd = 1 / PIRATES.carrier.fireRate + range(world.rng, 0, 0.6);
  }
}

const STEPPERS = { skiff: stepSkiff, bomber: stepBomber, rammer: stepRammer, sniper: stepSniper, carrier: stepCarrier };

function stepBoss(world, dt) {
  const boss = world.boss;
  if (!boss) return;
  const p = world.player;
  const row = boss.row;
  boss.t += dt;
  // Entrance, then a slow hover drift that keeps the fight moving.
  const hoverX = 905 + Math.sin(boss.t * 0.31) * 60;
  const hoverY = 208 + Math.sin(boss.t * 0.47) * 42;
  if (!boss.entered) {
    boss.x -= 120 * dt;
    if (boss.x <= hoverX + 40) boss.entered = true;
  } else {
    steer(boss, hoverX, hoverY, row.speed * 2.4, dt, 1.4);
  }
  boss.contactCd -= dt;
  // Broadsides: a fan of shells from the gun deck toward the player's side.
  boss.broadsideCd -= dt;
  if (boss.broadsideCd <= 0 && boss.entered) {
    const guns = row.broadside.guns;
    for (let g = 0; g < guns; g++) {
      const gy = boss.y - 52 + (104 / Math.max(1, guns - 1)) * g;
      const a = Math.atan2(p.y - gy, p.x - boss.x) + range(world.rng, -0.09, 0.09);
      world.shells.push({ x: boss.x - 60, y: gy, vx: Math.cos(a) * 315, vy: Math.sin(a) * 315, r: 5, dmg: row.broadside.shotDamage, kind: 'shot', t: 0 });
    }
    world.events.push('broadside');
    boss.broadsideCd = row.broadside.cooldown * range(world.rng, 0.9, 1.15);
  }
  // The beam (waves 10 and 15): telegraph, track, fire.
  if (row.beam) {
    boss.beamT -= dt;
    if (boss.beamState === 'idle') {
      boss.beamCd -= dt;
      if (boss.beamCd <= 0 && boss.entered) {
        boss.beamState = 'telegraph';
        boss.beamT = row.beam.telegraph;
        boss.beamAngle = Math.atan2(p.y - boss.y, p.x - boss.x);
        world.events.push('beamcharge');
      }
    } else if (boss.beamState === 'telegraph') {
      const want = Math.atan2(p.y - boss.y, p.x - boss.x);
      let diff = want - boss.beamAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const track = boss.beamT > 0.45 ? 1.5 : 0.25; // the aim settles late — dodge late
      boss.beamAngle += Math.max(-track * dt, Math.min(track * dt, diff));
      if (boss.beamT <= 0) {
        boss.beamState = 'fire';
        boss.beamT = row.beam.fire;
        world.events.push('beamfire');
      }
    } else if (boss.beamState === 'fire') {
      // Is the player inside the beam's corridor?
      const dx = p.x - boss.x;
      const dy = p.y - boss.y;
      const along = dx * Math.cos(boss.beamAngle) + dy * Math.sin(boss.beamAngle);
      const across = Math.abs(-dx * Math.sin(boss.beamAngle) + dy * Math.cos(boss.beamAngle));
      if (along > 0 && across < 30) hurtPlayer(world, row.beam.damage * dt * 2.2);
      if (boss.beamT <= 0) {
        boss.beamState = 'idle';
        boss.beamCd = row.beam.cooldown * range(world.rng, 0.9, 1.2);
      }
    }
  }
  // Escort launches (the Skyfall only).
  if (row.launches) {
    boss.launchCd -= dt;
    const escorts = world.enemies.length;
    if (boss.launchCd <= 0 && escorts < row.launches.cap && boss.entered) {
      world.enemies.push(makeEnemy(world, row.launches.of, boss.x - 80, boss.y + 90));
      boss.launchCd = row.launches.every;
      world.events.push('launch');
    }
  }
  // Contact with the great hull.
  if (boss.contactCd <= 0 && dist(boss, p) < boss.radius + SHIP.radius - 8) {
    hurtPlayer(world, row.contactDamage);
    boss.contactCd = 0.9;
  }
}

// ---------------------------------------------------------------- the run

/** The merit score and letter grade of a finished (or abandoned) run. */
export function meritOf(world) {
  const progress = (Math.min(world.wave, RUN.waves) / RUN.waves) * 42;
  const wonBonus = world.phase === 'won' ? 10 : 0;
  const accuracy = world.shotsFired > 0 ? (world.shotsHit / world.shotsFired) * 18 : 0;
  const killsPart = Math.min(14, world.kills * 0.055);
  const hullPart = (world.player.hull / world.player.maxHull) * 8;
  const goldPart = Math.min(8, world.goldEarned / 420);
  return Math.round(Math.min(100, progress + wonBonus + accuracy + killsPart + hullPart + goldPart));
}

export function gradeOf(world) {
  const merit = meritOf(world);
  return GRADES.find((g) => merit >= g.min) ?? GRADES[GRADES.length - 1];
}

/**
 * Advance the world one fixed step under `controls`
 * ({ moveX, moveY, aimX, aimY, firing }). All the game's rules live here.
 */
export function stepWorld(world, controls, dt = STEP) {
  world.time += dt;
  world.phaseTime += dt;
  if (world.hitStop > 0) {
    world.hitStop -= dt;
    stepParticles(world, dt * 0.25);
    return;
  }
  world.shake = Math.max(0, world.shake - dt * 1.7);
  const p = world.player;
  p.hurtCd -= dt;

  // The forge breathes smoke, whatever the phase.
  world.forgeSmokeCd -= dt;
  if (world.forgeSmokeCd <= 0) {
    smoke(world.motes, world.rng, FORGE.x + 44, FORGE.y - 96, 1);
    world.forgeSmokeCd = 0.5;
  }

  if (world.phase === 'combat') stepCombat(world, controls, dt);
  else if (world.phase === 'intermission') {
    stepDrift(world, controls, dt);
    if (world.phaseTime >= RUN.intermission) openDraft(world);
  } else if (world.phase === 'draft') {
    stepDrift(world, controls, dt);
  }
  stepParticles(world, dt);
  stepAnims(world, dt);
  // Events are a per-frame channel: main.js drains them after its steps.
}

// ------------------------------------------------------------- the acting

const ANIM_SCRATCH = [null, null, null, null, null, null, null, null];

/** Drain one machine's fired animation events into the world's channel. */
function drainAnim(world, m) {
  const n = drainEvents(m, ANIM_SCRATCH);
  for (let i = 0; i < n; i++) world.events.push(`anim:${ANIM_SCRATCH[i]}`);
}

/**
 * The acting pass: derive each actor's animation state from the world's
 * facts and advance every machine by the step's own dt — so animation
 * runs on the sim clock (deterministic, frozen by hit-stop, which
 * returns from stepWorld before this pass is reached). Priority is the
 * manifest's: death over hurt over telegraph over attack over motion.
 */
function stepAnims(world, dt) {
  const dtMs = dt * 1000;
  const p = world.player;
  if (world.phase === 'lost') setState(p.anim, 'death');
  else if (p.animHurt) {
    setState(p.anim, 'hurt');
    p.animHurt = false;
  } else if (p.anim.state === 'idle' || p.anim.state === 'move') {
    setState(p.anim, Math.hypot(p.vx, p.vy) > 45 ? 'move' : 'idle');
  }
  updateMachine(p.anim, dtMs);
  drainAnim(world, p.anim);
  for (const e of world.enemies) {
    const m = e.anim;
    if (e.hull < e.animHull) setState(m, 'hurt');
    else if (e.cls === 'rammer') {
      if (e.ramState === 'telegraph') setState(m, 'telegraph');
      else if (e.ramState === 'charge') setState(m, 'attack');
      else if (m.state === 'telegraph') setState(m, 'move');
    } else if (m.state === 'idle') setState(m, 'move');
    e.animHull = e.hull;
    updateMachine(m, dtMs);
    drainAnim(world, m);
  }
  const b = world.boss;
  if (b) {
    const m = b.anim;
    if (b.hull < b.animHull) setState(m, 'hurt');
    else if (b.beamState === 'telegraph') setState(m, 'telegraph');
    else if (b.beamState === 'fire') setState(m, 'attack');
    b.animHull = b.hull;
    updateMachine(m, dtMs);
    drainAnim(world, m);
  }
}

/** Staging helper, re-exported for shots.js: pose an actor's machine. */
export { primeAnim } from './anim.js';

function stepDrift(world, controls, dt) {
  // Between fights the ship still flies (and the forge still mends), but
  // the cannons stay silent and the sky holds no enemies.
  movePlayer(world, controls, dt);
  stepCoins(world, dt);
}

function movePlayer(world, controls, dt) {
  const p = world.player;
  const s = world.stats;
  p.vx += controls.moveX * SHIP.accel * s.speedMul * dt;
  p.vy += controls.moveY * SHIP.accel * s.speedMul * dt;
  const damp = Math.exp(-SHIP.drag * dt);
  p.vx *= damp;
  p.vy *= damp;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(36, Math.min(VIEW_W - 36, p.x));
  p.y = Math.max(96, Math.min(VIEW_H - 30, p.y));
  p.aimAngle = Math.atan2(controls.aimY - p.y, controls.aimX - p.x);
  // The forge's ring mends the hull of a ship that comes home.
  const dForge = Math.hypot(p.x - FORGE.heartX, p.y - FORGE.heartY);
  if (dForge < forgeRingRadius(world) && p.hull < p.maxHull) {
    p.hull = Math.min(p.maxHull, p.hull + SHIP.forgeRepairRate * s.repairMul * dt);
  }
}

function stepCombat(world, controls, dt) {
  const p = world.player;
  world.waveTime += dt;
  // Deal the wave's arrivals.
  while (world.spawnIndex < world.schedule.length && world.schedule[world.spawnIndex].at <= world.waveTime) {
    const s = world.schedule[world.spawnIndex++];
    const at = spawnPoint(s.side, world.rng, { w: VIEW_W, h: VIEW_H });
    world.enemies.push(makeEnemy(world, s.cls, at.x, at.y));
  }
  movePlayer(world, controls, dt);

  // The cannons.
  p.fireCd -= dt;
  if (controls.firing && p.fireCd <= 0) {
    const s = world.stats;
    const dmg = SHIP.bulletDamage + s.bulletDamage;
    const speed = SHIP.bulletSpeed * s.bulletSpeedMul;
    const shots = 1 + s.extraShot;
    for (let i = 0; i < shots; i++) {
      const spread = (i - (shots - 1) / 2) * 0.055 + range(world.rng, -0.012, 0.012) * s.spreadMul;
      const a = p.aimAngle + spread;
      world.bullets.push({
        x: p.x + Math.cos(p.aimAngle) * 34,
        y: p.y + Math.sin(p.aimAngle) * 34,
        vx: Math.cos(a) * speed + p.vx * 0.25,
        vy: Math.sin(a) * speed + p.vy * 0.25,
        dmg,
        life: SHIP.bulletLife * s.bulletSpeedMul,
        r: 4,
      });
    }
    world.shotsFired += shots;
    p.fireCd = 1 / (SHIP.fireRate * s.fireRateMul);
    world.events.push('shoot');
    retrigger(p.anim, 'attack'); // every volley restarts the recoil beat
    if (chance(world.rng, 0.5)) {
      world.motes.push(makeMote(p.x + Math.cos(p.aimAngle) * 30, p.y + Math.sin(p.aimAngle) * 30 + 12, range(world.rng, -30, 30), range(world.rng, 20, 60), 0.5, 2.4, '#c9a86a', 'shell'));
    }
  }

  // Player bullets fly and land.
  for (let i = world.bullets.length - 1; i >= 0; i--) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < -64 || b.x > VIEW_W + 64 || b.y < -64 || b.y > VIEW_H + 64;
    if (!dead) {
      const targets = world.boss ? [...world.enemies, world.boss] : world.enemies;
      for (const e of targets) {
        if (e.hull > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.r) {
          e.hull -= b.dmg;
          world.shotsHit += 1;
          burst(world.motes, world.rng, b.x, b.y, 5, '#ffe9a8', 200, 2.6);
          floatText(world.texts, e.x + range(world.rng, -8, 8), e.y - e.radius - 4, String(b.dmg), '#ffffff', 14);
          world.events.push('hit');
          dead = true;
          break;
        }
      }
    }
    if (dead) world.bullets.splice(i, 1);
  }

  // Pirates fly and fight.
  for (const e of world.enemies) {
    e.t += dt;
    e.contactCd -= dt;
    const shellsBefore = world.shells.length;
    const foesBefore = world.enemies.length;
    STEPPERS[e.cls](world, e, dt);
    // A pirate that loosed a shell (or a carrier that launched a skiff)
    // plays its attack beat — the shell's spawn frame is the anim event.
    if (world.shells.length > shellsBefore || world.enemies.length > foesBefore) setState(e.anim, 'attack');
    clampToSky(world, e, 30);
  }
  // A gentle separation so a swarm reads as ships, not a knot.
  const list = world.enemies;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      const min = a.radius + b.radius + 4;
      if (d2 > 0.01 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 26 * dt;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
    }
  }
  stepBoss(world, dt);

  // Pirate shells fly and land.
  for (let i = world.shells.length - 1; i >= 0; i--) {
    const sh = world.shells[i];
    sh.t += dt;
    if (sh.kind === 'bomb') sh.vy += 130 * dt; // bombs arc down
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    let dead = sh.x < -40 || sh.x > VIEW_W + 40 || sh.y < -40 || sh.y > VIEW_H + 40 || sh.t > 6;
    if (!dead && Math.hypot(sh.x - p.x, sh.y - p.y) < sh.r + SHIP.radius - 6) {
      hurtPlayer(world, sh.dmg);
      dead = true;
      // Second Wind clears the sky mid-loop: the array this loop walks is
      // suddenly empty, and the only honest move is to stop walking it.
      if (world.shells.length === 0) break;
    }
    if (dead) world.shells.splice(i, 1);
  }

  // Contact: a pirate that reaches the ship hurts it and is hurt.
  for (const e of world.enemies) {
    if (e.contactCd <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + SHIP.radius - 4) {
      const base = PIRATES[e.cls];
      hurtPlayer(world, base.damage * e.damageScale * (e.cls === 'rammer' && e.ramState === 'charge' ? 1.6 : 1));
      e.hull -= 12;
      e.contactCd = 0.85;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      e.x += Math.cos(a) * 26;
      e.y += Math.sin(a) * 26;
    }
  }

  stepCoins(world, dt);

  // The dead are gathered.
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    if (world.enemies[i].hull <= 0) {
      killEnemy(world, world.enemies[i]);
      world.enemies.splice(i, 1);
    }
  }
  if (world.boss && world.boss.hull <= 0) killEnemy(world, world.boss);

  // The wave is clear when nothing is left to arrive or to fight.
  if (
    world.phase === 'combat' &&
    world.spawnIndex >= world.schedule.length &&
    world.enemies.length === 0 &&
    !world.boss
  ) {
    if (world.wave >= RUN.waves) {
      world.phase = 'won';
      world.phaseTime = 0;
      world.events.push('win');
    } else {
      world.phase = 'intermission';
      world.phaseTime = 0;
      world.events.push('waveclear');
    }
  }
}

function stepCoins(world, dt) {
  const p = world.player;
  const magnetR = SHIP.goldMagnet * world.stats.magnetMul;
  for (let i = world.coins.length - 1; i >= 0; i--) {
    const c = world.coins[i];
    c.t += dt;
    c.life -= dt;
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < magnetR) {
      const pull = 640 * (1 - d / magnetR) + 120;
      c.vx += ((p.x - c.x) / (d || 1)) * pull * dt * 3;
      c.vy += ((p.y - c.y) / (d || 1)) * pull * dt * 3;
    }
    c.vx *= 1 - 1.4 * dt;
    c.vy *= 1 - 1.4 * dt;
    c.x += c.vx * dt + Math.sin(c.t * 2.1) * ECONOMY.coinDrift * dt * 0.4;
    c.y += c.vy * dt;
    if (d < SHIP.goldPickup) {
      world.gold += c.value;
      world.goldEarned += c.value;
      glint(world.motes, world.rng, c.x, c.y, 5);
      world.events.push('coin');
      world.coins.splice(i, 1);
    } else if (c.life <= 0) {
      world.coins.splice(i, 1);
    }
  }
}

// ------------------------------------------------------------- autopilot

/**
 * The autopilot the headless simulator flies: a competent, unglamorous
 * pilot. It holds a firing stand-off from the nearest threat, sidesteps
 * shells it can see coming, banks gold when the sky is quiet, and goes
 * home to the forge's ring when the hull runs low. It drafts by a fixed
 * preference (damage first, then survival). If this pilot can finish the
 * game on a fair share of seeds, a human with reflexes can too.
 */
export function botControls(world) {
  const p = world.player;
  const idle = { moveX: 0, moveY: 0, aimX: p.x + 100, aimY: p.y, firing: false };
  if (world.phase !== 'combat') return idle;
  // Choose the threat: the boss first, else the nearest pirate.
  let target = world.boss;
  let td = target ? dist(p, target) : Infinity;
  for (const e of world.enemies) {
    const d = dist(p, e);
    if (d < td) {
      td = d;
      target = e;
    }
  }
  // Hull low: go home and mend, unless the sky is nearly clear.
  const homebound = p.hull < p.maxHull * 0.34 && (world.enemies.length > 2 || world.boss);
  let tx;
  let ty;
  let firing = false;
  let aimX = p.x + 100;
  let aimY = p.y;
  if (homebound) {
    tx = FORGE.heartX;
    ty = FORGE.heartY;
  } else if (target) {
    const stand = target.isBoss ? 330 : 250;
    const a = Math.atan2(p.y - target.y, p.x - target.x);
    tx = target.x + Math.cos(a) * stand;
    ty = target.y + Math.sin(a) * stand + Math.sin(world.time * 1.7) * 60;
    const lead = td / (SHIP.bulletSpeed * world.stats.bulletSpeedMul);
    aimX = target.x + target.vx * lead;
    aimY = target.y + target.vy * lead;
    firing = td < 760;
  } else if (world.coins.length) {
    let coin = world.coins[0];
    let cd = dist(p, coin);
    for (const c of world.coins) {
      const d = dist(p, c);
      if (d < cd) {
        cd = d;
        coin = c;
      }
    }
    tx = coin.x;
    ty = coin.y;
  } else {
    tx = 640;
    ty = 400;
  }
  let moveX = (tx - p.x) / 90;
  let moveY = (ty - p.y) / 90;
  // Dodge: any shell close and closing gets a perpendicular sidestep.
  for (const sh of world.shells) {
    const dx = p.x - sh.x;
    const dy = p.y - sh.y;
    const d = Math.hypot(dx, dy);
    if (d < 110 && dx * sh.vx + dy * sh.vy > 0) {
      moveX += (-sh.vy / 400) * (dx > 0 ? 1 : -1) * 0.9;
      moveY += (sh.vx / 400) * (dy > 0 ? 1 : -1) * 0.9;
    }
  }
  const len = Math.hypot(moveX, moveY);
  if (len > 1) {
    moveX /= len;
    moveY /= len;
  }
  return { moveX, moveY, aimX, aimY, firing };
}

/** The autopilot's draft policy: the first card on its preference list. */
export function botDraftIndex(world) {
  const preference = ['heavy-shot', 'twin-muzzles', 'rapid-cannons', 'ironwood-hull', 'powder-flares', 'second-wind', 'long-barrels', 'forge-pact', 'swift-rigging', 'keel-fins', 'salvage-crews', 'gilded-magnet'];
  let best = 0;
  let bestRank = Infinity;
  world.draftOffer.forEach((offer, i) => {
    const rank = preference.indexOf(offer.id);
    if (rank !== -1 && rank < bestRank) {
      bestRank = rank;
      best = i;
    }
  });
  return best;
}
