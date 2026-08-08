import { eventBus } from "../EventBus";
import { HistoryLog } from "../HistoryLog";

export function registerHistorySubscriber(): void {
  eventBus.onAny(async (event, ctx) => {
    await HistoryLog.recordIfWorthy(ctx.manager, event);
  });
}
