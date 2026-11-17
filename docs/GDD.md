# CLOUDBRAWL — Game Design Document

**Version:** 1.0 · **Updated:** 2026-11-17 · [Features](#feature-index) · [Decisions](#decisions) · [Change log](#change-log)

## Summary
You are the Dawnbreaker, the last airship guarding the floating Skyforge. Fifteen waves of sky pirates — five classes, three dreadnought bosses — come to take it; you fly, aim and fire in real time, draft one upgrade after every held wave, and win by sinking the third dreadnought, the Skyfall. Lose the hull and the forge falls. A run is one sitting, about twelve minutes, and a seed is a whole run: the same seed always plays the same.

| | |
|---|---|
| Genre and camera | 2D arena survival shooter, fixed 1280×800 side view |
| Audience | Casual-to-core web players; readable at a glance, hard to master |
| Platforms and input | Browser (phone or desktop), no install. WASD/arrows + mouse aim/fire, or one-thumb touch with auto-fire |
| Session | One run of 15 waves, ~12 minutes; results screen grades the run S/A/B/C/D |
| Engine | Vanilla canvas + Web Audio, no framework, no assets — all art and sound are code |
| Scope | make.fun best-game-01 entry; single file set under `game/`, deterministic seeded sim |
| References | Castle-defense wave shooters for the hold-the-line fantasy; shmup draft builds for the between-wave choices |

## Pillars
1. **The sky is bright and the fight is legible.** Daylight palette, navy outlines, danger always the warmest colour on frame. This rules out dark mood palettes and any effect that hides a telegraph.
2. **Every wall is fair for the build that meets it.** Bosses are tuned by Monte Carlo simulation (≥10,000 fights per matchup), not by feel; a loss should read as the run's story, never as a rigged fight.
3. **The draft is the strategy.** Fourteen choices of three from a 12-upgrade pool; no two runs assemble the same ship. Gold is the score, never a shop currency — the spender is the wave itself.
4. **A seed is a promise.** One seeded generator deals waves, spawns, scatter and drafts; the headless sim replays a run exactly, and the balance evidence in the dossier is measured from that same code.

## Core loop
```
fly and shoot the wave → bank the pirates' gold → draft one upgrade → next wave, harder → dreadnought every fifth wave
```
- **Seconds:** aim, fire, dodge shells and rams, chase coins before they blow away — [combat loop](features/combat-loop/design.md).
- **Minutes:** clear a wave, take the draft's one card, mend in the forge's ring — [draft and build](features/draft-and-build/design.md).
- **Session and between sessions:** fifteen waves in three five-wave movements, each closing on a dreadnought; the results screen grades the whole run — [waves and bosses](features/waves-and-bosses/design.md).

## Feature index

| Feature | Status | Scope | Summary | Docs |
|---|---|---|---|---|
| Combat loop | implemented | MVP | Fly/aim/fire, five pirate classes, forge-ring mending, gold coins with a 9 s fuse | [design](features/combat-loop/design.md) |
| Draft and build | implemented | MVP | After each held wave, 1 of 3 cards from a 12-upgrade pool, stack caps, build read back on the results screen | [design](features/draft-and-build/design.md) |
| Waves and bosses | implemented | MVP | 15 authored rosters, sawtooth pacing, dreadnoughts at 5/10/15 with telegraphed beams and broadsides | [design](features/waves-and-bosses/design.md) |
| Animation | implemented | MVP | Manifest-driven state machines on the sim clock; poses are keyframed parameters of the procedural art | [design](features/animation/design.md) |
| Audio | implemented | MVP | Procedural Web Audio SFX cores + a lookahead BGM sequencer (title/combat/boss), two-bus mix, persisted mute | [design](features/audio/design.md) |

## Milestones
1. **M1, the whole run playable:** waves, draft, three bosses, win/lose, graded results · done when: the headless sim plays full runs end to end on 12 seeds with all structural checks passing.
2. **M2, the judged surface:** four staged screenshots (cover, title, draft, victory) at 1280×800 with zero page errors · done when: the cover's measured brightness/edge density sit in the target band.
3. **M3, the evidence:** Monte Carlo tuning report and animation QA in the dossier · done when: ≥10,000 simulated fights per reported matchup and all five animation gates pass.

## Decisions

| ID | Date | Decision | Alternatives considered | Why | Affects |
|---|---|---|---|---|---|
| D-001 | 2026-11-17 | Gold is score only; the draft is free | A gold shop between waves | Keeps the loop tight and the economy ledger one-in/one-out; the draft stays the strategic spender | Draft and build, combat loop |
| D-002 | 2026-11-17 | Boss fairness is proven by encounter Monte Carlo with the policy build at full hull; campaign difficulty is measured separately by full-run sims | Tuning by playtime feel | The two questions ("is the wall fair", "is the run hard") have different answers and must not be conflated | Waves and bosses |
| D-003 | 2026-11-17 | Animation is pose keyframes on state machines, not sprite sheets | Generated sprite sheets | The art is procedural vector drawing; keyframed pose parameters keep one art source and full determinism | Animation |
| D-004 | 2026-11-17 | BGM is a Web Audio step sequencer; no audio files, no Strudel (AGPL) | Looping audio assets | Zero assets fits the dossier and the licence stays clean | Audio |

## Open questions
- **Assumptions to confirm:** none outstanding — every number in the feature notes is read from the code or the sim output.
- **Risks:** the reference autopilot is a competent duellist, so encounter win rates overstate human ease on a first run; the degraded-pilot cohort in the tuning report bounds that risk.

## Change log
**1.0 (2026-11-17):** first full GDD, written against the finished build (mode D sync): all five features implemented; numbers verified against `game/src/` and the sim harnesses.
