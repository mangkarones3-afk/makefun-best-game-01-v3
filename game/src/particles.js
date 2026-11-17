// particles.js — the sky's debris: sparks, smoke, bursts and floating numbers.
//
// Game feel lives here. Every hit lands with sparks, every kill with a burst
// and a drifting smoke puff, every coin with a glint, and damage floats up
// in numbers a player can read mid-fight. The system is two flat pools the
// world owns — motes (the physical bits) and texts (the numbers) — updated
// in fixed steps with the rest of the world, so a replayed run sheds the
// same sparks. Nothing here touches the canvas: render.js draws the pools,
// which keeps the headless simulator free of a DOM.

import { range } from './rng.js';

/** Cap the pools: past this, new motes replace the oldest instead of growing. */
export const MAX_MOTES = 900;
export const MAX_TEXTS = 90;

/** One mote: a bit of spark, smoke, shell or cloud with a short life. */
export function makeMote(x, y, vx, vy, life, size, colour, kind) {
  return { x, y, vx, vy, life, maxLife: life, size, colour, kind, spin: 0 };
}

/** A burst of sparks flying out of a point (hits, deaths, muzzle kick). */
export function burst(pool, rng, x, y, count, colour, speed = 260, size = 3.2) {
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const v = speed * (0.25 + rng() * 0.95);
    pushMote(pool, makeMote(x, y, Math.cos(a) * v, Math.sin(a) * v, range(rng, 0.25, 0.7), size * range(rng, 0.6, 1.5), colour, 'spark'));
  }
}

/** A rising smoke puff that swells and fades (burning wrecks, forge chimney). */
export function smoke(pool, rng, x, y, count, big = false) {
  for (let i = 0; i < count; i++) {
    const m = makeMote(
      x + range(rng, -10, 10),
      y + range(rng, -8, 8),
      range(rng, -16, 16),
      range(rng, -66, -30),
      range(rng, 0.8, 1.7),
      (big ? 17 : 10) * range(rng, 0.7, 1.4),
      'rgba(90, 96, 110, 0.35)',
      'smoke',
    );
    pushMote(pool, m);
  }
}

/** A ring of golden glints (a banked coin, a level of the draft). */
export function glint(pool, rng, x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng() * 0.4;
    pushMote(pool, makeMote(x, y, Math.cos(a) * 90, Math.sin(a) * 90, 0.42, 2.6, '#ffd94d', 'glint'));
  }
}

/** A floating combat number: damage, gold, a warning. */
export function floatText(pool, x, y, text, colour = '#ffffff', size = 17) {
  if (pool.length >= MAX_TEXTS) pool.shift();
  pool.push({ x, y, text: String(text), colour, size, life: 0.95, maxLife: 0.95, vy: -56 });
}

function pushMote(pool, mote) {
  if (pool.length >= MAX_MOTES) pool.shift();
  pool.push(mote);
}

/** Advance both pools one fixed step: drag, gravity per kind, life. */
export function stepParticles(world, dt) {
  const motes = world.motes;
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.life -= dt;
    if (m.life <= 0) {
      motes.splice(i, 1);
      continue;
    }
    if (m.kind === 'spark') {
      m.vx *= 1 - 2.4 * dt;
      m.vy = m.vy * (1 - 2.4 * dt) + 300 * dt; // sparks fall a little
    } else if (m.kind === 'smoke') {
      m.size += 13 * dt; // smoke swells as it rises
      m.vx *= 1 - 0.7 * dt;
    } else if (m.kind === 'glint') {
      m.vx *= 1 - 3.2 * dt;
      m.vy *= 1 - 3.2 * dt;
    } else if (m.kind === 'shell') {
      m.vy += 620 * dt; // spent casings tumble down
      m.spin += 9 * dt;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
  }
  const texts = world.texts;
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt;
    if (t.life <= 0) {
      texts.splice(i, 1);
      continue;
    }
    t.y += t.vy * dt;
    t.vy *= 1 - 1.6 * dt;
  }
}

/** How alive a mote looks, 0..1 across its life (render fades by this). */
export function moteAlpha(m) {
  const t = m.life / m.maxLife;
  return m.kind === 'smoke' ? Math.min(1, t * 1.6) : t;
}
