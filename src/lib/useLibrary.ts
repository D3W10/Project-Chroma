import { create } from "zustand";
import type { Library } from "./models";

interface LibraryState {
    libraries: Library[];
    setLibraries: (libraries: Library[]) => void;
    selectedLibrary: Library | null;
    setSelectedLibrary: (library: Library | null) => void;
    openCreateLibrary: boolean;
    setOpenCreateLibrary: (open: boolean) => void;
    pendingLibraryId: string | null;
    setPendingLibraryId: (id: string | null) => void;
}

export const useLibrary = create<LibraryState>(set => ({
    libraries: [],
    setLibraries: libraries => set({ libraries }),
    selectedLibrary: null,
    setSelectedLibrary: library => set({ selectedLibrary: library }),
    openCreateLibrary: false,
    setOpenCreateLibrary: open => set({ openCreateLibrary: open }),
    pendingLibraryId: null,
    setPendingLibraryId: id => set({ pendingLibraryId: id }),
}));