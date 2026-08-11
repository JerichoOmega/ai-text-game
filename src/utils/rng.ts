/**
 * Small, fast, deterministic seeded PRNG (mulberry32). Given the same seed
 * it always yields the same sequence — used for reproducible, run-stable
 * world choices (e.g. shopkeeper selection) instead of uncontrolled
 * Math.random(). Not for cryptographic use.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
