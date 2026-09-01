import { contextBridge, ipcRenderer } from "electron";
import { ipc, ipcDefinition } from "@project-chroma/contracts/ipc";
import type { ChromaBridge, ChromaEventChannel, ChromaEventListener, ChromaIpcChannel } from "@project-chroma/contracts/ipc";

function createBridge(schema: unknown): unknown {
    if (schema && typeof schema === "object" && "channel" in schema && typeof schema.channel === "string") {
        return (...args: unknown[]) => ipcRenderer.invoke(schema.channel as ChromaIpcChannel, ...args);
    }

    if (!schema || typeof schema !== "object") return schema;

    return Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, createBridge(value)]));
}

const generatedBridge = createBridge(ipcDefinition) as ChromaBridge;

const chromaBridge = {
    ...generatedBridge,
} satisfies ChromaBridge;

contextBridge.exposeInMainWorld("chroma", chromaBridge);
