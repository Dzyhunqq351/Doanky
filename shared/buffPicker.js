export const BENEFIT_RATE = 0.6;

function seededRandom(seed) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rng, entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll < 0) return entry.id;
  }
  return entries.at(-1).id;
}

export function pickBuff(seed, milestone, beneficial, harmful) {
  const rng = seededRandom((seed >>> 0) + milestone * 104729);
  const good = rng() < BENEFIT_RATE;
  return {
    id: pickWeighted(rng, good ? beneficial : harmful),
    tone: good ? 'good' : 'bad',
  };
}
