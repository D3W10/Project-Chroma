import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    plugins: [reactRouter(), tailwindcss()],
    clearScreen: false,
    server: {
        port: 5173,
        strictPort: true,
        host: host || false,
        hmr: host ? {
            protocol: "ws",
            host,
            port: 1421,
        } : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    build: {
        target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
        minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
        sourcemap: !!process.env.TAURI_ENV_DEBUG,
    },
});