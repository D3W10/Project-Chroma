/// <reference types="vite/client" />

import type { ChromaBridge } from "@project-chroma/contracts/ipc";

declare global {
    interface Window {
        chroma?: ChromaBridge;
    }
}
