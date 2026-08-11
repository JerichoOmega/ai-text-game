import type { EntityId } from "@/domain/types";

/**
 * Every `router.push(...)` in the app should use these instead of a raw
 * string literal. Before this existed, "/quests", "/journal", "/settings",
 * and "/chronicle" were each independently typed as string literals at
 * multiple call sites — a typo in any one of them would compile fine and
 * fail silently at navigation time, since expo-router's file-based routes
 * aren't statically checked against arbitrary strings the way a typed
 * constant is checked against its declared shape.
 *
 * Static routes are plain strings; parameterized routes are functions —
 * that distinction is enforced by the type of `routes` itself, so a call
 * site can't accidentally pass a raw string where an id was required.
 */
export const routes = {
  menu: "/" as const,
  newAdventure: "/new-adventure" as const,
  journey: "/journey" as const,
  character: "/character" as const,
  chronicle: "/chronicle" as const,
  world: "/world" as const,
  journal: "/journal" as const,
  settings: "/settings" as const,
  quests: "/quests" as const,
  shop: (npcId: EntityId) => `/shop?npcId=${npcId}` as const,
  npc: (id: EntityId) => `/npc/${id}` as const,
  combat: "/combat" as const,
};
