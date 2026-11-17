# Combat loop

**Status:** implemented · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

The moment-to-moment game: fly the Dawnbreaker with thrust and drift, aim with the mouse, hold fire, and keep the sky's pirates off the Skyforge. It serves pillar 1 (legibility) — every threat announces itself: bombers arc bombs you can see coming, rammers shake and glow before they charge, snipers sit far and shoot slow, carriers telegraph by launching skiffs.

## Rules
1. The ship accelerates under thrust and drifts with drag; it is clamped to the sky with a margin, and its cannon tracks the aim point exactly.
2. Firing is continuous while held: a volley every `1/(6.5 × fireRateMul)` seconds, each bullet living 1.15 s at 760 u/s before upgrades.
3. Pirates fly their class steering (world.js STEPPERS): skiffs weave at the player, bombers hold range and drop arcing bombs, rammers stalk → telegraph (0.55 s) → charge → recover, snipers keep 430–560 units and fire slow aimed shots, carriers drift high and launch a skiff every ~7 s (max 5 alive).
4. Contact with a pirate hurts both ships; a charging rammer deals 1.6× its contact damage.
5. A killed pirate drops its gold as coins. Coins drift, are magnetised within 120 units, bank inside 30 units, and blow away unbanked after 9 s — the economy's only sink.
6. Inside the forge's gold ring (radius 190 × pact factor) the hull mends at 7/s × repairMul. There is no other healing except Ironwood Hull's mend-on-pick and Second Wind.
7. Hull at zero ends the run — unless Second Wind was drafted and unused: hull restores to 35, shells clear, pirates are blown back 190 units. Once per run.

## Numbers
| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Ship hull | 100 | hp | Deaths before wave 5 mean the teach waves bite too hard |
| Cannon damage / rate | 9 / 6.5 | hp per bullet / volleys per s | Time-to-kill on a wave-1 skiff (18 hp) is two volleys |
| Pirate hull (wave 1) | 18–120 by class | hp | Carrier at 120 is the wave-7 priority lesson |
| Wave scaling | hull ×1.09^(w−1), speed ×1.045 (cap 1.45), damage ×1.05^(w−1) | — | Late waves must pressure without outrunning the ship (top speed ~330 u/s) |
| Coin life | 9 | s | Banked-vs-dropped ratio in the economy ledger (tuning report) |

## Edge cases
- Second Wind clears the shell array mid-collision-loop; the loop stops rather than walking a stale array.
- A pirate can never be pushed more than 30 units past the sky's edge — a fight can never park out of bullet reach.
- Pause freezes the fixed-step clock; the animation machines freeze with it (they advance on sim dt only).

## History
- 2026-11-17: documented against the shipped code (world.js, catalog.js, config.js).
