// Solmar Bay — shared tuning constants for the whole open-world game.
// One place holds every number the other modules agree on, so a balance
// change never needs hunting through the city, the cars or the police.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay-save-v1';
export const CITY_BLOCKS = 7;
export const BLOCK_SIZE = 40;
export const ROAD_WIDTH = 14;
export const CITY_HALF = (CITY_BLOCKS * (BLOCK_SIZE + ROAD_WIDTH)) / 2;

export const PLAYER_WALK_SPEED = 7;
export const PLAYER_RUN_SPEED = 11;
export const PLAYER_JUMP_SPEED = 8.5;
export const GRAVITY = 24;

export const CAR_TOP_SPEED = 34;
export const CAR_ACCEL = 16;
export const CAR_BRAKE = 30;
export const CAR_STEER = 1.9;

export const TRAFFIC_COUNT = 12;
export const PED_COUNT = 20;
export const MAX_WANTED = 5;
export const WANTED_DECAY_SECONDS = 22;

export const PISTOL_DAMAGE = 34;
export const PISTOL_AMMO = 24;
export const PUNCH_DAMAGE = 20;
export const PUNCH_RANGE = 2.4;

export const MISSION_REWARDS = [150, 300, 450, 700, 1500];
export const START_CASH = 50;
export const START_HEALTH = 100;

// Story beats, in the order the player meets them. Names, places and the
// plot are all original to Solmar Bay.
export const STORY_INTRO =
  'Solmar Bay, 2026. Lena Voss needs a driver who asks no questions. ' +
  'One favour turns into five jobs — and the whole bay police on your tail.';
