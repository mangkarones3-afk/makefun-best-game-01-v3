# Animation: implementation

**Updated:** 2026-11-17 · [Design](design.md) · [Testing](testing.md)

## Approach
Pose keyframes instead of sprite frames: the art is procedural canvas drawing, so each manifest frame keys the parameters the painters already vary (bob, propeller speed, recoil, glow, flash, sink). Frames are sliced once at module load into cumulative timing tables (Float32Array starts + total). Machines advance inside the world step, so animation time IS sim time.

## Code map
| File / module | Role in this feature |
|---|---|
| `game/src/anim.js` | The manifest, slicing, machines (createMachine / setState / retrigger / updateMachine), the event ring, frameAt |
| `game/src/world.js` | Owns the machines (player, makeEnemy, makeBoss), requests transitions from gameplay facts, `stepAnims` derives states and drains events into the world channel as `anim:<name>` |
| `game/src/render.js` | Reads `anim.pose` in drawPlayer / drawPirate / drawBoss (bob, prop clock, recoil, glow, flash, sink); falls back to frame-clock motion for machine-less parade dummies |
| `game/src/contact.js` | The contact-sheet staging (`?shot=contact1|contact2`) |
| `game/src/shots.js` | `primeAnim` poses staged actors mid-beat for the judged screenshots |
| `sim/animqa.mjs` | The five QA gates |

## Data and config
- **Config constants:** all durations live in the MANIFEST in anim.js; the dreadnought's telegraph/attack totals are rescaled per boss from catalog.js beam timings at machine creation.
- **Persistence:** none.

## Deviations from design
None — the design note was written against this code (mode D sync).

## History
- 2026-11-17: implemented and documented.
