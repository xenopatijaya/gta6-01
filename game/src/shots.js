// Staged screenshot scenes: each one plays the real rules forward from
// a fresh world with a fixed seed, steered by a tiny autopilot, so the
// frame is what a real game looks like and the same seed always gives
// the same frame. ?shot=chase|street|mission|start
import { updateCamera } from './player.js';
import { driveCar } from './cars.js';
import { syncPoliceCars, stepPolice } from './police.js';
import { stepTraffic, stepPedestrians } from './traffic.js';
import { drawMinimap } from './hud.js';

function paintHud(ctx, hud, state, playerX, playerZ, heading) {
  hud.setHealth(state.health);
  hud.setCash(state.cash);
  hud.setWanted(state.wanted.level);
  hud.setClock(state.clockMinutes);
  hud.setAmmo(18, 96, false);
  hud.showCrosshair(true);
  drawMinimap(hud, {
    landmarks: state.landmarks,
    missionTarget: state.missionTarget,
    police: state.police,
    playerX,
    playerZ,
    playerHeading: heading,
  });
}

function placePlayerOnFoot(state, x, z, yaw) {
  state.player.inCar = null;
  state.player.mesh.visible = true;
  state.player.position.set(x, 0, z);
  state.player.mesh.position.copy(state.player.position);
  state.player.facing = yaw;
}

function putPlayerInCar(state, car) {
  state.player.inCar = car;
  car.stolen = true;
  state.player.mesh.visible = false;
  state.player.position.copy(car.position);
}

function frameCamera(ctx, focus, yaw, distance, height, pitch) {
  ctx.input.yaw = yaw;
  if (pitch !== undefined) ctx.input.pitch = pitch;
  updateCamera(ctx.camera, ctx.input, focus, distance, height);
}

export function stageShot(name, ctx) {
  const { state, scene, hud, input } = ctx;
  state.screen = 'play';
  hud.hideEndScreen();
  hud.showPause(false);

  if (name === 'start') {
    // High orbit view over the plaza so the start screen sits on the city.
    ctx.camera.position.set(58, 42, 86);
    ctx.camera.lookAt(state.landmarks.plaza.x, 4, state.landmarks.plaza.z);
    hud.showStart(true);
    state.screen = 'start';
    return { screen: 'start' };
  }

  hud.hideStart();
  state.cash = 1250;
  state.health = 86;

  if (name === 'street') {
    ctx.beginMission(0);
    // On the road at x=-20, facing north up a long street of towers.
    placePlayerOnFoot(state, -20, 60, Math.PI);
    state.wanted.level = 0;
    syncPoliceCars(state.police, scene, state.player.position, 0, Math.random);
    // Let traffic and pedestrians move so the street feels alive.
    for (let i = 0; i < 180; i += 1) {
      stepTraffic(state.traffic, 1 / 60);
      stepPedestrians(state.peds, state.player.position, 0, 1 / 60);
    }
    frameCamera(ctx, state.player.position, 0, 8, 2.6, 0.12);
    paintHud(ctx, hud, state, -20, 60, Math.PI);
    hud.setSpeed(0, false);
    hud.setObjective('Pick up the package at Solmar Plaza');
    hud.setHint('WASD walk · Shift run · Space jump · Click shoot · F punch · E enter car');
    hud.addFeed('Lena Voss: "A package waits at the plaza fountain. Bring it to me."');
    return { screen: 'play' };
  }

  if (name === 'mission') {
    ctx.beginMission(4);
    placePlayerOnFoot(state, state.landmarks.bank.x - 8, state.landmarks.bank.z + 10, Math.PI * 0.8);
    state.wanted.level = 2;
    syncPoliceCars(state.police, scene, state.player.position, 2, Math.random);
    frameCamera(ctx, state.player.position, Math.PI * 0.8 + Math.PI, 10, 3.6, 0.18);
    paintHud(ctx, hud, state, state.player.position.x, state.player.position.z, Math.PI * 0.8);
    hud.setObjective('Grab the vault cash at the bank, then escape to the East Pier');
    hud.setHint('Click shoot · F punch · R reload · E enter car');
    hud.addFeed('Lena Voss: "The bank vault, the pier, the boat. Grab the cash, dodge the guards, vanish."');
    hud.addFeed('🎯 Guard down.');
    return { screen: 'play' };
  }

  // Default: chase — the cover. Player driving straight up the x=-20
  // road, 3 wanted stars, police closing in from behind.
  ctx.beginMission(2);
  const car = state.parkedCars[0];
  car.position.set(-20, 0, -40);
  car.mesh.position.set(-20, 0, -40);
  car.heading = 0;
  car.mesh.rotation.y = 0;
  car.speed = 18;
  putPlayerInCar(state, car);
  ctx.setWanted(state.wanted, 3);
  syncPoliceCars(state.police, scene, car.position, 3, Math.random);
  // Drive straight up the road a few seconds; police chase from behind.
  for (let i = 0; i < 150; i += 1) {
    driveCar(car, 1, 0, 1 / 60);
    stepPolice(state.police, car.position, true, 1 / 60, null);
  }
  // One patrol car cuts in ahead-left so the pursuit reads in the frame.
  if (state.police[0]) {
    const patrol = state.police[0];
    patrol.position.set(car.position.x - 7, 0, car.position.z + 22);
    patrol.mesh.position.set(patrol.position.x, 0, patrol.position.z);
    patrol.heading = car.heading;
    patrol.mesh.rotation.y = car.heading;
  }
  frameCamera(ctx, car.position, car.heading + Math.PI, 12, 3.8, 0.12);
  paintHud(ctx, hud, state, car.position.x, car.position.z, car.heading);
  hud.showCrosshair(false);
  hud.setSpeed(58, true);
  hud.setObjective('Escape the police and reach the hideout');
  hud.setHint('WASD drive · E exit · Space brake');
  hud.showBanner('MISSION 3 — HEAT WAVE', 'Lena: "Cops saw your face. Lose them and reach the hideout."');
  hud.addFeed('🚗 Car stolen — wanted level up! The police are coming.');
  hud.addFeed('🚔 Police rammed you! (-8 HP)');
  return { screen: 'play' };
}
