/** Generates a prefixed, sufficiently-unique id without pulling in a uuid dependency. */
export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${random}`;
}

/**
 * Deterministic id for an entity minted by the world simulation. It is a
 * stable function of the world seed and the append-only event index at the
 * moment of creation, so a reproduced simulation (same world + same RNG
 * state + same inputs) produces identical ids — WITHOUT consuming a draw
 * from the simulation RNG stream. Non-simulation ids (UI, one-off
 * world-generation entities) keep using the random `createId` above.
 */
export function simulationEventId(seed: number, eventIndex: number): string {
  return `evt_${seed >>> 0}_${eventIndex}`;
}
