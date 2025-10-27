import { create } from "zustand";
import type { Library } from "./models";

interface LibraryState {
    libraries: Library[];
    setLibraries: (libraries: Library[]) => void;
    selectedLibrary: Library | null;
    setSelectedLibrary: (library: Library | null) => void;
    openCreateLibrary: boolean;
    setOpenCreateLibrary: (show: boolean) => void;
    pendingLibraryId: string | null;
    setPendingLibraryId: (id: string | null) => void;
}

export const useLibrary = create<LibraryState>(set => ({
    libraries: [],
    setLibraries: libraries => set({ libraries }),
    selectedLibrary: null,
    setSelectedLibrary: library => set({ selectedLibrary: library }),
    openCreateLibrary: false,
    setOpenCreateLibrary: library => set({ openCreateLibrary: library }),
    pendingLibraryId: null,
    setPendingLibraryId: library => set({ pendingLibraryId: library }),
}));