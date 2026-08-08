# Chronicle Audio Assets

**No audio files exist in this project yet.** This directory structure and
README exist so that when tracks are ready (e.g. generated in Suno), there's
exactly one place each one goes and one line to change to wire it in — no
code archaeology required.

## Structure

```
assets/audio/
  music/
    menu/          MusicDirector.playMainMenu()
    exploration/   MusicDirector.playExploration(), .playMystery(), .playNight()
    settlements/   MusicDirector.playTown()
    dungeons/      MusicDirector.playDungeon()
    combat/        MusicDirector.playCombat(), .playVictory(), .playDefeat()
    bosses/        MusicDirector.playBoss()
    ambience/      MusicDirector.playCamp(), .playWeatherStorm()
  ui/              UISoundManager — button presses, menu open/close, quest accepted, etc.
  sfx/             Gameplay sound effects (combat hits, footsteps, etc.) — no system calls into this yet; combat doesn't have a screen
  voices/          NPC dialogue voice-over, if ever added — nothing reads from here yet
  ambient/         Layered environmental loops (rain, wind, tavern chatter) distinct from music/ambience — see "Layered ambience" below
```

## Naming convention

`kebab-case`, descriptive, no version numbers in the filename (if a track
gets replaced, replace the file — don't add `-v2`):

```
music/menu/main-theme.mp3
music/exploration/plains-theme-01.mp3
music/exploration/plains-theme-02.mp3
music/combat/standard-battle.mp3
music/combat/victory-sting.mp3
ui/button-press.mp3
ui/menu-open.mp3
```

## How to wire in a real track

1. Drop the file in the correct folder above, following the naming
   convention.
2. Open `src/presentation/audio/MusicDirector.ts` (or `UISoundManager.ts`
   for UI sounds) and change the `null` for that cue to
   `require("../../../assets/audio/music/menu/main-theme.mp3")` (adjust the
   relative path to match where the file actually is — `AudioSource` in
   expo-audio accepts a `require()`'d module the same way `Image` does).
3. That's the entire integration. Nothing else in the app needs to change —
   every caller already goes through the semantic method
   (`MusicDirector.playMainMenu()`), never the file directly.

## "Exploration" and other multi-track cues

Several cues (`exploration`, `town`, `combat`) are written in the docs as
if they might rotate between several tracks rather than always play the
same one file. **This is not implemented** — `MusicDirector` currently maps
each cue to exactly one `AudioSource | null`. Rotation/variation is a
real, separate feature (needs a track-selection strategy — random,
sequential, non-repeating) that should be built once there's more than one
track per cue to rotate between, not guessed at now with one file.

## Layered ambience

The milestone asks the framework to "support... layered ambience" (e.g.
rain sound + wind sound + distant thunder playing simultaneously,
independently faded). `AudioManager` supports this structurally — it
already tracks multiple independent playing keys on the `"ambient"`
channel with independent volumes — but nothing currently calls it that
way; `MusicDirector`/`UISoundManager` only ever play one thing per key.
Building an actual `AmbientLayerManager` (or similar) that plays several
`assets/audio/ambient/*` loops together based on weather/location is
future work, not part of this milestone.

## Format guidance (documented, not verified)

`expo-audio`'s underlying platform players generally handle `.mp3`, `.wav`,
and `.m4a` on iOS with no additional configuration. This is standard
platform behavior, not something specific to this project, and hasn't been
tested against these specific files (there are none yet) or a real device.
