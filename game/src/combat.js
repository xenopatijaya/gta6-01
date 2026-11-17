// Combat: fists and a hitscan pistol. Shots check range and angle
// against enemies, pedestrians and police cars; crimes raise wanted.
import * as THREE from 'three';
import { PISTOL_AMMO, PISTOL_DAMAGE, PUNCH_DAMAGE, PUNCH_RANGE } from './config.js';

export function createCombat() {
  return {
    ammo: PISTOL_AMMO,
    reserve: 120,
    reloading: false,
    reloadTimer: 0,
    cooldown: 0,
    muzzleFlash: 0,
    tracer: null,
  };
}

export function createTracer(scene) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe08a }));
  line.visible = false;
  line.frustumCulled = false;
  scene.add(line);
  return line;
}

function aimDirection(camera) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir;
}

// Hitscan shot from the camera: nearest enemy in the cone takes damage.
export function firePistol(combat, camera, origin, enemies, onHit) {
  if (combat.cooldown > 0 || combat.ammo <= 0 || combat.reloading) return false;
  combat.ammo -= 1;
  combat.cooldown = 0.28;
  combat.muzzleFlash = 0.08;
  const dir = aimDirection(camera);
  const end = origin.clone().add(dir.clone().multiplyScalar(60));
  let best = null;
  let bestDist = 60;
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const toEnemy = enemy.position.clone().sub(origin);
    const dist = toEnemy.length();
    if (dist > 60 || dist < 0.5) continue;
    const angle = toEnemy.normalize().angleTo(dir);
    if (angle < 0.16 && dist < bestDist) {
      best = enemy;
      bestDist = dist;
    }
  }
  if (combat.tracer) {
    const positions = combat.tracer.geometry.attributes.position.array;
    positions[0] = origin.x; positions[1] = origin.y; positions[2] = origin.z;
    const hitPoint = best ? best.position.clone().setY(best.position.y + 1.2) : end;
    positions[3] = hitPoint.x; positions[4] = hitPoint.y; positions[5] = hitPoint.z;
    combat.tracer.geometry.attributes.position.needsUpdate = true;
    combat.tracer.visible = true;
    combat.tracer.userData.hideAt = performance.now() + 70;
  }
  if (best) {
    best.hp -= PISTOL_DAMAGE;
    onHit?.(best, PISTOL_DAMAGE);
  }
  return true;
}

export function punch(combat, camera, origin, enemies, onHit) {
  if (combat.cooldown > 0) return false;
  combat.cooldown = 0.45;
  const dir = aimDirection(camera);
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const dist = enemy.position.distanceTo(origin);
    if (dist > PUNCH_RANGE + 0.6) continue;
    const toEnemy = enemy.position.clone().sub(origin).normalize();
    if (toEnemy.angleTo(dir) > 0.9) continue;
    enemy.hp -= PUNCH_DAMAGE;
    onHit?.(enemy, PUNCH_DAMAGE);
    return true;
  }
  return false;
}

export function updateCombat(combat, dt) {
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  combat.muzzleFlash = Math.max(0, combat.muzzleFlash - dt);
  if (combat.reloading) {
    combat.reloadTimer -= dt;
    if (combat.reloadTimer <= 0) {
      const need = PISTOL_AMMO - combat.ammo;
      const take = Math.min(need, combat.reserve);
      combat.ammo += take;
      combat.reserve -= take;
      combat.reloading = false;
    }
  }
  if (combat.tracer && combat.tracer.visible && performance.now() > (combat.tracer.userData.hideAt || 0)) {
    combat.tracer.visible = false;
  }
}

export function startReload(combat) {
  if (combat.reloading || combat.ammo === PISTOL_AMMO || combat.reserve <= 0) return false;
  combat.reloading = true;
  combat.reloadTimer = 1.1;
  return true;
}

// Mission guards: dark-suited hostiles who shoot back in missions 4 and 5.
export function createEnemy(x, z, scene) {
  const group = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.95, 10), suit);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd9a077 }));
  head.position.y = 1.78;
  group.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  gun.position.set(0.3, 1.2, 0.4);
  group.add(gun);
  group.position.set(x, 0, z);
  scene.add(group);
  return {
    mesh: group,
    position: group.position,
    hp: 100,
    shootTimer: 1 + Math.random() * 2,
  };
}

export function stepEnemies(enemies, playerPos, dt, onEnemyShot) {
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const dx = playerPos.x - enemy.position.x;
    const dz = playerPos.z - enemy.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 3 && dist < 26) {
      enemy.position.x += (dx / dist) * 2.4 * dt;
      enemy.position.z += (dz / dist) * 2.4 * dt;
    }
    enemy.mesh.rotation.y = Math.atan2(dx, dz);
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && dist < 24) {
      enemy.shootTimer = 1.6 + Math.random() * 1.2;
      onEnemyShot?.(enemy, dist);
    }
  }
}
