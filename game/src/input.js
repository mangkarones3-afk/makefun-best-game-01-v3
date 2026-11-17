// input.js — hands on the ship: keyboard, mouse and touch, one state.
//
// The world reads a single input shape every step — { moveX, moveY, aimX,
// aimY, firing } — and never asks where it came from. The keyboard flies by
// WASD or arrows; the mouse aims and its button fires; on a touch screen
// the left thumb is a floating stick that flies the ship, and the ship aims
// and fires on its own at the nearest pirate (main.js passes the target
// in), because two thumbs cannot hold a mouse. Pause and mute are edge
// events, queued for main.js to consume.

/** The shared input state. Coordinates are in world units (1280×800). */
export function makeInput() {
  return {
    keys: new Set(),
    mouseX: 640,
    mouseY: 340,
    mouseDown: false,
    touchMode: false,
    stickActive: false,
    stickId: null,
    stickOriginX: 0,
    stickOriginY: 0,
    stickX: 0,
    stickY: 0,
    events: [], // 'pause' | 'mute' | 'any' — consumed by main.js
  };
}

/** Convert a pointer event's client point into world units for a canvas
 *  that is scaled by CSS to fit its box. */
function toWorld(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * canvas.width,
    y: ((clientY - r.top) / r.height) * canvas.height,
  };
}

/** Wire the listeners. Returns a detach function (unused in play, handy in tests). */
export function attachInput(input, canvas) {
  const down = (e) => {
    input.events.push('any');
    if (e.code === 'KeyP' || e.code === 'Escape') input.events.push('pause');
    if (e.code === 'KeyM') input.events.push('mute');
    input.keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  };
  const up = (e) => input.keys.delete(e.code);
  const move = (e) => {
    const p = toWorld(canvas, e.clientX, e.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
  };
  const mDown = (e) => {
    input.events.push('any');
    move(e);
    if (e.pointerType === 'mouse') input.mouseDown = true;
  };
  const mUp = (e) => {
    if (e.pointerType === 'mouse') input.mouseDown = false;
  };
  const tStart = (e) => {
    input.events.push('any');
    for (const t of e.changedTouches) {
      const p = toWorld(canvas, t.clientX, t.clientY);
      if (p.x < canvas.width / 2 && input.stickId === null) {
        input.touchMode = true;
        input.stickActive = true;
        input.stickId = t.identifier;
        input.stickOriginX = p.x;
        input.stickOriginY = p.y;
        input.stickX = p.x;
        input.stickY = p.y;
      }
    }
    if (input.touchMode) e.preventDefault();
  };
  const tMove = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === input.stickId) {
        const p = toWorld(canvas, t.clientX, t.clientY);
        input.stickX = p.x;
        input.stickY = p.y;
      }
    }
    if (input.touchMode) e.preventDefault();
  };
  const tEnd = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === input.stickId) {
        input.stickActive = false;
        input.stickId = null;
      }
    }
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerdown', mDown);
  window.addEventListener('pointerup', mUp);
  canvas.addEventListener('touchstart', tStart, { passive: false });
  canvas.addEventListener('touchmove', tMove, { passive: false });
  canvas.addEventListener('touchend', tEnd);
  canvas.addEventListener('touchcancel', tEnd);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerdown', mDown);
    window.removeEventListener('pointerup', mUp);
    canvas.removeEventListener('touchstart', tStart);
    canvas.removeEventListener('touchmove', tMove);
    canvas.removeEventListener('touchend', tEnd);
    canvas.removeEventListener('touchcancel', tEnd);
  };
}

/**
 * Read the input as the world wants it. `autoTarget` is where a touch
 * player's ship should aim (the nearest pirate, chosen by main.js); with
 * no target a touch ship aims ahead of its motion and does not fire.
 */
export function readControls(input, autoTarget) {
  let moveX = 0;
  let moveY = 0;
  const k = input.keys;
  if (k.has('KeyA') || k.has('ArrowLeft')) moveX -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) moveX += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) moveY -= 1;
  if (k.has('KeyS') || k.has('ArrowDown')) moveY += 1;
  if (input.stickActive) {
    const dx = (input.stickX - input.stickOriginX) / 55;
    const dy = (input.stickY - input.stickOriginY) / 55;
    const len = Math.hypot(dx, dy);
    const cap = len > 1 ? 1 / len : 1;
    moveX = dx * cap;
    moveY = dy * cap;
  } else {
    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }
  }
  if (input.touchMode) {
    return {
      moveX,
      moveY,
      aimX: autoTarget ? autoTarget.x : input.mouseX,
      aimY: autoTarget ? autoTarget.y : input.mouseY,
      firing: !!autoTarget,
    };
  }
  return {
    moveX,
    moveY,
    aimX: input.mouseX,
    aimY: input.mouseY,
    firing: input.mouseDown || k.has('Space'),
  };
}
