import type { AudioSource } from "expo-audio"; // type-only — no runtime expo-audio API used here, see AudioManager.ts
import { AudioManager } from "./AudioManager";
import { Logger } from "@/utils/logger";

export type UISoundCue =
  | "buttonPress"
  | "menuOpen"
  | "menuClose"
  | "dialogOpen"
  | "dialogClose"
  | "questAccepted"
  | "questCompleted"
  | "itemReceived"
  | "itemEquipped"
  | "purchase"
  | "levelUp"
  | "notification"
  | "error";

/** Expected path under assets/audio/ui/. All null — see MusicDirector's
 * MUSIC_TRACKS doc comment for why, same reasoning applies here. */
const UI_SOUNDS: Record<UISoundCue, AudioSource | null> = {
  buttonPress: null, // assets/audio/ui/button-press.mp3
  menuOpen: null, // assets/audio/ui/menu-open.mp3 (journal opening — "leather page turn" per the design brief)
  menuClose: null, // assets/audio/ui/menu-close.mp3
  dialogOpen: null, // assets/audio/ui/dialog-open.mp3
  dialogClose: null, // assets/audio/ui/dialog-close.mp3
  questAccepted: null, // assets/audio/ui/quest-accepted.mp3
  questCompleted: null, // assets/audio/ui/quest-completed.mp3
  itemReceived: null, // assets/audio/ui/item-received.mp3
  itemEquipped: null, // assets/audio/ui/item-equipped.mp3
  purchase: null, // assets/audio/ui/purchase.mp3
  levelUp: null, // assets/audio/ui/level-up.mp3
  notification: null, // assets/audio/ui/notification.mp3
  error: null, // assets/audio/ui/error.mp3
};

let cueCounter = 0;

function trigger(cue: UISoundCue): void {
  const source = UI_SOUNDS[cue];
  if (!source) {
    Logger.warn("UISoundManager", `"${cue}" has no asset yet (UI_SOUNDS["${cue}"] is null) — no-op.`);
    return;
  }
  // Unlike MusicDirector, UI sounds are short one-shots that can overlap
  // (e.g. rapid taps) — each gets its own unique key rather than sharing
  // one slot, so a second button press doesn't cut off the first sound's
  // tail. AudioManager.play() replaces same-key tracks, which is right for
  // music but wrong here.
  cueCounter += 1;
  const key = `ui-${cue}-${cueCounter}`;
  void AudioManager.play(key, source, { channel: "sfx" }).then((started) => {
    // One-shots aren't tracked/stopped externally — let AudioManager's
    // player finish and clean up. There's currently no "playback finished"
    // callback wired here (expo-audio exposes a `playbackStatusUpdate`
    // event on the player that could drive this); without it, one-shot
    // players are released only when something else calls
    // AudioManager.stop() with the same key, which never happens for these
    // keys. This is a real, acknowledged leak until that callback is
    // wired — see Remaining Gaps in the audio documentation.
    if (!started) {
      Logger.warn("UISoundManager", `"${cue}" failed to start.`);
    }
  });
}

export const UISoundManager = {
  buttonPress: () => trigger("buttonPress"),
  menuOpen: () => trigger("menuOpen"),
  menuClose: () => trigger("menuClose"),
  dialogOpen: () => trigger("dialogOpen"),
  dialogClose: () => trigger("dialogClose"),
  questAccepted: () => trigger("questAccepted"),
  questCompleted: () => trigger("questCompleted"),
  itemReceived: () => trigger("itemReceived"),
  itemEquipped: () => trigger("itemEquipped"),
  purchase: () => trigger("purchase"),
  levelUp: () => trigger("levelUp"),
  notification: () => trigger("notification"),
  error: () => trigger("error"),
};

// Not wired to any component in this milestone, same reasoning as
// MusicDirector: every cue is a no-op today. When real SFX assets exist,
// call e.g. UISoundManager.buttonPress() alongside (not instead of)
// HapticManager.light() in ActionButton/MenuRow's press handlers — the two
// systems are independent and both should fire, not be merged into one call.
