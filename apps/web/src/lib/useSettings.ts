import { create } from "zustand";
import { defaultChromaConfig, type ChromaSettings } from "@project-chroma/contracts/config";

interface SettingsState {
    settings: ChromaSettings;
    updateSettings: (partial: Partial<ChromaSettings>) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
    settings: defaultChromaConfig.settings,
    updateSettings: async (partial: Partial<ChromaSettings>) => {
        const whole = { ...get().settings, ...partial };
        set({ settings: whole });
        await window.chroma?.config.set("settings", whole);
    },
}));
