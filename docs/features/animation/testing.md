# Animation: testing

**Updated:** 2026-11-17 · [Design](design.md) · [Implementation](implementation.md)

All criteria are proven by `sim/animqa.mjs` unless marked otherwise. Run: `node sim/animqa.mjs`.

## Acceptance criteria
- [x] Every actor × state renders at 0/25/50/75/100% of its duration on the two contact sheets, drawn by the game's own painters. *(sim/animqa.mjs gate 1: sheet files exist and are full captures; visual check 2026-11-17: sheets eyeballed against DESIGN.md silhouettes and palette)*
- [x] Durations match design intent; where a world constant owns the number (beam telegraph/fire per boss, the rammer's 550 ms wind-up), the manifest equals it exactly. *(gate 2)*
- [x] Every declared event of every `once` state fires exactly once per play, in order. *(gate 3, machine level)*
- [x] In the world, rammer anim telegraphs equal its wind-ups, its charge fires `hit`, and player anim spawns equal volleys. *(gate 3, in-world scenarios)*
- [x] Two runs of one seed produce identical (state, frame) sequences. *(gate 4)*
- [x] The frame-advance path allocates nothing per frame: pose, ring and manifest keep object identity across 1,000 updates. *(gate 5)*
- [x] Adding the machines did not change gameplay: the 12-seed full-run harness reproduces its pre-animation fingerprints exactly. *(sim/simulate.mjs, run 2026-11-17)*

## Playtest checks
1. Open the game, hold fire: the nose cannon visibly recoils per volley and the propeller speeds up under way. Mute with M: the button in the corner slashes.
2. Fight a wave-10+ dreadnought: the bow muzzle heats through the telegraph before the beam fires.

## History
- 2026-11-17: criteria written and proven.
