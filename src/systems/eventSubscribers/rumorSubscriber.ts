import { toAbsoluteDay } from "@/domain/types";
import { eventBus } from "../EventBus";
import { generateRumorFromEvent } from "../RumorSystem";

export function registerRumorSubscriber(): void {
  eventBus.onAny((event) => {
    generateRumorFromEvent(event, toAbsoluteDay(event.timestamp));
  });
}
