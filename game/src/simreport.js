// simreport.js — the balance record, measured, not asserted.
//
// sim/simulate.mjs plays this exact simulation headlessly: botControls
// flies the Dawnbreaker, botDraftIndex drafts, twelve seeds, each played
// twice. The twin runs of every seed produced identical fingerprints —
// the run is deterministic — and every structural check passed: waves
// advance one at a time, a draft follows every cleared wave, a
// dreadnought is met on waves 5, 10 and 15, hull and gold never go
// negative, and every run ends. Reproduce with: node sim/simulate.mjs
//
// What the table says, honestly: the autopilot is a competent but
// unglamorous pilot — it holds a fixed stand-off, dodges shells it can
// see, and does not read beam telegraphs the way a human does. It won
// once in twelve and its median death was wave 9, with the losses
// spread from wave 5 to wave 13. The game is hard for a robot that
// cannot read a telegraph; the wave-15 win proves the full loop —
// fifteen waves, fourteen drafts, three dreadnoughts — closes.

export const SIM_REPORT = {
  harness: 'sim/simulate.mjs (node, headless, the browser game\'s own world module)',
  seeds: 12,
  runsPerSeed: 2,
  stepHz: 120,
  verdict: 'ALL CHECKS PASSED',
  wins: 1,
  medianFinalWave: 9,
  rows: [
    // seed, result, final wave, kills, accuracy %, minutes, gold earned, bosses met, fingerprint
    ['cloudbrawl-sim-101', 'LOSS', 5, 47, 65, 2.2, 159, '5', '9915f27a'],
    ['cloudbrawl-sim-102', 'LOSS', 5, 43, 64, 2.0, 128, '5', '723977a9'],
    ['cloudbrawl-sim-103', 'LOSS', 8, 107, 53, 3.9, 466, '5', 'e4c5283e'],
    ['cloudbrawl-sim-104', 'LOSS', 13, 229, 59, 7.7, 1167, '5,10', '536fbac7'],
    ['cloudbrawl-sim-105', 'LOSS', 10, 134, 50, 5.1, 610, '5,10', '89c2a618'],
    ['cloudbrawl-sim-106', 'LOSS', 10, 137, 50, 5.1, 591, '5,10', 'bc607a9f'],
    ['cloudbrawl-sim-107', 'LOSS', 10, 135, 42, 5.0, 580, '5,10', '5ca839b0'],
    ['cloudbrawl-sim-108', 'WIN', 15, 300, 56, 9.8, 1914, '5,10,15', 'b5b084fc'],
    ['cloudbrawl-sim-109', 'LOSS', 9, 122, 43, 4.3, 536, '5', '3a819bfd'],
    ['cloudbrawl-sim-110', 'LOSS', 9, 127, 49, 4.5, 572, '5', '24223c6f'],
    ['cloudbrawl-sim-111', 'LOSS', 9, 125, 56, 4.4, 589, '5', '5af2f908'],
    ['cloudbrawl-sim-112', 'LOSS', 8, 102, 60, 3.8, 478, '5', 'eb8f8fda'],
  ],
  reading: [
    'The winning run banked 1,914 gold across 300 kills in 9.8 minutes —',
    'the bot leaves coins unbanked under fire, so a human purse runs higher.',
    'Deaths cluster at the boss waves and just after them: the dreadnought',
    'plus its escort is the wall the build has to be ready for, which is',
    'why the draft pool front-loads damage and the Forge Pact exists.',
  ],
};
