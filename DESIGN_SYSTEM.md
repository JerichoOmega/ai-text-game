# Chronicle Design System

This is the canonical reference. `src/presentation/theme/theme.ts` is the
source of truth in code; this document explains the *why* and gives the
rules for building anything new so it belongs without another redesign
pass.

## Navigation (locked)

**Main Menu launcher (`app/index.tsx`, route `/`)** — the Design Bible's
flagship screen (UI-001): full-bleed painted hero art
(`assets/images/main-menu-hero.jpg`), the gold serif CHRONICLE wordmark +
compass medallion, the "Realms remember. Legends endure." tagline, and a
vertical launcher of large gold-bordered buttons. It is the app's entry
screen; each button pushes into the four-tab experience. Buttons only route
to features that exist — New Adventure / Inventory are shown honestly
disabled ("Coming soon"), not faked.

Four persistent bottom tabs: **Journey, Character, Chronicle, World** (the
Journey tab now lives at `/journey`, since `/` is the Main Menu).
Everything else — Inventory, Camp, Codex, Bestiary, Settings,
Achievements, Support — lives in the **Adventure Journal** (`app/journal.tsx`),
a modal reachable from a single compass-icon button (`JournalTriggerButton`)
present on every tab. This is the one and only entry point to those

> **Companions are deferred from the initial release** — a deliberate MVP
> scope decision to reach a finished, releasable game sooner (not a
> cancellation; see STATUS.md "MVP scope"). There is no Companions tab, no
> Companions menu entry, and no companion gameplay system. The MVP centers
> on the player's personal journey and NPC interaction. The
> `companion_joined`/`companion_left` event vocabulary is intentionally kept
> as an inert future extension point.
features — do not add a second path to the same screen from somewhere else.

No manual save button anywhere. The game autosaves after every time
advance (`useWorldStore.advanceTime`); `saveNow()` exists as an internal
capability the journal reads a status from, not something the player
triggers.

The app defaults to the **dark (obsidian) theme** — the Design Bible is a
dark-only reference; light mode still exists and is selectable but is no
longer the launch default.

## Color palette

Defined in `palette.light` / `palette.dark` in `theme.ts`. Official mapping:

| Doc name | Token | 
|---|---|
| Background (deep charcoal/obsidian) | `background` |
| Panels (dark leather) | `panel` |
| Text (warm parchment) | `ink` / `inkMuted` |
| Primary accent (antique gold) | `gold` / `goldMuted` / `goldBorder` |
| Secondary accent (soft bronze) | `bronze` |
| Alerts (muted crimson) | `wax` |
| Positive (muted emerald) | `forest` |

One deliberate addition not in the source mockups: `accent`, a cool
teal-cyan, used *only* for "this is active / this is you" — the active tab
tint and the XP progress bar. Nowhere else. If you're tempted to use
`accent` for a third purpose, use `gold` or `bronze` instead — the whole
point is that seeing the cool color means exactly one thing.

**No bright/flat/material colors, ever.** If a new color is needed, it
should read as an aged, muted version of something — test it next to
`gold` and `wax`; if it looks like it belongs in a different app, it's wrong.

## Typography

`fontFamily.display` / `displayBold` (Georgia on iOS, no bundled font
asset) for headings and section labels; `fontFamily.body` (System) for
everything else. Scale is `typeScale` — `hero` (40) is used exactly once
per screen at most (the big location name on Journey); `display` (28) for
screen titles; `title` (20) for card/section titles; `body` (16) for
copy; `caption` (13) and `eyebrow` (12) for metadata and section labels.

Section labels use `eyebrowStyle` (uppercase, tracked, 12pt, 700 weight) —
one function, used everywhere a "THE WORLD TODAY"-style label appears, via
`SectionHeader`. Don't hand-roll this styling inline.

## Spacing & radius

`spacing` (`xs:4 sm:8 md:12 lg:16 xl:24 xxl:32`) and `radii`
(`xs:4 sm:8 md:12 lg:16 xl:22 pill:999`). An audit during the polish pass
found ten different hardcoded border-radius values and six hardcoded icon
sizes across components with no logic behind which screen got which — that
was the actual problem, not the spacing scale (which mostly matched by
coincidence already). New components should import these constants rather
than writing numbers. Genuine exceptions that don't come from the scale:
perfect circles sized to their own diameter (e.g. a 56pt avatar gets a 28pt
radius) — that's math, not a style choice, and doesn't need a token.

## Icon sizes

`iconSize.inline` (14, text-adjacent/chip icons), `.standard` (18, default
row/card icon), `.emphasis` (22, primary/lead icon on a card), `.hero` (28,
one-per-screen). Collapsed from six near-random values found in the audit.

## Component library

Built and in real use — everything listed here is used by at least one
current screen, not speculative:

| Component | Used for |
|---|---|
| `Panel` | The base card surface every other card wraps |
| `SectionHeader` | Small-caps section labels, optional "View All" action |
| `ActionButton` | Primary/secondary/danger buttons |
| `MenuRow` | Tappable icon+title+subtitle+chevron rows (Journal, Character equipment list is the exception — see below) |
| `StatChip` | World Today's Year/Season/Weather/World-State tiles |
| `ChronicleCard` | News/timeline entries |
| `JourneyCard` | Current-journey summary (Journey tab + Journal) |
| `NPCCard` | People-here list |
| `QuestCard` | Full quest-log entries |
| `ObjectiveChecklist` | Progress bar + checklist — shared by `JourneyCard` and `QuestCard` so they don't duplicate the same logic |
| `StatBar` | HP/Stamina/XP bars |
| `CharacterHeader` | Portrait+name+bars+chips — shared by Character tab and Journal |
| `InlineChip` | Small pill (location/season/weather row) |
| `JournalTriggerButton` | The one journal entry point, on every tab |
| `LoadingState` | Shared loading spinner+label |
| `HapticManager` (not a component — `src/presentation/haptics/`) | Single source of truth for all haptic feedback; see Haptic guidelines below |
| `AudioManager` / `MusicDirector` / `UISoundManager` (not components — `src/presentation/audio/`) | Audio playback architecture; see Audio Architecture below. All currently silent — no audio assets exist. |

**Deliberately not built**: Dialog Window, Inventory Cell, Equipment Slot
(as a distinct component — currently four inline `View`s in `character.tsx`
because there's no inventory system to make them interactive yet),
Notification Banner, Overlay Panel as distinct from `Panel`. Building these
with nothing to back them would be exactly the speculative indirection
the project's own architecture-hardening pass (see `STATUS.md`) argued
against. Build one when a real screen needs it, from these same tokens.

## Animation principles

- **Press feedback**: every interactive element uses `usePressScale` — a
  0.97 scale-down over 120ms (`motionTiming.press`), not a per-component
  hand-tuned value. Opacity change on press is layered on top for
  disabled/pressed states (that's a state signal, not decoration, so it
  stays even under Reduce Motion).
- **Reduce Motion**: read directly from the OS via `useReduceMotion`
  (`AccessibilityInfo.isReduceMotionEnabled`), not a redundant in-app
  toggle duplicating a system setting. `usePressScale` no-ops the scale
  animation entirely when Reduce Motion is on; the underlying interaction
  and state change still happen instantly.
- **Not implemented, honestly**: journal-opening page-turn animation, gold
  border shimmer, drifting fog, "breathing" background art, card
  slide-in-on-mount. These need either an animation library beyond what's
  installed (Reanimated for anything shader-like) or art assets that don't
  exist, and — more importantly — animation *feel* cannot be verified in
  this environment (no simulator, no device). Shipping unverified timing/
  easing values for decorative motion risks looking worse than no
  animation. `usePressScale` and the loading spinner were kept to the
  animation types that are low-risk to get right blind (standard,
  well-understood RN `Animated` patterns).

## Audio Architecture

**No audio assets exist in this project.** Everything in this section is
architecture — the plumbing that makes adding real tracks later a one-line
change per track, not a redesign. Written against `expo-audio`'s
documented API shape but not compiled or run (no network to install the
package, no device/simulator here) — verify by running `npx expo install
expo-audio` and `npm run typecheck` before trusting any of it compiles.

**Why `expo-audio`, not `expo-av`**: this project pins Expo SDK 52. At that
SDK, `expo-av`'s Audio API is already deprecated and confirmed for removal
in SDK 55; `expo-audio` was in beta at SDK 52, stable as of SDK 53. Built
on `expo-audio` anyway, since a "production foundation for years" shouldn't
be built on a library with a confirmed removal date — but this means
either bumping the project to SDK 53+ before shipping, or verifying
`expo-audio`'s SDK-52-beta API hasn't changed from what's assumed here.
`package.json` intentionally pins `expo-audio` to `"*"` rather than a
fabricated version number — run `npx expo install expo-audio` to get the
real one.

### Three layers, one rule

**No component or system ever imports `expo-audio` directly.** Everything
goes through:

- **`AudioManager`** (`src/presentation/audio/AudioManager.ts`) — the only
  file that touches `expo-audio`. Load/play/pause/resume/stop, per-channel
  (`music`/`sfx`/`ambient`) volume combined with master volume and mute
  from `useUIStore`, fade and crossfade (JS-side volume ramping — see
  below, not a native primitive), platform-safe error handling (every
  `expo-audio` call is wrapped in try/catch; a bad audio file logs and
  no-ops, never crashes).
- **`MusicDirector`** — semantic music cues (`playMainMenu()`,
  `playCombat()`, etc.), each resolving through a lookup table to either a
  real asset or `null`. All 13 requested cues exist as methods; all
  currently resolve to `null` (see `assets/audio/README.md`).
- **`UISoundManager`** — same pattern, 13 semantic UI sound cues, all
  currently `null`.

This mirrors the `HapticManager` precedent exactly: semantic methods, one
place that owns the platform API, callers never see filenames or the
platform module.

### Settings integration

`useUIStore` now has `audioMuted`, `masterVolume`, `musicVolume`,
`sfxVolume`, `ambientVolume` (+ setters), and `AudioManager` subscribes to
changes and re-applies volume to whatever's playing. **No Settings-screen
UI exposes these** — per this milestone's own scope ("prepare the
architecture but do not redesign the interface"), that's deliberately
deferred to a UI milestone, not attempted here.

### Crossfading — what's real and what isn't

`AudioManager.crossfade()` and the internal fade ramps are a **JS-side
linear volume interpolation** (a `setInterval` stepping `.volume` ~25
times/second), not a native crossfade API — `expo-audio` doesn't expose
one. This works and is a completely standard technique, but it is *not*:
sample-accurate, gapless, or guaranteed glitch-free on every device — none
of that has been verified without a device to listen on. Looping
(`player.loop = true`) is `expo-audio`'s native loop flag; whether the
loop point is audibly gapless is format- and device-dependent and has not
been verified.

### Event integration — prepared, not wired

`MusicDirector`'s file has a documented, unwired plan for subscribing to
`weather_changed`/`season_changed`/future combat events via a new
`eventSubscribers/musicSubscriber.ts`, following the exact pattern
`historySubscriber.ts` etc. already establish. Deliberately not built in
this milestone: every cue is `null`, so the hook would have nothing real
to demonstrate.

### Honesty — explicitly NOT claimed

Seamless/gapless crossfading, platform parity (iOS vs. Android vs. web
behavior differences are real and unverified), Bluetooth audio-device
behavior, lock-screen "Now Playing" integration, and background audio are
all **not implemented**. `AudioManager` explicitly sets
`shouldPlayInBackground: false` — turning it on requires an
`ios.infoPlist.UIBackgroundModes: ["audio"]` entry in `app.json` that has
NOT been added, because enabling the flag without that entry would silently
fail on a real device, which is worse than being explicit that this isn't
ready.

### Known gap: one-shot UI sounds aren't released

`UISoundManager` fires one-shot sounds through `AudioManager.play()` with a
unique key per call, but nothing ever calls `AudioManager.stop()` for
those keys afterward — there's no "playback finished" callback wired up
yet (`expo-audio` exposes a status-update event that could drive this).
Every UI sound played leaks its player object. Harmless while every cue is
`null` (nothing actually plays), but this must be fixed before real SFX
assets are added, not after.



All haptic feedback goes through `src/presentation/haptics/HapticManager.ts`.
**No component calls `expo-haptics` directly** — call
`HapticManager.light()` / `.medium()` / `.heavy()` / `.selection()` /
`.success()` / `.warning()` / `.error()` instead. The manager reads
`useUIStore`'s `hapticsEnabled` internally (via `getState()`, not the hook
— these are called from event handlers, not render) and no-ops on web and
on unsupported device/platform combinations, so callers never need their
own enablement check or try/catch.

Semantic meaning of each method, and when to use it:

| Method | Meaning | Current call sites |
|---|---|---|
| `.light()` | Default tap feedback | `ActionButton` (primary/secondary), `MenuRow`, `JournalTriggerButton` |
| `.heavy()` | Destructive/high-stakes action | `ActionButton` (danger variant) |
| `.medium()` | Mid-weight confirmation (equipping an item, etc.) | None yet — no inventory system to call it from |
| `.selection()` | Picker/segmented-control style feedback | None yet |
| `.success()` | Positive milestone (quest complete, level up, achievement) | None yet — none of those have a UI hook to fire from |
| `.warning()` | Caution state (e.g. low HP) | None yet — no combat screen exists |
| `.error()` | Failure state (e.g. combat defeat) | None yet |

Four of the seven methods exist and work correctly but have nothing calling
them yet, because the *feature* they'd represent (combat, inventory,
achievements-with-a-screen) doesn't exist. That's intentional — the API
surface is there so the first thing built for those features is "call
`HapticManager.success()`," not "figure out haptics from scratch."

**Adding a new haptic event**: find the semantic method above that matches
what happened, call it from wherever that action completes. If none of the
seven fit, that's a signal the event needs its own review (should it really
be a new haptic pattern, or does it map to an existing one?) rather than
adding an eighth method reflexively.

**Not implemented, and not claimed**: Apple Watch haptics, Android
vibration-motor nuance (expo-haptics maps to Android's generic vibration
API; it works, but hasn't been felt on real Android hardware — this
sandbox has no device to verify feel on), and game controller haptics.

## Chronicle NPC Visual Style

This is the **official Chronicle NPC visual standard**. All NPC artwork —
existing and future — should be evaluated against the 12 canonical
characters as the style reference. This section governs *visual direction
only*; it introduces no gameplay mechanics, classes, statistics, or
abilities, and it must never do so.

### Canonical visual direction

Chronicle NPCs use a **stylized fantasy character-portrait aesthetic**:
expressive, painterly, polished, readable, and appropriate for a classic
fantasy RPG. The feeling should evoke the warmth and character-driven charm
of games like *Fable*, while remaining an original Chronicle visual
identity. Artwork prioritizes:

- Strong facial identity and silhouettes
- Expressive eyes and facial expressions
- Distinctive hairstyles, clothing, accessories, and physical features
- Fantasy-world clothing and materials
- Warm, atmospheric fantasy presentation
- Consistent lighting and rendering language
- Portrait composition suited to the portrait-dominant dialogue screen
- Clear readability at mobile scale

### The 12 canonical / key NPCs — the style anchors

The 12 authored NPCs (`src/data/npcRegistry.ts`, art in
`assets/characters/npc/`) are the **visual style anchors** for Chronicle.
They establish character proportions, rendering style, facial design
language, clothing/detail level, color treatment, expression style,
portrait framing, and overall fantasy aesthetic. They are **reference, not
templates** — they must not be recolored, reskinned, or copied to produce
other characters.

### Procedural / ordinary NPCs

Generated NPCs should feel like they belong to the **same world and art
direction** as the canonical 12, while introducing genuinely new faces:
new races/ancestries, hairstyles, clothing combinations, ages, physical
traits, and personalities.

> **Rule: same art direction, different characters.** Never recolor,
> reskin, or copy a canonical character to create an ordinary NPC.

Today ordinary NPCs use a small set of shared, role-based placeholder
portraits (`src/presentation/npc/npcPortrait.ts`) — the generic tier of the
resolver. Future unique generated portraits must follow the direction above;
the architecture is already ready for them (a per-NPC portrait id would slot
in without touching screens).

### Shopkeepers — a distinct content pool

The authored shopkeeper roster (`src/data/shopkeepers.ts`, art in
`assets/images/shopkeepers/`) follows the same Chronicle visual language but
remains a **separate content pool** with its own authored identities.
Shopkeepers should feel visually consistent with both the canonical
characters and ordinary NPCs while keeping their own recognizable faces.

`characterId`, `shopkeeperId`, and ordinary NPC `role` are what decide which
portrait system is used — the **visual style is fully separate from gameplay
identity**. All three flow through the single `portraitForNpc(npc, emotion)`
resolver (`src/presentation/npc/shopkeeperPortraits.ts`), precedence
`characterId → shopkeeperId → generic role`.

### Expression system

Expressions are **part of a character's identity** and stay consistent with
the base portrait. Each canonical character ships six expressions
communicating states such as neutral, happy, concerned, angry, surprised,
and sad. An expression change must preserve the character's recognizable
facial structure, hairstyle, clothing, and overall appearance. The resolver
maps a (possibly loosely-named) dialogue emotion to a real owned expression,
falling back **mapped expression → that character's neutral → base portrait**
— and never substitutes another character's art or generates a replacement
face.

### Portrait-dominant dialogue

NPC portraits are a major part of Chronicle's interaction design. When the
player speaks with an NPC (`app/npc/[id].tsx`), the portrait occupies most
of the screen and is the visual focus, above the NPC's current line and a
small set of deterministic response branches. Future NPC artwork must be
composed for this presentation: portrait-first composition, face readable at
mobile scale, expressions clearly visible, minimal environmental detail
behind the character, and consistent framing between characters.

### Reference-art rule

External artwork may inform *presentation quality and genre conventions
only*. Chronicle must keep its own characters, names, lore, branding, copy,
gameplay systems, and visual identity. Never reproduce another game's
characters, logos, taglines, UI copy, or proprietary identity.


## Accessibility rules

- Every `Pressable` gets `accessibilityRole`, `accessibilityLabel`, and
  (where there's secondary text) `accessibilityHint`.
- Disabled rows get `accessibilityState={{ disabled: true }}` in addition
  to the visual dimming — screen readers announce this even if the visual
  opacity change isn't perceived.
- All body/title text uses `allowFontScaling` + `scaledFontSize()` +
  `maxFontSizeMultiplier` (typically 1.5–1.6) so Dynamic Type scales
  without breaking card layouts at the largest accessibility sizes.
- **Not verified**: actual VoiceOver navigation order, rotor behavior, or
  Dynamic Type at the largest accessibility sizes on a real device/
  simulator — none of that can be tested in this sandbox. Treat the
  `accessibilityLabel`/`Hint` coverage as "present and structurally
  correct," not "verified with VoiceOver on."

## Guidance for a screen with no mockup

1. Start from `Panel` + `SectionHeader` + whichever list-item component is
   closest to what you're showing (a new list of "things" is probably a
   `MenuRow` or a new card following `ChronicleCard`'s header-graphic +
   title + detail + meta shape, not a new pattern).
2. Pull every color/size/spacing value from `theme.ts`. If the value you
   need doesn't exist as a token, that's a signal to add it to the scale
   (and use it elsewhere too), not to hardcode a one-off number.
3. If the screen needs data that doesn't have a domain model yet (like
   Inventory today), build the honest disabled/"coming soon"
   state, not a decorative fake. See `MenuRow` usage in `journal.tsx` for
   the pattern.
4. Answer, within the first screenful: *Where am I? What matters right
   now? What can I do next?* If you can't point to the specific element
   answering each question, the layout needs another pass before it needs
   more content.

## Reference-pack audit (visual craft only)

A second reference pack was reviewed for visual/UX craft — layout,
spacing, typography, panel hierarchy, information density — explicitly
**not** for gameplay content. Part of that pack turned out to be actual
screenshots of a different named product ("EverWeave": its own title,
tagline, credits line, and a full mana/spellbook system Chronicle doesn't
have). None of that was adopted — no EverWeave branding, copy, or
mechanics exist anywhere in this codebase. The general presentation
quality (dense-but-readable stat tiles, journal-style section grouping,
consistent card framing) was already the direction this design system was
built in; this pass didn't change visual direction, it found and fixed
concrete gaps:

- **Memoization**: `NPCCard`, `ChronicleCard`, `QuestCard`, `StatChip` — all
  render repeatedly in lists and had zero memoization. `QuestCard` and
  `NPCCard` memoize safely (not just fast) because `WorldStateManager`'s
  setters only replace the mutated entity's object reference, leaving
  every other entity's reference stable across a world update.
- **VoiceOver grouping**: `StatBar` and `ObjectiveChecklist`'s progress
  track now use `accessibilityRole="progressbar"` + `accessibilityValue`
  instead of relying on adjacent `Text` nodes alone — previously a screen
  reader would announce "Health" and "20 / 30" as two separate stops
  instead of one. Objective rows now use `accessibilityRole="checkbox"` +
  `accessibilityState.checked`. `StatChip` groups its icon+value+label into
  one `accessibilityLabel`. `Panel` was extended to forward a deliberately
  narrow set of accessibility props to make this possible without becoming
  a catch-all pass-through.
- **Last off-scale spacing value**: `chronicle.tsx`'s tab selector radius
  (10, 8) now reads from `radii.sm` like everything else.

**Not re-verified in this pass**: the memoization changes are correct by
code inspection (prop shapes, reference stability guarantees from
`WorldStateManager`) but their actual re-render-reduction has not been
profiled — no device/simulator available here, same limitation noted
throughout this project's polish passes.

## System-wide infrastructure pass

Shifted from screen-level fixes to infrastructure that benefits every
screen at once, per direct instruction. Five pieces, each replacing a
concrete, grepped instance of duplication rather than a hypothetical one:

- **`src/utils/format.ts`** — `capitalize()` was independently copy-pasted
  in 5 files (`index.tsx`, `character.tsx`, `journal.tsx`,
  `CharacterHeader.tsx`, `SimulationEngine.ts`). One definition now.
- **`src/utils/logger.ts`** — `Logger.warn/error/debug(scope, message, err?)`
  replaces 9 hand-formatted `console.*` calls across 5 files
  (`AudioManager`, `MusicDirector`, `UISoundManager`, `EventBus`,
  `EventEngine`), each of which independently wrote its own
  `` `[SystemName] message:` `` string. `warn`/`debug` are dev-only;
  `error` logs in both dev and production (no remote reporting wired up —
  see Audio Architecture's own honesty notes for the same caveat applied
  there).
- **`src/presentation/navigation/routes.ts`** — typed route constants
  (`routes.quests`, `routes.npc(id)`, etc.) replace raw string literals at
  every `router.push()` call site. A typo in a raw string compiles fine and
  fails silently at navigation time; a typo against `routes` is a
  TypeScript error.
- **`ErrorBoundary`** — did not exist anywhere. One thrown error in any
  screen took down the entire app with no recovery path. Wraps the root
  layout, deliberately *outside* `SafeAreaProvider` and anything calling
  `useTheme()` (an error boundary only catches errors from its children's
  render — if the crash originates in the theme system, the boundary has
  to sit above it, not beside it), and uses hardcoded colors rather than
  theme tokens for the same reason.
- **`ScreenContainer`** — the `SafeAreaView` + background + loading-gate
  pattern that all 5 top-level screens (`Journey`, `Character`, `Chronicle`,
  `World`, `Journal`) were each independently reimplementing, with
  inconsistent behavior (two used `LoadingState`, one used a bare
  `return null`, one had no loading gate at all and silently showed an
  empty state instead). All 5 now share one implementation; the
  inconsistency is now structurally impossible to reintroduce by accident,
  not just fixed once.

**Also fixed as a consequence of async actions never having error
handling**: every `useWorldStore` action that can fail (`initialize`,
`advanceTime`, `saveNow`) now catches its own errors and records
`lastError` — worth noting explicitly that `ErrorBoundary` does **not**
cover this case; error boundaries only catch render-phase errors, not
errors inside event handlers or promises, which is what actually would
have kept failing silently otherwise. Nothing in the UI surfaces
`lastError` yet — state exists, no screen reads it, same "prepare
architecture without redesigning UI" pattern used for audio volume.

## World-state transaction boundary

**Invariant**: Simulation produces a candidate state. Persistence succeeds
before that candidate becomes authoritative application state.

Concretely: `useWorldStore.advanceTime()` (and any future store action with
the same shape — simulate, then persist) goes through
`runTransactionalWorldUpdate()` in `src/systems/WorldTransaction.ts`, not
directly through `TimeSystem`/`SimulationEngine` + `SaveManager` calls in
sequence. That function:

1. Clones the authoritative `WorldStateManager` (`WorldStateManager.clone()`
   — a deep JSON clone) into a disposable `candidate`.
2. Runs simulation against `candidate` only. The authoritative manager is
   not touched during this stage, no matter what simulation does to
   `candidate` or how it fails partway through (e.g. day 3 of a 5-day
   advance throwing).
3. Persists `candidate`'s resulting world. If this fails, `candidate` is
   discarded and the function returns — the authoritative manager was
   never touched at any point.
4. Only if both stages succeeded: `manager.replaceWorld(candidate.getWorld())`
   — a single synchronous assignment, immediately followed by the Zustand
   `set()` that updates the UI. There is no `await` between persistence
   succeeding and the in-memory commit, so there's no window where the
   authoritative manager, the persisted disk state, and the React-visible
   `world` can disagree with each other.

**Any new gameplay system that follows the "mutate state, then persist"
shape must go through this function, not reimplement the sequence by
hand.** The bug this fixes was exactly that hand-written sequence:
`TimeSystem.advance(manager, days)` (mutates the real manager immediately)
followed by `SaveManager.save(manager.getWorld())` (can fail after the
mutation already happened) — if the save failed, the in-memory manager
was already ahead of disk, and there was no way back to a consistent
state short of restarting the app.

### What this does NOT cover (documented, not silently ignored)

`EventEngine.dispatch()` and `HistoryLog.recordIfWorthy()` append directly
to their own SQLite tables (`eventRepository`, `historyRepository`) as
events occur *during* simulation — independent of which `WorldStateManager`
instance (real or candidate) triggered them, because those repositories
are singletons wrapping the actual database connection, not scoped to a
particular manager. This means: if simulation succeeds internally (several
events get appended, e.g. across a multi-day advance) but the final
`persist` step then fails, those already-appended event/history rows are
**not** rolled back. The core world snapshot (player, clock, weather,
kingdoms, settlements, factions, npcs, quests — everything
`worldRepository.saveAll` actually writes) is fully protected by this
transaction boundary; the append-only event/history log is not, and
retrying a failed `advanceTime` can produce a small number of "orphan"
event/history entries from the failed attempt sitting alongside the
entries from the eventually-successful retry.

This was a conscious scope decision, not an oversight: fully closing this
gap would mean either wrapping the whole simulation in a real SQLite
transaction spanning multiple repositories, or buffering event/history
writes and flushing them only after the outer commit — both are the kind
of "generic transaction framework" this fix was explicitly asked not to
build. If duplicate/orphan history entries ever become a real player-
visible problem (they're currently just extra rows, not corruption — IDs
are unique, nothing crashes), the fix is to make event/history writes go
through the same candidate-then-commit shape, not to add a new mechanism.

### Other store actions, audited against the same question

- **`talkTo()`**: does not have this bug, for a different reason than
  "already protected" — it never calls `SaveManager` at all. NPC memory
  written by a conversation stays in-memory only until the next action
  that does persist. See the doc comment on `talkTo` in `useWorldStore.ts`
  for the accepted risk this leaves (an in-memory-only conversation can be
  lost if the app is killed before the next autosave) — a real
  characteristic, but a different one from the transactional-consistency
  bug this pass fixes, and fixing it would mean adding persistence where
  none exists today, out of scope here.
- **`saveNow()`**: doesn't need `runTransactionalWorldUpdate` — it has no
  simulate stage, so there's nothing for a candidate/commit pattern to
  protect. It just re-persists whatever the (now-guaranteed-consistent)
  authoritative manager already holds.
- **`initialize()`**: the "new game" path in `SaveManager.loadOrCreate`
  builds a fresh manager and persists it before ever returning that
  manager to the store. If that persist fails, the exception propagates to
  `initialize()`'s existing try/catch, and `manager`/`world` in the store
  are simply never set (the store stays in its initial `null` state) —
  there's no "authoritative manager" yet at that point for anything to
  drift ahead of, so this path was already safe.

### Known limitation of this pass

Update from a later verification pass: `npm test` **has** since been run
against this exact code — 20/20 passing, including all 6 transaction tests
this section describes (`tests/worldTransaction.test.ts`). `npm run
typecheck` remains environment-blocked (`expo` package not installed in
this sandbox, unrelated to the transaction logic itself — see
`STATUS.md`'s Phase 12 row and `README.md`'s "Running the tests" section
for the current, precise state of both). The original claim below is left
visible rather than deleted, as a record of what this pass could and
couldn't verify at the time it was written — that gap has since been
closed for `npm test` specifically, not for `npm run typecheck`.

Original text: "Not executed: `npm run typecheck` and `npm test` were not
run against this change — no network in this environment to install
dependencies (`tsc`, `tsx`)... Every changed/new file was manually re-read
line by line for type consistency... as the best available substitute, but
that is not the same guarantee actual compilation provides."
