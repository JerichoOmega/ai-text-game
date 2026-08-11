# Production Hardening — Status

## MVP scope: Companions deferred (post-launch)

**Companions are deferred from the initial release** — a deliberate scope
reduction to get Chronicle to a finished, releasable MVP sooner. This is
**not** a permanent cancellation; companions are a planned future/post-launch
system. There is intentionally no companion gameplay system, no Companions
navigation destination, no companion screen/route/model/persistence, and no
dead companion UI. The `companion_joined`/`companion_left` world-event types
(and their HistoryLog entries) are preserved as inert future extension points
only — nothing dispatches them today. The MVP centers on the player's personal
journey and on richer NPC interaction (the portrait-dominant dialogue screen).

## Recurring shopkeepers (authored roster, run-selected)

Chronicle ships a canonical roster of **10 authored recurring shopkeepers**
(`src/data/shopkeepers.ts`) — Marabelle, Eldric, Brogan, Lyra, Zahir, Pip,
Sister Miriam, Grok, Silas, Tobias. They are a **pool**, not a fixed cast:
each run deterministically selects a subset from the new persisted
`WorldState.seed` and assigns them onto the existing merchant/innkeeper NPC
slots (`NPC.shopkeeperId`), reusing the existing NPC, world-gen, and
persistence systems (no second system). Selection is stable for the run
(shops never reroll on visit), reproduces from the seed, and varies between
seeds. Rarity tiers (common / uncommon / traveling); Tobias and one general
merchant are always present so every world has a shop. Portraits are the
supplied authored art (`assets/images/shopkeepers/*.png`), mapped RN-side in
`shopkeeperPortraits.ts`; the shop/dialogue presentation shows the official
portrait, name, and specialty for an assigned shopkeeper.



Written against the 14-phase hardening prompt. Graded honestly: **Done**
means implemented and internally consistent (verified by manual type-surface
review, not by running the toolchain — no network in this environment, see
README). **Partial** means real code exists but doesn't cover the full
phase. **Deferred** means not started, with the reason why.

| Phase | Status | Notes |
|---|---|---|
| 1. Architecture Audit | Done | See below — this whole pass *is* the audit-then-refactor. |
| 2. Event Bus | Done | `EventBus.ts` + `eventSubscribers/*`. EventEngine no longer contains reactive logic. |
| 3. Simulation Engine | Done | `SimulationEngine.ts` — fixed pipeline, TimeSystem now a compatibility shim over it. |
| 4. World Managers | Partial | `WeatherManager` added (genuinely new logic). The other 13 named managers were deliberately **not** created as wrapper classes — see rationale below. |
| 5. Data-Driven Content | Deferred | Not started. |
| 6. Chronicle System | Partial | `HistoryLog.generateYearNarrative()` renders a readable per-year summary. No dedicated chronicle screen yet (history screen shows a flat list, not the narrative). |
| 7. NPC Memory | Done | Expanded `MemoryType`, importance-weighted decay (major events don't fade, routine ones do), `decayed` flag now actually computed and used by `getProminentMemories()`. |
| 8. Emergent Quest Generator | Unchanged | Already implemented in the vertical slice; not touched this pass. Still only 3 templates — more chains (crop failure → prices → hunters → poachers → rangers) are content work, not architecture, and are deferred. |
| 9. Reputation | Partial | Added `ReputationScope` (global/kingdom/settlement/faction). Guild/religion/family scopes **not** added — those entity types don't exist in the domain layer, so the scope would be a label with nothing behind it. `ReputationSystem.adjust()` is **now called from quest completion** (`QuestSystem.completeQuest`), faction-scoped when the reward names a faction and global otherwise — it is no longer dead code. Reputation still doesn't influence prices/dialogue/etc. |
| 10. Save System | Partial | Weather now persists, forward/backward-compatible (`saveVersion` bumped, old saves default gracefully). No RNG seed persisted — `Math.random()` is used directly, so save/load does not currently reproduce identical future rolls. Simulation clock (`currentDate`) does persist. |
| 11. Performance | Deferred | Not started beyond what already existed (indexed SQLite columns from the original pass). No profiling has been done; "prepare for thousands of NPCs" hasn't been tested at that scale. |
| 12. Testing | Partial | 7 test files under `tests/` (added `questLoop.test.ts` for the gameplay-loop integration) covering time math, NPC memory decay, EventBus ordering/isolation, quest conditionality, world-state transaction safety, and the full combat→objective→completion→reward→reputation→history→memory loop — all pure-logic, no SQLite/RN dependency. **Executed and verified**: `npm test` — **30/30 passing, 0 failing, 0 skipped**. `npm run typecheck` now runs (`expo` installed) but surfaces a **pre-existing, app-wide** `ResolvedTheme`/`ScreenContainerProps` type-surface issue across the presentation layer (~150 errors, none in the gameplay-loop source). No CI yet. |
| 13. Documentation | Done (this pass) | This file + README updates. Architecture diagrams and a formal extension guide are not written. |
| 14. Code Quality | Partial | This refactor itself is a cohesion/coupling improvement (Phase 2/3). No dedicated duplication/naming audit pass beyond what fell out of the refactor. |

## Phase 1 audit, in short

What was already sound and preserved as-is: the domain/data/systems/state/
presentation split, the SQLite JSON-blob-per-table persistence model, the
seed data shape, the component/screen layer. Nothing there needed
rewriting.

What had the coupling problem the prompt named: `EventEngine` owned a
`CONSEQUENCE_RULES` table that directly called `NPCMemorySystem.remember()`
and mutated settlements inline — i.e. exactly "one gameplay system directly
calling another while reacting to an event." That's what moved to
`eventSubscribers/`. `TimeSystem` owned the day-loop directly rather than
delegating to a dedicated simulation class — that's what `SimulationEngine`
now owns, with `TimeSystem` kept only so nothing calling it breaks.

## Why 13 of 14 named managers weren't created

`CharacterManager`, `SettlementManager`, `FactionManager`, `EconomyManager`,
`QuestManager`, `DialogueManager`, `CombatManager`, `InventoryManager`,
`RelationshipManager`, `TimeManager` etc. would each be a class whose entire
body is "call the existing system of (almost) the same name." That's
indirection with no behavior behind it — the kind of thing Phase 14 asks to
eliminate, not add. `NPCMemorySystem` already *is* the character/
relationship manager; `EconomySystem` already *is* the economy manager.
`WeatherManager` got made because weather is new — there was no existing
system to wrap. If a system's responsibilities genuinely outgrow one file
(e.g. `CombatEngine` sprouts targeting AI, an ability system, and loot
tables as separate concerns), that's the signal to split it into a real
manager + supporting files, not before.

## Recommended order for what's actually next

1. ~~**Wire something to consume `ReputationSystem`**~~ — **done** (Core
   Gameplay Loop pass): `QuestSystem.completeQuest` now calls `adjust()`
   using the reward's faction scope (or global), so reputation is a real
   consequence of quest completion.
2. ~~**Combat → quest completion loop**~~ — **done** (Core Gameplay Loop
   pass): `CombatSystem` turns a combat victory into a `bandit_leader_slain`
   world event; `questProgressSubscriber` advances the matching quest
   objective; `QuestSystem` completes the quest along one authoritative
   path (reward + reputation + `quest_completed` event → history + NPC
   memory). Reachable in-app via the Quest Log's "Resolve battle" action.
   Remaining loop work: non-combat objective triggers (`talk_to_npc`,
   `deliver_item`) and a real turn-by-turn combat screen.
3. ~~Run `npm test` for real~~ — done; now 30/30 passing.
4. Persist an RNG seed if determinism-on-reload actually matters for your
   design (it matters a lot for Phase 12's "must remain deterministic" if
   that's meant to include save/load, less if it's only meant to describe
   same-session pipeline ordering).
5. Fix the pre-existing `ResolvedTheme`/`ScreenContainerProps` type-surface
   errors surfaced by `npm run typecheck` now that `expo` is installed —
   app-wide in `src/presentation/`, unrelated to gameplay systems.

## Core Gameplay Loop Integration (latest pass)

Added the connective tissue the audit found missing — the domain systems
existed but were never wired into an actual loop:

- **New**: `src/systems/QuestSystem.ts` (authoritative objective advance +
  one-time completion + reward + reputation), `src/systems/CombatSystem.ts`
  (combat outcome → world event bridge), and
  `src/systems/eventSubscribers/questProgressSubscriber.ts` (combat-victory
  events → objective progress).
- **Connected**: `quest_completed` is now emitted (was defined and had an
  NPC-memory subscriber waiting, but nothing dispatched it) and added to
  `HistoryLog`'s chronicle-worthy table; `ReputationSystem.adjust` is now
  called; the existing `worldConsequenceSubscriber` bandit→roads→trade
  cascade now fires from real player combat.
- **Preserved**: EventBus is still the only cross-system coordinator;
  WorldTransaction still wraps the store action; no new persistence layer,
  no second event framework, no UI-owned gameplay logic (the Quest Log
  button only calls a store action).

## Combat, Character Progression & Leveling (2026-06)
Replaced the placeholder combat with one deterministic, stat-driven system.
- **Stat model**: removed the 6 D&D attributes; player now uses the six
  combat stats (HP + Attack/Defense/MagicPower/MagicDefense/Speed). Old
  saves migrate safely (worldRepository.migratePlayer, save v4).
- **Single engine**: rewrote `CombatEngine` (stat-driven damage, Speed turn
  order, defend/heal, defeat at 0 HP) and `CombatSystem` (encounter setup +
  the existing bandit_leader_slain victory bridge + headless autoResolve for
  the quest event pipeline). Old position/status-effect auto-battle removed;
  `resolveQuestBattle` replaced by interactive `beginQuestBattle`/`combatAct`.
- **Progression**: `ProgressionSystem` — cap 12, alternating one-ability-
  per-level (6 Character + 6 Combat), fixed stat growth, deterministic
  seed-stable level-up choices, XP frozen at cap.
- **Abilities/equipment/enemies/origins**: centralized data modules
  (`abilities`, `equipment`, `enemies`, `origins`). Player stores only ids.
- **UI**: new text-first `app/combat.tsx` (with inline level-up choice) and
  expanded character creation (`new-adventure.tsx`: race/background/
  motivation). Character tab rebuilt around the six stats + ability/equipment
  lists. `CharacterHeader` dropped stamina/classId.
- **Verified**: typecheck 0 errors; **79/79 tests** (28 new: combat,
  progression, character creation) covering Part 33's leveling/XP/combat/
  persistence-shape/determinism/ability-availability requirements; Metro
  resolves 1256 modules (Hermes bytecode still blocked by aarch64/x86-64).
  On-device rendering / real SQLite / haptics NOT verified (no simulator).
- **Sweeps clean**: one combat resolver, no uncontrolled Math.random in
  combat/progression, no duplicate ability defs, no stale auto-resolve path.

## Inventory & Equipment (2026-06)
Small text-first inventory that makes gear/shop purchases matter — reuses the existing stat path.
- **Bridged the shop↔equipment id gap** (the audited conflict): shop equippables now have real
  `equipment.ts` defs (`item_iron_sword` weapon +3 Atk, `item_travelers_cloak` armor +2 Def/+1 Spd),
  so a purchased id is equippable. No mapping layer, no second id space.
- New `EquipmentSystem` (pure equip/unequip, one-item-per-slot, safe rejection of invalid ops) + store
  `equipItem`/`unequipItem` actions through WorldTransaction/SaveManager. `effectiveStats`/`equipmentBonus`
  unchanged and remain the single authoritative stat path; combat reads equipped stats unchanged.
- New `app/inventory.tsx` (live effective stats, Weapon/Armor slots, Equip/Unequip); Journal Inventory row
  enabled. shop.tsx / shopkeeper system / combat formulas / leveling untouched.
- **Verified**: tsc 0 errors; **89/89 tests** (10 new: ownership/equip/equip-armor/unequip/effective-stats/
  slot-swap/combat-integration/invalid-op/determinism/persistence-shape/no-mutation); Metro resolves 1258
  modules (Hermes still blocked by aarch64/x86-64). On-device UI NOT verified (no simulator/browser target).
- Sweeps clean: one effectiveStats, one equipmentBonus, one equip/unequip, no competing inventory system.
