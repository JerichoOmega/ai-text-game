import type { CombatAction, CombatEncounter, Combatant, StatusEffectType } from "@/domain/types";

const POSITION_DAMAGE_MULTIPLIER: Record<Combatant["position"], number> = {
  front: 1.0,
  mid: 0.85,
  back: 0.7,
};

export interface TurnResult {
  logLines: string[];
  encounter: CombatEncounter;
}

function applyStatusEffectTicks(combatant: Combatant): { combatant: Combatant; log: string[] } {
  const log: string[] = [];
  let hp = combatant.hp;
  const remainingEffects = combatant.statusEffects
    .map((effect) => {
      if (effect.type === "poisoned" || effect.type === "bleeding") {
        hp = Math.max(0, hp - effect.magnitude);
        log.push(`${combatant.name} takes ${effect.magnitude} damage from ${effect.type}.`);
      }
      return { ...effect, remainingTurns: effect.remainingTurns - 1 };
    })
    .filter((effect) => effect.remainingTurns > 0);

  return { combatant: { ...combatant, hp, statusEffects: remainingEffects }, log };
}

function resolveAttack(encounter: CombatEncounter, action: CombatAction): string[] {
  const log: string[] = [];
  const actor = encounter.combatants.find((c) => c.id === action.actorId);
  const target = encounter.combatants.find((c) => c.id === action.targetId);
  if (!actor || !target || actor.hp <= 0) return log;

  const isStunned = actor.statusEffects.some((e) => e.type === "stunned");
  if (isStunned) {
    log.push(`${actor.name} is stunned and cannot act.`);
    return log;
  }

  const baseDamage = 8; // placeholder base; real gear/ability stats plug in here later
  const positionMultiplier = POSITION_DAMAGE_MULTIPLIER[target.position];
  const isShielded = target.statusEffects.some((e) => e.type === "shielded");
  const damage = Math.max(1, Math.round(baseDamage * positionMultiplier * (isShielded ? 0.5 : 1)));

  target.hp = Math.max(0, target.hp - damage);
  log.push(`${actor.name} attacks ${target.name} for ${damage} damage${isShielded ? " (reduced by shield)" : ""}.`);
  if (target.hp === 0) {
    log.push(`${target.name} is defeated.`);
  }
  return log;
}

export const CombatEngine = {
  resolveTurn(encounter: CombatEncounter, actions: CombatAction[]): TurnResult {
    const log: string[] = [];
    let combatants = [...encounter.combatants];

    // Front-line combatants act before back-line, simple initiative rule.
    const ordered = [...actions].sort((a, b) => {
      const posA = combatants.find((c) => c.id === a.actorId)?.position ?? "back";
      const posB = combatants.find((c) => c.id === b.actorId)?.position ?? "back";
      const order: Record<string, number> = { front: 0, mid: 1, back: 2 };
      return order[posA] - order[posB];
    });

    let working: CombatEncounter = { ...encounter, combatants };
    for (const action of ordered) {
      if (action.type === "attack" && action.targetId) {
        const lines = resolveAttack(working, action);
        log.push(...lines);
      } else if (action.type === "defend") {
        working = {
          ...working,
          combatants: working.combatants.map((c) =>
            c.id === action.actorId
              ? { ...c, statusEffects: [...c.statusEffects, { type: "shielded" as StatusEffectType, remainingTurns: 1, magnitude: 0 }] }
              : c
          ),
        };
        log.push(`${working.combatants.find((c) => c.id === action.actorId)?.name} braces for impact.`);
      } else if (action.type === "flee") {
        log.push("The party flees the encounter.");
        return { logLines: log, encounter: { ...working, resolved: true, playerVictorious: false } };
      }
    }

    // End-of-round status effect ticks.
    const tickedCombatants = working.combatants.map((c) => {
      const { combatant, log: tickLog } = applyStatusEffectTicks(c);
      log.push(...tickLog);
      return combatant;
    });

    const playerAlive = tickedCombatants.some((c) => c.isPlayerParty && c.hp > 0);
    const enemyAlive = tickedCombatants.some((c) => !c.isPlayerParty && c.hp > 0);
    const resolved = !playerAlive || !enemyAlive;

    const finalEncounter: CombatEncounter = {
      ...working,
      combatants: tickedCombatants,
      round: working.round + 1,
      resolved,
      playerVictorious: resolved ? playerAlive : null,
    };

    if (resolved) {
      log.push(playerAlive ? "Victory!" : "Defeat...");
    }

    return { logLines: log, encounter: finalEncounter };
  },
};
