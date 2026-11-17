// Story missions: five chained jobs for Lena Voss, each with a waypoint,
// dialogue, a goal and a cash reward. The beacon marks the target in 3D.
import * as THREE from 'three';
import { MISSION_REWARDS } from './config.js';

export const MISSIONS = [
  {
    id: 1,
    title: 'First Favour',
    giver: 'Lena Voss',
    briefing: 'Lena: "A package waits at the plaza fountain. Bring it to me — no questions."',
    objective: 'Pick up the package at Solmar Plaza',
    target: 'plaza',
    reward: MISSION_REWARDS[0],
    kind: 'pickup',
  },
  {
    id: 2,
    title: 'Hot Delivery',
    giver: 'Lena Voss',
    briefing: 'Lena: "The buyer is at the North Gate. Ninety seconds — the tide waits for no one."',
    objective: 'Deliver the package to the North Gate before time runs out',
    target: 'northGate',
    reward: MISSION_REWARDS[1],
    kind: 'deliver',
    timeLimit: 90,
  },
  {
    id: 3,
    title: 'Heat Wave',
    giver: 'Lena Voss',
    briefing: 'Lena: "Cops saw your face. Lose them and reach the hideout — stay out of sight."',
    objective: 'Escape the police and reach the hideout',
    target: 'hideout',
    reward: MISSION_REWARDS[2],
    kind: 'escape',
    setWanted: 2,
  },
  {
    id: 4,
    title: 'Debt Collector',
    giver: 'Marco Hale',
    briefing: 'Marco: "Rico owes me. Ram his orange coupe three times — then he will listen."',
    objective: 'Ram Rico\'s orange coupe 3 times',
    target: 'eastPier',
    reward: MISSION_REWARDS[3],
    kind: 'chase',
    hitsNeeded: 3,
  },
  {
    id: 5,
    title: 'The Solmar Heist',
    giver: 'Lena Voss',
    briefing: 'Lena: "The bank vault, the pier, the boat. Grab the cash, dodge the guards, vanish."',
    objective: 'Grab the vault cash at the bank, then escape to the East Pier',
    target: 'bank',
    reward: MISSION_REWARDS[4],
    kind: 'heist',
  },
];

export function createMissionState() {
  return {
    index: 0,
    active: false,
    stage: 0,
    timer: 0,
    hits: 0,
    targetCar: null,
    completed: 0,
    message: '',
  };
}

export function currentMission(missions) {
  return missions.index < MISSIONS.length ? MISSIONS[missions.index] : null;
}

export function startMission(missions, index) {
  missions.index = index;
  missions.active = true;
  missions.stage = 0;
  missions.timer = 0;
  missions.hits = 0;
  missions.targetCar = null;
  const mission = MISSIONS[index];
  missions.message = mission ? mission.briefing : '';
  return mission;
}

export function finishMission(missions) {
  const mission = MISSIONS[missions.index];
  missions.active = false;
  missions.completed += 1;
  missions.index += 1;
  missions.message = mission ? `Job done: ${mission.title} — +$${mission.reward}` : '';
  return mission;
}

// A glowing beacon column plus a floating ring, parked over the target.
export function createBeacon() {
  const beacon = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  column.position.y = 13;
  beacon.add(column);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.16, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  ring.name = 'beaconRing';
  beacon.add(ring);
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 1.8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  marker.position.y = 6;
  marker.rotation.x = Math.PI;
  marker.name = 'beaconMarker';
  beacon.add(marker);
  beacon.visible = false;
  return beacon;
}

export function placeBeacon(beacon, landmarks, targetName) {
  const spot = landmarks[targetName];
  if (!spot) {
    beacon.visible = false;
    return null;
  }
  beacon.position.set(spot.x, 0, spot.z);
  beacon.visible = true;
  return spot;
}

export function animateBeacon(beacon, time) {
  if (!beacon.visible) return;
  const ring = beacon.getObjectByName('beaconRing');
  const marker = beacon.getObjectByName('beaconMarker');
  if (ring) {
    const scale = 1 + Math.sin(time * 3) * 0.12;
    ring.scale.set(scale, scale, 1);
  }
  if (marker) marker.position.y = 6 + Math.sin(time * 2) * 0.7;
}
