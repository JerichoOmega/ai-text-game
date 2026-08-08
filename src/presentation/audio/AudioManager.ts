import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from "expo-audio";
import { useUIStore } from "@/state/useUIStore";
import { Logger } from "@/utils/logger";

/**
 * The ONLY file in the app that imports `expo-audio`. MusicDirector and
 * UISoundManager (and, eventually, any future ambient/voice system) call
 * through this — nothing else should ever import `expo-audio` directly,
 * the same rule HapticManager established for `expo-haptics`.
 *
 * IMPORTANT — written against expo-audio's documented API shape
 * (`createAudioPlayer`, `AudioPlayer.play/pause/volume/loop/remove`,
 * `setAudioModeAsync`), not verified by actually compiling or running it —
 * this sandbox has no network to install the package or a device/simulator
 * to run it on. Before this ships, run `npx expo install expo-audio`
 * (don't trust the version pinned in package.json — it was left as `"*"`
 * deliberately rather than guessing a fake-precise version number) and
 * confirm this file compiles against the actually-installed types.
 */

export type AudioChannel = "music" | "sfx" | "ambient";

interface ActiveTrack {
  key: string;
  channel: AudioChannel;
  player: AudioPlayer;
}

const active = new Map<string, ActiveTrack>();
let audioModeConfigured = false;

// React to volume/mute changes from anywhere (a future Settings UI, or
// programmatic changes) by re-applying volumes to whatever's currently
// playing. AudioManager subscribes to the store rather than the store
// knowing about AudioManager — keeps the dependency direction consistent
// with the rest of the app (state layer has no idea presentation/audio
// exists).
useUIStore.subscribe((state, prevState) => {
  if (
    state.masterVolume !== prevState.masterVolume ||
    state.musicVolume !== prevState.musicVolume ||
    state.sfxVolume !== prevState.sfxVolume ||
    state.ambientVolume !== prevState.ambientVolume ||
    state.audioMuted !== prevState.audioMuted
  ) {
    AudioManager.refreshVolumes();
  }
});

/** expo-audio requires this to be called once before playback for
 * predictable behavior (interruption handling, silent-mode behavior on
 * iOS). Deliberately conservative defaults — background playback is OFF
 * (`shouldPlayInBackground: false`) because enabling it also requires an
 * `UIBackgroundModes: ["audio"]` entry in app.json that has NOT been added
 * (see Remaining Gaps in the audio documentation) — turning the flag on
 * here without that entry would silently do nothing on a real device,
 * which is worse than being explicit that background audio isn't ready. */
async function ensureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "duckOthers",
    });
    audioModeConfigured = true;
  } catch (err) {
    Logger.error("AudioManager", "setAudioModeAsync failed", err);
  }
}

function channelVolumeMultiplier(channel: AudioChannel): number {
  const state = useUIStore.getState();
  if (state.audioMuted) return 0;
  const channelVol = channel === "music" ? state.musicVolume : channel === "sfx" ? state.sfxVolume : state.ambientVolume;
  return state.masterVolume * channelVol;
}

/** Linear volume ramp over `durationMs`, stepped every ~40ms (25fps — smooth
 * enough for a volume fade, cheap enough not to matter for battery/perf).
 * This is a JS-side interpolation, NOT a native crossfade primitive —
 * expo-audio doesn't expose one. See "Crossfading" in the audio docs. */
function rampVolume(player: AudioPlayer, from: number, to: number, durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (durationMs <= 0) {
      try {
        player.volume = to;
      } catch {
        /* player may have been removed mid-ramp */
      }
      resolve();
      return;
    }
    const steps = Math.max(1, Math.round(durationMs / 40));
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const t = step / steps;
      try {
        player.volume = from + (to - from) * t;
      } catch {
        clearInterval(interval);
        resolve();
        return;
      }
      if (step >= steps) {
        clearInterval(interval);
        resolve();
      }
    }, 40);
  });
}

export const AudioManager = {
  /**
   * Loads and plays a track under `key`. If something is already playing
   * under that key, it's replaced. Returns false (and logs) instead of
   * throwing if the source can't be loaded — a missing/corrupt audio file
   * should never crash the app.
   */
  async play(
    key: string,
    source: AudioSource,
    options: { channel: AudioChannel; loop?: boolean; fadeInMs?: number } = { channel: "sfx" }
  ): Promise<boolean> {
    await ensureAudioMode();
    try {
      this.stop(key);
      const player = createAudioPlayer(source);
      player.loop = options.loop ?? false;
      const targetVolume = channelVolumeMultiplier(options.channel);
      player.volume = options.fadeInMs ? 0 : targetVolume;
      active.set(key, { key, channel: options.channel, player });
      player.play();
      if (options.fadeInMs) {
        void rampVolume(player, 0, targetVolume, options.fadeInMs);
      }
      return true;
    } catch (err) {
      Logger.error("AudioManager", `failed to play "${key}"`, err);
      return false;
    }
  },

  pause(key: string): void {
    const track = active.get(key);
    if (!track) return;
    try {
      track.player.pause();
    } catch (err) {
      Logger.error("AudioManager", `pause failed for "${key}"`, err);
    }
  },

  resume(key: string): void {
    const track = active.get(key);
    if (!track) return;
    try {
      track.player.play();
    } catch (err) {
      Logger.error("AudioManager", `resume failed for "${key}"`, err);
    }
  },

  /** Stops and releases the player under `key`. Always safe to call, even if nothing is playing under that key. */
  stop(key: string, fadeOutMs = 0): void {
    const track = active.get(key);
    if (!track) return;
    active.delete(key);
    if (fadeOutMs > 0) {
      void rampVolume(track.player, track.player.volume, 0, fadeOutMs).then(() => {
        try {
          track.player.remove();
        } catch {
          /* already released */
        }
      });
    } else {
      try {
        track.player.remove();
      } catch {
        /* already released */
      }
    }
  },

  stopAll(channel?: AudioChannel): void {
    for (const track of active.values()) {
      if (channel && track.channel !== channel) continue;
      this.stop(track.key);
    }
  },

  /**
   * Fades `fromKey` out while fading `toKey` in, over `durationMs`.
   * `toSource`/`toChannel` describe the incoming track (it's loaded fresh).
   * This is two independent JS-side ramps running concurrently, not a
   * single native crossfade op — see the honesty note on `rampVolume`.
   */
  async crossfade(
    fromKey: string,
    toKey: string,
    toSource: AudioSource,
    toChannel: AudioChannel,
    durationMs: number
  ): Promise<void> {
    this.stop(fromKey, durationMs);
    await this.play(toKey, toSource, { channel: toChannel, loop: true, fadeInMs: durationMs });
  },

  /** Re-applies the current channel volumes to every active track — call after a volume/mute setting changes. */
  refreshVolumes(): void {
    for (const track of active.values()) {
      try {
        track.player.volume = channelVolumeMultiplier(track.channel);
      } catch {
        /* player may have been removed */
      }
    }
  },

  isPlaying(key: string): boolean {
    const track = active.get(key);
    if (!track) return false;
    try {
      return track.player.playing;
    } catch {
      return false;
    }
  },
};
