// anim.js — the ships' acting: manifest-driven animation state machines.
//
// CLOUDBRAWL's actors are procedural vector art, not sprite sheets, so the
// "frames" of this manifest are pose keyframes — bob, sway, propeller
// speed, cannon recoil, telegraph glow, hurt flash, death sink — sliced
// ONCE at load into per-state timing tables. The machines then run on the
// simulation's own fixed-step clock (world.js calls updateMachine with
// the same dt the seeded sim uses), so a replayed seed shows identical
// frames, hit-stop freezes animTime with the world, and the renderer's
// only job is to read the machine's current pose. Gameplay code requests
// transitions; it never sets frames.
//
// Animation events are gameplay events: the rammer's telegraph fires
// 'telegraph' on its first frame (the player gets the state's remaining
// duration as reaction time), its charge fires 'hit' on the strike frame,
// the dreadnought's beam wind-up fires 'telegraph' and its firing state
// fires 'hit' on frame 0 — the frame the beam lands. world.js drains the
// fired events into its own event channel as 'anim:<name>'.

/** Pose channels every frame may key. Missing channels read as 0,
 *  except prop, which falls back to the actor's cruise speed. */
const POSE_KEYS = ['bob', 'sway', 'prop', 'recoil', 'glow', 'flash', 'sink'];

/** The transition table: legal moves between states. Two overrides sit
 *  above the table — hurt interrupts anything except death, and death
 *  interrupts everything. `once` states fall back to their declared
 *  `next` state when they complete. */
const TRANSITIONS = {
  idle: ['move', 'attack', 'telegraph', 'hurt', 'death'],
  move: ['idle', 'attack', 'telegraph', 'hurt', 'death'],
  attack: ['idle', 'move', 'hurt', 'death'],
  telegraph: ['attack', 'move', 'hurt', 'death'],
  hurt: ['idle', 'move', 'death'],
  death: [],
};

const F = (ms, pose) => ({ ms, pose });

/** The manifest. Durations are design intent, checked against the game
 *  by sim/animqa.mjs: the player's attack (160 ms) matches the base
 *  cannon interval (1/6.5 s ≈ 154 ms); the dreadnought's telegraph and
 *  firing states ARE the catalog's beam timings for its row (telegraph
 *  1500/1300 ms, fire 900/1000 ms — set per-boss at creation). */
export const MANIFEST = {
  player: {
    anchor: 'centre', // flyers anchor at the centre, per the design sheet
    cruiseProp: 9,
    states: {
      idle: { loop: true, frames: [F(400, { bob: 0, prop: 9 }), F(400, { bob: 3, prop: 9 }), F(400, { bob: 0, prop: 9 }), F(400, { bob: -3, prop: 9 })] },
      move: { loop: true, frames: [F(180, { bob: 0, prop: 22 }), F(180, { bob: 2.5, prop: 22 }), F(180, { bob: 0, prop: 22 }), F(180, { bob: -2.5, prop: 22 })] },
      attack: { loop: false, next: 'move', events: [{ frame: 0, name: 'spawn' }], frames: [F(50, { recoil: 0, prop: 22 }), F(50, { recoil: 7, prop: 22 }), F(60, { recoil: 0, prop: 22 })] },
      hurt: { loop: false, next: 'idle', frames: [F(90, { flash: 1 }), F(90, { flash: 0 })] },
      death: { loop: false, next: null, frames: [F(150, { flash: 0.6, sink: 0 }), F(150, { flash: 0.3, sink: 6 }), F(150, { flash: 0, sink: 16 }), F(350, { sink: 30 })] },
    },
  },
  pirate: {
    anchor: 'centre',
    cruiseProp: 14,
    states: {
      move: { loop: true, frames: [F(220, { bob: 0, prop: 14 }), F(220, { bob: 2.4, prop: 14 }), F(220, { bob: 0, prop: 14 }), F(220, { bob: -2.4, prop: 14 })] },
      attack: { loop: false, next: 'move', events: [{ frame: 0, name: 'spawn' }], frames: [F(60, { recoil: 0 }), F(60, { recoil: 5 }), F(80, { recoil: 0 })] },
      hurt: { loop: false, next: 'move', frames: [F(80, { flash: 1 }), F(80, { flash: 0 })] },
      death: { loop: false, next: null, frames: [F(120, { flash: 0.5, sink: 0 }), F(120, { flash: 0.2, sink: 10 }), F(200, { sink: 24 })] },
    },
  },
  rammer: {
    anchor: 'centre',
    cruiseProp: 30,
    states: {
      move: { loop: true, frames: [F(200, { bob: 0, prop: 30 }), F(200, { bob: 1.8, prop: 30 }), F(200, { bob: 0, prop: 30 }), F(200, { bob: -1.8, prop: 30 })] },
      telegraph: { loop: true, events: [{ frame: 0, name: 'telegraph' }], frames: [F(275, { glow: 0.35, prop: 38 }), F(275, { glow: 1, prop: 38 })] },
      attack: { loop: false, next: 'move', events: [{ frame: 1, name: 'hit' }], frames: [F(70, { prop: 46 }), F(70, { prop: 46 }), F(70, { prop: 30 })] },
      hurt: { loop: false, next: 'move', frames: [F(80, { flash: 1 }), F(80, { flash: 0 })] },
      death: { loop: false, next: null, frames: [F(120, { flash: 0.5, sink: 0 }), F(120, { flash: 0.2, sink: 10 }), F(200, { sink: 24 })] },
    },
  },
  dreadnought: {
    anchor: 'centre',
    cruiseProp: 7,
    states: {
      move: { loop: true, frames: [F(300, { bob: 0, prop: 7 }), F(300, { bob: 3, prop: 7 }), F(300, { bob: 0, prop: 7 }), F(300, { bob: -3, prop: 7 })] },
      telegraph: { loop: false, next: 'move', events: [{ frame: 0, name: 'telegraph' }], frames: [F(600, { glow: 0.3 }), F(900, { glow: 1 })] },
      attack: { loop: false, next: 'move', events: [{ frame: 0, name: 'hit' }], frames: [F(350, { recoil: 4, glow: 0.6 }), F(350, { recoil: 0, glow: 0 })] },
      hurt: { loop: false, next: 'move', frames: [F(100, { flash: 0.8 }), F(100, { flash: 0 })] },
      death: { loop: false, next: null, frames: [F(200, { flash: 0.6, sink: 0 }), F(200, { flash: 0.3, sink: 14 }), F(400, { sink: 34 })] },
    },
  },
};

/** Slice a state's frames once: cumulative start times + total. */
function sliceState(def) {
  const starts = new Float32Array(def.frames.length);
  let total = 0;
  for (let i = 0; i < def.frames.length; i++) {
    starts[i] = total;
    total += def.frames[i].ms;
  }
  return { ...def, starts, total };
}

/** The sliced manifest: built once at module load, shared by every
 *  machine of an actor. opts.telegraphMs rescales the dreadnought's
 *  telegraph state to a specific boss's beam (see createMachine). */
const SLICED = {};
for (const [actor, def] of Object.entries(MANIFEST)) {
  const states = {};
  for (const [name, s] of Object.entries(def.states)) states[name] = sliceState(s);
  SLICED[actor] = { ...def, states };
}

/** Rescale one state's frame durations to a target total, keeping the
 *  keyframe proportions — the dreadnought's telegraph and firing states
 *  are per-boss numbers (the catalog's beam timings), not constants. */
function rescaleState(actorDef, name, totalMs) {
  const src = actorDef.states[name];
  const scale = totalMs / src.total;
  const frames = src.frames.map((f) => ({ ms: Math.round(f.ms * scale), pose: f.pose }));
  const states = { ...actorDef.states, [name]: sliceState({ ...src, frames }) };
  return { ...actorDef, states };
}

/**
 * A machine for one actor. Allocation happens here (spawn) and in
 * setState (rare); updateMachine allocates nothing — it writes numbers
 * into the preallocated pose and event ring.
 */
export function createMachine(actor, opts = {}) {
  let def = SLICED[actor];
  if (!def) throw new Error(`anim: unknown actor ${actor}`);
  if (actor === 'dreadnought' && opts.telegraphMs) def = rescaleState(def, 'telegraph', opts.telegraphMs);
  if (actor === 'dreadnought' && opts.fireMs) def = rescaleState(def, 'attack', opts.fireMs);
  const m = {
    actor,
    def,
    state: actor === 'player' ? 'idle' : 'move',
    time: 0, // ms inside the current state
    timeTotal: 0, // ms since creation — the propeller's clock
    frame: 0,
    pose: { bob: 0, sway: 0, prop: def.cruiseProp, recoil: 0, glow: 0, flash: 0, sink: 0 },
    ring: [null, null, null, null, null, null, null, null], // fired events, FIFO
    ringHead: 0,
    ringCount: 0,
    done: false, // a `once` state has completed
  };
  computePose(m);
  return m;
}

function fireEvent(m, name, frame) {
  if (m.ringCount >= m.ring.length) return; // a full ring drops, never grows
  const slot = (m.ringHead + m.ringCount) % m.ring.length;
  m.ring[slot] = { name, frame };
  m.ringCount += 1;
}

/** Read and clear the machine's fired events, oldest first, into `out`
 *  (an array the caller owns). Returns how many were drained. */
export function drainEvents(m, out) {
  let n = 0;
  while (m.ringCount > 0) {
    out[n++] = m.ring[m.ringHead].name;
    m.ring[m.ringHead] = null;
    m.ringHead = (m.ringHead + 1) % m.ring.length;
    m.ringCount -= 1;
  }
  return n;
}

function enterState(m, name) {
  m.state = name;
  m.time = 0;
  m.frame = 0;
  m.done = false;
  const def = m.def.states[name];
  if (def.events) {
    for (const ev of def.events) if (ev.frame === 0) fireEvent(m, ev.name, 0);
  }
  computePose(m);
}

/**
 * Request a transition. Legal moves come from the table; hurt interrupts
 * anything but death; death interrupts everything; a `once` state that is
 * still playing refuses locomotion requests (its fallback handles the
 * exit). Returns whether the machine is now in `name`.
 */
export function setState(m, name) {
  if (m.state === name) return true;
  if (!m.def.states[name]) return false;
  const cur = m.def.states[m.state];
  if (m.state === 'death') return false;
  let legal = name === 'death' || name === 'hurt' || (TRANSITIONS[m.state] ?? []).includes(name);
  if (!cur.loop && !m.done && (name === 'idle' || name === 'move')) legal = false;
  if (!legal) return false;
  enterState(m, name);
  return m.state === name;
}

/** The frame index and interpolated pose at a state-local time. Pure:
 *  the contact sheet and the QA harness read poses through this. */
export function frameAt(m, stateName, timeMs) {
  const def = m.def.states[stateName];
  let t = timeMs;
  if (def.loop) t = def.total > 0 ? t % def.total : 0;
  else t = Math.min(t, def.total - 0.001);
  let frame = 0;
  while (frame < def.frames.length - 1 && t >= def.starts[frame] + def.frames[frame].ms) frame += 1;
  const local = (t - def.starts[frame]) / def.frames[frame].ms;
  const a = def.frames[frame].pose;
  const b = def.frames[(frame + 1) % def.frames.length].pose;
  const pose = {};
  for (const k of POSE_KEYS) {
    const av = a[k] ?? (k === 'prop' ? m.def.cruiseProp : 0);
    const bv = def.loop || frame < def.frames.length - 1 ? (b[k] ?? (k === 'prop' ? m.def.cruiseProp : 0)) : av;
    pose[k] = av + (bv - av) * Math.max(0, Math.min(1, local));
  }
  return { frame, pose };
}

function computePose(m) {
  const { frame, pose } = frameAt(m, m.state, m.time);
  m.frame = frame;
  for (const k of POSE_KEYS) m.pose[k] = pose[k];
}

/**
 * Advance the machine by dtMs of SIM time. Fires the entered frames'
 * declared events, completes `once` states exactly once (falling back to
 * the manifest's `next`), and wraps loops. Allocates nothing.
 */
export function updateMachine(m, dtMs) {
  m.timeTotal += dtMs;
  if (m.done) return;
  const def = m.def.states[m.state];
  const before = m.frame;
  m.time += dtMs;
  if (!def.loop && m.time >= def.total) {
    // Completion: land on the last frame, fire its entry if unvisited,
    // then fall back — once, in order.
    if (before < def.frames.length - 1 && def.events) {
      for (const ev of def.events) if (ev.frame === def.frames.length - 1) fireEvent(m, ev.name, ev.frame);
    }
    m.time = def.total;
    computePose(m);
    m.done = true;
    if (def.next && m.def.states[def.next]) enterState(m, def.next);
    return;
  }
  if (def.loop && m.time >= def.total) m.time %= def.total;
  computePose(m);
  // Frame events fire when the playhead crosses INTO a frame going
  // forward. A loop wrap is a re-entry of the state, not of the frame —
  // frame-0 events belong to enterState, so a looping telegraph fires
  // its 'telegraph' exactly once per wind-up, not once per revolution.
  if (def.events && m.frame > before) {
    for (const ev of def.events) if (ev.frame === m.frame) fireEvent(m, ev.name, ev.frame);
  }
}

/**
 * Force a state entry, bypassing the table — for discrete gameplay
 * events that must restart a beat, above all the cannon's volley: each
 * shot retriggers the attack (and its frame-0 'spawn'), even when the
 * previous shot's recoil is still playing. Continuous state derivation
 * (stepAnims) uses setState; discrete events use this. Death is final
 * and refuses even this.
 */
export function retrigger(m, name) {
  if (m.state === 'death' || !m.def.states[name]) return false;
  enterState(m, name);
  return true;
}

/** Total duration of a state in ms (the duration table's raw material). */
export function stateDuration(m, name) {
  return m.def.states[name].total;
}

/** Prime an actor's machine into a state at a state-local time — the
 *  screenshot staging and the contact sheet pose actors through this. */
export function primeAnim(entity, state, timeMs) {
  if (!entity || !entity.anim) return;
  enterState(entity.anim, state);
  entity.anim.time = timeMs;
  computePose(entity.anim);
}
