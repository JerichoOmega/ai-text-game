import { eventBus } from "../EventBus";
import { registerHistorySubscriber } from "./historySubscriber";
import { registerNpcMemorySubscriber } from "./npcMemorySubscriber";
import { registerWorldConsequenceSubscriber } from "./worldConsequenceSubscriber";
import { registerQuestProgressSubscriber } from "./questProgressSubscriber";
import { registerRumorSubscriber } from "./rumorSubscriber";
import { registerAchievementSubscriber } from "./achievementSubscriber";

let registered = false;

/**
 * Idempotent — safe to call multiple times (e.g. hot reload in dev) without
 * double-registering handlers, which would double-apply every consequence.
 *
 * Dialogue is deliberately not represented here: DialogueSystem resolves
 * lines on demand from live NPC/world state, so there's nothing to
 * "refresh" — adding a no-op subscriber for it would be indirection with no
 * behavior behind it. If dialogue ever needs cached/precomputed state,
 * that's when it earns a subscriber.
 */
export function registerAllEventSubscribers(): void {
  if (registered) return;
  eventBus.reset();

  // History first: it decides worthiness independently of what other
  // subscribers do to world state, and every other reaction should be able
  // to assume the event is already on the permanent record.
  registerHistorySubscriber();
  registerNpcMemorySubscriber();
  registerWorldConsequenceSubscriber();
  // Quest progress reacts to combat-victory world events after the world
  // consequence (road safety, trade) has been applied for the same event.
  registerQuestProgressSubscriber();
  registerRumorSubscriber();
  registerAchievementSubscriber();

  registered = true;
}
