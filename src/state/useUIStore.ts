import { create } from "zustand";
import { Appearance } from "react-native";

type ThemeMode = "light" | "dark" | "system";

interface UIStore {
  themeMode: ThemeMode;
  hapticsEnabled: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleHaptics: () => void;
  resolvedScheme: () => "light" | "dark";

  // --- Audio (Milestone 2: Audio Architecture) ---------------------------
  // State only, prepared for the AudioManager/MusicDirector/UISoundManager
  // to read via getState(). No Settings-screen UI exposes these yet — per
  // the milestone's own instruction, the architecture is prepared without
  // redesigning the interface. Values are 0-1 multipliers, combined as
  // masterVolume * channelVolume by AudioManager.channelVolumeMultiplier.
  audioMuted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  setAudioMuted: (muted: boolean) => void;
  setMasterVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  setAmbientVolume: (value: number) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  themeMode: "system",
  hapticsEnabled: true,
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),
  resolvedScheme: () => {
    const { themeMode } = get();
    if (themeMode !== "system") return themeMode;
    return Appearance.getColorScheme() === "dark" ? "dark" : "light";
  },

  audioMuted: false,
  masterVolume: 1,
  musicVolume: 0.7,
  sfxVolume: 1,
  ambientVolume: 0.6,
  setAudioMuted: (muted) => set({ audioMuted: muted }),
  setMasterVolume: (value) => set({ masterVolume: clamp01(value) }),
  setMusicVolume: (value) => set({ musicVolume: clamp01(value) }),
  setSfxVolume: (value) => set({ sfxVolume: clamp01(value) }),
  setAmbientVolume: (value) => set({ ambientVolume: clamp01(value) }),
}));

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
