# Audio

**Status:** implemented · **Updated:** 2026-11-17 · [GDD](../../GDD.md)

All sound is synthesised Web Audio — no files, no libraries (decision D-004). One-shot SFX come from three cores; the music is a lookahead step sequencer; everything routes through a music bus and an SFX bus under one master gain, which is the mute's single control point.

## Rules
1. SFX cores: `playTone` (oscillator + lowpass + exponential envelope, optional glide), `playNotes` (a run at a fixed gap), `playNoise` (the shared 2 s noise buffer through low/highpass). Every named sound — cannon, hit, hurt, explosion, coin, draft fanfare, beam charge/fire, rammer warning, Second Wind — is a preset over these cores.
2. The world's event channel is the score's conductor: main.js maps events to presets (volleys, hits, wave horns, wave-clear chimes, boss alarm, broadside, launch pops) with light throttling where events chatter.
3. BGM: a 25 ms timer schedules eighth notes up to 0.12 s ahead (no drift). Modes: title 92 BPM, combat 108, boss 122. Anti-repetition: four melody phrases cycle, the arp layer runs 24 steps against the others' 32 (layers realign after 96 steps), and arp notes drop out at random — exact repetition is minutes away.
4. Mix (the game-audio guide's table, under a 0.5 master): melody 0.11–0.13, bass 0.19–0.21, arp 0.04–0.05, kick 0.24–0.26, impacts 0.2–0.34, UI 0.16.
5. Mute (M key or the on-canvas button, drawn on every screen) sets the master gain to 0, stops the sequencer, and persists in `localStorage` (`cloudbrawl-muted`). Unmuting resumes the current mode.

## Numbers
| Name | Value | Unit | What to watch in playtests |
|---|---|---|---|
| Master gain | 0.5 | — | SFX must cut through BGM without clipping on phone speakers |
| Sequencer lookahead | 0.12 | s | Timing stays sample-accurate under frame hitches |
| Boss tempo | 122 | BPM | The dreadnought fights should feel driven, not frantic |

## Edge cases
- The AudioContext is created lazily on the first user gesture; every call before that is a safe no-op, and the headless sim never imports this module.
- A requested music mode before the context exists is remembered and starts on init.

## History
- 2026-11-17: rebuilt from the original tone/noise kit onto the bus + core + sequencer architecture; presets kept their characters and names.
