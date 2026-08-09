# Chronicle

A mobile-first text RPG built around one idea: the world remembers everything
you do, permanently, whether you're playing or not. This is the vertical
slice — a small but fully wired test world proving the persistence loop
works end to end, ahead of content expansion.

## Tech stack

Expo + React Native + TypeScript, targeting an eventual App Store release.

- **expo-router** — native navigation (file-based routes in `app/`)
- **expo-sqlite** — persistent world storage (not localStorage/AsyncStorage)
- **zustand** — lightweight state, one store per concern
- **@shopify/flash-list** — efficient long-list rendering (story log, future inventory)
- **expo-haptics** — tap feedback on primary actions
- **expo-secure-store** — included for future settings/sensitive local data; not yet wired to anything
- **react-native-safe-area-context** — Dynamic Island / notch / home indicator safe areas

No LLM calls anywhere in gameplay. World simulation is deterministic code,
NPC memory is structured data, quests are rule-based, dialogue is
template-driven. That's what keeps it fast, free to run, fully offline, and
consistent — an AI layer is an optional narration enhancement to bolt on
later, never the mechanic itself.

## Architecture

Four layers, gameplay logic fully separated from UI:

```
src/
  domain/      pure types, zero dependencies (WorldState, NPC, Quest, ...)
  data/        SQLite schema + repositories + seed data (persistence only)
  systems/     the actual game engine (WorldStateManager, EventEngine, ...)
  state/       zustand stores — the only bridge React screens use to reach systems
  presentation/  theme + reusable components
app/           expo-router screens (thin — they call the store, never systems/data directly)
```

If you're mapping this to the `systems/world, systems/npc, systems/combat...`
folder-per-domain structure: each of those subdomains is one file in
`src/systems/` here (`WorldStateManager.ts`, `NPCMemorySystem.ts`,
`CombatEngine.ts`, etc.) rather than a subfolder, because at this size one
file per system is easier to navigate than one file per system per folder.
Worth revisiting once `CombatEngine` or `QuestGenerator` grow multiple files
of their own — split into a folder at that point, same public interface.

### Core systems (`src/systems/`)

| System | Responsibility |
|---|---|
| `EventBus` | Central pub/sub. Gameplay systems react to events by subscribing, never by calling each other directly. |
| `EventEngine` | Creates and persists `WorldEvent`s, then hands them to `EventBus`. Owns no reactive logic itself. |
| `eventSubscribers/` | Where reactions actually live: `historySubscriber`, `npcMemorySubscriber`, `worldConsequenceSubscriber` (the bandit→roads→trade cascade), `questProgressSubscriber` (combat-victory events → quest objective progress), `rumorSubscriber`, `achievementSubscriber`. Registered in a fixed order by `registerAllEventSubscribers()`. |
| `SimulationEngine` | The one class that advances world time, in a fixed deterministic pipeline (weather → season detection → economy → politics/faction/kingdom-AI/NPC-schedule stubs → monster AI), then quest generation + autosave once per call. |
| `TimeSystem` | Thin compatibility wrapper over `SimulationEngine` — kept so existing callers don't break. New code should call `SimulationEngine` directly. |
| `WorldStateManager` | Owns the live `WorldState` object; every other system reads/writes through it |
| `managers/WeatherManager` | Seasonally-weighted weather transitions; emits `weather_changed` |
| `HistoryLog` | Decides which events are chronicle-worthy, appends permanent timeline entries, and renders a readable year narrative (`generateYearNarrative`) |
| `NPCMemorySystem` | Adds memories to NPCs; importance-weighted decay — major events (world events, marriages, titles, high-magnitude sentiment) barely fade, routine ones do within a season or two |
| `QuestGenerator` | Matches rule-based templates against live world state — no quest exists without a world-state reason |
| `DialogueSystem` | Resolves the best-matching dialogue line for an NPC from conditions (memory, relationship, debt...) |
| `EconomySystem` | Background prosperity/treasury drift, ticked once per day |
| `ReputationSystem` | Scoped player standing (global/kingdom/settlement/faction) + title thresholds. Now driven by quest completion (`QuestSystem.completeQuest` → `adjust()`); faction-scoped when the reward names a faction, global otherwise. |
| `RumorSystem` | In-memory, deliberately non-persisted rumor feed generated from notable events |
| `AchievementSystem` | In-memory unlock tracking; not yet persisted |
| `CombatEngine` | Turn resolution: position, status effects, initiative |
| `CombatSystem` | Bridges combat *outcomes* to the world event stream: runs an encounter to resolution, and on victory emits the existing `bandit_leader_slain` event (never calls QuestSystem directly) |
| `QuestSystem` | The one authoritative home for quest *progression*: advances objectives, decides satisfaction, and completes a quest exactly once (reward + reputation + `quest_completed` event). Idempotent — a quest cannot pay out twice. |
| `SaveManager` | The only place that decides "load existing save" vs "seed new game"; also where event subscribers get bootstrapped |

See `STATUS.md` for an honest phase-by-phase account of a later hardening
pass against this architecture, including what's deliberately deferred.


### Persistence model

Each domain collection (`npcs`, `quests`, `settlements`, ...) is its own
SQLite table storing `(id, ...indexed columns, data JSON)` rather than a
fully normalized relational schema. Indexed columns (`settlement_id`,
`status`, `alive`) keep the common queries fast at scale without needing a
full-table scan, while the JSON blob means adding a field to a domain type
never requires a migration. `events` and `history` are append-only logs, as
a real chronicle should be. Revisit and normalize a specific table only if
a specific query pattern proves this insufficient — not preemptively.

### The test world (seed data)

1 kingdom (Eastbridge), 3 settlements (1 city, 1 town, 1 village), 2
factions, 24 NPCs, and 2 seed history entries so the timeline isn't empty
on first launch. `QuestGenerator` fills in a handful of starting quests from
world conditions (Millbrook's low road safety spawns a bandit-clearing
quest, its low prosperity spawns a relief-supply quest, etc.) — nothing is
hand-placed.

## iOS / App Store readiness

- Portrait-locked, safe-area-respecting layouts (`app.json`, `SafeAreaView` with `edges`)
- Light/dark mode via `useTheme()`, following system appearance by default
- Dynamic Type: all text uses `scaledFontSize()` (respects the OS font-scale factor, clamped so layouts don't break) and `allowFontScaling`
- Haptic feedback on `ActionButton` taps, toggleable via `useUIStore`
- 44pt+ minimum touch targets
- `expo-sqlite` persists across app restarts and (once wired) app backgrounding
- Native navigation via `expo-router` / `react-native-screens`, no custom router

Not yet done, called out so nothing's assumed silently: accessibility
labels are on the interactive components built so far but haven't been
audited screen-by-screen; VoiceOver rotor testing hasn't happened; iCloud
sync, Game Center, push notifications, multiple save slots, and
localization are all designed to bolt onto the current architecture (state
lives in one serializable `WorldState`, SQLite is the source of truth) but
are not implemented.

## Running this

This sandbox has no network access, so `npm install` / `npx expo start`
have not been run here — the code has been written and manually reviewed
for type/import correctness (matching the offline-verification approach
used on Cookbook Builder) but not executed. To actually run it:

```bash
cd chronicle
npm install
npx expo start
```

Then press `i` for iOS simulator, or scan the QR code with Expo Go on a
physical iPhone.

### Running the tests

```bash
npm test
```

This runs `tsx --tsconfig tsconfig.test.json --test tests/*.test.ts` — pure-logic
tests only (time math, NPC memory decay, EventBus ordering, quest
conditionality, world-state transactions, and the core gameplay loop —
combat→objective→completion→reward→reputation→history→memory), nothing that
touches SQLite or React Native, so they don't need the Expo toolchain.
**This has been run and verified: 30/30 passing, 0 failing, 0 skipped**
(20 pre-existing + 10 for the gameplay-loop integration).

The `--tsconfig tsconfig.test.json` flag matters: the project's real
`tsconfig.json` extends `expo/tsconfig.base`, which only resolves once
`expo` is actually installed — without it, `tsx` silently fails to load
*any* path mapping from `tsconfig.json` (not just some), which breaks
resolution for every `@/`-aliased *value* import (type-only `@/` imports
are unaffected, since they're erased before resolution ever runs, which is
why some test files worked even before this fix and others didn't).
`tsconfig.test.json` is a minimal, `extends`-free config with just the
`paths` mapping, used only by the `test` script — the real `tsconfig.json`
is unchanged and is what Metro/the Expo toolchain/your editor actually use.
If a real `npm install` is ever run, both configs continue to work; this
one just stops being load-bearing.

## What's a stub right now

- **Combat** resolves turns deterministically and is now wired into the
  core loop (`CombatSystem` → `bandit_leader_slain` event →
  `questProgressSubscriber`), reachable from the Quest Log's "Resolve
  battle" action, but still uses placeholder damage numbers (no
  gear/ability stat plumbing) and has no dedicated turn-by-turn combat
  screen.
- **Quest objectives** now advance from combat outcomes and complete their
  quest through one authoritative path (`QuestSystem`). Non-combat
  objective types (`deliver_item`, `talk_to_npc`) don't yet have triggers
  wired — their completion path exists, but nothing increments them.
- **Dialogue** has a small line bank (6 lines) to prove the
  condition-matching approach; expanding content means adding entries to
  `LINE_BANK` in `DialogueSystem.ts`, not new code.
- **Background/catch-up simulation** (world keeps moving while the app is
  closed) — `TimeSystem.advance()` is ready for this, just needs to be
  called with `daysSinceLastOpen` on app foreground instead of only from
  the "Rest a day" button.
- No name-entry screen yet; the player is hardcoded as "Wanderer" in
  `app/_layout.tsx`.

## Next milestone suggestion

The core loop is now provable end to end for combat quests: world state
creates a quest → combat resolves → objective advances → quest completes →
reward + reputation + history + NPC memory + world consequences. The next
piece is wiring the non-combat objective triggers (`talk_to_npc` off the
existing `talkTo` action, `deliver_item` off travel/arrival) so delivery
and social quests close the same way, and giving combat a real
turn-by-turn screen instead of the auto-resolved encounter.

## UI/UX (redesign pass)

Navigation and visual design were reworked to match an attached mockup
board (dark fantasy chronicle aesthetic — obsidian panels, gold borders,
serif headers). Gameplay systems were not touched by this pass; only
`src/presentation/`, `app/`, and one additive domain change (`PlayerStats`
on `PlayerCharacter`, for the new Character tab) changed.

- **Design system**: `src/presentation/theme/theme.ts` — palette, serif
  `fontFamily` tokens (system Georgia, no bundled font asset), spacing/radii/
  shadow constants, and one deliberate accent color (`accent`, a cool teal)
  reserved exclusively for "this is active / this is you" states, contrasted
  against the warm gold used everywhere else.
- **Reusable components**: `Panel`, `SectionHeader`, `StatChip`,
  `ChronicleCard`, `JourneyCard`, `MenuRow`, `StatBar` — every screen in the
  redesign is built from these rather than one-off styling, so new screens
  inherit the visual language automatically.
- **Navigation**: `app/(tabs)/` — five persistent tabs (Journey, Character,
  Chronicle, World, More) per the mockup's bottom-nav spec, wrapped in a root
  `Stack` so NPC detail and the quest log push over the tabs rather than
  replacing them.
- **Honestly scoped, not faked**: the mockup's World tab shows an
  interactive map with Kingdoms/Factions/Trade Routes/Dungeons/Borders/Wars
  sub-tabs; only Kingdoms and Settlements have a domain model behind them
  today, so that's all the World tab shows, with an explicit "coming soon"
  note rather than a decorative fake map. Same treatment for
  Inventory/Companions/Crafting/Codex in the More tab — real `MenuRow`
  entries, disabled, not silently omitted or faked as working.
- **Not done**: the mockup's connecting-rail Timeline visual (icon nodes
  linked by a vertical line) — the Chronicle tab has real Timeline/News
  views over live data, just not that specific rendering treatment yet.
  Equipment slots on the Character tab are empty placeholders — there is no
  inventory/item system to back them.
- **Unverified**: all Ionicons names used (`reader`, `ellipsis-horizontal-circle`,
  etc.) are typed against `Ionicons.glyphMap` so a *wrong* name would be a
  TypeScript error, but that hasn't actually been run — see the "Running
  this" section on why not.

See `STATUS.md` for what from the 14-phase hardening pass this redesign
sits on top of.

## UI/UX Theme Lock (v3)

Second design pass, adopting two mockups as the canonical, locked design
reference (see the "official palette mapping" comment block at the top of
`src/presentation/theme/theme.ts` — that file is the single source of
truth going forward; new screens should read tokens from it rather than
inventing colors).

**Navigation changed again**: four tabs now (Journey, Character, Chronicle,
World), not five. "More" was removed — its contents moved into a new
**Adventure Journal** overlay (`app/journal.tsx`, a modal route), reachable
from a persistent compass-icon button (`JournalTriggerButton`) in every
tab's header. This matches "no duplicated navigation": there is exactly one
way to reach Settings/Inventory/Companions/etc., not a tab AND a menu that
both go somewhere similar.

**No manual save button** — removed per the design mandate ("the game
autosaves"). `useWorldStore.saveNow()` still exists as an internal capability
(and the journal overlay shows a passive "Saved locally" / "Not saved"
status using it) but nothing in the UI lets the player trigger it directly.

**New reusable components**: `CharacterHeader` (portrait+name+HP/Stamina+
location chips — used in both the Character tab and the Journal overlay,
per the "no one-off designs" requirement), `InlineChip`, `JournalTriggerButton`.

**Explicitly not built** (the mockup's full component-library list —
Dialog Window, Inventory Cell, Equipment Slot, Notification Banner, Loading
Screen, Overlay Panel as a distinct primitive from `Panel`): building these
with no current screen to use them would be exactly the kind of
speculative indirection the Phase 14 code-quality pass in `STATUS.md`
argued against. They get built when a screen actually needs one, using the
same tokens — not pre-built as an unused library.

**Explicitly not built** (visual polish): leather journal-opening animation,
gold shimmer, fog drift, torch flicker, painted map/portrait artwork. All
of these are asset- or animation-library work, not component architecture;
the components are built so that swapping in real art/animation later is
additive (e.g. `CharacterHeader`'s portrait placeholder is one `View` to
replace), not a rebuild.

**"Cloud Sync" in the mockup vs. this app**: the mockup shows "Cloud Sync —
Up to date." There is no cloud sync — only local SQLite — so the journal
overlay says "Saved locally" instead. Search and Notifications (also in the
mockup's utility row) aren't shown at all, since there's nothing to search
or be notified about yet; a disabled button implying otherwise would be
worse than omitting it.

## UI Polish Pass

Audited the implementation against `DESIGN_SYSTEM.md` (now the canonical
doc — see that file for the full palette/type/spacing/component rules)
before changing anything, per the request. Real findings and fixes:

- **Found**: 10 different hardcoded `borderRadius` values and 6 hardcoded
  icon sizes across components, with no logic behind which screen got
  which. **Fixed**: collapsed to `radii`/`iconSize` token scales in
  `theme.ts`, migrated the highest-repetition components (`ActionButton`,
  `MenuRow`, `StatChip`, `ChronicleCard`, `JourneyCard`/`QuestCard`).
- **Found**: `spacing`/`radii` tokens existed in `theme.ts` since the first
  redesign pass but were essentially unused — components had their own
  magic numbers that happened to often match. **Fixed** on the components
  above; not yet a 100%-enforced convention across every file.
- **Found**: Character/World tabs did `if (!world) return null` — a blank
  screen during the brief loading window, inconsistent with Journey (which
  already had a spinner). **Fixed**: new shared `LoadingState` component.
- **Found**: the Current Journey card showed only a title and one line of
  prose — the mockup's objective checklist + progress bar had no data
  behind it (`QuestObjective` had no human-readable `label` field at all).
  **Fixed properly, not faked**: added `label` to `QuestObjective`,
  authored real labels in `QuestGenerator`'s three templates, built a
  shared `ObjectiveChecklist` component now used by both `JourneyCard` and
  `QuestCard` (removing what would otherwise have been duplicated logic).
- **Found**: no Reduce Motion support existed anywhere despite being
  claimed as a maintained requirement in earlier passes. **Fixed**:
  `useReduceMotion` reads the real OS-level setting; `usePressScale` (now
  used by `ActionButton` and `MenuRow`) respects it.

**Not done, stated plainly rather than left implicit:**
- Decorative animation (journal page-turn, gold shimmer, drifting fog,
  breathing background art) — see `DESIGN_SYSTEM.md`'s Animation
  Principles section for why these were skipped rather than guessed at.
- Performance profiling / 60fps verification / memoization pass — nothing
  in this sandbox can run the app, so any performance claim would be
  unverifiable. `React.memo` was **not** added to list-item components in
  this pass; that's a legitimate next step but wasn't done blind.
- VoiceOver/Dynamic Type verification on a real device or simulator.
- A handful of lower-repetition components (`chronicle.tsx`'s tab
  selector, `world.tsx`'s kingdom/settlement cards) still have a couple of
  off-scale spacing/radius values — flagged in `DESIGN_SYSTEM.md`, not
  chased to zero given the time this pass had.

## Design Bible pass (UI look)

Applied the uploaded **Chronicle UI Design Bible** (6 reference screens) to the
existing app without touching gameplay logic or the systems layer:

- **Main Menu (`app/index.tsx`, route `/`)** — the Bible's flagship UI-001:
  full-bleed painted hero (`assets/images/main-menu-hero.jpg`), gold serif
  CHRONICLE wordmark + compass medallion, tagline, and a large-button
  launcher into the four tabs. New Adventure / Inventory are shown honestly
  disabled. The four-tab Journey screen moved from `/` to `/journey`.
- **Dark by default** — `useUIStore.themeMode` now defaults to `dark`; the
  obsidian palette was deepened (`background #0A0806`, warmer leather panels)
  to match the Bible.
- **ChronicleCard** rebuilt to the Bible layout: category-tinted thumbnail +
  headline/detail/time + heraldic shield (UI-002 / UI-005).
- **Type surface fixed** — corrected the `Theme` type so `npm run typecheck`
  now passes **0 errors** (previously ~150 pre-existing `ResolvedTheme` errors).

_Verification limits_: the RN app cannot be launched here (aarch64 vs x86-64
`hermesc`; no simulator), so this pass is verified via a clean typecheck,
30/30 tests, and a successful Metro bundle of all 1139 modules (which resolves
the new route and bundled hero asset) — not by on-device screenshots.
