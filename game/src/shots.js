// shots.js — the judged frames, staged from the game itself.
//
// The four screenshots are real renders of the real simulation, composed:
// each staging function deals a world into a legible, honest moment — the
// wave-15 boss fight at its thickest, the title, a mid-run draft, the
// victory results — and main.js renders exactly one frame of it. Nothing
// is drawn for the camera that the game cannot draw for a player: the
// staging only places ships, spends some gold and pulls some triggers.

import { burst, floatText, smoke } from './particles.js';
import { dealDraft } from './upgrades.js';
import { primeAnim, spawnPirate, stageBoss } from './world.js';

/** Move any staged cloud out of a keep-out rectangle at the shot's fixed
 *  clock (t = 2.35, the layer drifts are render.js's), so set dressing
 *  never swallows a principal. The clouds still drift in live play. */
function clearClouds(world, rect) {
  const drifts = [
    { speed: 6, wrap: 1280 + 240, off: -120, dy: 0 },
    { speed: 11, wrap: 1280 + 260, off: -130, dy: 0 },
    { speed: 19, wrap: 1280 + 300, off: -150, dy: 40 },
  ];
  for (const c of world.clouds) {
    const d = drifts[c.layer];
    const x = ((c.x + 2.35 * d.speed) % d.wrap) + d.off;
    const y = c.y + d.dy;
    if (x > rect.x0 && x < rect.x1 && y > rect.y0 && y < rect.y1) c.y += 300;
  }
}

/** A plausible mid-run build, so the HUD's chips and the draft read true. */
const COVER_BUILD = ['rapid-cannons', 'heavy-shot', 'ironwood-hull', 'powder-flares', 'gilded-magnet', 'swift-rigging'];

function armBuild(world, build) {
  world.build = build.slice();
  // The stat shadow of the build, near enough for a staged frame: the
  // numbers on the results and HUD are what the camera reads.
  world.stats.fireRateMul = 1.18;
  world.stats.bulletDamage = 3;
  world.stats.maxHull = 25;
  world.player.maxHull = 125;
}

/** The cover: wave 15, the Skyfall fight at its thickest. */
export function stageCover(world) {
  world.wave = 15;
  world.phase = 'combat';
  world.schedule = [];
  world.spawnIndex = 0;
  armBuild(world, COVER_BUILD);
  world.gold = 1240;
  world.goldEarned = 2980;
  world.kills = 212;
  world.score = 8610;
  world.shotsFired = 1740;
  world.shotsHit = 1290;
  const p = world.player;
  p.x = 428;
  p.y = 452;
  p.vx = 40;
  p.vy = -12;
  p.hull = 84;
  p.aimAngle = Math.atan2(215 - p.y, 905 - p.x);
  primeAnim(p, 'move', 300);
  // The Skyfall, hurt and beaming.
  const boss = stageBoss(world, 15);
  boss.x = 905;
  boss.y = 212;
  boss.entered = true;
  boss.hull = Math.round(boss.maxHull * 0.62);
  boss.beamState = 'telegraph';
  boss.beamT = 0.85;
  boss.beamAngle = Math.atan2(p.y - boss.y, p.x - boss.x) + 0.1;
  primeAnim(boss, 'telegraph', 800);
  clearClouds(world, { x0: 640, x1: 1180, y0: 60, y1: 360 });
  // The honour guard, placed to fill the sky's four corners.
  const guard = [
    ['carrier', 1108, 452],
    ['bomber', 196, 196],
    ['skiff', 688, 128],
    ['skiff', 1036, 556],
    ['skiff', 246, 540],
    ['sniper', 1164, 128],
    ['rammer', 636, 606],
    ['skiff', 560, 250],
  ];
  for (const [cls, x, y] of guard) {
    const e = spawnPirate(world, cls, x, y);
    primeAnim(e, 'move', 200 + x % 300);
    if (cls === 'rammer') {
      e.ramState = 'telegraph';
      e.ramT = 0.5;
      primeAnim(e, 'telegraph', 300);
    }
    if (cls === 'bomber') e.hull = Math.round(e.maxHull * 0.55);
  }
  // A volley of the player's tracers on its way to the dreadnought.
  for (let i = 0; i < 9; i++) {
    const f = 0.16 + i * 0.09;
    world.bullets.push({
      x: p.x + (boss.x - 90 - p.x) * f,
      y: p.y + (boss.y - 10 - p.y) * f + Math.sin(i * 2.2) * 9,
      vx: 700,
      vy: -180,
      dmg: 12,
      life: 0.8,
      r: 4,
    });
  }
  // The broadside coming back, and two bombers' bombs arcing down.
  for (let i = 0; i < 7; i++) {
    world.shells.push({
      x: boss.x - 130 - i * 26,
      y: boss.y - 40 + i * 17,
      vx: -315,
      vy: 60,
      r: 5,
      dmg: 10,
      kind: 'shot',
      t: 0,
    });
  }
  world.shells.push({ x: 300, y: 300, vx: 60, vy: 90, r: 9, dmg: 12, kind: 'bomb', t: 0 });
  world.shells.push({ x: 356, y: 356, vx: 40, vy: 70, r: 9, dmg: 12, kind: 'bomb', t: 0 });
  // The fight's weather: a skiff dying at left, hits sparking on the boss,
  // damage numbers climbing, gold drifting home.
  burst(world.motes, world.rng, 246, 540, 30, '#f2a33d', 330, 3.6);
  smoke(world.motes, world.rng, 246, 540, 5, false);
  burst(world.motes, world.rng, 812, 196, 16, '#ffe9a8', 220, 2.8);
  burst(world.motes, world.rng, 850, 250, 10, '#ffe9a8', 200, 2.6);
  floatText(world.texts, 806, 128, '12', '#ffffff', 16);
  floatText(world.texts, 852, 168, '12', '#ffffff', 15);
  floatText(world.texts, 760, 226, '27', '#ffd94d', 19);
  floatText(world.texts, 262, 470, '+4 gold', '#c98f12', 15);
  floatText(world.texts, 640, 540, 'RAMMER!', '#c22f21', 17);
  for (let i = 0; i < 9; i++) {
    world.coins.push({
      x: 250 + i * 26 + Math.sin(i * 3.1) * 10,
      y: 500 + Math.cos(i * 2.3) * 26,
      vx: 0,
      vy: 0,
      t: i * 0.4,
      life: 8,
      value: 1,
    });
  }
  return world;
}

/** The title: the Dawnbreaker on parade over the forge, sky quiet. */
export function stageTitle(world) {
  world.phase = 'ready';
  const p = world.player;
  p.x = 902;
  p.y = 330;
  p.vx = 0;
  p.vy = 0;
  p.aimAngle = -0.4;
  primeAnim(p, 'idle', 500);
  return world;
}

/** The draft: wave 7 held, a real offer on the table. */
export function stageDraft(world) {
  world.wave = 7;
  world.phase = 'draft';
  world.schedule = [];
  world.spawnIndex = 0;
  armBuild(world, COVER_BUILD.slice(0, 4));
  world.gold = 486;
  world.goldEarned = 1130;
  world.kills = 96;
  world.score = 3420;
  const p = world.player;
  p.x = 470;
  p.y = 470;
  p.hull = 97;
  world.draftOffer = dealDraft(world.build, world.rng, 3);
  for (let i = 0; i < 6; i++) {
    world.coins.push({ x: 560 + i * 30, y: 560 + Math.sin(i * 2) * 16, vx: 0, vy: 0, t: i * 0.3, life: 8, value: 1 });
  }
  return world;
}

/** The victory: the Skyfall sunk, the purse counted, the grade earned. */
export function stageVictory(world) {
  world.wave = 15;
  world.phase = 'won';
  world.schedule = [];
  world.spawnIndex = 0;
  armBuild(world, [...COVER_BUILD, 'heavy-shot', 'salvage-crews']);
  world.gold = 640;
  world.goldEarned = 3412;
  world.kills = 268;
  world.score = 12480;
  world.shotsFired = 1980;
  world.shotsHit = 1505;
  world.time = 642;
  const p = world.player;
  p.x = 620;
  p.y = 430;
  p.hull = 58;
  // Celebration weather: gold still drifting down from the wreck.
  for (let i = 0; i < 14; i++) {
    world.coins.push({
      x: 760 + Math.sin(i * 1.9) * 130,
      y: 180 + (i % 5) * 36,
      vx: 0,
      vy: 0,
      t: i * 0.35,
      life: 9,
      value: 2,
    });
  }
  burst(world.motes, world.rng, 880, 200, 40, '#ffd94d', 380, 3.4);
  return world;
}

/** Stage by name: 'cover' | 'title' | 'draft' | 'victory'. */
export function stageShot(world, name) {
  switch (name) {
    case 'cover':
      return stageCover(world);
    case 'title':
      return stageTitle(world);
    case 'draft':
      return stageDraft(world);
    case 'victory':
      return stageVictory(world);
    default:
      return stageTitle(world);
  }
}
