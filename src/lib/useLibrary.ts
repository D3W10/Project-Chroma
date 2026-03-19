import { create } from "zustand";
import { getLibraries } from "@/lib/invoker";
import type { Library } from "@/lib/models";

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
        const { ok, data } = await getLibraries();
        if (!ok) return [];
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