import { create } from "zustand";
import { setSettings as setSettingsOnBackend } from "./invoker";
import type { Settings } from "./models";

interface SettingsState {
    settings: Settings;
    updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
    settings: {
        theme: "dark",
        libraryZoom: 2,
        libraryExpanded: false,
        albumLayout: "card",
        importOptions: {
            livePhotos: false,
            edits: false,
        },
    } satisfies Settings,
    updateSettings: async (partial: Partial<Settings>) => {
        const whole = { ...get().settings, ...partial };
        await setSettingsOnBackend({ settings: whole });
        set({ settings: whole });
    },
}));