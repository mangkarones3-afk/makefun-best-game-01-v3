// render.js — CLOUDBRAWL's art: every pixel is drawn here, in code.
//
// No image files exist in this game. The sky, the clouds, the Skyforge, the
// Dawnbreaker and the whole pirate fleet are canvas paths painted from the
// design sheet in DESIGN.md: warm round shapes for the friend, patched
// angular ones for the pirates, one navy ink for outlines. The renderer is
// a pure function of the world state plus the frame clock, so a staged
// screenshot (shots.js) is the game itself, composed — never a mock-up.
//
// The light discipline matters: the sky gradient averages daylight, hulls
// are mid-tone, and the only dark is the 2–3 px navy outline. A frame of
// CLOUDBRAWL cannot go black, however the fight is going.

import { PIRATES } from './catalog.js';
import { FORGE, INK, OBJECTIVE, SKY, VIEW_H, VIEW_W } from './config.js';
import { moteAlpha } from './particles.js';
import { buildSummary } from './upgrades.js';
import { waveManifest } from './waves.js';
import { forgeRingRadius } from './world.js';

// ---------------------------------------------------------------- helpers

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** A cloud: a row of overlapping puffs with one shade step underneath. */
function drawCloud(ctx, x, y, s, shade) {
  ctx.fillStyle = shade;
  const puffs = [[0, 6, 34], [-30, 12, 24], [30, 12, 26], [-56, 16, 17], [56, 16, 18], [0, -8, 26]];
  for (const [px, py, pr] of puffs) {
    ctx.beginPath();
    ctx.ellipse(x + px * s, y + (py + 5) * s, pr * s, pr * 0.62 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#dfeaf6';
  for (const [px, py, pr] of puffs) {
    ctx.beginPath();
    ctx.ellipse(x + px * s, y + py * s, pr * s, pr * 0.62 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The sun, top-right, with slow rotating rays. */
function drawSun(ctx, t) {
  const x = 1130;
  const y = 105;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.11) * 0.06);
  ctx.fillStyle = 'rgba(255, 217, 77, 0.5)';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(52, -9);
    ctx.lineTo(96, 0);
    ctx.lineTo(52, 9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(x, y, 8, x, y, 62);
  g.addColorStop(0, '#fff6d8');
  g.addColorStop(0.55, '#ffeeb0');
  g.addColorStop(1, 'rgba(255, 238, 176, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffeeb0';
  ctx.beginPath();
  ctx.arc(x, y, 36, 0, Math.PI * 2);
  ctx.fill();
}

/** A far floating islet: rock, grass cap, one wind-bent tree. */
function drawIslet(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#8a6f55';
  ctx.beginPath();
  ctx.moveTo(-58, 0);
  ctx.lineTo(58, 0);
  ctx.lineTo(30, 26);
  ctx.lineTo(0, 52);
  ctx.lineTo(-34, 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6e5741';
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.lineTo(30, 26);
  ctx.lineTo(58, 0);
  ctx.lineTo(20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#69a84f';
  ellipse(ctx, 0, -2, 60, 10);
  ctx.fill();
  ctx.strokeStyle = '#5b4632';
  ctx.lineWidth = 5;
  line(ctx, 18, -6, 24, -34);
  ctx.strokeStyle = '#4e8a3f';
  ctx.fillStyle = '#5da24a';
  ellipse(ctx, 30, -42, 20, 13);
  ctx.fill();
  ellipse(ctx, 14, -34, 14, 10);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------- the forge

/** The Skyforge: the landmark. A rock island with an anvil tower, a chimney,
 *  a glowing heart, banners — and the repair ring drawn on the sky around it. */
export function drawForge(ctx, world, t) {
  const { x, y } = FORGE;
  // The repair ring, pulsing gently so a hurt player can find home.
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  ctx.strokeStyle = `rgba(242, 179, 61, ${0.25 + pulse * 0.2})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.arc(FORGE.heartX, FORGE.heartY, forgeRingRadius(world), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Island rock.
  ctx.fillStyle = '#8a6f55';
  ctx.beginPath();
  ctx.moveTo(x - 190, y);
  ctx.lineTo(x + 190, y);
  ctx.lineTo(x + 120, y + 52);
  ctx.lineTo(x + 30, y + 108);
  ctx.lineTo(x - 60, y + 96);
  ctx.lineTo(x - 150, y + 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6e5741';
  ctx.beginPath();
  ctx.moveTo(x + 30, y + 108);
  ctx.lineTo(x + 120, y + 52);
  ctx.lineTo(x + 190, y);
  ctx.lineTo(x + 60, y);
  ctx.closePath();
  ctx.fill();
  // Rock shading strokes.
  ctx.strokeStyle = 'rgba(60, 45, 30, 0.35)';
  ctx.lineWidth = 3;
  line(ctx, x - 120, y + 18, x - 70, y + 44);
  line(ctx, x + 40, y + 22, x + 90, y + 40);
  line(ctx, x - 30, y + 40, x + 6, y + 66);
  // Grass cap.
  ctx.fillStyle = '#69a84f';
  ellipse(ctx, x, y - 2, 192, 15);
  ctx.fill();
  ctx.fillStyle = '#7cb45e';
  ellipse(ctx, x - 60, y - 6, 90, 10);
  ctx.fill();
  // The anvil tower: stone stack, roof, chimney.
  ctx.fillStyle = '#9aa3ad';
  rr(ctx, x - 66, y - 108, 96, 106, 6);
  ctx.fill();
  ctx.strokeStyle = INK.navy;
  ctx.lineWidth = 2.5;
  rr(ctx, x - 66, y - 108, 96, 106, 6);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(29, 47, 77, 0.3)';
  ctx.lineWidth = 2;
  line(ctx, x - 66, y - 72, x + 30, y - 72);
  line(ctx, x - 66, y - 38, x + 30, y - 38);
  line(ctx, x - 18, y - 108, x - 18, y - 2);
  ctx.fillStyle = '#7a4a2b';
  ctx.beginPath();
  ctx.moveTo(x - 82, y - 104);
  ctx.lineTo(x - 18, y - 142);
  ctx.lineTo(x + 46, y - 104);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK.navy;
  ctx.stroke();
  ctx.fillStyle = '#6e5741';
  rr(ctx, x + 38, y - 128, 22, 52, 4);
  ctx.fill();
  ctx.strokeRect(x + 38, y - 128, 22, 52);
  // The forge heart: a glowing furnace door in the tower.
  const glow = 0.75 + 0.25 * Math.sin(t * 3.1);
  const g = ctx.createRadialGradient(x - 18, y - 48, 4, x - 18, y - 48, 44);
  g.addColorStop(0, `rgba(255, 210, 62, ${0.85 * glow})`);
  g.addColorStop(1, 'rgba(255, 157, 46, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x - 18, y - 48, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9d2e';
  rr(ctx, x - 34, y - 66, 32, 38, 14);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  rr(ctx, x - 28, y - 60, 20, 26, 9);
  ctx.fill();
  // An anvil silhouette on the grass.
  ctx.fillStyle = '#3c4654';
  ctx.beginPath();
  ctx.moveTo(x + 66, y - 12);
  ctx.lineTo(x + 116, y - 12);
  ctx.lineTo(x + 106, y - 4);
  ctx.lineTo(x + 96, y - 4);
  ctx.lineTo(x + 96, y + 2);
  ctx.lineTo(x + 84, y + 2);
  ctx.lineTo(x + 84, y - 4);
  ctx.lineTo(x + 72, y - 4);
  ctx.closePath();
  ctx.fill();
  // Banners: the forge's gold, snapping in the wind.
  for (const bx of [x - 150, x + 128]) {
    ctx.strokeStyle = '#5b4632';
    ctx.lineWidth = 4;
    line(ctx, bx, y - 4, bx, y - 74);
    ctx.fillStyle = '#f2b33d';
    ctx.beginPath();
    const wave = Math.sin(t * 5 + bx) * 5;
    ctx.moveTo(bx, y - 74);
    ctx.quadraticCurveTo(bx + 20, y - 70 + wave, bx + 38, y - 64 + wave);
    ctx.quadraticCurveTo(bx + 20, y - 56 + wave, bx, y - 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c22f21';
    ctx.beginPath();
    ctx.arc(bx + 15, y - 63 + wave * 0.6, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Name plate, cut into the island's rock face where it stays in frame.
  ctx.font = '700 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(253, 246, 224, 0.92)';
  ctx.fillText('THE SKYFORGE', x, y + 66);
}

// ------------------------------------------------------------ the ships

/** Rigging lines from a balloon to its gondola. */
function rigging(ctx, x, y, halfW, drop) {
  ctx.strokeStyle = 'rgba(29, 47, 77, 0.55)';
  ctx.lineWidth = 1.6;
  for (const fx of [-0.72, -0.3, 0.3, 0.72]) {
    line(ctx, x + halfW * fx, y + drop * 0.55, x + halfW * fx * 0.55, y + drop);
  }
}

/** A balloon with stripes and a patch or two — the fleet's shared cloth. */
function balloon(ctx, x, y, len, hgt, colour, shade, stripes, t, seedPhase) {
  ctx.fillStyle = colour;
  ellipse(ctx, x, y, len / 2, hgt / 2);
  ctx.fill();
  // Belly shade.
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(x, y + hgt * 0.16, len / 2, hgt / 2, 0, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.fill();
  // Stripes.
  ctx.save();
  ellipse(ctx, x, y, len / 2, hgt / 2);
  ctx.clip();
  ctx.fillStyle = stripes;
  for (const fx of [-0.45, 0, 0.45]) {
    ctx.fillRect(x + fx * len - len * 0.07, y - hgt / 2, len * 0.14, hgt);
  }
  // Crown highlight.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x - len * 0.14, y - hgt * 0.24, len * 0.3, hgt * 0.16, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK.navy;
  ctx.lineWidth = 2.4;
  ellipse(ctx, x, y, len / 2, hgt / 2);
  ctx.stroke();
}

/** The black pirate flag with its white skull diamond. */
function pirateFlag(ctx, x, y, s, t, phase) {
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 2;
  line(ctx, x, y, x, y - 22 * s);
  ctx.fillStyle = '#20242c';
  const w = Math.sin(t * 6 + phase) * 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(x, y - 22 * s);
  ctx.quadraticCurveTo(x + 11 * s, y - 24 * s + w, x + 21 * s, y - 20 * s + w);
  ctx.quadraticCurveTo(x + 11 * s, y - 16 * s + w, x, y - 12 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4f1e6';
  ctx.save();
  ctx.translate(x + 10 * s, y - 17.5 * s + w * 0.7);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-2.6 * s, -2.6 * s, 5.2 * s, 5.2 * s);
  ctx.restore();
}

/** The Dawnbreaker, the player's airship: cream and crimson, brass and gold. */
export function drawPlayer(ctx, world, t) {
  const p = world.player;
  const tilt = Math.max(-0.09, Math.min(0.09, p.vx * 0.00022));
  // The pose is the animation machine's (anim.js): bob, propeller speed,
  // cannon recoil, hurt flash and death sink all come from the sim clock.
  const pose = p.anim ? p.anim.pose : null;
  const bob = pose ? pose.bob : Math.sin(t * 1.8) * 3;
  ctx.save();
  ctx.translate(p.x, p.y + bob + (pose ? pose.sink : 0));
  ctx.rotate(tilt);
  // Balloon: 196 long — the anchor of every frame it is in.
  balloon(ctx, 0, -64, 196, 82, '#f7ead2', '#e3cfa5', 'rgba(216, 64, 46, 0.85)', t, 0);
  rigging(ctx, 0, -64, 88, 58);
  // Stern fins.
  ctx.fillStyle = '#d8402e';
  ctx.beginPath();
  ctx.moveTo(-86, -84);
  ctx.lineTo(-116, -104);
  ctx.lineTo(-108, -66);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-86, -44);
  ctx.lineTo(-114, -28);
  ctx.lineTo(-104, -62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK.navy;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Propeller at the stern, spinning on the machine's own clock.
  const propA = pose ? (p.anim.timeTotal / 1000) * pose.prop : t * 22;
  ctx.strokeStyle = '#5b4632';
  ctx.lineWidth = 4;
  line(ctx, -96, -6, -108, -6);
  ctx.fillStyle = '#8a6f55';
  for (const off of [0, Math.PI]) {
    ctx.beginPath();
    ctx.ellipse(-110, -6 + Math.sin(propA + off) * 13, 4.5, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Gondola: brass hull with plank lines and a cabin window.
  ctx.fillStyle = '#b07a3f';
  ctx.beginPath();
  ctx.moveTo(-58, -22);
  ctx.lineTo(62, -22);
  ctx.quadraticCurveTo(70, -22, 66, -6);
  ctx.lineTo(52, 14);
  ctx.quadraticCurveTo(48, 22, 36, 22);
  ctx.lineTo(-34, 22);
  ctx.quadraticCurveTo(-48, 22, -52, 10);
  ctx.lineTo(-60, -8);
  ctx.quadraticCurveTo(-62, -22, -58, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK.navy;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(29, 47, 77, 0.3)';
  ctx.lineWidth = 1.6;
  line(ctx, -54, -6, 62, -6);
  line(ctx, -48, 8, 54, 8);
  ctx.fillStyle = '#ffe9a8';
  rr(ctx, -14, -18, 22, 14, 4);
  ctx.fill();
  ctx.strokeStyle = INK.navy;
  ctx.lineWidth = 1.8;
  rr(ctx, -14, -18, 22, 14, 4);
  ctx.stroke();
  // The aim cannon on the gondola's nose, tracking the player's aim —
  // and kicking back by the attack pose's recoil when it fires.
  ctx.save();
  ctx.translate(46 - (pose ? pose.recoil : 0), 2);
  ctx.rotate(p.aimAngle - tilt);
  ctx.fillStyle = '#3c4654';
  rr(ctx, 0, -5, 34, 10, 4);
  ctx.fill();
  ctx.fillStyle = '#20242c';
  rr(ctx, 28, -3.4, 9, 6.8, 3);
  ctx.fill();
  ctx.restore();
  // Aft cannon, fixed astern.
  ctx.fillStyle = '#3c4654';
  rr(ctx, -70, -3, 20, 8, 3);
  ctx.fill();
  ctx.restore();
  // The hurt state's flash, washed over the balloon.
  if (pose && pose.flash > 0.05) {
    ctx.fillStyle = `rgba(255, 240, 230, ${pose.flash * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 64 + bob, 92, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hurt flash: a soft red ring when the hull was just struck.
  if (p.hurtCd > 0.04) {
    ctx.strokeStyle = `rgba(194, 47, 33, ${p.hurtCd * 2.4})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 30, 108, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------- the pirates

/** A pirate gondola: dark wood, plank lines, one gun. */
function pirateHull(ctx, w, h, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.quadraticCurveTo(w / 2 + 4, 0, w / 2 - 6, h / 2);
  ctx.lineTo(-w / 2 + 6, h / 2);
  ctx.quadraticCurveTo(-w / 2 - 4, 0, -w / 2, -h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK.navy;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(29, 47, 77, 0.35)';
  ctx.lineWidth = 1.4;
  line(ctx, -w / 2 + 4, 0, w / 2 - 4, 0);
}

/** A pirate's wound smoke darkens as its hull goes (render reads the ratio). */
function woundSmoke(ctx, e, t) {
  const ratio = e.hull / e.maxHull;
  if (ratio > 0.55) return;
  const n = ratio > 0.3 ? 1 : 2;
  ctx.fillStyle = 'rgba(70, 74, 84, 0.4)';
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.9 + e.t + i * 0.5) % 1;
    ctx.beginPath();
    ctx.arc(e.x + Math.sin(e.t * 3 + i * 2) * 8, e.y - e.radius - ph * 34, 5 + ph * 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw one pirate by class, each from the design sheet's silhouette. */
export function drawPirate(ctx, e, t) {
  const base = PIRATES[e.cls];
  // The pose is the animation machine's where the world gave the pirate
  // one; the title screen's parade dummies carry none and keep the
  // frame-clock bob they were staged with.
  const pose = e.anim ? e.anim.pose : null;
  const bob = pose ? pose.bob : Math.sin(t * 2 + e.t * 2) * 2.4;
  ctx.save();
  ctx.translate(e.x, e.y + bob + (pose ? pose.sink : 0));
  const face = e.vx < -8 ? -1 : e.vx > 8 ? 1 : e.x > 640 ? -1 : 1;
  ctx.scale(face, 1);
  if (e.cls === 'skiff') {
    balloon(ctx, 0, -34, 74, 40, base.balloon, base.balloonShade, 'rgba(32, 36, 44, 0.5)', t, e.t);
    rigging(ctx, 0, -34, 32, 26);
    pirateHull(ctx, 46, 17, base.hullColour);
    ctx.fillStyle = '#20242c';
    rr(ctx, 12, -4, 18, 6, 3);
    ctx.fill();
    pirateFlag(ctx, -16, -8, 0.8, t, e.t);
  } else if (e.cls === 'bomber') {
    balloon(ctx, 0, -52, 128, 74, base.balloon, base.balloonShade, 'rgba(32, 36, 44, 0.45)', t, e.t);
    rigging(ctx, 0, -52, 54, 40);
    pirateHull(ctx, 74, 24, base.hullColour);
    // The bomb bay: a rack of round bombs under the hull.
    ctx.fillStyle = '#20242c';
    for (const bx of [-20, 0, 20]) {
      ctx.beginPath();
      ctx.arc(bx, 16, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c22f21';
    ctx.beginPath();
    ctx.arc(0, 8, 3, 0, Math.PI * 2);
    ctx.fill();
    pirateFlag(ctx, -26, -12, 1, t, e.t);
  } else if (e.cls === 'rammer') {
    // No balloon: a rotor kite with an iron prow. Telegraph = it shakes
    // harder as the anim pose's glow builds; charge = motion streaks.
    const telegraph = e.ramState === 'telegraph';
    const glow = pose ? pose.glow : telegraph ? 0.8 : 0;
    const jx = telegraph ? Math.sin(t * 60) * (1 + glow * 2.2) : 0;
    ctx.translate(jx, 0);
    ctx.fillStyle = base.balloon;
    ctx.beginPath();
    ctx.moveTo(-34, -26);
    ctx.lineTo(30, -34);
    ctx.lineTo(38, -6);
    ctx.lineTo(-26, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK.navy;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Rotor mast and spinning blades.
    ctx.strokeStyle = '#3a2c1c';
    ctx.lineWidth = 3;
    line(ctx, -4, -30, -4, -44);
    ctx.strokeStyle = '#20242c';
    ctx.lineWidth = 3.4;
    const ra = pose ? (e.anim.timeTotal / 1000) * pose.prop + e.t : t * 30 + e.t;
    line(ctx, -4 - Math.cos(ra) * 24, -46 - Math.sin(ra) * 5, -4 + Math.cos(ra) * 24, -46 + Math.sin(ra) * 5);
    // The prow, with the telegraph's heat building on it.
    if (glow > 0.05) {
      ctx.fillStyle = `rgba(232, 64, 46, ${glow * 0.4})`;
      ctx.beginPath();
      ctx.arc(44, -3, 12 + glow * 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = telegraph ? '#e8402e' : '#8e2f28';
    ctx.beginPath();
    ctx.moveTo(34, -14);
    ctx.lineTo(58, -2);
    ctx.lineTo(34, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK.navy;
    ctx.lineWidth = 2;
    ctx.stroke();
    pirateHull(ctx, 52, 16, base.hullColour);
    if (e.ramState === 'charge') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 3;
      for (const sy of [-12, 0, 10]) line(ctx, -40, sy, -78 - (sy % 7), sy);
    }
  } else if (e.cls === 'sniper') {
    // A tall kite sail instead of a round balloon, and a very long barrel.
    ctx.fillStyle = base.balloon;
    ctx.beginPath();
    ctx.moveTo(0, -86);
    ctx.quadraticCurveTo(30, -40, 12, 2);
    ctx.lineTo(-12, 2);
    ctx.quadraticCurveTo(-26, -44, 0, -86);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK.navy;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(29, 47, 77, 0.4)';
    ctx.lineWidth = 1.4;
    line(ctx, 0, -80, 0, -2);
    rigging(ctx, 0, -20, 10, 16);
    pirateHull(ctx, 50, 17, base.hullColour);
    ctx.fillStyle = '#20242c';
    rr(ctx, 10, -3, 36, 6, 3);
    ctx.fill();
    pirateFlag(ctx, -18, -8, 0.8, t, e.t);
  } else if (e.cls === 'carrier') {
    balloon(ctx, -38, -56, 108, 56, base.balloon, base.balloonShade, 'rgba(32, 36, 44, 0.4)', t, e.t);
    balloon(ctx, 38, -56, 108, 56, base.balloon, base.balloonShade, 'rgba(32, 36, 44, 0.4)', t, e.t + 2);
    rigging(ctx, -20, -50, 62, 42);
    rigging(ctx, 20, -50, 62, 42);
    pirateHull(ctx, 108, 26, base.hullColour);
    // The hangar belly, with a skiff nose peeking out.
    ctx.fillStyle = '#2c332a';
    rr(ctx, -30, 8, 60, 16, 5);
    ctx.fill();
    ctx.fillStyle = '#7d8aa0';
    ctx.beginPath();
    ctx.moveTo(-8, 24);
    ctx.lineTo(14, 24);
    ctx.lineTo(4, 34);
    ctx.closePath();
    ctx.fill();
    pirateFlag(ctx, -40, -14, 1.1, t, e.t);
  }
  ctx.restore();
  // The hurt state's flash, washed over the whole craft.
  if (pose && pose.flash > 0.05) {
    ctx.fillStyle = `rgba(255, 240, 230, ${pose.flash * 0.4})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y - 20, e.radius + 16, 0, Math.PI * 2);
    ctx.fill();
  }
  // A thin hull sliver over any pirate that has been hurt.
  if (e.hull < e.maxHull) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(29, 47, 77, 0.55)';
    rr(ctx, e.x - w / 2, e.y - e.radius - 34, w, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#e8402e';
    rr(ctx, e.x - w / 2, e.y - e.radius - 34, w * Math.max(0, e.hull / e.maxHull), 5, 2.5);
    ctx.fill();
  }
  woundSmoke(ctx, e, t);
}

// -------------------------------------------------------- the dreadnought

/** The dreadnought: three balloons, an armoured hull, four turrets, a banner
 *  big enough to read. The cover's second anchor after the Dawnbreaker. */
export function drawBoss(ctx, boss, t) {
  const row = boss.row;
  const pose = boss.anim ? boss.anim.pose : null;
  const bob = pose ? pose.bob : Math.sin(t * 1.1) * 3;
  ctx.save();
  ctx.translate(boss.x, boss.y + bob + (pose ? pose.sink : 0));
  // Three war-red balloons in a row.
  for (const bx of [-118, 0, 118]) {
    balloon(ctx, bx, -118, 150, 84, '#8e2f28', '#6e231e', 'rgba(244, 241, 230, 0.28)', t, bx);
  }
  rigging(ctx, -60, -110, 130, 84);
  rigging(ctx, 60, -110, 130, 84);
  // Armoured hull: iron plates, rivets, a gold trim line.
  ctx.fillStyle = '#565d66';
  ctx.beginPath();
  ctx.moveTo(-196, -44);
  ctx.lineTo(196, -44);
  ctx.quadraticCurveTo(214, -44, 206, -8);
  ctx.lineTo(168, 40);
  ctx.quadraticCurveTo(158, 52, 138, 52);
  ctx.lineTo(-138, 52);
  ctx.quadraticCurveTo(-160, 52, -168, 38);
  ctx.lineTo(-204, -10);
  ctx.quadraticCurveTo(-212, -44, -196, -44);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK.navy;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(244, 241, 230, 0.35)';
  ctx.lineWidth = 2;
  for (const px of [-120, -40, 40, 120]) line(ctx, px, -44, px - 6, 50);
  ctx.fillStyle = '#f2b33d';
  ctx.fillRect(-196, -18, 392, 5);
  ctx.fillStyle = '#20242c';
  for (const px of [-160, -80, 0, 80, 160]) {
    ctx.beginPath();
    ctx.arc(px, 26, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Four turrets along the deck.
  for (const tx of [-140, -48, 48, 140]) {
    ctx.fillStyle = '#3c4654';
    ellipse(ctx, tx, -46, 24, 13);
    ctx.fill();
    ctx.strokeStyle = INK.navy;
    ctx.lineWidth = 2.2;
    ellipse(ctx, tx, -46, 24, 13);
    ctx.stroke();
    ctx.fillStyle = '#20242c';
    rr(ctx, tx - 30, -50, 22, 7, 3);
    ctx.fill();
  }
  // The bow (left, toward the player) and its beam muzzle — which heats
  // with the telegraph pose's glow, so the wind-up reads at a glance.
  ctx.fillStyle = '#3c4654';
  ctx.beginPath();
  ctx.arc(-196, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  const muzzleGlow = pose ? pose.glow : 0;
  if (row.beam && muzzleGlow > 0.05) {
    const gg = ctx.createRadialGradient(-196, 0, 2, -196, 0, 16 + muzzleGlow * 22);
    gg.addColorStop(0, `rgba(255, 120, 70, ${0.35 + muzzleGlow * 0.45})`);
    gg.addColorStop(1, 'rgba(255, 120, 70, 0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(-196, 0, 16 + muzzleGlow * 22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = row.beam ? '#e8402e' : '#20242c';
  ctx.beginPath();
  ctx.arc(-196, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  // The great banner amidships: skull diamond on black, gold fringe.
  ctx.fillStyle = '#20242c';
  const sway = Math.sin(t * 3.2) * 4;
  ctx.beginPath();
  ctx.moveTo(-34, 52);
  ctx.lineTo(34, 52);
  ctx.lineTo(30 + sway, 108);
  ctx.lineTo(-30 + sway, 108);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2b33d';
  ctx.fillRect(-34, 104 + sway * 0.4, 68, 5);
  ctx.save();
  ctx.translate(sway * 0.5, 80);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#f4f1e6';
  ctx.fillRect(-11, -11, 22, 22);
  ctx.restore();
  // Stern propeller, huge and slow.
  const pa = t * 7;
  ctx.fillStyle = '#8a6f55';
  for (const off of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath();
    ctx.ellipse(216 + Math.cos(pa + off) * 4, Math.sin(pa + off) * 22, 6, 20, pa + off, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  woundSmoke(ctx, { ...boss, y: boss.y - 60 }, t);
}

/** The beam, telegraph or firing, from the dreadnought's bow. */
export function drawBeam(ctx, boss, t) {
  if (!boss || !boss.row.beam || boss.beamState === 'idle' || boss.beamState === 'none') return;
  const bx = boss.x - boss.radius - 60;
  const by = boss.y;
  const a = boss.beamAngle;
  const ex = bx + Math.cos(a) * 1500;
  const ey = by + Math.sin(a) * 1500;
  if (boss.beamState === 'telegraph') {
    const frac = 1 - boss.beamT / boss.row.beam.telegraph;
    ctx.strokeStyle = `rgba(232, 64, 46, ${0.25 + frac * 0.45})`;
    ctx.lineWidth = 2 + frac * 9;
    ctx.setLineDash([16, 12]);
    line(ctx, bx, by, ex, ey);
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(232, 64, 46, ${0.5 + frac * 0.5})`;
    ctx.beginPath();
    ctx.arc(bx, by, 8 + frac * 9 + Math.sin(t * 30) * 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (boss.beamState === 'fire') {
    ctx.strokeStyle = 'rgba(255, 84, 40, 0.35)';
    ctx.lineWidth = 52;
    line(ctx, bx, by, ex, ey);
    ctx.strokeStyle = 'rgba(255, 160, 60, 0.85)';
    ctx.lineWidth = 27;
    line(ctx, bx, by, ex, ey);
    ctx.strokeStyle = '#fff6da';
    ctx.lineWidth = 11;
    line(ctx, bx, by, ex, ey);
  }
}

// ------------------------------------------------------ small flying things

function drawCoins(ctx, world, t) {
  for (const c of world.coins) {
    const blink = c.life < 1.6 ? (Math.sin(t * 18) > 0 ? 1 : 0.35) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.translate(c.x, c.y + Math.sin(c.t * 3.4) * 2.4);
    ctx.fillStyle = '#f2b33d';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(0, 0, 5.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c98f12';
    ctx.font = '700 8px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('G', 0, 3);
    ctx.restore();
  }
}

function drawProjectiles(ctx, world) {
  // The player's tracer rounds: bright cores with a short trail.
  for (const b of world.bullets) {
    ctx.strokeStyle = 'rgba(255, 214, 90, 0.55)';
    ctx.lineWidth = 4.4;
    line(ctx, b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.x, b.y);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pirate shells: dark iron with a hot rim; bombs bigger, with a lit fuse.
  for (const s of world.shells) {
    if (s.kind === 'bomb') {
      ctx.fillStyle = '#20242c';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8402e';
      ctx.beginPath();
      ctx.arc(s.x, s.y - 9, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#3c4654';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb03a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles(ctx, world) {
  for (const m of world.motes) {
    const a = moteAlpha(m);
    if (m.kind === 'smoke') {
      ctx.fillStyle = m.colour;
      ctx.globalAlpha = a * 0.8;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (m.kind === 'shell') {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(m.x, m.y);
      ctx.rotate(m.spin);
      ctx.fillStyle = m.colour;
      ctx.fillRect(-3.4, -1.6, 6.8, 3.2);
      ctx.restore();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = m.colour;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Floating numbers: damage in white, gold in gold, warnings in red.
  ctx.textAlign = 'center';
  for (const t of world.texts) {
    const a = Math.min(1, t.life / (t.maxLife * 0.6));
    ctx.globalAlpha = a;
    ctx.font = `700 ${t.size}px Verdana, sans-serif`;
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = 'rgba(29, 47, 77, 0.75)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.colour;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------- HUD

/** A parchment panel with a navy edge — the HUD's one furniture style. */
function panel(ctx, x, y, w, h, alpha = 0.94) {
  ctx.fillStyle = `rgba(253, 246, 224, ${alpha})`;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = INK.parchmentEdge;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 10);
  ctx.stroke();
}

function hullBar(ctx, x, y, w, frac, t) {
  ctx.fillStyle = 'rgba(29, 47, 77, 0.65)';
  rr(ctx, x, y, w, 15, 7);
  ctx.fill();
  const danger = frac < 0.3;
  ctx.fillStyle = danger ? (Math.sin(t * 9) > 0 ? '#e8402e' : '#c22f21') : frac < 0.55 ? '#e8862b' : '#4da34d';
  if (frac > 0) {
    rr(ctx, x + 2, y + 2, (w - 4) * Math.max(0, frac), 11, 5.5);
    ctx.fill();
  }
}

/** Counts of what is left: alive now plus still to arrive, per class. */
export function threatCounts(world) {
  const counts = { skiff: 0, bomber: 0, rammer: 0, sniper: 0, carrier: 0 };
  for (const e of world.enemies) counts[e.cls] += 1;
  for (let i = world.spawnIndex; i < world.schedule.length; i++) counts[world.schedule[i].cls] += 1;
  return counts;
}

/** The full in-play HUD: top bar, objective line, threat panel, build chips. */
export function drawHud(ctx, world, t) {
  const p = world.player;
  panel(ctx, 14, 12, 772, 54);
  ctx.fillStyle = INK.navy;
  ctx.textAlign = 'left';
  ctx.font = '700 21px Verdana, sans-serif';
  ctx.fillText(`WAVE ${Math.max(1, world.wave)}/${15}`, 30, 48);
  ctx.font = '700 19px Verdana, sans-serif';
  ctx.fillStyle = INK.gold;
  ctx.fillText(`◆ ${Math.floor(world.gold)} gold`, 208, 48);
  ctx.fillStyle = INK.navy;
  ctx.fillText(`☠ ${world.kills}`, 372, 48);
  ctx.fillText(`★ ${world.score}`, 472, 48);
  // Hull, with its numbers said out loud.
  ctx.font = '700 15px Verdana, sans-serif';
  ctx.fillText('HULL', 596, 33);
  hullBar(ctx, 596, 39, 172, p.hull / p.maxHull, t);
  ctx.fillStyle = INK.navy;
  ctx.font = '700 12.5px Verdana, sans-serif';
  ctx.fillText(`${Math.ceil(p.hull)} / ${p.maxHull}`, 690, 33);
  // The objective line, always on the frame during play.
  panel(ctx, 14, 72, 772, 30, 0.88);
  ctx.fillStyle = INK.navy;
  ctx.font = '700 15.5px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(OBJECTIVE, 400, 93);
  ctx.textAlign = 'left';
  // Threat panel, top right: what is left in this sky.
  panel(ctx, 1022, 12, 244, 138);
  ctx.fillStyle = INK.navy;
  ctx.font = '700 15px Verdana, sans-serif';
  ctx.fillText('STILL IN THIS SKY', 1038, 36);
  ctx.font = '600 14.5px Verdana, sans-serif';
  const counts = threatCounts(world);
  const rows = [
    ['Skiffs', counts.skiff],
    ['Bombers', counts.bomber],
    ['Rammers', counts.rammer],
    ['Sniper kites', counts.sniper],
    ['Carriers', counts.carrier],
  ];
  rows.forEach(([name, n], i) => {
    ctx.fillStyle = n > 0 ? INK.navy : 'rgba(29, 47, 77, 0.4)';
    ctx.fillText(`${name}`, 1038, 60 + i * 19);
    ctx.textAlign = 'right';
    ctx.fillText(`×${n}`, 1250, 60 + i * 19);
    ctx.textAlign = 'left';
  });
  // The boss's great hull bar, under the top bar, when it flies.
  if (world.boss) {
    const b = world.boss;
    panel(ctx, 330, 112, 620, 40, 0.92);
    ctx.fillStyle = '#8e2f28';
    ctx.font = '700 15px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, 640, 130);
    ctx.fillStyle = 'rgba(29, 47, 77, 0.6)';
    rr(ctx, 348, 136, 584, 9, 4.5);
    ctx.fill();
    ctx.fillStyle = '#c22f21';
    if (b.hull > 0) {
      rr(ctx, 348, 136, 584 * Math.max(0, b.hull / b.maxHull), 9, 4.5);
      ctx.fill();
    }
    ctx.textAlign = 'left';
  }
  // Build chips, bottom-left: the run's upgrades so far, glyphs in a row.
  if (world.build.length) {
    const label = 'BUILD';
    ctx.font = '700 12px Verdana, sans-serif';
    const w = 66 + world.build.length * 30;
    panel(ctx, 14, VIEW_H - 52, Math.min(w, 560), 38, 0.88);
    ctx.fillStyle = INK.navy;
    ctx.fillText(label, 26, VIEW_H - 28);
    const glyphs = [...new Set(world.build)];
    glyphs.forEach((id, i) => {
      const x = 76 + i * 30;
      if (x > 560) return;
      ctx.fillStyle = '#f2b33d';
      rr(ctx, x, VIEW_H - 46, 26, 26, 6);
      ctx.fill();
      ctx.fillStyle = INK.navy;
      ctx.font = '700 15px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(glyphOf(id), x + 13, VIEW_H - 27);
      ctx.textAlign = 'left';
    });
  }
  // The wave manifest line, bottom-right, small and factual.
  ctx.font = '600 13px Verdana, sans-serif';
  ctx.fillStyle = 'rgba(29, 47, 77, 0.85)';
  ctx.textAlign = 'right';
  ctx.fillText(waveManifest(Math.max(1, world.wave)), 1266, VIEW_H - 18);
  ctx.textAlign = 'left';
}

const GLYPHS = {
  'rapid-cannons': '»',
  'heavy-shot': '●',
  'twin-muzzles': '⋮',
  'long-barrels': '—',
  'ironwood-hull': '▣',
  'forge-pact': '✚',
  'swift-rigging': '≫',
  'keel-fins': '△',
  'gilded-magnet': '◎',
  'salvage-crews': '⚓',
  'powder-flares': '✦',
  'second-wind': '♥',
};

function glyphOf(id) {
  return GLYPHS[id] ?? '?';
}

// ------------------------------------------------------------ the scene

/** The whole play scene: sky, landmark, ships, fire, weather, HUD. */
export function drawScene(ctx, world, t, { hud = true } = {}) {
  const shakeX = world.shake > 0 ? Math.sin(t * 71) * world.shake * 13 : 0;
  const shakeY = world.shake > 0 ? Math.cos(t * 83) * world.shake * 10 : 0;
  // Sky: a five-stop daylight gradient.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, SKY.top);
  g.addColorStop(0.3, SKY.upper);
  g.addColorStop(0.55, SKY.middle);
  g.addColorStop(0.8, SKY.lower);
  g.addColorStop(1, SKY.horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawSun(ctx, t);
  ctx.save();
  ctx.translate(shakeX, shakeY);
  // Far islets and the back cloud layer drift slowest.
  for (const isl of world.islets) drawIslet(ctx, isl.x, isl.y + Math.sin(t * 0.4 + isl.x) * 5, isl.s * 0.8);
  for (const c of world.clouds) {
    if (c.layer !== 0) continue;
    const x = (c.x + t * 6) % (VIEW_W + 240) - 120;
    drawCloud(ctx, x, c.y, c.s * 0.75, '#b9d6f2');
  }
  drawForge(ctx, world, t);
  for (const c of world.clouds) {
    if (c.layer !== 1) continue;
    const x = (c.x + t * 11) % (VIEW_W + 260) - 130;
    drawCloud(ctx, x, c.y, c.s * 0.95, '#d7e9fa');
  }
  drawCoins(ctx, world, t);
  drawProjectiles(ctx, world);
  if (world.boss) drawBeam(ctx, world.boss, t);
  for (const e of world.enemies) drawPirate(ctx, e, t);
  if (world.boss) drawBoss(ctx, world.boss, t);
  if (world.phase !== 'lost') drawPlayer(ctx, world, t);
  drawParticles(ctx, world);
  // Front cloud layer: fast, low, thin — it gives the sky its depth.
  for (const c of world.clouds) {
    if (c.layer !== 2) continue;
    const x = (c.x + t * 19) % (VIEW_W + 300) - 150;
    ctx.globalAlpha = 0.85;
    drawCloud(ctx, x, c.y + 40, c.s * 1.25, '#e8f3fd');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (hud) drawHud(ctx, world, t);
  // Low hull: the frame's edges warm — a warning that stays daylight.
  if (world.phase === 'combat' && world.player.hull / world.player.maxHull < 0.3) {
    const a = 0.1 + 0.07 * Math.sin(t * 6);
    const vg = ctx.createRadialGradient(640, 400, 380, 640, 400, 800);
    vg.addColorStop(0, 'rgba(194, 47, 33, 0)');
    vg.addColorStop(1, `rgba(194, 47, 33, ${a})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

// --------------------------------------------------------------- screens

/** The CLOUDBRAWL logotype: cloud-white letters, sky outline, soft shadow. */
function logotype(ctx, cx, y, scale, t) {
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(scale, scale);
  ctx.font = '900 92px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#1d5f9e';
  ctx.strokeText('CLOUDBRAWL', 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CLOUDBRAWL', 0, 0);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(242, 179, 61, 0.9)';
  ctx.strokeText('CLOUDBRAWL', 0, 3);
  ctx.restore();
  void t;
}

/** The title screen: the pitch, the counts, the controls, the bestiary. */
export function drawTitle(ctx, world, t) {
  drawScene(ctx, world, t, { hud: false });
  // A warm light veil so the type sits on the sky, never on a ship.
  ctx.fillStyle = 'rgba(255, 246, 220, 0.18)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  logotype(ctx, 640, 148, 1.06, t);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK.navy;
  ctx.font = '700 24px Georgia, serif';
  ctx.fillText('Hold the Skyforge against fifteen waves of sky pirates', 640, 196);
  ctx.font = '600 18px Verdana, sans-serif';
  ctx.fillText(OBJECTIVE, 640, 228);
  // The content counts, stated plainly — the game's whole contents in a line.
  panel(ctx, 290, 252, 700, 46);
  ctx.fillStyle = INK.navy;
  ctx.font = '700 19px Verdana, sans-serif';
  ctx.fillText('15 WAVES · 5 PIRATE CLASSES · 12 UPGRADES · 3 DREADNOUGHT BOSSES', 640, 282);
  // Controls, two columns on one panel.
  panel(ctx, 330, 318, 620, 108);
  ctx.font = '600 16.5px Verdana, sans-serif';
  ctx.textAlign = 'left';
  const controls = [
    ['FLY', 'WASD or arrow keys'],
    ['AIM', 'the mouse'],
    ['FIRE', 'hold click or Space'],
    ['PAUSE', 'P or Esc · M mutes'],
    ['TOUCH', 'left thumb flies, auto-fire'],
    ['MEND', 'rest in the forge’s gold ring'],
  ];
  controls.forEach(([k, v], i) => {
    const colX = i % 2 === 0 ? 356 : 646;
    const rowY = 348 + Math.floor(i / 2) * 30;
    ctx.fillStyle = INK.gold;
    ctx.font = '700 15px Verdana, sans-serif';
    ctx.fillText(k, colX, rowY);
    ctx.fillStyle = INK.navy;
    ctx.font = '600 15.5px Verdana, sans-serif';
    ctx.fillText(v, colX + 66, rowY);
  });
  ctx.textAlign = 'center';
  // The bestiary strip: the five classes, drawn at parade size, named.
  ctx.font = '700 16px Verdana, sans-serif';
  ctx.fillStyle = INK.navy;
  ctx.fillText('KNOW YOUR PIRATES', 640, 462);
  const strip = [
    { cls: 'skiff', label: 'SKIFF' },
    { cls: 'bomber', label: 'BOMBER' },
    { cls: 'rammer', label: 'RAMMER' },
    { cls: 'sniper', label: 'SNIPER KITE' },
    { cls: 'carrier', label: 'CARRIER' },
  ];
  strip.forEach((s, i) => {
    const x = 228 + i * 206;
    const demo = {
      cls: s.cls,
      x,
      y: 522,
      vx: -1,
      vy: 0,
      t: i * 1.7,
      hull: 1,
      maxHull: 1,
      radius: 20,
      ramState: 'stalk',
    };
    drawPirate(ctx, demo, t);
    ctx.fillStyle = INK.navy;
    ctx.font = '700 14.5px Verdana, sans-serif';
    ctx.fillText(s.label, x, 596);
  });
  // The call to sail, breathing.
  const pulse = 0.72 + 0.28 * Math.sin(t * 3.4);
  ctx.globalAlpha = pulse;
  panel(ctx, 470, 636, 340, 58);
  ctx.fillStyle = '#8e2f28';
  ctx.font = '700 23px Verdana, sans-serif';
  ctx.fillText('CLICK TO SET SAIL', 640, 673);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(29, 47, 77, 0.8)';
  ctx.font = '600 14px Verdana, sans-serif';
  ctx.fillText('A complete run is fifteen waves — about twelve minutes of sky.', 640, 742);
  ctx.textAlign = 'left';
}

/** The draft cards' geometry, shared by the painter and the mouse. */
export function draftCardRects(count) {
  const cardW = 330;
  const cardH = 300;
  const gap = 28;
  const totalW = cardW * count + gap * (count - 1);
  const x0 = (VIEW_W - totalW) / 2;
  const y0 = 248;
  const rects = [];
  for (let i = 0; i < count; i++) rects.push({ x: x0 + i * (cardW + gap), y: y0, w: cardW, h: cardH });
  return rects;
}

/** The draft screen: three cards over the quiet sky. */
export function drawDraft(ctx, world, t, hoverIndex = -1) {
  drawScene(ctx, world, t, { hud: true });
  ctx.fillStyle = 'rgba(255, 244, 214, 0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK.navy;
  ctx.font = '900 44px Georgia, serif';
  ctx.fillText(`WAVE ${world.wave} HELD`, 640, 168);
  ctx.font = '600 19px Verdana, sans-serif';
  ctx.fillText('The forge crews offer their spoils — choose one, then fly on.', 640, 202);
  const rects = draftCardRects(world.draftOffer.length);
  const y0 = 248;
  const cardW = 330;
  const cardH = 300;
  world.draftOffer.forEach((offer, i) => {
    const x = rects[i].x;
    const hovered = i === hoverIndex;
    ctx.save();
    if (hovered) ctx.translate(0, -8);
    ctx.fillStyle = hovered ? '#fffdf4' : INK.parchment;
    rr(ctx, x, y0, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = hovered ? INK.goldBright : INK.parchmentEdge;
    ctx.lineWidth = hovered ? 4 : 2.4;
    rr(ctx, x, y0, cardW, cardH, 14);
    ctx.stroke();
    // The glyph in its gold medallion.
    ctx.fillStyle = '#f2b33d';
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y0 + 66, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK.navy;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y0 + 66, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = INK.navy;
    ctx.font = '700 34px Verdana, sans-serif';
    ctx.fillText(offer.glyph, x + cardW / 2, y0 + 78);
    ctx.font = '700 23px Georgia, serif';
    ctx.fillText(offer.name.toUpperCase(), x + cardW / 2, y0 + 138);
    ctx.font = '700 16.5px Verdana, sans-serif';
    ctx.fillStyle = '#8e2f28';
    wrapText(ctx, offer.text, x + cardW / 2, y0 + 172, cardW - 44, 21);
    ctx.fillStyle = INK.navySoft;
    ctx.font = 'italic 600 14.5px Georgia, serif';
    wrapText(ctx, offer.blurb, x + cardW / 2, y0 + 226, cardW - 52, 19);
    // Stacks already held, as pips.
    const held = world.build.filter((b) => b === offer.id).length;
    ctx.font = '600 13px Verdana, sans-serif';
    ctx.fillStyle = INK.navySoft;
    ctx.fillText(held > 0 ? `held ×${held} of ${offer.max}` : `new — up to ×${offer.max}`, x + cardW / 2, y0 + cardH - 18);
    ctx.restore();
  });
  ctx.font = '600 15px Verdana, sans-serif';
  ctx.fillStyle = INK.navy;
  ctx.fillText('Click a card — or press 1, 2 or 3', 640, y0 + cardH + 44);
  ctx.textAlign = 'left';
}

/** Word-wrap a centred string; returns the y after the last line. */
function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = String(text).split(' ');
  let lineText = '';
  let yy = y;
  for (const word of words) {
    const trial = lineText ? `${lineText} ${word}` : word;
    if (ctx.measureText(trial).width > maxW && lineText) {
      ctx.fillText(lineText, cx, yy);
      lineText = word;
      yy += lineH;
    } else {
      lineText = trial;
    }
  }
  if (lineText) ctx.fillText(lineText, cx, yy);
  return yy;
}

/** The results screen: the grade in its rosette, the run in numbers.
 *  `results` is main.js's computeResults: { letter, colour, merit, stats }. */
export function drawResults(ctx, world, t, won, results) {
  drawScene(ctx, world, t, { hud: false });
  ctx.fillStyle = won ? 'rgba(255, 244, 214, 0.5)' : 'rgba(70, 60, 70, 0.28)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 240, 92, 800, 616, 0.97);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#2e7d32' : '#8e2f28';
  ctx.font = '900 54px Georgia, serif';
  ctx.fillText(won ? 'THE SKY IS YOURS' : 'THE FORGE FALLS', 640, 168);
  ctx.fillStyle = INK.navy;
  ctx.font = '600 18px Verdana, sans-serif';
  ctx.fillText(
    won
      ? 'The Skyfall is sunk, the forge still burns, and the Dawnbreaker comes home.'
      : `The Dawnbreaker went down in wave ${world.wave}. The pirates hold the sky — this time.`,
    640,
    202,
  );
  // The grade rosette, with the merit the grade was earned from.
  drawRosette(ctx, 640, 306, results.letter, results.colour, t);
  ctx.fillStyle = INK.navySoft;
  ctx.font = '700 14px Verdana, sans-serif';
  ctx.fillText(`MERIT ${results.merit} OF 100`, 640, 386);
  // The stat grid: two columns of named numbers.
  const stats = results.stats;
  ctx.font = '600 18px Verdana, sans-serif';
  stats.forEach(([name, value], i) => {
    const colX = i % 2 === 0 ? 330 : 690;
    const rowY = 428 + Math.floor(i / 2) * 40;
    ctx.fillStyle = INK.gold;
    ctx.font = '700 15px Verdana, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, colX, rowY);
    ctx.fillStyle = INK.navy;
    ctx.font = '700 20px Verdana, sans-serif';
    ctx.fillText(value, colX + 128, rowY);
  });
  // The build, read back.
  ctx.textAlign = 'center';
  ctx.fillStyle = INK.navySoft;
  ctx.font = '700 14px Verdana, sans-serif';
  ctx.fillText('THE BUILD THAT FLEW', 640, 584);
  ctx.fillStyle = INK.navy;
  ctx.font = '600 15.5px Verdana, sans-serif';
  wrapText(ctx, buildSummary(world.build), 640, 610, 720, 21);
  const pulse = 0.72 + 0.28 * Math.sin(t * 3.4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#8e2f28';
  ctx.font = '700 21px Verdana, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', 640, 676);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/** A medal rosette with the grade letter in it. */
function drawRosette(ctx, cx, cy, letter, colour, t) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 0.8) * 0.03);
  ctx.fillStyle = colour;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(11, -34);
    ctx.lineTo(-11, -34);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdf6e0';
  ctx.beginPath();
  ctx.arc(0, 0, 37, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colour;
  ctx.font = '900 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(letter, 0, 16);
  ctx.restore();
}

/** The pause veil: the on-demand tier — controls recap and the build,
 *  the things a player asks for only when they stop to ask. */
export function drawPause(ctx, world, t) {
  ctx.fillStyle = 'rgba(255, 244, 214, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK.navy;
  ctx.font = '900 52px Georgia, serif';
  ctx.fillText('HELD FAST', 640, 330);
  ctx.font = '600 18px Verdana, sans-serif';
  ctx.fillText('The sky waits. Press P or Esc to fly on.', 640, 368);
  panel(ctx, 390, 396, 500, 118);
  ctx.fillStyle = INK.navy; // panel() leaves the parchment fill behind
  ctx.font = '600 16px Verdana, sans-serif';
  const lines = [
    'FLY  WASD or arrows · AIM  the mouse',
    'FIRE  hold click or Space · M  mutes',
    'MEND  rest inside the forge’s gold ring',
  ];
  lines.forEach((s, i) => ctx.fillText(s, 640, 428 + i * 30));
  if (world) {
    ctx.fillStyle = INK.navySoft;
    ctx.font = '700 13.5px Verdana, sans-serif';
    ctx.fillText('THE BUILD THAT FLIES', 640, 556);
    ctx.fillStyle = INK.navy;
    ctx.font = '600 15.5px Verdana, sans-serif';
    wrapText(ctx, buildSummary(world.build), 640, 582, 700, 21);
  }
  ctx.textAlign = 'left';
  void t;
}

/** The mute button's geometry — main.js hit-tests the same rect. */
export const MUTE_RECT = { x: 1222, y: 716, w: 44, h: 44 };

/** The mute button: a parchment square with a speaker glyph, slashed
 *  when muted. Always-visible tier — sound state is glanceable, and the
 *  button is drawn on every screen, not buried in a menu. */
export function drawMuteButton(ctx, muted) {
  const { x, y, w, h } = MUTE_RECT;
  ctx.save();
  ctx.globalAlpha = 0.92;
  panel(ctx, x, y, w, h, 0.92);
  ctx.fillStyle = INK.navy;
  // Speaker: a block and a cone.
  ctx.beginPath();
  ctx.moveTo(x + 11, y + 19);
  ctx.lineTo(x + 16, y + 19);
  ctx.lineTo(x + 23, y + 12);
  ctx.lineTo(x + 23, y + 32);
  ctx.lineTo(x + 16, y + 25);
  ctx.lineTo(x + 11, y + 25);
  ctx.closePath();
  ctx.fill();
  if (muted) {
    ctx.strokeStyle = '#c22f21';
    ctx.lineWidth = 3.4;
    line(ctx, x + 10, y + 34, x + 34, y + 10);
  } else {
    ctx.strokeStyle = INK.navy;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(x + 26, y + 22, 6, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 26, y + 22, 10.5, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/** The touch stick, when a thumb is flying the ship. */
export function drawTouch(ctx, input) {
  if (!input || !input.touchMode) return;
  if (input.stickActive) {
    ctx.strokeStyle = 'rgba(253, 246, 224, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(input.stickOriginX, input.stickOriginY, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(253, 246, 224, 0.85)';
    ctx.beginPath();
    ctx.arc(input.stickX, input.stickY, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(29, 47, 77, 0.55)';
  ctx.font = '600 14px Verdana, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('AUTO-FIRE ENGAGED', VIEW_W - 18, VIEW_H - 18);
  ctx.textAlign = 'left';
}
