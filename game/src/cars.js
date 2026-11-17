// Cars: one builder for every vehicle in Solmar Bay — player cars, parked
// cars to steal, traffic and police — plus the arcade driving model.
import * as THREE from 'three';
import { CAR_ACCEL, CAR_BRAKE, CAR_STEER, CAR_TOP_SPEED } from './config.js';

const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x1a1a1a, 0x16a085, 0xd35400];

export function buildCarMesh(color, isPolice) {
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: isPolice ? 0xf2f2f2 : color,
    roughness: 0.35,
    metalness: 0.55,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1a2530, roughness: 0.15, metalness: 0.7 }),
  );
  cabin.position.set(0, 1.1, -0.2);
  cabin.castShadow = true;
  car.add(cabin);
  if (isPolice) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42), new THREE.MeshStandardMaterial({ color: 0x1a3a8a, roughness: 0.5 }));
    stripe.position.y = 0.62;
    car.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }));
    bar.position.set(0, 1.45, -0.2);
    car.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.4), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.4 }));
    red.position.set(-0.3, 1.56, -0.2);
    car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.4), new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 1.4 }));
    blue.position.set(0.3, 1.56, -0.2);
    car.add(blue);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheelPositions = [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]];
  for (const [wx, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    wheel.castShadow = true;
    car.add(wheel);
  }
  const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff8c0, emissive: 0xfff2a0, emissiveIntensity: 1.2 });
  for (const side of [-0.6, 0.6]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), headlightMat);
    light.position.set(side, 0.55, 2.22);
    car.add(light);
  }
  return car;
}

export function makeCar(kind, x, z, heading, color) {
  const isPolice = kind === 'police';
  const mesh = buildCarMesh(color ?? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], isPolice);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  return {
    kind,
    mesh,
    position: mesh.position,
    heading,
    speed: 0,
    steer: 0,
    isPolice,
    stolen: false,
    hp: 100,
  };
}

// Arcade driving: accelerate, brake/reverse, steering that bites harder
// at low speed, gentle drag, and a speed cap.
export function driveCar(car, throttle, steerInput, dt) {
  if (throttle > 0) car.speed += CAR_ACCEL * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 0.5) car.speed -= CAR_BRAKE * dt;
    else car.speed -= CAR_ACCEL * 0.55 * dt;
  }
  car.speed -= car.speed * 0.55 * dt;
  car.speed = Math.max(-12, Math.min(CAR_TOP_SPEED, car.speed));
  const steerAmount = steerInput * CAR_STEER * dt * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.heading += steerAmount * Math.sign(car.speed || 1);
  car.position.x += Math.sin(car.heading) * car.speed * dt;
  car.position.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.rotation.y = car.heading;
  car.mesh.position.x = car.position.x;
  car.mesh.position.z = car.position.z;
  // Body roll and pitch sell the speed.
  car.mesh.rotation.z = -steerInput * Math.min(0.06, Math.abs(car.speed) * 0.002);
  car.mesh.rotation.x = -throttle * 0.015;
}

export function carSpeedKmh(car) {
  return Math.abs(car.speed) * 3.6;
}
