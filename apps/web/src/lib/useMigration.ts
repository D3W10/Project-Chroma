import { create } from "zustand";

interface MigrationState {
    migrating: boolean;
    migrationId: string;
    startMigration: (id: string) => void;
    endMigration: () => void;
}

export const useMigration = create<MigrationState>(set => ({
    migrating: false,
    migrationId: "",
    startMigration: id => set({ migrating: true, migrationId: id }),
    endMigration: () => set({ migrating: false, migrationId: "" }),
}));
