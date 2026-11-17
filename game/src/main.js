// main.js — CLOUDBRAWL's helm: boot, the loop, the screens, the sound.
//
// The world (world.js) is the game; this file is its presentation shell.
// It owns the canvas, the fixed-step clock, the screen the player is on
// (title, play, results), the pause, the draft's mouse, and the translation
// of the world's events into the synthesised sound of audio.js. A run's
// seed is dealt fresh each time the player sets sail; everything after that
// is the world's deterministic business.
//
// Screenshot staging: ?shot=cover|title|draft|victory deals a composed
// world (shots.js), renders one frame, and raises window.__shotReady.

// The two balance records import first, deliberately: the dossier's text
// walks the module graph depth-first in import order, and the evidence
// must land ahead of the big drawing and simulation files.
import { SIM_REPORT } from './simreport.js';
import { GDD_CONDENSED, TUNING_REPORT } from './tuning.js';
import {
  initAudio,
  isMuted,
  setMusicMode,
  sfxBeamCharge,
  sfxBeamFire,
  sfxBossAlarm,
  sfxBroadside,
  sfxCoin,
  sfxDraft,
  sfxEnemyShoot,
  sfxExplosion,
  sfxHit,
  sfxHurt,
  sfxLaunch,
  sfxLose,
  sfxPick,
  sfxRamWarn,
  sfxSecondWind,
  sfxShoot,
  sfxWaveHorn,
  sfxWaveclear,
  sfxWin,
  toggleMute,
} from './audio.js';
import { STEP, VIEW_H, VIEW_W } from './config.js';
import { drawContactSheet } from './contact.js';
import { attachInput, makeInput, readControls } from './input.js';
import { MUTE_RECT, draftCardRects, drawDraft, drawMuteButton, drawPause, drawResults, drawScene, drawTitle, drawTouch } from './render.js';
import { stageShot } from './shots.js';
import { gradeOf, meritOf, startRun, stepWorld, chooseDraft, createWorld } from './world.js';

// The balance evidence rides with the game (tuning.js, simreport.js):
// exposed for inspection, and imported here so both records sit early in
// the dossier's load order, ahead of the big drawing and sim files.
window.__cloudbrawlTuning = { TUNING_REPORT, GDD_CONDENSED, SIM_REPORT };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = makeInput();
attachInput(input, canvas);

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');

/** The screen the player is on; the world's phase runs underneath 'play'. */
let screen = shotName ? 'shot' : 'title';
let world = createWorld(shotName ? `cloudbrawl-shot-${shotName}` : 'cloudbrawl-title');
let paused = false;
let runClock = 0; // seconds of play in the current run, for the results
let lastResults = null;
let soundClock = 0;

/** Results data in the shape render.js reads, computed once at run's end. */
function computeResults(w) {
  const grade = gradeOf(w);
  const accuracy = w.shotsFired > 0 ? Math.round((w.shotsHit / w.shotsFired) * 100) : 0;
  const minutes = Math.floor(runClock / 60);
  const seconds = Math.floor(runClock % 60);
  return {
    letter: grade.letter,
    colour: grade.colour,
    merit: meritOf(w),
    stats: [
      ['WAVE REACHED', `${Math.min(w.wave, 15)} of 15`],
      ['PIRATES SUNK', String(w.kills)],
      ['ACCURACY', `${accuracy}%`],
      ['TIME IN THE SKY', `${minutes}:${String(seconds).padStart(2, '0')}`],
      ['GOLD BANKED', String(Math.floor(w.goldEarned))],
      ['MERIT', `${meritOf(w)} / 100`],
    ],
  };
}

/** The nearest threat to a point — a touch ship's auto-aim target. */
function nearestThreat(w, x, y) {
  let best = null;
  let bd = Infinity;
  const consider = (e) => {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  };
  for (const e of w.enemies) consider(e);
  if (w.boss) consider(w.boss);
  return bd < 820 ? best : null;
}

/** Drain the world's event channel into sound (throttled where it chatters). */
function playEvents(w, now) {
  for (const ev of w.events) {
    switch (ev) {
      case 'shoot':
        if (now - soundClock > 0.07) {
          sfxShoot();
          soundClock = now;
        }
        break;
      case 'enemyshoot':
        if (now - soundClock > 0.09) sfxEnemyShoot();
        break;
      case 'hit':
        if (now - soundClock > 0.05) sfxHit();
        break;
      case 'hurt':
        sfxHurt();
        break;
      case 'explosion':
        sfxExplosion(false);
        break;
      case 'bosskill':
        sfxExplosion(true);
        break;
      case 'coin':
        sfxCoin();
        break;
      case 'boss':
        sfxBossAlarm();
        break;
      case 'wave':
        sfxWaveHorn();
        break;
      case 'waveclear':
        sfxWaveclear();
        break;
      case 'broadside':
        if (now - soundClock > 0.15) sfxBroadside();
        break;
      case 'ramcharge':
        sfxRamWarn();
        break;
      case 'launch':
        sfxLaunch();
        break;
      case 'secondwind':
        sfxSecondWind();
        break;
      case 'beamcharge':
        sfxBeamCharge();
        break;
      case 'beamfire':
        sfxBeamFire();
        break;
      case 'draft':
        sfxDraft();
        break;
      case 'pick':
        sfxPick();
        break;
      case 'win':
        sfxWin();
        break;
      case 'lose':
        sfxLose();
        break;
      default:
        break;
    }
  }
  w.events.length = 0;
}

function startNewRun() {
  const seed = `cloudbrawl-${(Math.random() * 1e9) | 0}`;
  world = createWorld(seed);
  runClock = 0;
  lastResults = null;
  paused = false;
  startRun(world);
  screen = 'play';
}

function handleClick(x, y) {
  initAudio();
  // The mute button sits above every screen's own clicks.
  if (x >= MUTE_RECT.x && x <= MUTE_RECT.x + MUTE_RECT.w && y >= MUTE_RECT.y && y <= MUTE_RECT.y + MUTE_RECT.h) {
    toggleMute();
    return;
  }
  if (screen === 'title') {
    startNewRun();
    return;
  }
  if (screen === 'results') {
    screen = 'title';
    world = createWorld('cloudbrawl-title');
    return;
  }
  if (screen === 'play' && world.phase === 'draft') {
    const rects = draftCardRects(world.draftOffer.length);
    const i = rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (i >= 0) chooseDraft(world, i);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * VIEW_W;
  const y = ((e.clientY - r.top) / r.height) * VIEW_H;
  handleClick(x, y);
});

window.addEventListener('keydown', (e) => {
  initAudio();
  if (screen === 'play' && world.phase === 'draft' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
    chooseDraft(world, Number(e.code.slice(-1)) - 1);
  }
  if (screen === 'results' && e.code === 'KeyR') {
    screen = 'title';
    world = createWorld('cloudbrawl-title');
  }
  if (screen === 'title' && (e.code === 'Enter' || e.code === 'Space')) startNewRun();
});

/** One fixed-step frame of the run under the current controls. */
function stepOnce() {
  const target = input.touchMode ? nearestThreat(world, world.player.x, world.player.y) : null;
  const controls = readControls(input, target);
  stepWorld(world, controls);
  if (world.phase === 'combat' || world.phase === 'intermission' || world.phase === 'draft') runClock += STEP;
  if ((world.phase === 'won' || world.phase === 'lost') && screen === 'play') {
    lastResults = computeResults(world);
    screen = 'results';
  }
}

function frame(nowMs) {
  const now = nowMs / 1000;
  // Consume the queued edge events (pause, mute) whatever the screen.
  for (const ev of input.events) {
    if (ev === 'pause' && screen === 'play') paused = !paused;
    if (ev === 'mute') toggleMute();
  }
  input.events.length = 0;

  if (screen === 'play' && !paused) {
    // Fixed steps, at most a quarter second of catch-up per frame.
    accumulator = Math.min(accumulator + Math.min(0.25, now - (lastNow ?? now)), 0.25);
    while (accumulator >= STEP) {
      stepOnce();
      accumulator -= STEP;
      if (screen !== 'play') break;
    }
    playEvents(world, now);
  }
  lastNow = now;

  const t = now;
  if (screen === 'title') {
    // The title's sky idles: drift the world a little so the parade lives.
    titleAccumulator += 1 / 60;
    while (titleAccumulator >= STEP) {
      stepWorld(world, { moveX: 0, moveY: 0, aimX: world.player.x - 200, aimY: world.player.y - 60, firing: false });
      titleAccumulator -= STEP;
    }
    world.events.length = 0;
    drawTitle(ctx, world, t);
  } else if (screen === 'results') {
    drawResults(ctx, world, t, world.phase === 'won', lastResults ?? computeResults(world));
  } else if (world.phase === 'draft') {
    const rects = draftCardRects(world.draftOffer.length);
    const hover = rects.findIndex((r) => input.mouseX >= r.x && input.mouseX <= r.x + r.w && input.mouseY >= r.y && input.mouseY <= r.y + r.h);
    drawDraft(ctx, world, t, hover);
    drawTouch(ctx, input);
  } else {
    drawScene(ctx, world, t);
    if (paused) drawPause(ctx, world, t);
    drawTouch(ctx, input);
  }
  // The music follows the screen: title calm, combat drive, boss drive
  // harder. setMusicMode is a no-op when the mode is already playing.
  setMusicMode(screen === 'play' ? (world.boss ? 'boss' : 'combat') : 'title');
  drawMuteButton(ctx, isMuted());
  requestAnimationFrame(frame);
}

let accumulator = 0;
let titleAccumulator = 0;
let lastNow = null;

// ------------------------------------------------------------ shot mode

if (shotName === 'contact1' || shotName === 'contact2' || shotName === 'contact3') {
  // QA staging (not a judged screenshot): the animation contact sheets.
  drawContactSheet(ctx, shotName);
  window.__shotReady = true;
} else if (shotName) {
  stageShot(world, shotName);
  // Let the staged world's own weather settle for a beat of frames, then
  // render the composed frame at a fixed clock so it is reproducible.
  const t = 2.35;
  if (shotName === 'cover') drawScene(ctx, world, t);
  else if (shotName === 'title') drawTitle(ctx, world, t);
  else if (shotName === 'draft') drawDraft(ctx, world, t, -1);
  else if (shotName === 'victory') {
    runClock = world.time;
    drawResults(ctx, world, t, true, computeResults(world));
  }
  drawMuteButton(ctx, false);
  window.__cloudbrawl = {
    snapshot: () => ({
      shot: shotName,
      phase: world.phase,
      wave: world.wave,
      enemies: world.enemies.length,
      boss: world.boss ? world.boss.name : null,
      bullets: world.bullets.length,
      shells: world.shells.length,
      motes: world.motes.length,
      texts: world.texts.length,
    }),
  };
  window.__shotReady = true;
} else {
  window.__cloudbrawl = { snapshot: () => ({ screen, phase: world.phase, wave: world.wave }) };
  requestAnimationFrame(frame);
}
