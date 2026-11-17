// contact.js — the animation contact sheets: QA evidence, not a screen.
//
// The sprite-animation QA gate asks for every actor × state rendered at
// fixed timestamps (0/25/50/75/100% of the state's duration) on one sheet,
// eyeballed against the design sheet. CLOUDBRAWL's actors are procedural,
// so the sheets are drawn by the game's own painters (render.js) with the
// machines forced into each state at each timestamp — the same poses the
// game itself strikes. Open game/index.html?shot=contact1|contact2|contact3
// to see them; sim/animqa.mjs asserts the files exist after capture.
// These pages are staging only: they are not among the judged screenshots.

import { createMachine, frameAt, stateDuration } from './anim.js';
import { DREADNOUGHTS, PIRATES } from './catalog.js';
import { drawBoss, drawPirate, drawPlayer } from './render.js';

// rowH is each actor's honest drawing span at its scale, plus air: the
// Dawnbreaker spans ~127 units tall, the dreadnought ~273 with its banner.
const ROWS = {
  contact1: [
    { actor: 'player', label: 'DAWN BREAKER', states: ['idle', 'move', 'attack', 'hurt', 'death'], scale: 0.42, rowH: 58 },
    { actor: 'pirate', cls: 'skiff', label: 'SKIFF', states: ['move', 'attack', 'hurt', 'death'], scale: 0.7, rowH: 56 },
    { actor: 'rammer', cls: 'rammer', label: 'RAMMER', states: ['move', 'telegraph', 'attack', 'hurt'], scale: 0.8, rowH: 56 },
  ],
  contact2: [
    { actor: 'dreadnought', label: 'DREADNOUGHT (COALBARON)', states: ['move', 'telegraph', 'attack', 'hurt', 'death'], scale: 0.26, rowH: 78 },
    { actor: 'pirate', cls: 'bomber', label: 'BOMBER', states: ['move', 'attack', 'hurt', 'death'], scale: 0.55, rowH: 72 },
  ],
  contact3: [
    { actor: 'pirate', cls: 'sniper', label: 'SNIPER KITE', states: ['move', 'attack', 'hurt', 'death'], scale: 0.55, rowH: 64 },
    { actor: 'pirate', cls: 'carrier', label: 'CARRIER', states: ['move', 'attack', 'hurt', 'death'], scale: 0.5, rowH: 68 },
  ],
};

const FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

/** Force a machine into a state at a state-local time, pose included. */
function forcePose(machine, state, timeMs) {
  const { frame, pose } = frameAt(machine, state, timeMs);
  machine.state = state;
  machine.frame = frame;
  machine.time = timeMs;
  machine.timeTotal = timeMs;
  for (const k of Object.keys(pose)) machine.pose[k] = pose[k];
  return machine;
}

function fakeActor(row, state, timeMs, cx, cy) {
  if (row.actor === 'player') {
    const anim = forcePose(createMachine('player'), state, timeMs);
    return {
      draw(ctx) {
        const world = {
          player: { x: cx, y: cy, vx: 30, vy: 0, hull: 80, maxHull: 100, fireCd: 0, hurtCd: state === 'hurt' ? 0.1 : 0, aimAngle: -0.2, anim },
        };
        drawPlayer(ctx, world, 0);
      },
    };
  }
  if (row.actor === 'dreadnought') {
    const brow = DREADNOUGHTS[1];
    const anim = forcePose(createMachine('dreadnought', { telegraphMs: 1500, fireMs: 900 }), state, timeMs);
    const boss = {
      isBoss: true, cls: 'dreadnought', row: brow, x: cx, y: cy, vx: 0, vy: 0,
      hull: 1800, maxHull: brow.hull, radius: brow.radius, t: 0, beamState: 'idle', anim,
    };
    return { draw(ctx) { drawBoss(ctx, boss, 0); } };
  }
  const anim = forcePose(createMachine(row.actor), state, timeMs);
  const e = {
    cls: row.cls, x: cx, y: cy, vx: -20, vy: 0, t: 1.3,
    hull: Math.round(PIRATES[row.cls].hull * 0.6), maxHull: PIRATES[row.cls].hull,
    radius: PIRATES[row.cls].radius,
    ramState: state === 'telegraph' ? 'telegraph' : state === 'attack' && row.cls === 'rammer' ? 'charge' : 'stalk',
    anim,
  };
  return { draw(ctx) { drawPirate(ctx, e, 0); } };
}

/** Draw one contact sheet page ('contact1' | 'contact2' | 'contact3'). */
export function drawContactSheet(ctx, page) {
  const rows = ROWS[page] ?? ROWS.contact1;
  const pageNo = page === 'contact2' ? '2' : page === 'contact3' ? '3' : '1';
  ctx.fillStyle = '#3a76b8';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.fillStyle = '#fdf6e0';
  ctx.font = '700 19px Verdana, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`CLOUDBRAWL — ANIMATION CONTACT SHEET ${pageNo} · columns: 0% 25% 50% 75% 100% of state duration`, 18, 36);
  let y = 52;
  for (const row of rows) {
    for (const state of row.states) {
      const probe = createMachine(row.actor, row.actor === 'dreadnought' ? { telegraphMs: 1500, fireMs: 900 } : {});
      const total = stateDuration(probe, state);
      const cy = y + row.rowH / 2;
      ctx.fillStyle = 'rgba(253, 246, 224, 0.92)';
      ctx.fillRect(10, y, 1260, row.rowH - 4);
      ctx.fillStyle = '#1d2f4d';
      ctx.font = '700 12.5px Verdana, sans-serif';
      ctx.fillText(row.label, 18, cy - 4);
      ctx.font = '600 12.5px Verdana, sans-serif';
      ctx.fillText(`${state} · ${total} ms`, 18, cy + 14);
      FRACTIONS.forEach((frac, ci) => {
        const cx = 300 + ci * 195;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(row.scale, row.scale);
        ctx.translate(-cx, -cy);
        fakeActor(row, state, Math.round(total * frac), cx, cy).draw(ctx);
        ctx.restore();
        ctx.fillStyle = 'rgba(29, 47, 77, 0.55)';
        ctx.font = '600 11px Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(total * frac)} ms`, cx, y + row.rowH - 8);
        ctx.textAlign = 'left';
      });
      y += row.rowH;
    }
  }
}
