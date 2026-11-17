# Animation

**Status:** implemented · **Updated:** 2026-11-17 · [GDD](../../GDD.md) · [Implementation](implementation.md) · [Testing](testing.md)

CLOUDBRAWL's actors are procedural vector art, so animation is not sprite frames but pose keyframes — bob, sway, propeller speed, cannon recoil, telegraph glow, hurt flash, death sink — driven by manifest state machines (anim.js) on the simulation's own clock. This serves pillar 4: because the machines advance on the fixed-step dt, a replayed seed shows identical frames, hit-stop freezes the pose with the world, and screenshots are reproducible.

## Rules
1. Every actor carries a machine from a manifest (player, pirate, rammer, dreadnought). Gameplay code requests transitions; it never sets frames. Poses are sliced once at load; the advance path allocates nothing.
2. Transitions follow a declared table. Hurt interrupts anything except death; death interrupts everything and is terminal. A playing `once` state refuses locomotion requests and falls back to its declared next state on completion.
3. Discrete events may retrigger: every cannon volley restarts the player's attack beat, so its frame-0 `spawn` event fires exactly once per volley.
4. Animation events are gameplay events: the rammer's telegraph fires `telegraph` on entry (its 550 ms loop is exactly the world's wind-up), its charge fires `hit` on the strike frame; the dreadnought's telegraph and firing states are rescaled per boss to the catalog's beam timings, firing `telegraph` and `hit` (the beam's landing frame) respectively.
5. The renderer reads only the machine's current pose (plus its total clock for propeller angles). Actors without a machine — the title screen's parade dummies — keep a frame-clock fallback.

## Numbers
| Actor / state | Duration | Loop | Notes |
|---|---|---|---|
| player idle / move | 1600 / 720 ms | loop | prop 9 → 22 rad/s under way |
| player attack | 160 ms | once | matches the base cannon interval (~154 ms); recoil 7 px |
| player hurt / death | 180 / 800 ms | once | flash 1→0; death sinks 30 px |
| pirate move / attack / hurt / death | 880 / 200 / 160 / 440 ms | loop / once | one manifest for skiff, bomber, sniper, carrier |
| rammer telegraph | 550 ms | loop | == the world wind-up, one loop per wind-up; glow 0.35→1 |
| rammer attack | 210 ms | once | `hit` at frame 1 (140 ms), the strike frame |
| dreadnought telegraph / attack | = beam telegraph / fire of its row | once | 1500/900 ms Coalbaron, 1300/1000 ms Skyfall |

## Proof
`sim/animqa.mjs` runs the five QA gates: contact sheets (`game/index.html?shot=contact1|contact2|contact3`, captured to `sim/contact*.jpg`), the duration table against the catalog's own constants, the event audit (machine level and in-world: telegraphs == wind-ups, spawns == volleys), determinism of (state, frame) sequences across two runs of one seed, and zero-allocation identity checks. All gates must pass.

## Edge cases
- A pirate killed mid-attack is removed the same step; its machine dies with it and the explosion particles carry the beat. The death state exists for the player (whose ship stays on screen as the run ends) and for the contact sheet.
- Prime, don't step: screenshot staging poses machines directly (`primeAnim`) so a staged frame is mid-beat without simulating to it.

## History
- 2026-11-17: designed and implemented together (anim.js, world.js stepAnims, render.js pose reads); QA harness in sim/animqa.mjs.
