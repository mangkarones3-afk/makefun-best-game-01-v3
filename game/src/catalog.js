// catalog.js — the pirate fleet, the dreadnoughts and the upgrade pool.
//
// This file is the game's bestiary and armoury in data. world.js flies what
// is written here; render.js paints it from the same rows, so a class can
// never look like one ship and fight like another. The numbers were set by
// the balance argument in the comments and then proven two ways: the
// headless campaign simulator (sim/simulate.mjs, results in simreport.js)
// and a 10,000-battles-per-matchup Monte Carlo audit (sim/montecarlo.mjs,
// results in tuning.js).
//
// THE BALANCE ARGUMENT, in brief. The Dawnbreaker's cannon deals 9 damage
// 6.5 times a second: 58.5 damage a second on target, about 40 in a real
// fight where a third of the shots are spent repositioning. Roster hull
// (pirates only, at wave scaling) climbs from ~110 on wave 1 to ~4,000 on
// wave 14, with the dreadnoughts sitting on top of their waves; the
// Monte Carlo puts a prepared fight's median length at ~45–60 seconds.
// What a pilot banks depends on how greedily they fly the magnet (the
// ledger in tuning.js counts 2,335 gold of analytic sources across a
// run, between pirate drops and the three boss purses). The purse is
// score, not a shop, so its only job is to make every kill feel counted.

// ---------------------------------------------------------------- pirates

/**
 * The five pirate classes. Fields:
 *   name      what the HUD's threat panel calls it
 *   hull      damage it soaks before it burns
 *   speed     cruise speed in units a second
 *   radius    collision circle
 *   damage    what its contact (or its ram) does to the Dawnbreaker
 *   shotDamage what one of its bullets does
 *   fireRate  its shots a second when it fires (0 = it never shoots)
 *   range     the distance it likes to fight at
 *   gold      coins it drops, as [min, max]
 *   score     merit points for the kill
 *   colour    balloon / hull colours from the design sheet
 *   blurb     one line for the title screen's bestiary strip
 */
export const PIRATES = {
  skiff: {
    name: 'Skiff',
    hull: 18,
    speed: 148,
    radius: 17,
    damage: 6,
    shotDamage: 4,
    fireRate: 0.9,
    range: 300,
    gold: [2, 4],
    score: 10,
    balloon: '#7d8aa0',
    balloonShade: '#5f6d84',
    hullColour: '#5b4632',
    blurb: 'A dart with a gun. Weak alone, a weather system in a swarm.',
  },
  bomber: {
    name: 'Bomber',
    hull: 74,
    speed: 62,
    radius: 30,
    damage: 10,
    shotDamage: 12,
    fireRate: 0.55,
    range: 360,
    gold: [6, 10],
    score: 30,
    balloon: '#a05a3a',
    balloonShade: '#7e452b',
    hullColour: '#4a3826',
    blurb: 'A fat balloon over a bomb bay. Slow, stubborn, expensive to ignore.',
  },
  rammer: {
    name: 'Rammer',
    hull: 34,
    speed: 96,
    radius: 19,
    damage: 22,
    shotDamage: 0,
    fireRate: 0,
    range: 520,
    gold: [4, 7],
    score: 25,
    balloon: '#6b7280',
    balloonShade: '#525862',
    hullColour: '#6b7280',
    blurb: 'No balloon, no gun, one iron prow. It telegraphs, then it charges.',
  },
  sniper: {
    name: 'Sniper kite',
    hull: 30,
    speed: 84,
    radius: 20,
    damage: 7,
    shotDamage: 9,
    fireRate: 0.5,
    range: 430,
    gold: [5, 9],
    score: 30,
    balloon: '#b9c4cf',
    balloonShade: '#93a2b0',
    hullColour: '#54606e',
    blurb: 'A tall kite with a long barrel. Fights from farther than you want.',
  },
  carrier: {
    name: 'Carrier',
    hull: 120,
    speed: 44,
    radius: 38,
    damage: 12,
    shotDamage: 5,
    fireRate: 0.7,
    range: 380,
    gold: [10, 16],
    score: 60,
    balloon: '#5f7355',
    balloonShade: '#49573f',
    hullColour: '#3f4a3a',
    blurb: 'A hangar with balloons. Launches a fresh skiff every few seconds.',
  },
};

/** The class keys in the order the threat panel lists them. */
export const PIRATE_ORDER = ['skiff', 'bomber', 'rammer', 'sniper', 'carrier'];

/** How a class's hull grows as the waves climb: +9% a wave, compounding, so
 *  a wave-14 skiff (41 hull) is a different argument from a wave-1 skiff
 *  (18) even before the counts grow. Speed grows half as fast, capped, so
 *  late waves press without becoming un-dodgeable. */
export function waveScale(wave) {
  return {
    hull: Math.pow(1.09, wave - 1),
    speed: Math.min(1.45, Math.pow(1.045, wave - 1)),
    damage: Math.pow(1.05, wave - 1),
  };
}

// ------------------------------------------------------------- dreadnought

/**
 * The dreadnoughts. One hull, three tempers: the wave-5 ship is a gun deck,
 * the wave-10 ship adds a charge beam, the wave-15 ship — the SKYFALL — does
 * everything faster and launches escorts while it fights. Hull is set so a
 * boss fight lasts about a minute at the player's then-current damage —
 * the Monte Carlo audit (tuning.js) measures p50 58–60 s across all three
 * walls, with the policy build winning 99.8% / 98.1% / 92.4% of 10,000
 * fights each: the draft has offered 4 upgrades by wave 5, 9 by wave 10,
 * 14 by wave 15, and a damage-leaning build is near 110 damage a second
 * by the end.
 */
export const DREADNOUGHTS = [
  {
    wave: 5,
    name: 'DREADNOUGHT BRASSJAW',
    hull: 1450,
    speed: 26,
    radius: 92,
    contactDamage: 18,
    broadside: { guns: 5, shotDamage: 8, cooldown: 3.4 },
    beam: null,
    launches: null,
    gold: [120, 160],
    score: 600,
  },
  {
    wave: 10,
    name: 'DREADNOUGHT COALBARON',
    hull: 2600,
    speed: 30,
    radius: 98,
    contactDamage: 22,
    broadside: { guns: 7, shotDamage: 9, cooldown: 3.0 },
    beam: { damage: 26, telegraph: 1.5, fire: 0.9, cooldown: 7.5 },
    launches: null,
    gold: [220, 300],
    score: 1200,
  },
  {
    wave: 15,
    name: 'DREADNOUGHT SKYFALL',
    hull: 3900,
    speed: 34,
    radius: 104,
    contactDamage: 26,
    broadside: { guns: 9, shotDamage: 10, cooldown: 2.6 },
    beam: { damage: 34, telegraph: 1.3, fire: 1.0, cooldown: 6.0 },
    launches: { every: 6.5, of: 'skiff', cap: 5 },
    gold: [400, 520],
    score: 2400,
  },
];

/** The dreadnought row for a wave, or null on a wave with no boss. */
export function dreadnoughtFor(wave) {
  return DREADNOUGHTS.find((d) => d.wave === wave) ?? null;
}

// --------------------------------------------------------------- upgrades

/**
 * The twelve upgrades of the between-wave draft. Each card is one line of
 * arithmetic the player can feel: `apply` names the ship stat it moves and
 * `amount` is per stack; `max` caps the stacks so a draft late in the run
 * still has live cards. The pool is weighted toward damage and survival
 * early — the draft code in upgrades.js reads `tags` to keep an offer from
 * ever being three cards the run cannot use.
 */
export const UPGRADES = [
  {
    id: 'rapid-cannons',
    name: 'Rapid Cannons',
    glyph: '»',
    text: '+18% cannon fire rate',
    apply: 'fireRateMul',
    amount: 1.18,
    mode: 'mul',
    max: 4,
    tags: ['damage'],
    blurb: 'The guns cycle faster. The sky notices.',
  },
  {
    id: 'heavy-shot',
    name: 'Heavy Shot',
    glyph: '●',
    text: '+3 damage per cannon shot',
    apply: 'bulletDamage',
    amount: 3,
    mode: 'add',
    max: 4,
    tags: ['damage'],
    blurb: 'Heavier balls, shorter arguments.',
  },
  {
    id: 'twin-muzzles',
    name: 'Twin Muzzles',
    glyph: '⋮',
    text: 'Cannons fire a second, tighter shot',
    apply: 'extraShot',
    amount: 1,
    mode: 'add',
    max: 1,
    tags: ['damage'],
    blurb: 'One trigger, two opinions.',
  },
  {
    id: 'long-barrels',
    name: 'Long Barrels',
    glyph: '—',
    text: '+25% shot speed and reach',
    apply: 'bulletSpeedMul',
    amount: 1.25,
    mode: 'mul',
    max: 2,
    tags: ['damage'],
    blurb: 'Reach the kite before it reaches you.',
  },
  {
    id: 'ironwood-hull',
    name: 'Ironwood Hull',
    glyph: '▣',
    text: '+25 maximum hull, and mend 25 now',
    apply: 'maxHull',
    amount: 25,
    mode: 'add',
    max: 4,
    tags: ['survival'],
    blurb: 'The shipwrights swear by it. So does the hull.',
  },
  {
    id: 'forge-pact',
    name: 'Forge Pact',
    glyph: '✚',
    text: 'The forge ring repairs twice as fast, and wider',
    apply: 'repairMul',
    amount: 2,
    mode: 'mul',
    max: 2,
    tags: ['survival'],
    blurb: 'The forgekeepers keep your sky worth flying.',
  },
  {
    id: 'swift-rigging',
    name: 'Swift Rigging',
    glyph: '≫',
    text: '+12% thrust and top speed',
    apply: 'speedMul',
    amount: 1.12,
    mode: 'mul',
    max: 3,
    tags: ['mobility'],
    blurb: 'New lines, new ropes, new legs.',
  },
  {
    id: 'keel-fins',
    name: 'Keel Fins',
    glyph: '△',
    text: '+20% tighter turning drift, shots spread less',
    apply: 'spreadMul',
    amount: 0.8,
    mode: 'mul',
    max: 2,
    tags: ['mobility', 'damage'],
    blurb: 'She answers the helm like she means it.',
  },
  {
    id: 'gilded-magnet',
    name: 'Gilded Magnet',
    glyph: '◎',
    text: 'Gold flies to you from twice as far',
    apply: 'magnetMul',
    amount: 2,
    mode: 'mul',
    max: 2,
    tags: ['economy'],
    blurb: 'Every coin in the sky wants to come home.',
  },
  {
    id: 'salvage-crews',
    name: 'Salvage Crews',
    glyph: '⚓',
    text: 'Pirates drop +40% gold',
    apply: 'goldMul',
    amount: 1.4,
    mode: 'mul',
    max: 3,
    tags: ['economy'],
    blurb: 'Nothing falls out of this sky uncounted.',
  },
  {
    id: 'powder-flares',
    name: 'Powder Flares',
    glyph: '✦',
    text: 'Kills burst: nearby pirates take 14 splash damage',
    apply: 'splash',
    amount: 14,
    mode: 'add',
    max: 3,
    tags: ['damage'],
    blurb: 'A kill that introduces itself to the neighbours.',
  },
  {
    id: 'second-wind',
    name: 'Second Wind',
    glyph: '♥',
    text: 'Once a run: at zero hull, mend to 35 and clear the sky',
    apply: 'secondWind',
    amount: 1,
    mode: 'add',
    max: 1,
    tags: ['survival'],
    blurb: 'The Dawnbreaker has refused to fall before.',
  },
];

/** The upgrade row for an id. */
export function upgradeById(id) {
  return UPGRADES.find((u) => u.id === id) ?? null;
}
