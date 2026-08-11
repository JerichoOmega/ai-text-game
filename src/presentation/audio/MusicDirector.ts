import type { AudioSource } from "expo-audio"; // type-only — no runtime expo-audio API used here, see AudioManager.ts
import { AudioManager } from "./AudioManager";
import { Logger } from "@/utils/logger";

/**
 * Every semantic cue the milestone asked for. The value is the expected
 * asset path under assets/audio/music/ — see the folder structure and
 * assets/audio/README.md for the full convention. ALL values are `null`
 * right now: "do not fabricate music" means this table has nowhere real to
 * point yet. Dropping a real file in and changing one line here is the
 * entire integration step for adding a track — no code elsewhere needs to
 * change.
 */
export type MusicCue =
  | "mainMenu"
  | "exploration"
  | "town"
  | "dungeon"
  | "combat"
  | "boss"
  | "dialogue"
  | "victory"
  | "defeat"
  | "camp"
  | "mystery"
  | "weatherStorm"
  | "night";

// "The First Page" (Suno) — the MVP's single generic gameplay track. This is
// intentionally the ONLY non-null cue: it plays during normal gameplay and
// loops. All other cues stay null until their own audio milestones. The
// filename/path is centralized here; screens request the semantic cue.
const THE_FIRST_PAGE = require("../../../assets/audio/music/exploration/the-first-page.mp3");

const MUSIC_TRACKS: Record<MusicCue, AudioSource | null> = {
  mainMenu: null, // assets/audio/music/menu/main-theme.mp3
  exploration: THE_FIRST_PAGE, // assets/audio/music/exploration/the-first-page.mp3
  town: null, // assets/audio/music/settlements/*.mp3
  dungeon: null, // assets/audio/music/dungeons/*.mp3
  combat: null, // assets/audio/music/combat/*.mp3
  boss: null, // assets/audio/music/bosses/*.mp3
  dialogue: null, // assets/audio/music/exploration/dialogue-bed.mp3 (or its own subfolder if the count grows)
  victory: null, // assets/audio/music/combat/victory-sting.mp3
  defeat: null, // assets/audio/music/combat/defeat-sting.mp3
  camp: null, // assets/audio/music/ambience/camp.mp3
  mystery: null, // assets/audio/music/exploration/mystery.mp3
  weatherStorm: null, // assets/audio/music/ambience/storm.mp3
  night: null, // assets/audio/music/exploration/night.mp3
};

const MUSIC_KEY = "music-primary"; // MusicDirector plays one track at a time on this AudioManager key
const DEFAULT_CROSSFADE_MS = 1500;

let currentCue: MusicCue | null = null;

function play(cue: MusicCue, crossfadeMs = DEFAULT_CROSSFADE_MS): void {
  const source = MUSIC_TRACKS[cue];
  if (currentCue === cue) return; // already playing this cue, no-op rather than restart
  currentCue = cue;

  if (!source) {
    Logger.warn("MusicDirector", `"${cue}" has no asset yet (MUSIC_TRACKS["${cue}"] is null) — no-op.`);
    // Nothing to crossfade TO, but still fade out whatever's currently
    // playing so calling e.g. playCombat() with no combat track doesn't
    // leave the exploration theme playing under it forever.
    AudioManager.stop(MUSIC_KEY, crossfadeMs);
    return;
  }

  void AudioManager.crossfade(MUSIC_KEY, MUSIC_KEY, source, "music", crossfadeMs);
}

export const MusicDirector = {
  playMainMenu: () => play("mainMenu"),
  playExploration: () => play("exploration"),
  playTown: () => play("town"),
  playDungeon: () => play("dungeon"),
  playCombat: () => play("combat"),
  playBoss: () => play("boss"),
  playDialogue: () => play("dialogue"),
  playVictory: () => play("victory"),
  playDefeat: () => play("defeat"),
  playCamp: () => play("camp"),
  playMystery: () => play("mystery"),
  playWeatherStorm: () => play("weatherStorm"),
  playNight: () => play("night"),

  stop: (fadeOutMs = DEFAULT_CROSSFADE_MS) => {
    currentCue = null;
    AudioManager.stop(MUSIC_KEY, fadeOutMs);
  },

  getCurrentCue: (): MusicCue | null => currentCue,
};

// --- Event integration: prepared, deliberately NOT wired -------------------
//
// The milestone asks for MusicDirector to be ready to react to combat/
// settlement/dungeon/weather/season/day-night/story events. Some of those
// event types already exist on Chronicle's EventBus today (season_changed,
// weather_changed — see src/systems/EventBus.ts); combat and dungeon-entry
// events don't exist yet since there's no combat/dungeon screen.
//
// The deliberate choice in THIS milestone is not to subscribe MusicDirector
// to the bus at all. Every cue above resolves to null, so wiring e.g.
// "on weather_changed to storm, call playWeatherStorm()" right now would
// just be calling a documented no-op — code with nothing to verify.
//
// When at least one real track exists: add a new file under
// src/systems/eventSubscribers/ (musicSubscriber.ts), following the exact
// pattern the other subscribers use, call eventBus.on("weather_changed", ...)
// there, and register it in registerAllEventSubscribers.ts. That's a small,
// mechanical change once there's something real to hear the result of.
