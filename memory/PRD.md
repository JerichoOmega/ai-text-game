# Chronicle — PRD / Working Notes

Repo: JerichoOmega/ai-text-game (cloned at /app/ai-text-game)
Stack: Expo SDK 52 · React Native 0.76 · TypeScript · expo-sqlite · Zustand · expo-router. Client-only, no backend. **AI is OFF by design.** Text RPG (not 3D/Godot/multiplayer).

## Architecture principle (long-term)
AI interprets & narrates; Chronicle's deterministic systems validate/resolve/mutate/persist. AI must never be the authority over game state. Substrate already exists (EventBus → subscribers → WorldTransaction → SQLite).

## Session log

### 2026-06-14 — Repo audit / checkpoint (review only)
- Full source audit. Verified: `yarn test` 89/89 pass, `yarn typecheck` 0 errors.
- Key findings: solid deterministic combat quest loop; `talk_to_npc`/`deliver_item` objectives never advance (dead-ends); player-consequence events defined but never dispatched; only `bandit` enemy reachable; RNG partially seeded; zero AI code. README/older STATUS.md sections are stale.
- Proposed clean STATUS.md content delivered to user (not committed, per user choice).

### 2026-06-14 — Title screen ground-up redesign (presentation only)
Living-fantasy-storybook title screen; no gameplay/systems/persistence changes.
- `app/index.tsx`: full rewrite. Hero painting (`assets/images/main-menu-hero.jpg`) fills viewport. Minimal UI: CHRONICLE wordmark (compass rose set into the "O"), motto "REALMS REMEMBER. LEGENDS ENDURE.", Settings, single primary action. Removed old 7-row dashboard menu.
- Living-painting animation (frozen under Reduce Motion): slow parallax breath; 4 independent drifting cloud/mist gradient bands; breathing sunset glow; two self-scheduling bird flocks crossing the sky at irregular, varied intervals/directions; procedural birds (no assets). Uses `expo-linear-gradient`.
- Save-aware actions: no save → START ADVENTURE; save exists → CONTINUE ADVENTURE + START NEW ADVENTURE. New `hasSave` store state.
- Boot flow: root `_layout` calls `bootstrap()` (checks save, loads if present, never auto-seeds) instead of `initialize("Wanderer")`.
- Music: owned by root `_layout`, started once at launch; removed start/stop from `(tabs)/_layout` → continuous across title → adventure, no restart. Default `musicVolume` 0.7 → 0.30 (settings controls preserved).
- testIDs: kept `main-menu-title`, `main-menu-settings-button`; actions `main-menu-start-button` / `main-menu-continue-button` / `main-menu-new-adventure-button`.

Verification (automated): typecheck 0 · tests 89/89 · `expo export --platform web` clean bundle. NOT verified: on-device/simulator visual (web can't RUN — `expo-sqlite` is native-only, pre-existing limitation).

### 2026-06-14 — Wordmark art + visual QA
- Illuminated compass rose: replaced the plain Ionicons compass in the CHRONICLE "O" with a hand-painted gold illuminated compass-rose medallion (`assets/images/compass-rose.png`), shown in a circular brass-ringed medallion inlaid into the wordmark.
- Atmosphere polish: switched the drifting cloud/mist layers from horizontal to vertically-feathered gradients (removes visible band seams); softened + repositioned the sunset glow.
- Web-only SQLite shim: added `src/data/sqlite.web.ts` + `metro.config.js` web alias so the app can render in a browser for preview/QA. **iOS/Android use the real native expo-sqlite unchanged** — gameplay persistence is not affected. Safe to delete if web preview isn't wanted.
- Visual QA via browser render (not a real device): captured both title states — no-save shows START ADVENTURE; saved shows CONTINUE ADVENTURE + Start New Adventure. Confirmed compass medallion, soft drifting haze (no seams), and bird flocks render correctly.
- Still NOT verified on a real iPhone/simulator (no iOS toolchain in this environment).

## Backlog (future roadmap — NOT started)
P1: wire `talk_to_npc`/`deliver_item` objective triggers (complete deterministic RPG loop w/o AI). Then player-consequence events; enemy variety; seeded RNG; quest chains + content depth.
Later (design only): conversational NPCs → NL player actions → deterministic action resolution → emergent interactions/quest chains → living world → content/polish/MVP. AI stays interpreter/narrator, never authority.
