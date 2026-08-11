import type { Ability, CharacterAbility, CombatAbility } from "@/domain/types";

/**
 * Centralized ability definitions (Part 26: stable ids, no duplicated
 * descriptive data on the player — the player stores only ids). Two pools,
 * kept intentionally small (Parts 4/5: ~10–15 each). Character abilities
 * expand out-of-combat agency; combat abilities modify the deterministic
 * combat math. Balance numbers here are first-pass and meant to be tuned.
 */

/** Always available in combat; not part of the unlockable pool. */
export const BASIC_ATTACK: CombatAbility = {
  id: "basic_attack",
  name: "Attack",
  category: "combat",
  description: "A standard strike with your weapon.",
  kind: "physical",
  power: 0,
};

export const CHARACTER_ABILITIES: CharacterAbility[] = [
  { id: "keen_eye", name: "Keen Eye", category: "character", description: "Notice hidden details, tracks, and clues others miss.", tag: "perception" },
  { id: "persuasive", name: "Persuasive", category: "character", description: "Unlock additional persuasion options in conversation.", tag: "social" },
  { id: "survivalist", name: "Survivalist", category: "character", description: "Unlock better wilderness and travel choices.", tag: "survival" },
  { id: "resourceful", name: "Resourceful", category: "character", description: "Find unconventional solutions to problems.", tag: "utility" },
  { id: "strong", name: "Strong", category: "character", description: "Unlock strength-based interactions with the world.", tag: "physical" },
  { id: "perceptive", name: "Perceptive", category: "character", description: "Read moods and spot social or environmental cues.", tag: "perception" },
  { id: "silver_tongue", name: "Silver Tongue", category: "character", description: "Talk your way past hostility and haggle for better prices.", tag: "social" },
  { id: "scholar", name: "Scholar", category: "character", description: "Understand lore, languages, and old writings.", tag: "knowledge" },
  { id: "nimble", name: "Nimble", category: "character", description: "Slip through tight spaces and dangerous terrain.", tag: "agility" },
  { id: "iron_will", name: "Iron Will", category: "character", description: "Resist fear, deceit, and intimidation.", tag: "willpower" },
  { id: "streetwise", name: "Streetwise", category: "character", description: "Navigate the underbelly of towns and read a crowd.", tag: "social" },
  { id: "naturalist", name: "Naturalist", category: "character", description: "Identify plants, beasts, and safe forage.", tag: "survival" },
];

export const COMBAT_ABILITIES: CombatAbility[] = [
  { id: "power_strike", name: "Power Strike", category: "combat", description: "A heavy physical blow.", kind: "physical", power: 6 },
  { id: "quick_strike", name: "Quick Strike", category: "combat", description: "A fast, lighter attack.", kind: "physical", power: 3 },
  { id: "precise_strike", name: "Precise Strike", category: "combat", description: "A carefully aimed, reliable strike.", kind: "physical", power: 4 },
  { id: "crushing_blow", name: "Crushing Blow", category: "combat", description: "A devastating two-handed swing.", kind: "physical", power: 9 },
  { id: "riposte", name: "Riposte", category: "combat", description: "A sharp counter that punishes an opening.", kind: "physical", power: 5 },
  { id: "firebolt", name: "Firebolt", category: "combat", description: "A bolt of flame that sears the target.", kind: "magic", power: 5 },
  { id: "frost_lance", name: "Frost Lance", category: "combat", description: "A spear of ice that pierces defenses.", kind: "magic", power: 7 },
  { id: "arcane_bolt", name: "Arcane Bolt", category: "combat", description: "Raw arcane force, hard to resist.", kind: "magic", power: 4 },
  { id: "shadow_bolt", name: "Shadow Bolt", category: "combat", description: "A draining bolt of dark energy.", kind: "magic", power: 6 },
  { id: "guard", name: "Guard", category: "combat", description: "Brace yourself, halving the next hit this round.", kind: "guard", power: 0 },
  { id: "healing_touch", name: "Healing Touch", category: "combat", description: "Mend your wounds, restoring some HP.", kind: "heal", power: 10 },
  { id: "second_wind", name: "Second Wind", category: "combat", description: "Dig deep and recover a large amount of HP.", kind: "heal", power: 18 },
];

const BY_ID: Record<string, Ability> = Object.fromEntries(
  [BASIC_ATTACK, ...CHARACTER_ABILITIES, ...COMBAT_ABILITIES].map((a) => [a.id, a])
);

export function getAbility(id: string | undefined): Ability | undefined {
  return id ? BY_ID[id] : undefined;
}

export function getCombatAbility(id: string | undefined): CombatAbility | undefined {
  const a = getAbility(id);
  return a && a.category === "combat" ? a : undefined;
}

export function getCharacterAbility(id: string | undefined): CharacterAbility | undefined {
  const a = getAbility(id);
  return a && a.category === "character" ? a : undefined;
}

export function abilitiesForCategory(category: "character" | "combat"): Ability[] {
  return category === "character" ? CHARACTER_ABILITIES : COMBAT_ABILITIES;
}
