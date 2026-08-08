import { eventBus } from "../EventBus";
import { NPCMemorySystem } from "../NPCMemorySystem";

/**
 * Every handler here follows the same shape: read who was affected, decide
 * who should remember it and how strongly, call NPCMemorySystem.remember.
 * This is the piece that used to live inline in EventEngine's consequence
 * rules — moved here so EventEngine no longer needs to know anything about
 * how NPCs react emotionally to events.
 */
export function registerNpcMemorySubscriber(): void {
  eventBus.on("settlement_destroyed", (event, ctx) => {
    for (const settlementId of event.affectedEntityIds) {
      const settlement = ctx.manager.getSettlement(settlementId);
      if (!settlement) continue;
      for (const npc of ctx.manager.getNpcsInSettlement(settlementId)) {
        NPCMemorySystem.remember(ctx.manager, npc.id, {
          type: "world_event_witnessed",
          summary: `Watched ${settlement.name} burn.`,
          timestamp: event.timestamp,
          relatedEntityIds: [event.id],
          sentiment: -60,
        });
      }
    }
  });

  eventBus.on("player_killed_npc", (event, ctx) => {
    const [victimId] = event.affectedEntityIds;
    if (!victimId) return;
    const victim = ctx.manager.getNpc(victimId);
    if (!victim) return;

    ctx.manager.setNpc({ ...victim, alive: false, diedOn: event.timestamp });

    for (const tie of victim.familyTies) {
      const relative = ctx.manager.getNpc(tie.npcId);
      if (!relative || !relative.alive) continue;
      NPCMemorySystem.remember(ctx.manager, relative.id, {
        type: "crime_witnessed",
        summary: `Lost their ${tie.relation === "child" ? "child" : tie.relation} ${victim.name} to the player.`,
        timestamp: event.timestamp,
        relatedEntityIds: [event.id, victim.id],
        sentiment: -80,
      });
    }
  });

  eventBus.on("player_helped_npc", (event, ctx) => {
    const [npcId] = event.affectedEntityIds;
    if (!npcId || !ctx.manager.getNpc(npcId)) return;
    NPCMemorySystem.remember(ctx.manager, npcId, {
      type: "favor_received",
      summary: event.description,
      timestamp: event.timestamp,
      relatedEntityIds: [event.id],
      sentiment: 40,
    });
  });

  eventBus.on("crime_witnessed", (event, ctx) => {
    for (const witnessId of event.affectedEntityIds) {
      if (!ctx.manager.getNpc(witnessId)) continue;
      NPCMemorySystem.remember(ctx.manager, witnessId, {
        type: "crime_witnessed",
        summary: event.description,
        timestamp: event.timestamp,
        relatedEntityIds: [event.id],
        sentiment: -30,
      });
    }
  });

  eventBus.on("quest_completed", (event, ctx) => {
    const [giverNpcId] = event.affectedEntityIds;
    if (!giverNpcId || !ctx.manager.getNpc(giverNpcId)) return;
    NPCMemorySystem.remember(ctx.manager, giverNpcId, {
      type: "quest_outcome",
      summary: event.description,
      timestamp: event.timestamp,
      relatedEntityIds: [event.id],
      sentiment: 30,
    });
  });
}
