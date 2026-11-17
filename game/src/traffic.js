// Traffic and pedestrians: AI cars cruise road loops around the blocks
// and walkers stroll the sidewalks, scattering when a crime happens.
import * as THREE from 'three';
import { CITY_HALF, PED_COUNT, TRAFFIC_COUNT } from './config.js';
import { nearestRoadCoordinate, roadCenter } from './city.js';
import { makeCar } from './cars.js';
import { createRandom, intRandom, pickRandom, rangeRandom } from './random.js';

const PED_SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1, 0x34495e];

export function createTraffic(random) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const road = roadCenter(intRandom(random, 0, 6));
    const along = rangeRandom(random, -CITY_HALF + 20, CITY_HALF - 20);
    const vertical = random() < 0.5;
    const car = makeCar('traffic', vertical ? road : along, vertical ? along : road, vertical ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2));
    car.speed = rangeRandom(random, 6, 11);
    car.lane = { vertical, road, direction: car.heading };
    cars.push(car);
  }
  return cars;
}

// Each traffic car drives straight down its road; at a junction it turns
// onto a new road, so the flow loops around the grid forever.
export function stepTraffic(cars, dt) {
  for (const car of cars) {
    const ahead = 14;
    const nextX = car.position.x + Math.sin(car.heading) * ahead;
    const nextZ = car.position.z + Math.cos(car.heading) * ahead;
    const nearEdge = Math.abs(nextX) > CITY_HALF - 4 || Math.abs(nextZ) > CITY_HALF - 4;
    const nearJunction = Math.abs(nearestRoadCoordinate(nextX) - nextX) < 3 && Math.abs(nearestRoadCoordinate(nextZ) - nextZ) < 3;
    if (nearEdge || nearJunction) {
      const turn = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      if (Math.random() < 0.6) car.heading += turn;
    }
    car.position.x += Math.sin(car.heading) * car.speed * dt;
    car.position.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.x = car.position.x;
    car.mesh.position.z = car.position.z;
    car.mesh.rotation.y = car.heading;
  }
}

function buildPedestrianMesh(random) {
  const ped = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: pickRandom(random, PED_SHIRTS), roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a077, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.85, 8), shirt);
  body.position.y = 0.95;
  body.castShadow = true;
  ped.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.y = 1.62;
  ped.add(head);
  return ped;
}

export function createPedestrians(random) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    const mesh = buildPedestrianMesh(random);
    const x = rangeRandom(random, -CITY_HALF + 10, CITY_HALF - 10);
    const z = nearestRoadCoordinate(rangeRandom(random, -CITY_HALF + 10, CITY_HALF - 10)) + rangeRandom(random, 8, 12) * (random() < 0.5 ? 1 : -1);
    mesh.position.set(x, 0, z);
    peds.push({
      mesh,
      position: mesh.position,
      heading: rangeRandom(random, 0, Math.PI * 2),
      speed: rangeRandom(random, 1.2, 2.2),
      fleeing: false,
      panic: 0,
    });
  }
  return peds;
}

export function stepPedestrians(peds, playerPos, wanted, dt) {
  for (const ped of peds) {
    const dx = ped.position.x - playerPos.x;
    const dz = ped.position.z - playerPos.z;
    const dist = Math.hypot(dx, dz);
    if (wanted > 0 && dist < 14) ped.fleeing = true;
    if (ped.fleeing) {
      ped.panic += dt;
      ped.heading = Math.atan2(dx, dz);
      ped.speed = 5.5;
      if (ped.panic > 6 || dist > 30) { ped.fleeing = false; ped.panic = 0; ped.speed = 1.6; }
    } else if (Math.random() < dt * 0.08) {
      ped.heading += (Math.random() - 0.5) * 1.6;
    }
    ped.position.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.position.z += Math.cos(ped.heading) * ped.speed * dt;
    ped.position.x = Math.max(-CITY_HALF, Math.min(CITY_HALF, ped.position.x));
    ped.position.z = Math.max(-CITY_HALF, Math.min(CITY_HALF, ped.position.z));
    ped.mesh.position.copy(ped.position);
    ped.mesh.rotation.y = ped.heading;
    ped.mesh.position.y = ped.fleeing ? Math.abs(Math.sin(performance.now() * 0.03)) * 0.08 : 0;
  }
}

export function scatterPedestrians(peds, atX, atZ) {
  for (const ped of peds) {
    const dist = Math.hypot(ped.position.x - atX, ped.position.z - atZ);
    if (dist < 18) ped.fleeing = true;
  }
}
