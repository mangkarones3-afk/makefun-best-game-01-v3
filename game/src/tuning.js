// tuning.js — the balance evidence, generated, not asserted.
//
// Written by sim/write-tuning.mjs from sim/montecarlo.mjs output: every
// matchup below was fought >= 10,000 times by the game's own simulation
// on the declared seed block. Reproduce: node sim/montecarlo.mjs (see
// its header), then node sim/write-tuning.mjs. The one-page GDD is
// condensed here so the dossier carries it; the full text, with the
// feature index and decisions, lives in docs/GDD.md.

export const TUNING_REPORT = {
 "method": "sim/montecarlo.mjs — encounter battles fought by the game's own world module (game/src/world.js) under declared pilot policies, at the sim's fixed 120 Hz step. An encounter starts its wave at full hull with the policy build (the draft policy's preference order dealt against the real pool and caps). Audit seed block 20001–30000 for every base, cohort and sensitivity row (sensitivity rows are paired: same seeds, one lever moved). Full-run campaign numbers: sim/simulate.mjs, 12 seeds x2 (see simreport.js).",
 "matchups": [
  {
   "matchup": "boss5",
   "variant": "base",
   "battles": 10000,
   "winRate": 99.8,
   "wilson95": [
    99.7,
    99.9
   ],
   "durationP50S": 58,
   "hullLeftP50": 0.57,
   "meanGold": 184
  },
  {
   "matchup": "boss10",
   "variant": "base",
   "battles": 10000,
   "winRate": 98.1,
   "wilson95": [
    97.8,
    98.4
   ],
   "durationP50S": 59,
   "hullLeftP50": 0.45,
   "meanGold": 324
  },
  {
   "matchup": "boss15",
   "variant": "base",
   "battles": 10000,
   "winRate": 92.4,
   "wilson95": [
    91.8,
    92.9
   ],
   "durationP50S": 60,
   "hullLeftP50": 0.34,
   "meanGold": 481
  },
  {
   "matchup": "wave13",
   "variant": "base",
   "battles": 10000,
   "winRate": 100,
   "wilson95": [
    99.9,
    100
   ],
   "durationP50S": 45,
   "hullLeftP50": 0.73,
   "meanGold": 93
  }
 ],
 "cohorts": [
  {
   "cohort": "reference autopilot (dodges, leads targets, reads the fight)",
   "rows": [
    {
     "matchup": "boss5",
     "variant": "base",
     "battles": 10000,
     "winRate": 99.8,
     "wilson95": [
      99.7,
      99.9
     ],
     "durationP50S": 58,
     "hullLeftP50": 0.57,
     "meanGold": 184
    },
    {
     "matchup": "boss15",
     "variant": "base",
     "battles": 10000,
     "winRate": 92.4,
     "wilson95": [
      91.8,
      92.9
     ],
     "durationP50S": 60,
     "hullLeftP50": 0.34,
     "meanGold": 481
    }
   ]
  },
  {
   "cohort": "degraded pilot (aim wobble ±0.09 rad, 70% thrust — the novice bound)",
   "rows": [
    {
     "matchup": "boss5",
     "variant": "degraded",
     "battles": 10000,
     "winRate": 100,
     "wilson95": [
      100,
      100
     ],
     "durationP50S": 58,
     "hullLeftP50": 0.63,
     "meanGold": 182
    },
    {
     "matchup": "boss15",
     "variant": "degraded",
     "battles": 10000,
     "winRate": 96.9,
     "wilson95": [
      96.6,
      97.2
     ],
     "durationP50S": 60,
     "hullLeftP50": 0.35,
     "meanGold": 487
    }
   ]
  }
 ],
 "sensitivity": [
  {
   "lever": "player fire rate x0.85",
   "matchup": "boss10",
   "winRate": 91,
   "deltaVsBase": -7.1
  },
  {
   "lever": "boss hull x1.2",
   "matchup": "boss10",
   "winRate": 91.7,
   "deltaVsBase": -6.4
  },
  {
   "lever": "player fire rate x1.2",
   "matchup": "boss10",
   "winRate": 99.7,
   "deltaVsBase": 1.6
  },
  {
   "lever": "boss hull x0.8",
   "matchup": "boss10",
   "winRate": 99.6,
   "deltaVsBase": 1.5
  }
 ],
 "ledger": {
  "runs": 300,
  "fullRunWins": 2,
  "analyticGoldPerWave": [
   18,
   32,
   43,
   61,
   195,
   72.5,
   97.5,
   109,
   124,
   354.5,
   135.5,
   156.5,
   175,
   183,
   578
  ],
  "analyticTotal": 2335,
  "bankedP50": 535,
  "bankedMean": 501,
  "note": "Gold has one sink by design: unbanked coins blow away after 9 s, and the draft is free — gold is the run score and the draft is the spender of waves, not of coin. Banked < analytic is mostly unreached gold (the rich purses sit in waves 10 and 15; the median run ends around wave 9–13) plus coins expiring unbanked under fire — not a leak."
 },
 "verdict": [
  "Every wall is fair for the build that is supposed to meet it: with",
  "the policy build at full hull, the reference pilot takes the Brassjaw",
  "99.8% of the time, the Coalbaron 98.1%,",
  "and the Skyfall 92.4%, finishing the last with",
  "34% of its hull at the median. Even the degraded",
  "pilot sweeps the Brassjaw (100%). No wall is a lottery.",
  "The degraded cohort matches the reference pilot in fresh encounters",
  "(at the Skyfall it even edges it): these fights are DPS-gated, not",
  "reflex-gated — pilot quality is priced over a full run's attrition,",
  "not in one fresh fight at full hull.",
  "The campaign is the hard part — the full-run autopilot won 2",
  "of 300 ledger runs — because a real run arrives at those walls",
  "worn, with a dealt build instead of the policy build. That split is",
  "the design: the fights are fair; the run is the test."
 ]
};

export const GDD_CONDENSED = "CLOUDBRAWL — one-page GDD (condensed; the full text lives in docs/GDD.md).\nYou are the Dawnbreaker, last airship guarding the floating Skyforge.\nFifteen waves of sky pirates in five classes; a dreadnought closes every\nfive waves; sinking the third, the Skyfall, wins the run. Hull zero loses\nit, unless Second Wind was drafted, once. After each held wave, draft one\nof three cards from a 12-upgrade pool — the draft is the strategy; gold\nis the score, never spent. Fly with WASD/arrows, aim with the mouse,\nhold to fire; on touch, one thumb flies and the ship fires itself.\nPillars: (1) bright daylight, legible danger; (2) every wall fair for\nthe build that meets it — proven by Monte Carlo, not asserted; (3) the\ndraft is the strategy; (4) a seed is a promise — one seeded generator,\na headless sim that replays runs exactly. Session: one run, ~12 minutes,\ngraded S/A/B/C/D on the results screen.";
