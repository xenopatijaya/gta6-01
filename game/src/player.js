// The player on foot: a third-person walker with run, jump, gravity and
// a camera that orbits with the mouse. Also owns health, cash and wanted.
import * as THREE from 'three';
import { GRAVITY, PLAYER_JUMP_SPEED, PLAYER_RUN_SPEED, PLAYER_WALK_SPEED } from './config.js';
import { clampToCity, resolveBuildingCollisions } from './city.js';

export function buildPlayerMesh() {
  const person = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xd97b2b, roughness: 0.8 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x2c4a6b, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98a5e, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.95, 10), jacket);
  body.position.y = 1.05;
  body.castShadow = true;
  person.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
  head.position.y = 1.78;
  head.castShadow = true;
  person.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.28, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  cap.position.y = 1.98;
  person.add(cap);
  for (const side of [-0.2, 0.2]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.62, 8), jeans);
    leg.position.set(side, 0.31, 0);
    leg.castShadow = true;
    person.add(leg);
  }
  person.traverse((child) => { child.name = 'playerPart'; });
  return person;
}

export function createPlayerState(x, z) {
  return {
    mesh: buildPlayerMesh(),
    position: new THREE.Vector3(x, 0, z),
    velocityY: 0,
    grounded: true,
    facing: 0,
    moving: false,
    inCar: null,
  };
}

export function stepPlayerOnFoot(player, input, colliders, dt) {
  const speed = input.run ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
  const yaw = input.yaw;
  const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const right = { x: -forward.z, z: forward.x };
  const moveX = forward.x * input.forward + right.x * input.strafe;
  const moveZ = forward.z * input.forward + right.z * input.strafe;
  const length = Math.hypot(moveX, moveZ);
  player.moving = length > 0.01;
  if (player.moving) {
    const nx = moveX / length;
    const nz = moveZ / length;
    player.position.x += nx * speed * dt;
    player.position.z += nz * speed * dt;
    player.facing = Math.atan2(nx, nz);
  }
  if (input.jump && player.grounded) {
    player.velocityY = PLAYER_JUMP_SPEED;
    player.grounded = false;
  }
  player.velocityY -= GRAVITY * dt;
  player.position.y += player.velocityY * dt;
  if (player.position.y <= 0) {
    player.position.y = 0;
    player.velocityY = 0;
    player.grounded = true;
  }
  const resolved = resolveBuildingCollisions(colliders, player.position.x, player.position.z, 0.55);
  const clamped = clampToCity(resolved.x, resolved.z);
  player.position.x = clamped.x;
  player.position.z = clamped.z;
  player.mesh.position.copy(player.position);
  player.mesh.rotation.y = player.facing;
  // Walk bob.
  const bob = player.moving && player.grounded ? Math.sin(performance.now() * 0.02) * 0.04 : 0;
  player.mesh.position.y = player.position.y + Math.abs(bob);
}

// Third-person camera: behind and above the player (or the car), looking
// along the mouse orbit yaw.
export function updateCamera(camera, input, focus, distance, height) {
  const yaw = input.yaw;
  const pitch = input.pitch;
  const cx = focus.x + Math.sin(yaw) * Math.cos(pitch) * distance;
  const cz = focus.z + Math.cos(yaw) * Math.cos(pitch) * distance;
  const cy = focus.y + height + Math.sin(pitch) * distance;
  camera.position.set(cx, cy, cz);
  camera.lookAt(focus.x, focus.y + 1.4, focus.z);
}
