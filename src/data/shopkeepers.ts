import type { EntityId, NPC, NpcRole, Settlement } from "@/domain/types";
import { mulberry32 } from "@/utils/rng";

/**
 * Chronicle's canonical roster of recurring, authored shopkeepers. They are
 * a POOL: each run selects a subset deterministically from the world seed
 * and assigns them onto the existing merchant/innkeeper NPC slots. A world
 * never spawns all ten, and a selected shopkeeper keeps a stable identity
 * for the whole run.
 *
 * This module is intentionally free of any image `require` so it stays
 * importable in the node test runner. Portrait assets live separately in
 * src/presentation/npc/shopkeeperPortraits.ts.
 */
export type ShopkeeperRarity = "common" | "uncommon" | "traveling";

export interface Shopkeeper {
  id: EntityId;
  name: string;
  /** Maps onto an existing NpcRole so shop/dialogue systems work unchanged. */
  role: NpcRole;
  /** Human-facing specialty shown as the role line, e.g. "General Goods". */
  shopTitle: string;
  personality: string;
  rarity: ShopkeeperRarity;
  /** Settlement types this shopkeeper prefers (a guideline, not a hard rule). */
  prefers: Array<Settlement["type"]>;
  /** A signature greeting for the dialogue/shop screen. */
  greeting: string;
}

export const SHOPKEEPERS: Shopkeeper[] = [
  { id: "marabelle", name: "Marabelle", role: "merchant", shopTitle: "General Goods", personality: "Warm and motherly; has a little bit of everything.", rarity: "common", prefers: ["village", "town", "city"], greeting: "Welcome, dear. Come in out of the cold — I've a little of everything." },
  { id: "eldric", name: "Eldric", role: "merchant", shopTitle: "Curiosities", personality: "Deals in rare and unusual items; a collector of stories as much as things.", rarity: "uncommon", prefers: ["town", "city"], greeting: "Ah, a curious face. Every object here carries a story, if you'll listen." },
  { id: "brogan", name: "Brogan", role: "merchant", shopTitle: "Weapons & Armor", personality: "Gruff but fair; believes a good blade solves most problems.", rarity: "common", prefers: ["town", "city"], greeting: "You'll want steel that holds. I don't sell junk. State your business." },
  { id: "lyra", name: "Lyra", role: "merchant", shopTitle: "Herbs & Potions", personality: "Knowledgeable and upbeat; heals with nature's touch.", rarity: "common", prefers: ["village", "town"], greeting: "Blessings, traveler! Nature has a remedy for nearly every ailment." },
  { id: "zahir", name: "Zahir", role: "merchant", shopTitle: "Fine Goods", personality: "Smooth talker with expensive tastes and exotic wares.", rarity: "uncommon", prefers: ["city"], greeting: "You have an eye for quality, I can tell. Only the finest, for you." },
  { id: "pip", name: "Pip", role: "merchant", shopTitle: "Traveling Merchant", personality: "Always on the move; stock changes with the road.", rarity: "traveling", prefers: ["village", "town", "city"], greeting: "Caught me before I move on! The road brings odd little treasures." },
  { id: "sister_miriam", name: "Sister Miriam", role: "merchant", shopTitle: "Books & Scrolls", personality: "Well-read and thoughtful; sells knowledge and insight.", rarity: "uncommon", prefers: ["town", "city"], greeting: "Seeking knowledge? A wise pursuit. Mind the ink is still wet on some." },
  { id: "grok", name: "Grok", role: "merchant", shopTitle: "Raw Materials", personality: "Strong, quiet, and reliable; has what builders and crafters need.", rarity: "uncommon", prefers: ["village", "town"], greeting: "Materials. Good ones. You build, you buy. Simple." },
  { id: "silas", name: "Silas", role: "merchant", shopTitle: "Jewelry & Trinkets", personality: "Charming and clever; deals in beauty, luck, and secrets.", rarity: "uncommon", prefers: ["town", "city"], greeting: "Beauty, luck, a secret or two — all fairly priced, my friend. Browse away." },
  { id: "tobias", name: "Tobias", role: "innkeeper", shopTitle: "Innkeeper", personality: "Provides rest, rumors, and a warm meal; everything starts here.", rarity: "common", prefers: ["village", "town", "city"], greeting: "Rest your feet, traveler. Warm meal, soft bed, and all the local talk you like." },
];

const BY_ID: Record<string, Shopkeeper> = Object.fromEntries(SHOPKEEPERS.map((s) => [s.id, s]));

export function getShopkeeper(id: string | undefined): Shopkeeper | undefined {
  return id ? BY_ID[id] : undefined;
}

const RARITY_PROBABILITY: Record<ShopkeeperRarity, number> = {
  common: 0.8,
  uncommon: 0.55,
  traveling: 0.5,
};

/**
 * Deterministically decides which shopkeepers exist in a run. Tobias is
 * always present (the inn is where things start), and at least one general
 * merchant is guaranteed so the world always has a shop. Same seed -> same
 * roster; different seeds can differ.
 */
export function selectRoster(seed: number): EntityId[] {
  const rng = mulberry32(seed);
  const present: EntityId[] = [];
  for (const shopkeeper of SHOPKEEPERS) {
    const roll = rng(); // consume one draw per shopkeeper, in fixed order
    if (shopkeeper.id === "tobias" || roll < RARITY_PROBABILITY[shopkeeper.rarity]) {
      present.push(shopkeeper.id);
    }
  }
  if (!present.some((id) => BY_ID[id]?.role === "merchant")) {
    present.push("marabelle");
  }
  return present;
}

/**
 * Assigns selected shopkeepers onto the world's existing merchant/innkeeper
 * NPC slots, deterministically from the seed. Returns a NEW npcs map (does
 * not mutate). Innkeeper slots take Tobias; merchant slots take present
 * merchants, preferring location fit. Unfilled slots keep their generic
 * identity; unplaced shopkeepers simply don't appear this run.
 */
export function assignShopkeepers(
  npcsInput: Record<EntityId, NPC>,
  settlements: Record<EntityId, Settlement>,
  seed: number
): Record<EntityId, NPC> {
  const npcs: Record<EntityId, NPC> = { ...npcsInput };
  const present = new Set(selectRoster(seed));
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);

  const merchantPool = SHOPKEEPERS.filter((s) => present.has(s.id) && s.role === "merchant")
    .map((s) => ({ s, key: rng() }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.s);
  const tobias = SHOPKEEPERS.find((s) => s.role === "innkeeper" && present.has(s.id));

  const settlementList = Object.values(settlements).sort(
    (a, b) => b.population - a.population || a.id.localeCompare(b.id)
  );

  const placed = new Set<string>();
  let tobiasPlaced = false;

  for (const settlement of settlementList) {
    const here = Object.values(npcs)
      .filter((n) => n.settlementId === settlement.id)
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const npc of here) {
      if (npc.role === "innkeeper" && tobias && !tobiasPlaced) {
        npcs[npc.id] = { ...npc, name: tobias.name, shopkeeperId: tobias.id };
        tobiasPlaced = true;
        continue;
      }
      if (npc.role === "merchant") {
        const pick =
          merchantPool.find((s) => !placed.has(s.id) && s.prefers.includes(settlement.type)) ??
          merchantPool.find((s) => !placed.has(s.id));
        if (pick) {
          npcs[npc.id] = { ...npc, name: pick.name, shopkeeperId: pick.id };
          placed.add(pick.id);
        }
      }
    }
  }

  return npcs;
}
