import { create } from "zustand";
import { setSettings as setSettingsOnBackend } from "./invoker";
import type { Settings } from "./models";

interface SettingsState {
    settings: Settings;
    updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

export const defaultSettings = {
    theme: "dark",
    accentColor: 8,
    libraryZoom: 2,
    libraryExpanded: false,
    albumLayout: "card",
    importOptions: {
        livePhotos: false,
        edits: false,
    },
} satisfies Settings;

export const useSettings = create<SettingsState>((set, get) => ({
    settings: defaultSettings,
    updateSettings: async (partial: Partial<Settings>) => {
        const whole = { ...get().settings, ...partial };
        set({ settings: whole });
        await setSettingsOnBackend({ settings: whole });
    },
}));