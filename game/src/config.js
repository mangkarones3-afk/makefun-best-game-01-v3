// config.js — CLOUDBRAWL's fixed numbers: the stage, the palette, the tuning.
//
// Anything a designer would argue about lives here or in catalog.js, in one
// place, so the balance pass is a reading pass. The world is 1280 by 800
// units, the canvas the same, so a unit is a pixel at the judged size and the
// screenshots stage exactly what a player sees.

export const VIEW_W = 1280;
export const VIEW_H = 800;

/** The fixed simulation step: the world advances in 120ths of a second, so a
 *  run is the same on a 60 Hz laptop and a 144 Hz monitor, and the headless
 *  simulator steps the identical code. */
export const STEP = 1 / 120;

/** The sky's colours, top to horizon (see DESIGN.md). */
export const SKY = {
  top: '#124a8c',
  upper: '#22609f',
  middle: '#3a76b8',
  lower: '#6399d2',
  horizon: '#eacf87',
};

/** Shared ink and furniture colours. */
export const INK = {
  navy: '#1d2f4d',
  navySoft: 'rgba(29, 47, 77, 0.72)',
  parchment: 'rgba(253, 246, 224, 0.94)',
  parchmentEdge: '#c9a86a',
  gold: '#c98f12',
  goldBright: '#f2b33d',
  danger: '#c22f21',
  good: '#2e7d32',
  white: '#ffffff',
};

/** The player's airship, the Dawnbreaker (catalog.js holds the pirates). */
export const SHIP = {
  radius: 26, // collision circle around the gondola
  hull: 100, // starting and maximum hull before upgrades
  accel: 1500, // units per second squared under key thrust
  drag: 2.6, // velocity decay per second (exp damping factor)
  maxSpeed: 340, // soft cap from drag equilibrium, tuned in playtests
  fireRate: 6.5, // cannon shots per second at base
  bulletSpeed: 780,
  bulletDamage: 9,
  bulletLife: 0.95, // seconds before a shot fizzles
  goldMagnet: 130, // radius that pulls drifting gold coins in
  goldPickup: 40, // radius that banks them
  forgeRepairRate: 3.2, // hull per second restored inside the forge's ring
  forgeRing: 190, // the repair ring's radius around the Skyforge heart
};

/** Where the Skyforge floats: left of centre, low — the landmark the player
 *  defends and the repair dock. Its heart is the repair ring's centre. */
export const FORGE = {
  x: 300,
  y: 668,
  heartX: 300,
  heartY: 596,
};

/** Run economy: gold buys nothing directly — it is score and draft luck. A
 *  draft is free; gold feeds the final grade and the coin purse on the HUD. */
export const ECONOMY = {
  coinDrift: 46, // how fast a dropped coin wanders
  coinLife: 9, // seconds before an unbanked coin blows away
  draftChoices: 3, // cards offered between waves
};

/** The fifteen waves, by the numbers (catalog.js gives the ships). */
export const RUN = {
  waves: 15,
  bossWaves: [5, 10, 15],
  intermission: 2.2, // seconds of calm sky between a clear wave and the draft
};

/** Grade thresholds on the results screen's merit score (results.js math in
 *  world.js: merit blends waves cleared, kills, accuracy and hull left). */
export const GRADES = [
  { letter: 'S', min: 92, colour: '#c98f12' },
  { letter: 'A', min: 78, colour: '#2e7d32' },
  { letter: 'B', min: 62, colour: '#2e7cd6' },
  { letter: 'C', min: 45, colour: '#7a5c1e' },
  { letter: 'D', min: 0, colour: '#8a4b2a' },
];

/** The objective line the HUD always carries, on every frame of play. */
export const OBJECTIVE = 'Sink the Dreadnought to WIN — hull at zero is DEFEAT';

/** The content counts the title screen states, in one place so the title,
 *  the README and the catalog can never disagree. */
export const CONTENT = {
  waves: 15,
  pirateClasses: 5,
  upgrades: 12,
  bosses: 3,
};
