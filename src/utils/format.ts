/**
 * Cross-cutting formatting helpers. Before this file existed, `capitalize`
 * was independently copy-pasted in five files (character.tsx, index.tsx,
 * journal.tsx, CharacterHeader.tsx, SimulationEngine.ts) — the exact
 * "one-off refinement instead of shared infrastructure" pattern to avoid.
 * Any new formatting need that would otherwise become a sixth copy belongs
 * here instead.
 */

export function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "1 objective" / "2 objectives" — the plural-suffix pattern already
 * hand-written inline in ObjectiveChecklist; pulled out so the next place
 * that needs simple count-based pluralization doesn't re-derive it. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
