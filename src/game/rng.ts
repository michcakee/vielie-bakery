/** Small deterministic PRNG (mulberry32) so a seed + day always produce the same market. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive an independent stream for a given seed and day. */
export function rngFor(seed: number, day: number, salt = 0): () => number {
  return mulberry32((seed ^ Math.imul(day + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0);
}

/** Approximately normal draw (sum of uniforms), mean 0, std ≈ 1. */
export function gaussian(rand: () => number): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rand();
  return (s - 3) / Math.sqrt(0.5);
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
