// Keyboard and mouse input: a held-keys set, pointer-lock orbit angles
// and edge-triggered actions (interact, punch, shoot, reload, pause).
export const ACTION_INTERACT = 'interact';
export const ACTION_PUNCH = 'punch';
export const ACTION_SHOOT = 'shoot';
export const ACTION_RELOAD = 'reload';
export const ACTION_PAUSE = 'pause';
export const ACTION_CONFIRM = 'confirm';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let yaw = 0.6;
  let pitch = 0.32;
  let locked = false;
  let shootHeld = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
    if (event.code === 'Space') event.preventDefault();
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    if (!locked) return;
    yaw -= event.movementX * 0.0032;
    pitch += event.movementY * 0.0026;
    pitch = Math.max(-0.15, Math.min(1.1, pitch));
  }
  function onMouseDown(event) {
    if (event.button === 0) shootHeld = true;
    if (!locked && event.target === canvas) {
      try {
        const lock = canvas.requestPointerLock?.();
        if (lock && lock.catch) lock.catch(() => {});
      } catch {
        // Pointer lock needs a user gesture; the game plays fine without it.
      }
    }
  }
  function onMouseUp(event) {
    if (event.button === 0) shootHeld = false;
  }
  function onLockChange() {
    locked = document.pointerLockElement === canvas;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  document.addEventListener('pointerlockchange', onLockChange);

  return {
    get yaw() { return yaw; },
    set yaw(value) { yaw = value; },
    get pitch() { return pitch; },
    set pitch(value) { pitch = Math.max(-0.15, Math.min(1.1, value)); },
    get locked() { return locked; },
    isDown(code) { return keys.has(code); },
    get forward() { return (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0); },
    get strafe() { return (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0); },
    get run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get jump() { return keys.has('Space'); },
    get shootHeld() { return shootHeld; },
    // True once, on the frame the key went down; call once per frame.
    takePressed(code) {
      if (!pressed.has(code)) return false;
      pressed.delete(code);
      return true;
    },
    actionPressed(action) {
      if (action === ACTION_INTERACT) return this.takePressed('KeyE');
      if (action === ACTION_PUNCH) return this.takePressed('KeyF');
      if (action === ACTION_RELOAD) return this.takePressed('KeyR');
      if (action === ACTION_PAUSE) return this.takePressed('Escape') || this.takePressed('KeyP');
      if (action === ACTION_CONFIRM) return this.takePressed('Enter');
      return false;
    },
    endFrame() { pressed.clear(); },
    lockPointer() {
      try {
        const lock = canvas.requestPointerLock?.();
        if (lock && lock.catch) lock.catch(() => {});
      } catch {
        // Pointer lock needs a user gesture; the game plays fine without it.
      }
    },
  };
}
