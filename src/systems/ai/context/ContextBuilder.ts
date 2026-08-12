import type { EntityId, NPC } from "@/domain/types";
import type { WorldStateManager } from "@/systems/WorldStateManager";
import { NPCMemorySystem } from "@/systems/NPCMemorySystem";
import { capitalize } from "@/utils/format";
import {
  GM_CONTEXT_SCHEMA_VERSION,
  type Band,
  type GmContext,
  type GmFocus,
  type NpcSummary,
  type QuestSummary,
} from "./GmContext";

/** Hard bounds so a context can never balloon into a giant prompt (spec §9). */
export const CONTEXT_LIMITS = {
  npcsPresent: 6,
  activeQuests: 5,
  recentEvents: 5,
  history: 4,
  rumors: 5,
  memoriesPerNpc: 3,
  recentLog: 6,
  maxSerializedBytes: 8000,
} as const;

function scale(value: number, max: number): Band {
  if (max <= 0) return "none";
  const r = value / max;
  if (r <= 0) return "none";
  if (r < 0.3) return "low";
  if (r < 0.6) return "moderate";
  if (r < 0.9) return "high";
  return "critical";
}

function relationshipBand(value: number): Band {
  if (value <= -60) return "critical";
  if (value <= -20) return "low";
  if (value < 20) return "moderate";
  if (value < 60) return "high";
  return "critical";
}

function summarizeNpc(npc: NPC, here: boolean): NpcSummary {
  return {
    npcId: npc.id,
    name: npc.name,
    role: npc.role,
    relationship: relationshipBand(npc.playerRelationship),
    prominentMemories: NPCMemorySystem.getProminentMemories(npc, CONTEXT_LIMITS.memoriesPerNpc).map((m) => m.summary),
    here,
  };
}

function summarizeQuest(q: { id: EntityId; title: string; status: string; giverNpcId: EntityId; objectives: { label: string; complete: boolean }[] }): QuestSummary {
  return {
    questId: q.id,
    title: q.title,
    status: q.status,
    giverNpcId: q.giverNpcId,
    objectives: q.objectives.map((o) => ({ label: o.label, complete: o.complete })),
  };
}

/**
 * Builds a compact, bounded GmContext from the authoritative WorldStateManager
 * — READ ONLY. Gathers only what the focus needs, applies the CONTEXT_LIMITS
 * caps, and never puts a WorldState reference (or any live object) into the
 * returned DTO. The allow-list is every entity the AI is permitted to name.
 */
export function buildGmContext(manager: WorldStateManager, focus: GmFocus): GmContext {
  const world = manager.getWorld();
  const here = world.player.currentSettlementId;
  const settlement = world.settlements[here];

  const npcsHere = manager
    .getNpcsInSettlement(here)
    .filter((n) => n.alive)
    .slice(0, CONTEXT_LIMITS.npcsPresent);

  const activeQuests = Object.values(world.quests)
    .filter((q) => q.status === "available" || q.status === "active")
    .slice(0, CONTEXT_LIMITS.activeQuests);

  const focusNpcId = focus.kind === "npc" ? focus.npcId : null;
  const focusNpc = focusNpcId ? world.npcs[focusNpcId] : undefined;

  const allowed = new Set<EntityId>();
  if (settlement) allowed.add(settlement.id);
  for (const n of npcsHere) allowed.add(n.id);
  if (focusNpc) allowed.add(focusNpc.id);
  for (const q of activeQuests) {
    allowed.add(q.id);
    allowed.add(q.giverNpcId);
  }

  const hpBand = scale(world.player.hp, Math.max(1, world.player.maxHp));

  const context: GmContext = {
    schemaVersion: GM_CONTEXT_SCHEMA_VERSION,
    focus,
    shortTerm: {
      location: {
        settlementId: here,
        name: settlement?.name ?? "the wilds",
        prosperity: settlement ? scale(settlement.prosperity, 100) : "none",
        roadSafety: settlement ? scale(settlement.roadSafety, 100) : "none",
        destroyed: settlement?.destroyed ?? false,
      },
      time: {
        year: world.currentDate.year,
        season: capitalize(world.currentDate.season),
        day: world.currentDate.day,
        weather: capitalize(world.weather.current),
      },
      player: {
        name: world.player.name,
        level: world.player.level,
        health: hpBand,
        wealth: scale(world.player.gold, 500),
        currentSettlementId: here,
      },
      recentLog: [],
    },
    session: {
      npcsPresent: npcsHere.map((n) => summarizeNpc(n, true)),
      activeQuests: activeQuests.map(summarizeQuest),
      rumors: [],
      recentEvents: world.events.slice(-CONTEXT_LIMITS.recentEvents).map((e) => ({ type: e.type, description: e.description })),
    },
    persistent: {
      focusNpc: focusNpc && focusNpc.alive ? summarizeNpc(focusNpc, focusNpc.settlementId === here) : null,
      relevantReputations: world.player.reputations.slice(0, 5).map((r) => ({ scope: r.scope, standing: relationshipBand(r.standing) })),
    },
    history: [...world.history]
      .sort((a, b) => b.year - a.year)
      .slice(0, CONTEXT_LIMITS.history)
      .map((h) => ({ year: h.year, category: h.category, headline: h.headline })),
    allowedEntityIds: [...allowed],
  };

  return context;
}
