// Solmar Bay — boot and the one game loop. Input is read every frame,
// the world advances in fixed 1/60 s steps, and the HUD paints the state.
// Screens: start, play, paused, busted, wasted. ?shot=chase|street|
// mission|start stages a deterministic scene instead of running the loop.
import * as THREE from 'three';
import { CITY_HALF, MAX_WANTED, PISTOL_AMMO, STEP, STORY_INTRO } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_INTERACT, ACTION_PAUSE, ACTION_PUNCH, ACTION_RELOAD } from './input.js';
import { createCity, clampToCity, resolveBuildingCollisions } from './city.js';
import { createPlayerState, stepPlayerOnFoot, updateCamera } from './player.js';
import { carSpeedKmh, driveCar, makeCar } from './cars.js';
import { createPedestrians, createTraffic, scatterPedestrians, stepPedestrians, stepTraffic } from './traffic.js';
import { addWanted, createPolice, createWanted, setWanted, stepPolice, syncPoliceCars, updateWanted } from './police.js';
import { MISSIONS, animateBeacon, createBeacon, createMissionState, currentMission, finishMission, placeBeacon, startMission } from './missions.js';
import { createCombat, createEnemy, createTracer, firePistol, punch, startReload, stepEnemies, updateCombat } from './combat.js';
import { createHud, drawMinimap } from './hud.js';
import { clearSave, loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const random = createRandom(seed);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87bfe8);
scene.fog = new THREE.Fog(0x9fc8e8, 120, 420);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const sun = new THREE.DirectionalLight(0xfff2d0, 2.6);
sun.position.set(90, 140, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -200;
sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -200;
sun.shadow.camera.far = 420;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9));

// Game state: one object every system reads and writes.
const city = createCity(random);
scene.add(city.group);
const hud = createHud();
const audio = createAudio();
const input = createInput(canvas);
const combat = createCombat();
combat.tracer = createTracer(scene);
const beacon = createBeacon();
scene.add(beacon);

const saved = loadSave();
const state = {
  screen: 'start',
  player: createPlayerState(saved ? saved.playerX : 0, saved ? saved.playerZ : 24),
  health: saved ? saved.health : 100,
  cash: saved ? saved.cash : 50,
  bestCash: saved ? saved.bestCash : 50,
  wanted: createWanted(),
  police: createPolice(),
  traffic: createTraffic(random),
  peds: createPedestrians(random),
  missions: createMissionState(),
  enemies: [],
  parkedCars: [],
  missionTarget: null,
  clockMinutes: 9 * 60 + 12,
  ramCooldown: 0,
  policeRamCooldown: 0,
  endTimer: 0,
  paused: false,
  landmarks: city.landmarks,
  colliders: city.colliders,
};
state.missions.index = saved ? saved.missionIndex : 0;
state.missions.completed = saved ? saved.missionsDone : 0;
state.player.mesh.position.copy(state.player.position);
scene.add(state.player.mesh);
for (const car of state.traffic) scene.add(car.mesh);
for (const ped of state.peds) scene.add(ped.mesh);

// Parked cars to steal, lined along the roads near the spawn.
const parkedSpots = [
  { x: 7, z: 30, heading: Math.PI / 2, color: 0xc0392b },
  { x: -7, z: 44, heading: -Math.PI / 2, color: 0x2e86c1 },
  { x: 61, z: 7, heading: 0, color: 0xf1c40f },
  { x: -61, z: -7, heading: Math.PI, color: 0x27ae60 },
  { x: 7, z: -60, heading: Math.PI / 2, color: 0xe67e22 },
  { x: 115, z: 61, heading: -Math.PI / 2, color: 0x8e44ad },
];
for (const spot of parkedSpots) {
  const car = makeCar('parked', spot.x, spot.z, spot.heading, spot.color);
  state.parkedCars.push(car);
  scene.add(car.mesh);
}

function feed(text) { hud.addFeed(text); }
function playerPos() {
  return state.player.inCar ? state.player.inCar.position : state.player.position;
}

function nearestStealableCar() {
  let best = null;
  let bestDist = 5;
  for (const car of state.parkedCars) {
    if (car.stolen) continue;
    const dist = Math.hypot(car.position.x - state.player.position.x, car.position.z - state.player.position.z);
    if (dist < bestDist) { bestDist = dist; best = car; }
  }
  return best;
}

function enterCar(car) {
  state.player.inCar = car;
  car.stolen = true;
  state.player.mesh.visible = false;
  addWanted(state.wanted, 1);
  feed('🚗 Car stolen — wanted level up! The police are coming.');
  hud.showBanner('CAR STOLEN', 'Wanted ★ — lose the cops or lay low');
  audio.mission();
}

function exitCar() {
  const car = state.player.inCar;
  if (!car) return;
  state.player.inCar = null;
  state.player.position.set(car.position.x + 2.4, 0, car.position.z + 1.5);
  state.player.mesh.position.copy(state.player.position);
  state.player.mesh.visible = true;
  input.yaw = car.heading + Math.PI;
}

function spawnMissionEnemies(count, around) {
  for (let i = 0; i < count; i += 1) {
    const enemy = createEnemy(around.x + (random() - 0.5) * 14, around.z + (random() - 0.5) * 14, scene);
    state.enemies.push(enemy);
  }
}

function clearEnemies() {
  for (const enemy of state.enemies) scene.remove(enemy.mesh);
  state.enemies = [];
}

function beginMission(index) {
  const mission = startMission(state.missions, index);
  if (!mission) {
    state.missionTarget = null;
    beacon.visible = false;
    hud.setObjective('All jobs done — Solmar Bay is yours. Free roam!');
    hud.setMissionTitle('STORY COMPLETE');
    return;
  }
  hud.setMissionTitle(`MISSION ${mission.id}: ${mission.title}`);
  hud.setObjective(mission.objective);
  hud.showBanner(`MISSION ${mission.id} — ${mission.title}`, mission.briefing);
  feed(`📋 ${mission.giver}: ${mission.briefing}`);
  if (mission.setWanted) setWanted(state.wanted, mission.setWanted);
  if (mission.kind === 'chase') {
    const target = makeCar('target', state.landmarks.eastPier.x, state.landmarks.eastPier.z, Math.PI, 0xe67e22);
    target.speed = 8;
    state.missions.targetCar = target;
    scene.add(target.mesh);
  }
  if (mission.kind === 'heist') spawnMissionEnemies(3, state.landmarks.bank);
  if (mission.kind === 'chase') spawnMissionEnemies(1, state.landmarks.eastPier);
  state.missionTarget = placeBeacon(beacon, state.landmarks, mission.target);
  audio.mission();
}

function completeMission() {
  const mission = finishMission(state.missions);
  if (!mission) return;
  state.cash += mission.reward;
  state.bestCash = Math.max(state.bestCash, state.cash);
  audio.cash();
  feed(`💰 Job complete: ${mission.title} — +$${mission.reward}`);
  hud.showBanner('JOB COMPLETE', `+$${mission.reward} — ${mission.title}`);
  clearEnemies();
  if (state.missions.targetCar) {
    scene.remove(state.missions.targetCar.mesh);
    state.missions.targetCar = null;
  }
  writeSave(state);
  window.setTimeout(() => beginMission(state.missions.index), 2600);
}

function triggerBusted() {
  state.screen = 'busted';
  state.endTimer = 0;
  setWanted(state.wanted, 0);
  audio.busted();
  audio.setSiren(false);
  hud.showEndScreen('BUSTED', 'The Solmar Bay police took you in. You lost $200 in fines — press Enter to walk free.');
  state.cash = Math.max(0, state.cash - 200);
  writeSave(state);
}

function triggerWasted() {
  state.screen = 'wasted';
  state.endTimer = 0;
  setWanted(state.wanted, 0);
  audio.busted();
  audio.setSiren(false);
  hud.showEndScreen('WASTED', 'You went down in Solmar Bay. The hospital patched you up for $150 — press Enter to get back out there.');
  state.cash = Math.max(0, state.cash - 150);
  state.health = 100;
  writeSave(state);
}

function respawnAfterEnd() {
  hud.hideEndScreen();
  state.health = 100;
  if (state.player.inCar) exitCar();
  state.player.position.set(0, 0, 24);
  state.player.mesh.position.copy(state.player.position);
  state.screen = 'play';
  feed('Back on the streets of Solmar Bay.');
}

function missionTargetPoint() {
  const mission = currentMission(state.missions);
  if (!mission) return null;
  if (mission.kind === 'heist' && state.missions.stage === 1) return state.landmarks.eastPier;
  if (mission.kind === 'chase' && state.missions.targetCar) {
    return { x: state.missions.targetCar.position.x, z: state.missions.targetCar.position.z };
  }
  return state.landmarks[mission.target] || null;
}

function updateMission(dt) {
  const missions = state.missions;
  const mission = currentMission(missions);
  if (!mission || !missions.active) return;
  const pos = playerPos();
  const target = missionTargetPoint();
  if (target) {
    state.missionTarget = target;
    beacon.position.set(target.x, 0, target.z);
    beacon.visible = true;
  }
  if (mission.timeLimit) {
    missions.timer += dt;
    const left = Math.max(0, mission.timeLimit - missions.timer);
    hud.setObjective(`${mission.objective} — ${Math.ceil(left)}s left`);
    if (left <= 0) {
      feed('⏰ Too slow — the buyer walked away. Job failed, try again.');
      startMission(missions, missions.index);
      state.missionTarget = placeBeacon(beacon, state.landmarks, mission.target);
      return;
    }
  }
  const dist = target ? Math.hypot(target.x - pos.x, target.z - pos.z) : 999;
  if (mission.kind === 'pickup' && dist < 5) {
    feed('📦 Package grabbed. Lena is waiting — start the next job.');
    audio.pickup();
    completeMission();
  } else if (mission.kind === 'deliver' && dist < 6) {
    feed('🤝 Delivered. The buyer paid up — nice driving.');
    completeMission();
  } else if (mission.kind === 'escape' && dist < 6 && state.wanted.level === 0) {
    feed('🏠 You vanished. The heat is off — for now.');
    completeMission();
  } else if (mission.kind === 'heist') {
    if (missions.stage === 0 && dist < 6) {
      missions.stage = 1;
      feed('💵 Vault cash grabbed! Now run — the pier boat leaves soon.');
      audio.cash();
      addWanted(state.wanted, 3);
      hud.setObjective('Escape to the East Pier — wanted ★★★★');
    } else if (missions.stage === 1 && dist < 6) {
      feed('⛵ You made the boat. The heist is done — Solmar Bay is yours.');
      completeMission();
    }
  }
  // Target car flees along the east road; ramming it counts a hit.
  if (mission.kind === 'chase' && missions.targetCar) {
    const targetCar = missions.targetCar;
    targetCar.position.x += Math.sin(targetCar.heading) * targetCar.speed * dt;
    targetCar.position.z += Math.cos(targetCar.heading) * targetCar.speed * dt;
    if (Math.abs(targetCar.position.x) > CITY_HALF - 8 || Math.abs(targetCar.position.z) > CITY_HALF - 8) {
      targetCar.heading += Math.PI / 2;
    }
    targetCar.mesh.position.x = targetCar.position.x;
    targetCar.mesh.position.z = targetCar.position.z;
    targetCar.mesh.rotation.y = targetCar.heading;
    const playerCar = state.player.inCar;
    if (playerCar && state.ramCooldown <= 0) {
      const ramDist = Math.hypot(targetCar.position.x - playerCar.position.x, targetCar.position.z - playerCar.position.z);
      if (ramDist < 4.2 && Math.abs(playerCar.speed) > 6) {
        missions.hits += 1;
        state.ramCooldown = 1.2;
        targetCar.speed = Math.max(4, targetCar.speed - 2);
        feed(`💥 Rammed Rico's coupe! ${missions.hits}/3 hits.`);
        audio.punch();
        if (missions.hits >= 3) {
          feed('Rico: "Okay, okay! Tell Marco he gets his money."');
          completeMission();
        }
      }
    }
  }
}

function stepWorld(dt) {
  state.clockMinutes += dt * 0.6;
  state.ramCooldown = Math.max(0, state.ramCooldown - dt);
  state.policeRamCooldown = Math.max(0, state.policeRamCooldown - dt);
  const pos = playerPos();
  const inCar = state.player.inCar;

  if (input.actionPressed(ACTION_PAUSE)) {
    state.paused = !state.paused;
    hud.showPause(state.paused);
  }
  if (state.paused) return;

  if (input.actionPressed(ACTION_INTERACT)) {
    if (inCar) exitCar();
    else {
      const car = nearestStealableCar();
      if (car) enterCar(car);
    }
  }

  if (inCar) {
    driveCar(inCar, input.forward, input.strafe, dt);
    const resolved = resolveBuildingCollisions(state.colliders, inCar.position.x, inCar.position.z, 1.6);
    const clamped = clampToCity(resolved.x, resolved.z);
    if (clamped.x !== inCar.position.x || clamped.z !== inCar.position.z) inCar.speed *= 0.4;
    inCar.position.x = clamped.x;
    inCar.position.z = clamped.z;
    inCar.mesh.position.x = clamped.x;
    inCar.mesh.position.z = clamped.z;
    input.yaw = inCar.heading + Math.PI;
    audio.setEngine(true, Math.abs(inCar.speed) / 34);
  } else {
    stepPlayerOnFoot(state.player, input, state.colliders, dt);
    audio.setEngine(false, 0);
  }

  // Combat: click to shoot, F to punch, R to reload.
  updateCombat(combat, dt);
  const shootPoint = inCar ? inCar.position.clone().setY(1.4) : state.player.position.clone().setY(1.5);
  if (!inCar && (input.shootHeld || input.actionPressed(ACTION_PUNCH))) {
    if (input.actionPressed(ACTION_PUNCH)) {
      punch(combat, camera, shootPoint, state.enemies, (enemy) => {
        feed(`👊 You hit a guard — ${Math.max(0, enemy.hp)} HP left.`);
        addWanted(state.wanted, 1);
        audio.punch();
      });
    } else if (firePistol(combat, camera, shootPoint, state.enemies, (enemy) => {
      addWanted(state.wanted, 1);
      scatterPedestrians(state.peds, shootPoint.x, shootPoint.z);
      audio.gunshot();
      if (enemy.hp <= 0) {
        feed('🎯 Guard down.');
        scene.remove(enemy.mesh);
      }
    })) {
      audio.gunshot();
      scatterPedestrians(state.peds, shootPoint.x, shootPoint.z);
    }
  }
  if (input.actionPressed(ACTION_RELOAD)) {
    if (startReload(combat)) feed('🔄 Reloading…');
  }

  stepTraffic(state.traffic, dt);
  stepPedestrians(state.peds, pos, state.wanted.level, dt);
  stepEnemies(state.enemies, pos, dt, (enemy, dist) => {
    if (dist < 22 && Math.random() < 0.4) {
      state.health -= 6;
      feed('🔫 A guard shot you! (-6 HP)');
      if (state.health <= 0) triggerWasted();
    }
  });

  // Police: spawn to match the stars, chase, ram, and bust on foot.
  syncPoliceCars(state.police, scene, pos, state.wanted.level, random);
  const policeResult = stepPolice(state.police, pos, !!inCar, dt, (car) => {
    if (state.policeRamCooldown <= 0) {
      state.policeRamCooldown = 1.0;
      state.health -= 8;
      feed('🚔 Police rammed you! (-8 HP)');
      if (inCar) inCar.speed *= 0.5;
      if (state.health <= 0) triggerWasted();
    }
  });
  updateWanted(state.wanted, policeResult.nearest < 26, dt);
  audio.setSiren(state.wanted.level > 0);
  if (!inCar && policeResult.touching && state.wanted.level > 0) {
    state.wanted.bustedTimer += dt;
    if (state.wanted.bustedTimer > 2) triggerBusted();
  } else {
    state.wanted.bustedTimer = 0;
  }

  updateMission(dt);
  animateBeacon(beacon, performance.now() * 0.001);

  // Camera follows the player or the car.
  const focus = inCar ? inCar.position : state.player.position;
  updateCamera(camera, input, focus, inCar ? 13 : 9, inCar ? 4.5 : 3.2);

  // HUD refresh.
  hud.setHealth(state.health);
  hud.setCash(state.cash);
  hud.setWanted(state.wanted.level);
  hud.setClock(state.clockMinutes);
  hud.setSpeed(inCar ? carSpeedKmh(inCar) : 0, !!inCar);
  hud.setAmmo(combat.ammo, combat.reserve, combat.reloading);
  hud.showCrosshair(!inCar && state.screen === 'play');
  const nearCar = !inCar ? nearestStealableCar() : null;
  hud.setHint(inCar ? 'WASD drive · E exit · Space brake' : nearCar ? 'Press E to steal this car' : 'WASD walk · Shift run · Space jump · Click shoot · F punch · E enter car');
  drawMinimap(hud, {
    landmarks: state.landmarks,
    missionTarget: state.missionTarget,
    police: state.police,
    playerX: pos.x,
    playerZ: pos.z,
    playerHeading: inCar ? inCar.heading : state.player.facing,
  });
}

function renderFrame() {
  renderer.render(scene, camera);
}

function startPlaying(fromSave) {
  audio.unlock();
  audio.startMusic();
  hud.hideStart();
  input.lockPointer();
  state.screen = 'play';
  if (!fromSave) {
    clearSave();
    state.cash = 50;
    state.health = 100;
    state.missions = createMissionState();
    state.missionTarget = null;
  }
  if (!state.missions.active && currentMission(state.missions)) beginMission(state.missions.index);
  feed(STORY_INTRO);
}

document.getElementById('new-game-btn').addEventListener('click', () => startPlaying(false));
document.getElementById('continue-btn').addEventListener('click', () => startPlaying(true));
document.getElementById('resume-btn').addEventListener('click', () => {
  state.paused = false;
  hud.showPause(false);
});
document.getElementById('restart-btn').addEventListener('click', () => {
  respawnAfterEnd();
});
document.getElementById('save-btn').addEventListener('click', () => {
  if (writeSave(state)) feed('💾 Game saved.');
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let last = performance.now();
let accumulator = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const frame = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (state.screen === 'play') {
    accumulator += frame;
    while (accumulator >= STEP) {
      stepWorld(STEP);
      accumulator -= STEP;
    }
    if (state.screen === 'play') renderFrame();
  } else if (state.screen === 'busted' || state.screen === 'wasted') {
    state.endTimer += frame;
    if (input.actionPressed('confirm') || (state.endTimer > 1 && input.takePressed('Enter'))) respawnAfterEnd();
    renderFrame();
  } else {
    // Start screen: slow orbit over the plaza so the city sells itself.
    const t = now * 0.00005;
    camera.position.set(Math.sin(t) * 90, 46, Math.cos(t) * 90);
    camera.lookAt(state.landmarks.plaza.x, 4, state.landmarks.plaza.z);
    renderFrame();
  }
  input.endFrame();
}

// Debug handle for automated play-tests (read-only state inspection).
window.__solmar = { state };
window.__shotError = null;
window.addEventListener('error', (event) => { window.__shotError = String(event.message); });

// Staged deterministic scenes for screenshots live in shots.js.
if (shotName) {
  const staged = stageShot(shotName, { state, scene, hud, input, camera, beginMission, setWanted, addWanted });
  state.screen = staged.screen;
  if (staged.screen !== 'start') hud.hideStart();
  let painted = 0;
  (function paintShot() {
    renderFrame();
    painted += 1;
    if (painted < 3) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  })();
} else {
  hud.showStart(!!saved);
  requestAnimationFrame(loop);
}
