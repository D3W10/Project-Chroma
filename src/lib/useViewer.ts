import { create } from "zustand";
import type { Item } from "@/lib/models";

interface ViewerState {
    viewingItem?: Item;
    setViewingItem: (item?: Item) => unknown;
}

export const useViewer = create<ViewerState>(set => ({
    viewingItem: undefined,
    setViewingItem: item => set({ viewingItem: item }),
}));