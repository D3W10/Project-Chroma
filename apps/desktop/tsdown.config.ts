import { defineConfig } from "tsdown";

const shared = {
    format: "cjs" as const,
    outDir: "dist-electron",
    sourcemap: true,
    outExtensions: () => ({ js: ".cjs" }),
    noExternal: (id: string) => id.startsWith("@project-chroma/"),
};

export default defineConfig([
    {
        ...shared,
        entry: ["src/main.ts"],
        clean: true,
        external: [
            "better-sqlite3",
            "electron",
            "sharp",
        ],
    },
    {
        ...shared,
        entry: ["src/preload.ts"],
        external: ["electron"],
    },
]);
