// Solmar Bay itself: a procedural sun-soaked grid city built from boxes,
// canvas window textures, street lamps, palms and a central plaza.
// Exports the three.js group, building colliders and named landmarks.
import * as THREE from 'three';
import { BLOCK_SIZE, CITY_BLOCKS, CITY_HALF, ROAD_WIDTH } from './config.js';
import { createRandom, intRandom, pickRandom, rangeRandom } from './random.js';

const PALETTE = [0x2e4a6b, 0x6b4a2e, 0x3a6b5a, 0x7a6a3a, 0x5a3a6b, 0x8a8a7a, 0x35506e, 0x6e3550];
const ROOF_COLORS = [0x445566, 0x665544, 0x556655, 0x774433];

function makeWindowTexture(random, baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 64, 128);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const lit = random() < 0.35;
      ctx.fillStyle = lit ? '#ffe9a8' : '#1d2a3a';
      ctx.fillRect(6 + col * 14, 8 + row * 15, 9, 9);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePalm(random) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8a4a, roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 4.4, 6), trunkMat);
  trunk.position.y = 2.2;
  trunk.rotation.z = rangeRandom(random, -0.08, 0.08);
  palm.add(trunk);
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 4), leafMat);
    const angle = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 1.1, 4.6, Math.sin(angle) * 1.1);
    leaf.rotation.z = Math.cos(angle) * 1.1;
    leaf.rotation.x = -Math.sin(angle) * 1.1;
    palm.add(leaf);
  }
  palm.traverse((child) => { child.castShadow = true; });
  return palm;
}

function makeLamp() {
  const lamp = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.6, metalness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6), poleMat);
  pole.position.y = 2.6;
  lamp.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.9 }),
  );
  head.position.y = 5.3;
  lamp.add(head);
  // No per-lamp PointLight: ~100 lamps would drown the shader in lights.
  // The emissive head and the sun carry the daylight look instead.
  return lamp;
}

export function roadCenter(index) {
  return -CITY_HALF + index * (BLOCK_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;
}

export function nearestRoadCoordinate(value) {
  let best = roadCenter(0);
  let bestDist = Infinity;
  for (let i = 0; i <= CITY_BLOCKS; i += 1) {
    const c = roadCenter(i);
    const d = Math.abs(c - value);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

export function createCity(random) {
  const group = new THREE.Group();
  group.name = 'SolmarBayCity';
  const colliders = [];
  const landmarks = {};

  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2 + 80, CITY_HALF * 2 + 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Sidewalk slabs per block, then buildings on top of them.
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9a938a, roughness: 1 });
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xc9b18a, roughness: 1 });
  for (let bx = 0; bx < CITY_BLOCKS; bx += 1) {
    for (let bz = 0; bz < CITY_BLOCKS; bz += 1) {
      const cx = -CITY_HALF + ROAD_WIDTH + bx * (BLOCK_SIZE + ROAD_WIDTH) + BLOCK_SIZE / 2;
      const cz = -CITY_HALF + ROAD_WIDTH + bz * (BLOCK_SIZE + ROAD_WIDTH) + BLOCK_SIZE / 2;
      const isPlaza = bx === 3 && bz === 3;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE + 2, 0.3, BLOCK_SIZE + 2), isPlaza ? plazaMat : sidewalkMat);
      slab.position.set(cx, 0.15, cz);
      slab.receiveShadow = true;
      group.add(slab);
      if (isPlaza) {
        landmarks.plaza = { x: cx, z: cz };
        const fountain = new THREE.Mesh(
          new THREE.CylinderGeometry(4, 4.6, 1, 20),
          new THREE.MeshStandardMaterial({ color: 0x7fb2d9, roughness: 0.3 }),
        );
        fountain.position.set(cx, 0.8, cz);
        fountain.castShadow = true;
        group.add(fountain);
        continue;
      }
      const buildingCount = intRandom(random, 1, 2);
      for (let b = 0; b < buildingCount; b += 1) {
        const w = buildingCount === 1 ? BLOCK_SIZE - 8 : (BLOCK_SIZE - 10) / 2;
        const d = buildingCount === 1 ? BLOCK_SIZE - 8 : BLOCK_SIZE - 8;
        const h = rangeRandom(random, 9, 42);
        const ox = buildingCount === 1 ? 0 : (b === 0 ? -w / 2 - 1 : w / 2 + 1);
        const color = pickRandom(random, PALETTE);
        const mat = new THREE.MeshStandardMaterial({
          map: makeWindowTexture(random, color),
          roughness: 0.85,
        });
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(cx + ox, 0.3 + h / 2, cz);
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6),
          new THREE.MeshStandardMaterial({ color: pickRandom(random, ROOF_COLORS), roughness: 1 }),
        );
        roof.position.set(cx + ox, 0.3 + h + 0.3, cz);
        group.add(roof);
        colliders.push({
          minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
          minZ: cz - d / 2, maxZ: cz + d / 2,
        });
      }
    }
  }

  // Named landmarks the missions point at.
  landmarks.northGate = { x: roadCenter(3), z: -CITY_HALF + 6 };
  landmarks.southGate = { x: roadCenter(3), z: CITY_HALF - 6 };
  landmarks.eastPier = { x: CITY_HALF - 6, z: roadCenter(4) };
  landmarks.westMarket = { x: -CITY_HALF + 6, z: roadCenter(2) };
  landmarks.bank = { x: roadCenter(5), z: roadCenter(1) };
  landmarks.hideout = { x: -CITY_HALF + 10, z: -CITY_HALF + 10 };
  landmarks.hotel = { x: roadCenter(1), z: roadCenter(5) };

  // Street lamps along every road, palms along the plaza edges.
  for (let i = 0; i <= CITY_BLOCKS; i += 1) {
    const c = roadCenter(i);
    for (let j = 0; j < CITY_BLOCKS; j += 1) {
      const along = -CITY_HALF + ROAD_WIDTH + j * (BLOCK_SIZE + ROAD_WIDTH) + BLOCK_SIZE / 2;
      const lampA = makeLamp();
      lampA.position.set(c - ROAD_WIDTH / 2 - 0.6, 0, along);
      group.add(lampA);
      const lampB = makeLamp();
      lampB.position.set(along, 0, c - ROAD_WIDTH / 2 - 0.6);
      group.add(lampB);
    }
  }
  for (let i = 0; i < 14; i += 1) {
    const palm = makePalm(random);
    const angle = (i / 14) * Math.PI * 2;
    palm.position.set(landmarks.plaza.x + Math.cos(angle) * 18, 0, landmarks.plaza.z + Math.sin(angle) * 18);
    group.add(palm);
  }

  // Bay water strip on the east edge and a sandy beach line.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(60, CITY_HALF * 2 + 80),
    new THREE.MeshStandardMaterial({ color: 0x2a7fa8, roughness: 0.25, metalness: 0.1 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(CITY_HALF + 40, -0.2, 0);
  group.add(sea);
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(10, CITY_HALF * 2 + 80),
    new THREE.MeshStandardMaterial({ color: 0xd9c08a, roughness: 1 }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(CITY_HALF + 5, -0.05, 0);
  group.add(beach);

  return { group, colliders, landmarks };
}

// Push a circle (player or car) out of every building it overlaps.
export function resolveBuildingCollisions(colliders, x, z, radius) {
  let px = x;
  let pz = z;
  for (const box of colliders) {
    const nearX = Math.max(box.minX, Math.min(px, box.maxX));
    const nearZ = Math.max(box.minZ, Math.min(pz, box.maxZ));
    const dx = px - nearX;
    const dz = pz - nearZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;
    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      px = nearX + (dx / dist) * radius;
      pz = nearZ + (dz / dist) * radius;
    } else {
      px = box.maxX + radius;
    }
  }
  return { x: px, z: pz };
}

export function clampToCity(x, z) {
  const limit = CITY_HALF + 2;
  return {
    x: Math.max(-limit, Math.min(limit, x)),
    z: Math.max(-limit, Math.min(limit, z)),
  };
}
