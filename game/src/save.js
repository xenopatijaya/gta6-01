// Save and load through localStorage: cash, story progress, best score
// and the player's last spot, so Continue on the start screen resumes.
import { SAVE_KEY } from './config.js';

export function defaultSave() {
  return {
    cash: 50,
    missionIndex: 0,
    missionsDone: 0,
    bestCash: 50,
    playerX: 0,
    playerZ: 20,
    health: 100,
    savedAt: Date.now(),
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return { ...defaultSave(), ...data };
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const data = {
      cash: state.cash,
      missionIndex: state.missionIndex,
      missionsDone: state.missionsDone,
      bestCash: Math.max(state.bestCash, state.cash),
      playerX: state.player.position.x,
      playerZ: state.player.position.z,
      health: state.health,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage off: nothing to clear.
  }
}
