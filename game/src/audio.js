// audio.js — CLOUDBRAWL's sound, synthesised: no files, only oscillators.
//
// Built on the game-audio discipline: one-shot SFX from three cores
// (playTone / playNotes / playNoise, each an oscillator or the shared
// noise buffer through a lowpass and an exponential envelope), a lookahead
// step sequencer for the music, and a two-bus mix — music and SFX under
// one master gain, so the mute is a single control point. Levels follow
// the mixing guide: melody 0.10–0.18, bass 0.15–0.22, arp 0.03–0.08,
// impacts 0.2–0.3, UI 0.15–0.25, all under a 0.5 master. The mute choice
// persists in localStorage. The context is created lazily on the first
// user gesture (browsers refuse it sooner), and every call is safe before
// that — silent — and in the headless simulator, which never imports
// this module at all. Web Audio core only; no libraries.

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let noiseBuffer = null;
let muted = readMutedPref();
let musicMode = null; // the mode the caller wants playing
let sequencer = null; // the running sequencer handle, if any

function readMutedPref() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('cloudbrawl-muted') === 'true';
  } catch (_) {
    return false;
  }
}

/** Create the context and the buses on a user gesture; harmless to call
 *  repeatedly. Starts the music if a mode was already requested. */
export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.9;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 1.0;
  sfxBus.connect(master);
  // Two seconds of white noise, shared by every explosion and gust —
  // playNoise reads it instead of building a buffer per call.
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  if (musicMode && !muted) startSequencer(musicMode);
}

/** The mute: one control point (the master gain), persisted. Muting
 *  also stops the sequencer's timer; unmuting resumes the mode. */
export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('cloudbrawl-muted', String(muted));
  } catch (_) {
    /* private mode: the choice just lasts the session */
  }
  if (master) master.gain.value = muted ? 0 : 0.5;
  if (muted) stopSequencer();
  else if (ctx && musicMode) startSequencer(musicMode);
  return muted;
}

export function isMuted() {
  return muted;
}

function ready() {
  return ctx !== null && !muted;
}

// ------------------------------------------------------------- the cores

/** One oscillator note: frequency, optional glide, lowpass, envelope. */
function playTone(freq, type, duration, gain = 0.25, filterFreq = 4000, freqEnd = null, delay = 0) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(filterFreq, t0);
  osc.connect(f).connect(g).connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** A run of notes at a fixed gap — fanfares, chimes, alarms. */
function playNotes(notes, type, noteDuration, gap, gain = 0.25, filterFreq = 4000, delay = 0) {
  notes.forEach((freq, i) => playTone(freq, type, noteDuration, gain, filterFreq, null, delay + i * gap));
}

/** Filtered noise from the shared buffer: explosions, wind, tearing. */
function playNoise(duration, gain = 0.2, lpfFreq = 4000, hpfFreq = 0, delay = 0) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(lpfFreq, t0);
  if (hpfFreq > 0) {
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(hpfFreq, t0);
    src.connect(hpf).connect(lpf).connect(g).connect(sfxBus);
  } else {
    src.connect(lpf).connect(g).connect(sfxBus);
  }
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

// ------------------------------------------------------------------ SFX

/** The cannon firing: a short square bark that drops. */
export function sfxShoot() {
  playTone(340, 'square', 0.09, 0.12, 3000, 130);
  playNoise(0.05, 0.05, 2400);
}

/** An enemy shot: thinner, higher, meaner. */
export function sfxEnemyShoot() {
  playTone(620, 'sawtooth', 0.08, 0.05, 3000, 300);
}

/** A dreadnought broadside: a heavier volley bark. */
export function sfxBroadside() {
  playTone(300, 'sawtooth', 0.16, 0.09, 1600, 130);
  playNoise(0.12, 0.06, 1200);
}

/** A hit landing on a pirate: a tick. */
export function sfxHit() {
  playTone(900, 'triangle', 0.045, 0.1, 4000, 500);
}

/** A hit landing on the Dawnbreaker: a duller, worrying thud. */
export function sfxHurt() {
  playTone(190, 'triangle', 0.16, 0.22, 1200, 70);
  playNoise(0.12, 0.12, 700);
}

/** Something burns and falls: noise bloom with a falling tone under it. */
export function sfxExplosion(big = false) {
  playNoise(big ? 0.7 : 0.38, big ? 0.34 : 0.22, big ? 500 : 800);
  playTone(big ? 130 : 200, 'sine', big ? 0.6 : 0.3, big ? 0.3 : 0.18, 900, 40);
}

/** A coin banked: two bright notes, up a fifth. */
export function sfxCoin() {
  playNotes([1180, 1770], 'sine', 0.12, 0.055, 0.1, 6000);
}

/** The draft opening: a small rising fanfare. */
export function sfxDraft() {
  playNotes([523, 659, 784], 'triangle', 0.2, 0.09, 0.14, 4000);
}

/** A card chosen: a stamp of approval (a UI sound, kept subtle). */
export function sfxPick() {
  playNotes([392, 587], 'square', 0.16, 0.07, 0.16, 4000);
}

/** A wave arriving: a two-note horn over the sky. */
export function sfxWaveHorn() {
  playNotes([392, 523], 'triangle', 0.28, 0.14, 0.12, 2400);
}

/** A wave held: the clear chime, rising and settling. */
export function sfxWaveclear() {
  playNotes([659, 784, 1047], 'triangle', 0.22, 0.08, 0.13, 4200);
}

/** The dreadnought arriving: two alarm swells. */
export function sfxBossAlarm() {
  playNotes([196, 185], 'sawtooth', 0.5, 0.32, 0.15, 1600);
  playNoise(0.7, 0.06, 400);
}

/** The beam charging: a rising whine that promises trouble. */
export function sfxBeamCharge() {
  playTone(220, 'sine', 0.9, 0.08, 3000, 990);
}

/** The beam firing: a tearing buzz. */
export function sfxBeamFire() {
  playTone(90, 'sawtooth', 0.8, 0.22, 1600, 55);
  playNoise(0.8, 0.16, 1600);
}

/** A rammer winding up: two low warning pulses. */
export function sfxRamWarn() {
  playNotes([98, 98], 'square', 0.11, 0.13, 0.16, 700);
}

/** A carrier launching a skiff: soft mechanical pops. */
export function sfxLaunch() {
  playNotes([300, 380, 460], 'sine', 0.07, 0.05, 0.07, 2400);
}

/** Second Wind: the sky itself takes a breath — a rising sweep into a
 *  bright chord. */
export function sfxSecondWind() {
  playTone(220, 'sine', 0.5, 0.16, 3000, 880);
  playNotes([523, 659, 784], 'triangle', 0.3, 0.09, 0.12, 4000, 0.3);
}

/** Victory: the fanfare, finished. */
export function sfxWin() {
  playNotes([523, 659, 784, 1047], 'triangle', 0.24, 0.13, 0.15, 4200);
  playNoise(1.0, 0.05, 3000, 0, 0.2);
}

/** Defeat: the fall, in three descending notes. */
export function sfxLose() {
  [392, 330, 262].forEach((f, i) => playTone(f, 'triangle', 0.3, 0.15, 2000, f * 0.94, i * 0.18));
  playNoise(1.1, 0.1, 500, 0, 0.1);
}

// ------------------------------------------------------------------ BGM
//
// A lookahead step sequencer (the game-audio pattern): a 25 ms timer
// schedules notes up to 0.12 s ahead of the playback cursor, so timing
// is sample-accurate with zero drift. Anti-repetition: four melody
// phrases cycle; the arp layer is 24 steps against the others' 32, so
// layers realign only after 96 steps; arp notes drop out at random.
// Exact repetition is minutes away in every mode.

const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
};

/** "C4 R G4" → note objects; R is a rest. */
function parsePattern(str, type, gain, lpf) {
  return str.split(' ').map((n) => (n === 'R' ? { freq: 0 } : { freq: NOTES[n] || 0, type, gain, lpf }));
}

/** The three scores. Progressions: title/combat ride C–G–Am–F; the boss
 *  turns it around (Am–F–C–G) and drives harder. */
const SCORES = {
  title: {
    bpm: 92,
    layers: () => [
      {
        phrases: [
          parsePattern('E4 R G4 R A4 R G4 R E4 R D4 R C4 R R R E4 R G4 R A4 R G4 R E4 R D4 R E4 R R R', 'triangle', 0.13, 2000),
          parsePattern('A4 R G4 R E4 R G4 R A4 R C5 R A4 R G4 R E4 R G4 R A4 R G4 R E4 R D4 R C4 R R R', 'triangle', 0.13, 2000),
          parsePattern('C4 R E4 R G4 R E4 R F4 R A4 R F4 R D4 R E4 R G4 R E4 R D4 R C4 R D4 R E4 R R R', 'triangle', 0.13, 2000),
          parsePattern('G4 R A4 R G4 R E4 R D4 R E4 R D4 R C4 R D4 R E4 R G4 R A4 R G4 R E4 R R R R R', 'triangle', 0.13, 2000),
        ],
      },
      { pattern: parsePattern('C3 R R R R R C3 R G3 R R R R R G3 R A3 R R R R R A3 R F3 R R R R R F3 R', 'triangle', 0.19, 500) },
      { pattern: parsePattern('C5 R E5 R G5 R E5 R C5 R E5 R G5 R E5 R G5 R A5 R G5 R E5 R C5 R', 'sine', 0.045, 1200), sparse: true },
    ],
  },
  combat: {
    bpm: 108,
    layers: () => [
      {
        phrases: [
          parsePattern('C4 E4 G4 E4 A4 G4 E4 D4 C4 E4 G4 E4 D4 E4 D4 R E4 G4 A4 G4 E4 G4 A4 C5 A4 G4 E4 D4 E4 D4 R', 'square', 0.11, 2200),
          parsePattern('A4 G4 E4 G4 A4 C5 A4 G4 E4 G4 A4 G4 E4 D4 C4 D4 E4 G4 E4 D4 C4 D4 E4 R E4 G4 A4 G4 E4 R', 'square', 0.11, 2200),
          parsePattern('F4 A4 F4 A4 C5 A4 F4 A4 G4 B4 G4 B4 D5 B4 G4 B4 C5 E5 C5 E5 G5 E5 C5 E5 D5 F5 D5 F5 A5 F5 D5 R', 'square', 0.11, 2200),
          parsePattern('E4 G4 A4 G4 E4 G4 A4 C5 A4 G4 E4 D4 C4 E4 G4 E4 D4 E4 F4 D4 E4 D4 C4 R R R E4 R R R', 'square', 0.11, 2200),
        ],
      },
      { pattern: parsePattern('C3 C3 R C3 C3 R C3 R G3 G3 R G3 G3 R G3 R A3 A3 R A3 A3 R A3 R F3 F3 R F3 F3 R F3 R', 'triangle', 0.2, 500) },
      { pattern: parsePattern('C5 E5 G5 E5 C5 E5 G5 E5 D5 F5 A5 F5 D5 F5 A5 F5 E5 G5', 'square', 0.04, 1000), sparse: true },
      { pattern: parsePattern('C3 R R R C3 R R R C3 R R R C3 R R R C3 R R R C3 R R R C3 R R R C3 R R R', 'sine', 0.24, 200), kick: true },
    ],
  },
  boss: {
    bpm: 122,
    layers: () => [
      {
        phrases: [
          parsePattern('A4 A4 C5 A4 A4 E4 A4 A4 F4 F4 A4 F4 F4 C4 F4 F4 C5 C5 E5 C5 C5 G4 C5 C5 B4 B4 D5 B4 B4 G4 B4 R', 'square', 0.12, 2400),
          parsePattern('A4 C5 E5 C5 A4 C5 E5 C5 F5 E5 C5 E5 F5 A5 F5 E5 E5 D5 B4 D5 E5 G5 E5 D5 D5 C5 A4 C5 D5 E5 D5 R', 'square', 0.12, 2400),
          parsePattern('A4 A4 C5 A4 A4 E4 A4 A4 F4 F4 A4 F4 F4 C4 F4 F4 G4 G4 B4 G4 G4 D4 G4 G4 A4 A4 C5 A4 B4 A4 R R', 'square', 0.12, 2400),
          parsePattern('E5 E5 D5 C5 A4 C5 E5 R D5 D5 C5 A4 G4 A4 C5 R A4 A4 C5 A4 A4 E4 A4 A4 F4 A4 G4 A4 R R R R', 'square', 0.12, 2400),
        ],
      },
      { pattern: parsePattern('A3 A3 R A3 A3 R A3 R F3 F3 R F3 F3 R F3 R C3 C3 R C3 C3 R C3 R G3 G3 R G3 G3 R G3 R', 'triangle', 0.21, 500) },
      { pattern: parsePattern('A4 C5 E5 C5 A4 C5 E5 C5 F5 A5 F5 A5 F5 A5 F5 A5 G5', 'square', 0.045, 1100), sparse: true },
      { pattern: parsePattern('C3 R R R C3 R R R C3 R R R C3 R C3 R C3 R R R C3 R R R C3 R R R C3 R R C3 R', 'sine', 0.26, 200), kick: true },
    ],
  },
};

function scheduleNote(note, t0, stepDur) {
  const osc = ctx.createOscillator();
  osc.type = note.type || 'square';
  osc.frequency.setValueAtTime(note.freq, t0);
  if (note.kick) osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.11);
  const g = ctx.createGain();
  g.gain.setValueAtTime(note.gain ?? 0.14, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + (note.kick ? 0.12 : stepDur * 0.92));
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(note.lpf || 3000, t0);
  osc.connect(f).connect(g).connect(musicBus);
  osc.start(t0);
  osc.stop(t0 + stepDur);
}

function startSequencer(mode) {
  stopSequencer();
  const score = SCORES[mode];
  if (!score || !ctx) return;
  const layers = score.layers();
  const stepDur = 60 / score.bpm / 2; // eighth notes
  let nextStepTime = ctx.currentTime + 0.06;
  let stepIndex = 0;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    while (nextStepTime < ctx.currentTime + 0.12) {
      for (const layer of layers) {
        let note = null;
        if (layer.phrases) {
          const phrase = layer.phrases[Math.floor(stepIndex / 32) % layer.phrases.length];
          note = phrase[stepIndex % phrase.length];
        } else {
          note = layer.pattern[stepIndex % layer.pattern.length];
        }
        if (note && note.freq > 0) {
          if (layer.sparse && Math.random() > 0.85) continue; // organic dropouts
          scheduleNote({ ...note, kick: layer.kick }, nextStepTime, stepDur);
        }
      }
      stepIndex += 1;
      nextStepTime += stepDur;
    }
    timer = setTimeout(tick, 25);
  };
  let timer = setTimeout(tick, 25);
  sequencer = {
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}

function stopSequencer() {
  if (sequencer) {
    sequencer.stop();
    sequencer = null;
  }
}

/** Ask for a music mode: 'title' | 'combat' | 'boss' | null (silence).
 *  Safe before the context exists — the mode starts on initAudio. */
export function setMusicMode(mode) {
  if (mode === musicMode) return;
  musicMode = mode;
  if (!ctx || muted) return;
  if (mode) startSequencer(mode);
  else stopSequencer();
}

/** Stop the music entirely (the mode is forgotten). */
export function stopMusic() {
  musicMode = null;
  stopSequencer();
}
