# Waves and bosses

**Status:** implemented · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

Fifteen authored rosters in three movements, each closing on a dreadnought. Composition is procedural but authored (waves.js): each wave's class counts are hand-set, and the seed deals only spawn sides, exact seconds and small count jitter — wave 7 always *means* the same fight. Pacing follows the level-design discipline: teach first, sawtooth pressure, relief after every climax, a rising press into the next one.

## Rules
1. A wave is a spawn schedule worked over ~8–40 s (55 s on boss waves, so escorts keep arriving while the dreadnought fights — a boss is never a duel).
2. The wave is clear when the schedule is exhausted, no pirate lives, and no boss lives. Wave 15 clear wins the run.
3. Dreadnoughts enter from the right sky and hover at (905, 208) with a slow drift. Broadsides fan `guns` shells every `cooldown` seconds. The two beam dreadnoughts telegraph (aim tracks the player, settling late), then fire a 30-unit corridor for `fire` seconds.
4. Boss kills pay a gold purse and a score bonus an order above any pirate's.

## Numbers — the pacing beats (measured from rosters × catalog, wave scaling applied)
Intensity is total hull in the wave including the boss. The shape is the design: teach (W1–2), first climax at W5, relief at W6 (hull drops 63%), rebuild to the W10 climax, relief at W11 (−45%), then the long press W12–14 into the Skyfall.

| Wave | Pirates | Total hull | Beat |
|---|---|---|---|
| 1 | 6 | 108 | teach: skiffs only |
| 2 | 9 | 241 | teach: first bomber |
| 3 | 11 | 336 | rammers arrive |
| 4 | 14 | 526 | first sniper kite |
| 5 | 13 + Brassjaw | 1,971 | climax 1 (broadside only, no beam) |
| 6 | 17 | 738 | relief |
| 7 | 19 | 1,144 | first carrier |
| 8 | 22 | 1,378 | pressure |
| 9 | 24 | 1,711 | the press before the Coalbaron |
| 10 | 19 + Coalbaron | 4,047 | climax 2 (beam, 1.5 s telegraph) |
| 11 | 27 | 2,199 | relief |
| 12 | 29 | 2,890 | two carriers |
| 13 | 33 | 3,444 | the full fleet |
| 14 | 34 | 3,970 | the press before the Skyfall |
| 15 | 23 + Skyfall | 6,645 | final climax (beam 1.3 s, launches skiffs) |

| Boss | Hull | Broadside | Beam |
|---|---|---|---|
| Brassjaw (W5) | 1,450 | 5 guns × 9 dmg / 3.4 s | — |
| Coalbaron (W10) | 2,600 | 6 × 10 / 3.1 s | 26 dmg, 1.5 s telegraph, 0.9 s fire |
| Skyfall (W15) | 3,900 | 7 × 11 / 2.8 s | 34 dmg, 1.3 s telegraph, 1.0 s fire, launches skiffs |

## Tuning evidence
Fairness is measured, not asserted (decision D-002): `sim/montecarlo.mjs` fights each boss wave and the wave-13 press 10,000 times per reported number with the policy build at full hull, and `sim/simulate.mjs` plays whole runs for the campaign picture. The results ship in the dossier as `game/src/tuning.js` and are summarised in the GDD change log when they move.

## Edge cases
- Count jitter (±1 on classes with ≥6) never changes a wave's meaning: the roster is the argument, the jitter is weather.
- The wave-15 clear check is the same as every wave's: schedule exhausted, no boss, AND no live pirates. Sinking the Skyfall does not end the run while its launched skiffs still fly — the honour guard must be finished, which is why the results screen's kill count on a win is always the full sky's.

## History
- 2026-11-17: documented against the shipped code (waves.js ROSTERS, catalog.js); hull table computed from the code, not estimated.
