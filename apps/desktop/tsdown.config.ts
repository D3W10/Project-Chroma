import { defineConfig } from "tsdown";

const shared = {
    format: "cjs" as const,
    outDir: "dist-electron",
    sourcemap: true,
    outExtensions: () => ({ js: ".cjs" }),
    deps: {
        alwaysBundle: (id: string) => id.startsWith("@project-chroma/"),
    },
};

export default defineConfig([
    {
        ...shared,
        entry: ["src/main.ts"],
        clean: true,
        deps: {
            ...shared.deps,
            neverBundle: ["better-sqlite3", "electron", "sharp"],
        },
    },
    {
        ...shared,
        entry: ["src/preload.ts"],
        deps: {
            ...shared.deps,
            neverBundle: ["electron"],
        },
    },
    {
        ...shared,
        entry: ["src/workers/**/*.ts"],
        outDir: shared.outDir + "/workers",
    },
]);
