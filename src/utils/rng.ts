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

/**
 * A resumable view of the SAME mulberry32 algorithm above. The classic
 * closure form (`mulberry32`) hides its accumulator, which is fine for
 * one-shot deterministic choices (shopkeeper roster, level-up options) but
 * not for the live world simulation, whose RNG must survive a save/reload.
 * `SeededRng` exposes its 32-bit accumulator via `getState()` so it can be
 * persisted (as `WorldState.rngCursor`) and rehydrated with the constructor
 * to resume the exact same sequence. Not a new RNG — same steps as above.
 */
export class SeededRng {
  private state: number;

  constructor(state: number) {
    this.state = state >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    let a = (this.state + 0x6d2b79f5) | 0;
    this.state = a >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, maxExclusive). Returns 0 when maxExclusive <= 0. */
  nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.next() * maxExclusive);
  }

  /** Current 32-bit accumulator. Persist this to resume the sequence later. */
  getState(): number {
    return this.state >>> 0;
  }
}
