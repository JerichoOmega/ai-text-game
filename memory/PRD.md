# Chronicle — PRD / Working Memory

## UI Composition & Scale Corrections (2026-06, commit 989d88a)
Presentation/layout-only fixes across Home, bottom nav, and the NPC interaction screen. No gameplay/AI/state/db changes; AI OFF.
- **Home (`app/index.tsx`)**: artwork now has a dedicated hero region at the top (height = clamp(winH×0.42, 300, 520)) with the CHRONICLE wordmark/tagline anchored to its lower edge and a two-band fade into the surface; the navigation menu was moved onto a separate dark Chronicle surface BELOW the hero (previously the menu overlaid the painting). Continue remains the emphasized accent entry; others are open rows on brass rules.
- **Bottom nav (`app/(tabs)/_layout.tsx`)**: tab bar height is now inset-aware (`58 + insets.bottom`, `paddingBottom = max(insets.bottom, 8)`) via `useSafeAreaInsets`, so icons + labels are never clipped by the home indicator and content never sits under the bar. React Navigation already insets the scene above the (non-absolute) bar; screen ScrollViews keep their `paddingBottom`.
- **NPC screen (`app/npc/[id].tsx`)**: replaced the full-bleed 52%-height portrait-as-background with a compact header (back + "Character"), a medium framed portrait bust (168×208, brass frame, cover), name + role beneath, an italic manuscript NPC line, and compact player-choice rows (leading topic icon + label + chevron). Dialogue is now the dominant content; default interaction fits a phone viewport. All testIDs preserved (npc-portrait/name/line/back-button/response-*). People-list medallions on Journey left unchanged (distinct small-portrait context).
- **Verified**: tsc 0 errors; 217/217 tests; `expo export --platform web` OK; SQLite guard passes. Live smoke on Home confirmed the hero-region/menu-surface split (menu no longer overlays artwork). NOTE: the automation harness still renders bundled raster images as dark placeholders (documented artifact affecting the hero painting and brass icons), so the hero painting's actual pixels and the NPC portrait bust are UNCONFIRMED in-harness; the composition/scale/layout structure is confirmed and all gates pass. Recommend an on-device/browser glance. Agent-tested only.


## UI Polish — Ornate Chronicle Section Rules (2026-06, commit 7eeee70)
Small presentation-only refinement of the shared `SectionLabel` primitive. No gameplay/AI/state/db changes; AI OFF; no new dependency; brass icons untouched.
- **Change**: the section rule evolved from a plain hairline to `LABEL ──── ✦ ────` — a restrained brass diamond (rotated 6px View, locked gold token, opacity ~0.8) centered between two flex hairlines, with the optional drill-down link preserved on the right.
- **Implementation**: View-only (no asset, no dependency); wrapped in a `ruleWrap` flex row with `spacing.sm` gap so it doesn't inflate height or shift layout. Because every screen's section headers use this one primitive, the flourish propagates everywhere at once (Journey/Character/Chronicle/World/New Adventure).
- **Verified**: tsc 0 errors; 217/217 tests; `expo export --platform web` OK; SQLite guard passes. Live smoke on New Adventure (renders without world-load) confirmed the ornament on all four section labels — subtle, centered, no layout shift, no extra vertical spacing. Since the ornament is a View (not a raster image) it renders reliably in the harness. Agent-tested.


## UI Polish — Handcrafted Brass Icon System (2026-06, commit cdff649)
Presentation-only iconography pass on top of the reconstruction. No gameplay/AI/state/db changes; AI OFF; no new dependency.
- **New**: `BrassIcon` component + 6 transparent brass PNGs in `assets/images/icons/` (ic_journey compass, ic_chronicle open book, ic_world globe, ic_character helmeted adventurer, ic_quest scroll, ic_rest hourglass). Icons carry their own brass color, so they're never tinted; active state is a restrained opacity lift.
- **Applied selectively**: bottom nav (all 4 destinations); Home menu (Continue/Chronicle/Characters/Quest Log/World — Ionicons kept for New Adventure & Inventory); Rest a Day button (brass hourglass). Section glyphs & small utility icons intentionally left as Ionicons (no forced matches; SectionLabel kept text-only to preserve the design system).
- **Asset provenance**: the reference pack's individual icon files were unusable — baked-in dark backgrounds (RGB, no alpha), neighbor-pixel bleed, and at least one mislabeled crop. So a clean cohesive set was generated (nano-banana) then background-keyed by saturation into real transparent RGBA PNGs (256px, autocropped/squared). Composite preview on the dark bg confirms a coherent engraved-brass set.
- **Verification**: tsc 0 errors; 217/217 tests; `expo export --platform web` OK; SQLite guard passes; all 6 icons hashed+bundled in dist and served as valid transparent RGBA PNGs (curl 200). Layout/IA unchanged (Home menu renders correctly with wells + brass borders). NOTE: the screenshot harness could not paint pixel content for ANY bundled raster image during this pass — the pre-existing hero image also rendered as a dark shape in the same captures — so live on-screen brass-icon pixels are UNCONFIRMED in-harness. This is an environment/harness image-loading artifact, not a code defect (require'd images rendered correctly on the dev server earlier this session, and the app has always shipped with working images; this change only adds a standard `<Image>`). Agent-tested only; recommend a quick on-device/browser glance to confirm the icons visually.


## UI Reconstruction — Cohesive Chronicle Design System (2026-06, commit 739a0dc)
Presentation-only rebuild of the visual language + information architecture. No gameplay/AI/state/db/SaveManager changes; AI stays OFF; all 217 tests + tsc + web export + SQLite guard pass.
- **Design system**: `ChronicleBackground` (generated dark leather/parchment texture `assets/images/textures/chronicle-bg.jpg` + obsidian scrim + vignette) wired into `ScreenContainer` so every destination shares atmosphere; new `SectionLabel` primitive (tracked small-caps + brass rule + optional drill-down link) replaces the habit of boxing every section. Reused the existing locked theme tokens (Georgia serif display, warm parchment ink, antique gold, crimson `wax`, emerald `forest`, cool `accent` for "you are here").
- **IA principle applied**: destinations, not documents — one-screenful with drill-downs instead of stacked cards.
- **Journey**: open sections (no OrnateFrame boxes); location art stays hero; Current Journey is an open passage with the single crimson action; People capped (4 mobile / 6 desktop, no directory); Recent Events = borderless chronicle feed → View Chronicle; slimmer Rest bar.
- **Character**: identity hero (portrait `hero-portrait.jpg` + serif name + Level·Race·Background) with always-visible Health/XP meters, then **Overview / Stats / Gear** segmented drill-down (was one long stats dashboard).
- **Chronicle**: **News** open list (newest emphasized serif) + **Timeline** year-grouped rail with node dots (was identical `ChronicleCard`s).
- **World**: map-first segmented tabs (Map/Kingdoms/Factions/Locations) with open atlas list rows (was stacked `Panel` cards).
- **New Adventure**: character-ledger manuscript — intro passage, large serif name field, brass-ruled chip groups, "Begin the Saga" (was boxed form).
- **Home**: de-boxed chronicle menu (Continue emphasized in accent, rest as open rows on brass rules, more breathing room). Bottom nav restyled as chronicle tabs (brass top rule, taller, restrained accent active).
- **Verification**: tsc 0 errors; 217/217 tests; `expo export --platform web` OK; SQLite guard passes; `chronicle-bg.jpg` bundled. Live smoke (prod bundle): Home + New Adventure fully rendered in the new language; bottom nav + dark textured background + loading states confirmed. Journey/Character/Chronicle/World are code-complete and share the validated primitives, but the automation harness's fixed ~10s capture window on a cold browser context could not catch them after world-seed completes — an environment/harness limitation, not a code defect (the full web loop rendered a loaded Journey earlier this session). Agent-tested only; no on-device confirmation.
- **Old components left in place but now unused by primary screens**: `OrnateFrame`, `ChronicleCard`, `SectionHeader`, `CharacterHeader`, `StatBar`, `Panel` (still used by secondary screens like inventory/shop). Not removed to avoid churn.


## Journey UI — Targeted Polish & Correctness Pass (2026-06, commit dd9967d)
Presentation-only refinement of the dark-fantasy Journey screen; no gameplay/AI changes (AI still OFF).
- **Asset**: `assets/journey/eastbridge.png` → `assets/journey/town-settlement.png` (generic settlement art,
  mockup-only, NOT canonical). `LocationBanner` require updated. No source refs to old name (the remaining
  `eastbridge` hits in `seedWorld.ts` are the legit canonical settlement/kingdom/faction/history — untouched).
- **People**: `PeopleSection` capped at 6 (removed the misleading "View all people (N)" link — the app has
  NO NPC directory screen, so any nav target would be dishonest). `portraitForNpc()` preserved. `journey.tsx`
  passes `limit={6}`, no `onViewAll`.
- **Recent Events**: lightened to a borderless "open chronicle" feed (dropped the `OrnateFrame` box; subtle
  left rule via `styles.feed`). Newest entry emphasized. "View Chronicle ›" → existing `routes.chronicle`.
  Deterministic ordering: `year` desc, insertion-index tiebreak (history has only `year`, no date/timestamp).
- **Current Journey action**: label/behavior honestly maps to `resolveQuestAffordance` — talk+here →
  `Speak with X` (opens NPC route), else Travel/Deliver/Continue → quest screen. No invented mechanics.
- **Banner data** (name/date/weather/stability) all sourced live from world state; Location kept as hero;
  restrained crimson preserved; responsive desktop two-column / mobile single-column retained.
- **Verified**: `tsc --noEmit` 0 errors; `yarn test` 213/213; `expo export --platform web` OK (SQLite guard
  passes, no native symbols); `town-settlement.png` correctly hashed+bundled in dist. Live desktop smoke
  confirmed full render (dynamic Eastbridge hero, 6 NPCs, Continue Journey, chronicle, Rest a Day, nav; no
  console errors / external requests; AI OFF). Metro dev hero-art has a known asset-registration timing quirk
  after file renames (needs `--clear`); production export is correct. Agent-tested only; no device confirmation.


## Inventory & Equipment (2026-06)
Small text-first inventory; makes weapons/armor/shop purchases meaningful. Reuses the combat stat path.
- **Audited conflict fixed**: shop and equipment used two id namespaces, so purchased gear did nothing.
  Bridged by giving shop equippables real `equipment.ts` defs (`item_iron_sword`→weapon +3 Atk,
  `item_travelers_cloak`→armor +2 Def/+1 Spd). One id space; no mapping layer.
- `EquipmentSystem` (pure `equipItem`/`unequipItem`, one item per slot, invalid ops rejected) +
  store `equipItem`/`unequipItem` through WorldTransaction/SaveManager. `equipmentBonus` →
  `CharacterSystem.effectiveStats` stays the single stat path; `CombatSystem.toPlayerCombatant`
  already builds from it, so interactive + auto combat both read equipped stats (formulas untouched).
- `app/inventory.tsx`: live effective stats (base shown), Weapon/Armor slots + Unequip, inventory list +
  Equip. Reached from the Journal Inventory row. shop.tsx / shopkeepers / leveling untouched. No schema
  change (both id lists already persisted as JSON).
- **Verified**: tsc 0 errors; 89/89 tests (10 new); Metro resolves 1258 modules (Hermes blocked by
  aarch64/x86-64). On-device UI rendering NOT verified (no simulator/browser target in container).
- **P1 backlog**: enemy abilities, XP from quests/story, defeat/recovery sanctuaries, inventory sort/stack.


## Combat, Progression & Leveling (2026-06)
New official MVP combat + character-progression foundation. Deterministic systems, simple text-first UX.
- **Six combat stats only**: HP + Attack/Defense/MagicPower/MagicDefense/Speed (`CombatStats`).
  Removed the 6 D&D attributes; old saves migrate via `worldRepository.migratePlayer` (save v4).
- **Single deterministic engine** (`src/systems/CombatEngine.ts`): physical = Atk+power-Def,
  magic = MPow+power-MDef, floor 1; heal = power+floor(MPow/2); defend halves next hit; turn order
  by Speed (player wins ties); defeat at HP≤0. `CombatSystem` sets up encounters + keeps the existing
  `bandit_leader_slain` victory→quest bridge + a headless autoResolve (same engine) for tests.
- **Progression** (`src/systems/ProgressionSystem.ts`): cap 12; one ability/level alternating
  (L1 Character…L12 Combat → 6+6); fixed stat growth; XP curve 100+(lvl-1)*60; XP frozen at cap;
  level-up choices (3–4) deterministic per world seed, derived from unlock counts (no extra persisted state).
- **Character creation** (`new-adventure.tsx`): name→race(5)→background(5)→motivation(4); no classes;
  race+background give a small deterministic stat bias; background grants the L1 Character ability +
  starting equipment (`CharacterSystem.createStartingPlayer`).
- **Data**: `abilities` (12 character + 12 combat + Basic Attack), `equipment` (flat modifiers),
  `enemies` (level-scaled), `origins`. Player stores only ids.
- **UI**: text-first `app/combat.tsx` (enemy/you HP, log, 3–5 actions, inline level-up), rebuilt
  Character tab (six stats + ability/equipment lists). Quest battles now enter `/combat`.
- **Defeat (MVP)**: HP≤0 → defeat, restore to 1 HP, no permadeath, progress intact. Richer system = future.
- **Verified**: tsc 0 errors; 79/79 tests (28 new); Metro resolves 1256 modules (Hermes bytecode blocked
  by aarch64/x86-64). On-device rendering / SQLite / haptics NOT verified here.
- **P1 backlog**: enemy abilities in combat, inventory/equip UI, XP from quests/story, defeat/recovery system.


## Canonical 12 NPCs + unified dialogue (2026-06)
Completed the NPC character & visual-consistency milestone (separate content pool from shopkeepers).
- 12 canonical NPCs in `src/data/npcRegistry.ts` (node-safe: identities, emotion→expression aliasing,
  `selectRecurringRoster(seed)`, `assignRecurringNpcs(npcs,seed)`). RN-only static asset map in
  `src/presentation/npc/npcAssets.ts` = 12 base portraits + 72 expressions under
  `assets/characters/npc/`. `NPC.characterId?` added (persists as JSON, separate from `shopkeeperId`).
- **Bug fixed**: `seedWorld.ts` computed canonical assignment but returned the pre-assignment map, so
  canonical NPCs never appeared. Now returns `npcsFinal`. Verified: 6–9 canonical NPCs/seed, 0 overlap
  with shopkeepers, all ids valid, deterministic, JSON round-trip stable.
- **Single resolver**: `portraitForNpc(npc, emotion)` in `shopkeeperPortraits.ts`, precedence
  `characterId → shopkeeperId → generic role`. Fallback: mapped expression → neutral → base portrait →
  generic; never substitutes another character's art, never generates. Deleted dead `NPCPortrait.tsx`
  (duplicate role-only path).
- **Portrait-dominant dialogue** `app/npc/[id].tsx`: large portrait (emotion from relationship + topic),
  greeting + deterministic `DialogueSystem` responses/replies, haptics, a11y labels/live-region. Shop
  entry for merchants preserved. `shop.tsx` portrait framing aligned to the same visual language;
  shop mechanics untouched.
- `DESIGN_SYSTEM.md`: added official "Chronicle NPC Visual Style" section (canonical 12 as style
  anchors, generated NPCs "same art direction / different characters", shopkeepers distinct pool,
  expression + portrait-dominant rules, reference-art rule).
- Verified: typecheck 0 errors, 51/51 tests (14 new, node-safe), Metro resolves 1248 modules + all
  new assets (fails only at Hermes bytecode: aarch64 vs x86-64 hermesc). On-device rendering NOT
  verifiable here.


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
