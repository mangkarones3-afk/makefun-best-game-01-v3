# Draft and build

**Status:** implemented · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

Between waves, the forge crews offer three cards; the player takes one and flies on. Fourteen drafts across fifteen waves assemble the run's build from a pool of twelve upgrades — this is pillar 3, the game's strategy layer. The results screen reads the build back by name, so a run's story includes what the player chose.

## Rules
1. Clearing a wave opens a 2.2 s intermission, then the draft. The run cannot advance until a card is taken (click or keys 1–3); if the pool is ever exhausted the draft is skipped and the next wave begins.
2. The offer is dealt from the run's seeded generator. A card at its stack cap is never offered; an offer is never three cards of one tag while the pool can deal otherwise.
3. Effects apply immediately and permanently. Ironwood Hull also mends by the amount it adds. Forge Pact widens the repair ring as it speeds it (ring × (1 + 0.25 × (repairMul − 1))).
4. Gold is never spent (decision D-001): it is the run's score and its bragging number.

## Numbers
| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Pool | 12 upgrades, caps ×2–×4 | cards | Heavy Shot (×4) and Rapid Cannons (×3) are the damage spine |
| Offer | 3 | cards per draft | A dead offer (three cards the build can't use) should be impossible by the cap rule |
| Drafts per run | 14 | — | The wave-15 fight is met with at most 14 of 38 possible stacks |
| Strongest single card | Twin Mount +1 shot (×2 max) | volley size | With Rapid ×3 and Heavy ×4 the cannon reaches ~4.6× base output |

## Edge cases
- Stack caps are enforced in `applyUpgrade` itself, so no caller (UI, autopilot, staging) can over-stack.
- The autopilot drafts by a fixed preference order (damage, rate, survival, utility); the Monte Carlo policy build is that same order dealt against the real pool.

## History
- 2026-11-17: documented against the shipped code (upgrades.js, catalog.js UPGRADES).
