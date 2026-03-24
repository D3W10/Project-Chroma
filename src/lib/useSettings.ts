import { create } from "zustand";
import { setSettings as setSettingsOnBackend } from "./invoker";
import type { Settings } from "./models";

interface SettingsState {
    settings: Settings;
    updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

export const defaultSettings = {
    configured: false,
    theme: "dark",
    accentColor: 8,
    libraryZoom: 2,
    libraryExpanded: false,
    searchEnabled: false,
    importOptions: {
        livePhotos: false,
        edits: false,
    },
    exportOptions: {
        livePhotos: false,
        edits: false,
        adjustments: false,
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