# makefun-best-game-01-v3

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/mangkarones3-afk/makefun-best-game-01-v3/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/mangkarones3-afk/makefun-best-game-01-v3/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**CLOUDBRAWL** — a bright daylight sky-arena survival game. You pilot the airship
*Dawnbreaker* over the floating Skyforge and hold the sky against fifteen waves of
sky pirates: five pirate classes (skiff, bomber, rammer, sniper kite and carrier),
a draft of one-of-three upgrades between every wave from a pool of twelve, a gold
economy, and a dreadnought boss at waves 5, 10 and 15. Sink the last dreadnought
to win; if your hull reaches zero, the forge falls with you.

Twin-stick controls: WASD or arrows to fly, mouse to aim, click or hold to fire.
On touch screens a left thumbstick flies the ship and it fires on its own at the
nearest pirate. P or Esc pauses. Everything is drawn and synthesised in code —
canvas art, WebAudio sound, a deterministic seeded run — with no asset files and
no build step.

## Run it

```sh
node serve.ts            # serves game/ at http://localhost:8123
# or hand the entry in the way the grader does:
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` into the output directory and writes
`dossier.json` there with the vendored make.fun library, rebuilding it once from
the written output to prove the bytes match. `sim/simulate.mjs` plays the game
headlessly with an autopilot across twelve seeds and checks the whole loop —
waves, drafts, bosses, win and lose — twice over. `sim/montecarlo.mjs` fights
each boss wave and the wave-13 press 10,000 times per reported number for the
tuning report in `game/src/tuning.js`; `sim/animqa.mjs` runs the animation
state machines' five QA gates. The design lives in `docs/GDD.md` with a feature
index; the art contract is `DESIGN.md`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ram1fzcx&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
