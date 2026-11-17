// Wanted level and police: crimes raise stars, police cars spawn to
// match them, chase and ram the player; hiding cools the heat down.
import { MAX_WANTED, WANTED_DECAY_SECONDS } from './config.js';
import { makeCar } from './cars.js';
import { roadCenter } from './city.js';

export function createWanted() {
  return {
    level: 0,
    heat: 0,
    quietSeconds: 0,
    bustedTimer: 0,
  };
}

export function addWanted(wanted, amount) {
  wanted.level = Math.min(MAX_WANTED, wanted.level + amount);
  wanted.heat = 100;
  wanted.quietSeconds = 0;
}

export function setWanted(wanted, level) {
  wanted.level = Math.max(0, Math.min(MAX_WANTED, level));
  wanted.heat = level > 0 ? 100 : 0;
  wanted.quietSeconds = 0;
}

export function updateWanted(wanted, policeNear, dt) {
  if (wanted.level === 0) return;
  if (policeNear) wanted.quietSeconds = 0;
  else wanted.quietSeconds += dt;
  if (wanted.quietSeconds > WANTED_DECAY_SECONDS) {
    wanted.level -= 1;
    wanted.quietSeconds = 0;
    if (wanted.level === 0) wanted.heat = 0;
  }
}

export function createPolice() {
  return [];
}

// Keep one police car per wanted star, spawning ahead of the player on
// the nearest road; remove extras when the heat drops.
export function syncPoliceCars(police, scene, playerPos, wantedLevel, random) {
  const target = wantedLevel;
  while (police.length < target) {
    const road = roadCenter(Math.floor(random() * 7));
    const ahead = 30 + random() * 30;
    const angle = random() * Math.PI * 2;
    const car = makeCar('police', playerPos.x + Math.sin(angle) * ahead, playerPos.z + Math.cos(angle) * ahead, angle + Math.PI);
    car.speed = 10;
    police.push(car);
    scene.add(car.mesh);
  }
  while (police.length > target) {
    const car = police.pop();
    scene.remove(car.mesh);
  }
}

// Police steer toward the player and ram; on foot, touching the player
// for two seconds means BUSTED.
export function stepPolice(police, playerPos, playerInCar, dt, onRam) {
  let nearest = Infinity;
  let touching = false;
  for (const car of police) {
    const dx = playerPos.x - car.position.x;
    const dz = playerPos.z - car.position.z;
    const dist = Math.hypot(dx, dz);
    nearest = Math.min(nearest, dist);
    const desired = Math.atan2(dx, dz);
    let diff = desired - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    // A patrol car that reaches a player on foot stops and holds them:
    // otherwise it would overshoot and BUSTED could never happen.
    const holding = dist < 3.5 && !playerInCar;
    const targetSpeed = holding ? 0 : dist > 6 ? 26 : 14;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.4);
    car.position.x += Math.sin(car.heading) * car.speed * dt;
    car.position.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.x = car.position.x;
    car.mesh.position.z = car.position.z;
    car.mesh.rotation.y = car.heading;
    if (dist < 3.2) {
      touching = true;
      if (playerInCar && onRam) onRam(car);
    }
  }
  return { nearest, touching };
}
