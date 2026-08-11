# Chronicle — PRD / Working Memory

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
