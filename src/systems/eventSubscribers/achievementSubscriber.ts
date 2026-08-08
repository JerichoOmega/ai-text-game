import { toAbsoluteDay } from "@/domain/types";
import { eventBus } from "../EventBus";
import { achievementTracker } from "../AchievementSystem";

export function registerAchievementSubscriber(): void {
  eventBus.on("bandit_leader_slain", (event) => {
    achievementTracker.unlock("first_bandit_slain", "Road Warden", toAbsoluteDay(event.timestamp));
  });
  eventBus.on("ruler_crowned", (event) => {
    achievementTracker.unlock("witnessed_coronation", "Kingmaker's Witness", toAbsoluteDay(event.timestamp));
  });
  eventBus.on("dungeon_cleared", (event) => {
    achievementTracker.unlock("first_dungeon_cleared", "Delver", toAbsoluteDay(event.timestamp));
  });
}
