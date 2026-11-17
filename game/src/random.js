// Seeded random numbers: one tiny mulberry32 generator, so the city,
// traffic and screenshot staging are identical for the same seed.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function nextRandom() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRandom(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function rangeRandom(random, low, high) {
  return low + random() * (high - low);
}

export function intRandom(random, low, high) {
  return low + Math.floor(random() * (high - low + 1));
}
