import { create } from "zustand";

interface MigrationState {
    migrating: boolean;
    setMigrating: (migrating: boolean) => void;
}

export const useMigration = create<MigrationState>(set => ({
    migrating: false,
    setMigrating: migrating => set({ migrating }),
}));