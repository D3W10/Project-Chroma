import { create } from "zustand";
import type { Library } from "./models";

interface LibraryState {
    selectedLibrary: Library | null;
    setSelectedLibrary: (library: Library | null) => void;
}

export const useLibrary = create<LibraryState>(set => ({
    selectedLibrary: null,
    setSelectedLibrary: library => set({ selectedLibrary: library }),
}));