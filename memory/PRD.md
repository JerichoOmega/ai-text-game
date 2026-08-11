# Chronicle — PRD / Working Memory

## Recurring shopkeepers (2026-06)
Authored, run-selected shopkeeper roster reusing the existing NPC/persistence/world systems.
- 10 canonical shopkeepers in `src/data/shopkeepers.ts` (node-safe catalog + deterministic
  `selectRoster(seed)` / `assignShopkeepers(npcs,settlements,seed)`). Portraits (10 PNGs under
  `assets/images/shopkeepers/`) mapped in RN-only `src/presentation/npc/shopkeeperPortraits.ts`.
- Added `WorldState.seed` (persisted via `meta`) + `NPC.shopkeeperId?` (persists free — NPCs are
  stored as JSON). Seed generated once in `buildSeedWorld`; shopkeepers assigned onto existing
  merchant/innkeeper slots deterministically and saved. Visiting a shop never rerolls.
- Rarity tiers (common/uncommon/traveling); Tobias + one general merchant always present. Not every
  run contains all ten; different seeds → different rosters (verified).
- `shop.tsx` shows the official portrait + name + specialty + signature greeting via `shopkeeperId`;
  generic role portrait is the fallback. No companion system introduced.
- Verified: typecheck 0 errors, 37/37 tests (7 new), Metro bundles 1162 modules (all 10 assets
  resolve), 10/10 id↔portrait↔role checks. On-device not verifiable (aarch64 vs x86-64 hermesc).


## MVP scope decision (2026-06): Companions DEFERRED (post-launch)
Deliberate scope reduction for a finished MVP. No companion system, tab,
route, screen, model, or persistence — and no dead companion UI. Removed the
disabled "Companions" journal MenuRow and the "& companions" main-menu
subtitle wording. PRESERVED as inert future extension points:
`companion_joined`/`companion_left` event types + HistoryLog entries (never
dispatched). Four tabs (Journey/Character/Chronicle/World) and the Adventure
Journal are unchanged. Freed scope goes to NPC interaction / dialogue.


## Original problem statement
Existing Expo/React Native game "Chronicle". Task: **Core Gameplay Loop
Integration** — connect existing systems into an actual loop:
Combat → Event → Quest Objective Progress → Quest Completion → Rewards →
Reputation → History → NPC Memory / World Consequences.
Audit first, implement only the missing connections, preserve architecture
(Expo/RN, SQLite, Zustand, EventBus, WorldTransaction). Don't rebuild.
Baseline was 20/20 tests passing — must not break it.

## Architecture (unchanged, preserved)
- `src/domain` pure types · `src/data` SQLite repos + seed · `src/systems`
  game engine · `src/state` Zustand store (only bridge UI uses) ·
  `src/presentation` + `app/` (expo-router screens).
- EventBus is the single cross-system coordinator. EventEngine creates/persists
  WorldEvents; reactions live in `eventSubscribers/`. WorldTransaction wraps
  simulate→persist→commit. SaveManager owns load-or-seed + subscriber bootstrap.

## Audit findings (this task)
Already worked: EventBus/EventEngine, subscribers (history/npcMemory/world
consequence/rumor/achievement), QuestGenerator, ReputationSystem.adjust,
NPCMemorySystem, CombatEngine (pure turn resolver), WorldTransaction, SaveManager.
Missing/dead: no objective-progress or quest-completion logic anywhere; rewards
never granted; ReputationSystem never called; `quest_completed` never dispatched
(its NPC-memory subscriber sat waiting) and not in HistoryLog worthy table;
CombatEngine produced a result but no event.

## Implemented (2026-06 — Core Gameplay Loop pass)
- NEW `src/systems/QuestSystem.ts`: `advanceObjective`, `isSatisfied`,
  `checkAndCompleteQuest`, `completeQuest` (ONE authoritative path — reward +
  reputation + `quest_completed` event; idempotent, cannot pay twice).
- NEW `src/systems/CombatSystem.ts`: `resolveAutoBattle` (deterministic) +
  `victoryEvent` (maps victory → existing `bandit_leader_slain` event).
- NEW `src/systems/eventSubscribers/questProgressSubscriber.ts`: combat-victory
  events → advance clear_location/defeat_target objectives → check completion.
- Edited `registerAllEventSubscribers.ts` (register new subscriber),
  `HistoryLog.ts` (`quest_completed: "personal"`), `useWorldStore.ts`
  (`resolveQuestBattle` action via WorldTransaction), `app/quests/index.tsx`
  (minimal "Resolve battle" button → store action only).
- Tests: NEW `tests/questLoop.test.ts` (10 tests). Total 30/30 passing.

## Verification
- Tests: 30/30 pass (20 existing + 10 new), 0 fail, 0 skip.
- Typecheck: new gameplay source = 0 errors. Pre-existing app-wide
  `ResolvedTheme`/`ScreenContainerProps` errors (~150) unrelated to this task.
- Mobile: Metro bundles all 1137 modules OK; native launch blocked by
  aarch64 vs x86-64 `hermesc` mismatch (environment, not source).

## Backlog / next
- P1: wire non-combat objective triggers (`talk_to_npc` off `talkTo`,
  `deliver_item` off travel/arrival).
- P1: fix pre-existing ResolvedTheme/ScreenContainerProps type-surface errors.
- P2: real turn-by-turn combat screen; persist RNG seed for reload determinism;
  persist RumorSystem/AchievementSystem.

## Shop / Merchant screen (2026-06)
Design Bible shop mockup implemented as the smallest abstraction — no new
economy/inventory subsystem.
- Audit: no item/inventory/shop system existed (only `inventoryItemIds: string[]`
  + `gold`); dialogue = `DialogueSystem.getGreeting`; assets = require().
- NEW `src/domain/types/shop.ts` (`ShopItem`), `src/data/shopCatalog.ts`
  (deterministic 5-item stock), `app/shop.tsx` (portrait + dialogue + item
  rows + Buy/Cancel detail sheet), reusable `merchant-portrait.jpg`.
- `useWorldStore.buyItem(itemId)` reuses `gold` + `inventoryItemIds` via
  runTransactionalWorldUpdate + SaveManager (persisted, idempotent-safe,
  affordability-guarded). Reuses DialogueSystem for the shopkeeper line.
- Entry: merchant/innkeeper NPC detail → "Browse wares" → `routes.shop(npcId)`
  (pushed Stack screen). Four-tab nav untouched.
- Verified: typecheck 0 errors, 30/30 tests, Metro bundles 1146 modules,
  sweep shows no duplicate shop/item systems. Item ROW icons use Ionicons
  (no per-item art pipeline). Not verified on-device (aarch64 vs x86-64 hermesc).

## UI — Design Bible pass 2 (2026-06)
Implemented the four follow-up items, presentation-layer only:
- **World Map (UI-003)**: `app/(tabs)/world.tsx` rebuilt with Map/Kingdoms/
  Factions/Locations sub-tabs. Map view = painted `assets/images/world-map.jpg`
  with tappable settlement markers (faction-colored, deterministic layout) +
  a detail panel; new Factions view lists power/seat/standing.
- **New Adventure**: `app/new-adventure.tsx` (name entry + destructive-overwrite
  warning) → `useWorldStore.startNewAdventure` → `SaveManager.createNewWorld`
  (resetDb + fresh seed). Main-menu button enabled + routed (`routes.newAdventure`).
- **Menu Ambience**: main-menu hero now has a slow looping parallax drift +
  pulsing torch-glow (Animated, native driver), both disabled under Reduce Motion.
- **Character Portrait**: `CharacterHeader` uses painted `hero-portrait.jpg`
  (lettered initial kept as a11y label + fallback).
- Verified: typecheck 0 errors, 30/30 tests, Metro bundles 1142 modules.
  Native launch still blocked by aarch64 vs x86-64 hermesc.
Applied uploaded Chronicle UI Design Bible (6 screens) to the presentation
layer only; gameplay/systems untouched.
- NEW `app/index.tsx` Main Menu launcher (route `/`, hero art
  `assets/images/main-menu-hero.jpg`, wordmark + tagline + button launcher).
  Journey tab moved `/` → `/journey` (`app/(tabs)/journey.tsx`);
  `routes.menu`/`routes.journey` updated; root Stack + tabs layout updated.
- Dark theme is now the default (`useUIStore.themeMode: "dark"`); dark palette
  deepened toward the Bible (`background #0A0806`, warmer panels).
- `ChronicleCard` rebuilt to Bible layout (thumbnail + shield).
- Fixed root-cause `Theme` type → `npm run typecheck` now 0 errors
  (was ~150 pre-existing ResolvedTheme errors); also fixed ScreenContainer
  optional children + 2 trivial pre-existing errors (CombatEngine, eventBus test).
- Verified: 30/30 tests, typecheck 0 errors, Metro bundles all 1139 modules.
  Native launch still blocked by aarch64 vs x86-64 hermesc (no on-device shots).
