import { create } from "zustand";
import type { Library } from "@project-chroma/contracts/gallery";

interface LibraryState {
    libraries: Library[];
    setLibraries: (libraries: Library[]) => void;
    selectedLibrary: Library | null;
    refreshLibraries: () => Promise<Library[]>;
    selectLibraryById: (libraryId: string | null) => Promise<void>;
}

export const useLibrary = create<LibraryState>((set, get) => ({
    libraries: [],
    setLibraries: libraries => set({ libraries }),
    selectedLibrary: null,
    refreshLibraries: async () => {
        if (!window.chroma) return [];

        const { success, data } = await window.chroma.library.get();
        if (!success) return [];
        set({ libraries: data });
        return data;
    },
    selectLibraryById: async (libraryId: string | null) => {
        if (!libraryId) {
            set({ selectedLibrary: null });
            return;
        }

        const current = get().libraries.find(l => l.id === libraryId);
        if (current) {
            set({ selectedLibrary: current });
            return;
        }

        set({ selectedLibrary: (await get().refreshLibraries()).find(l => l.id === libraryId) ?? null });
    },
}));
