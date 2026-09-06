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
    platform: () => process.platform,
    fileUrl: filePath => `chroma-file://${encodeURIComponent(filePath)}`,
    updates: {
        ...generatedBridge.updates,
        onState: listener => {
            const wrappedListener = (_event: Electron.IpcRendererEvent, state: Parameters<Parameters<ChromaBridge["updates"]["onState"]>[0]>[0]) => {
                listener(state);
            };
            ipcRenderer.on(ipc.UPDATE_STATE, wrappedListener);
            return () => ipcRenderer.off(ipc.UPDATE_STATE, wrappedListener);
        },
    },
    on: <TChannel extends ChromaEventChannel>(channel: TChannel, callback: ChromaEventListener<TChannel>) => {
        const listener = (_event: Electron.IpcRendererEvent, payload: Parameters<ChromaEventListener<TChannel>>[0]) => {
            callback(payload);
        };
        ipcRenderer.on(channel, listener);
        return () => ipcRenderer.off(channel, listener);
    },
    onMenuAction: listener => {
        const wrappedListener = (_event: Electron.IpcRendererEvent, action: Parameters<typeof listener>[0]) => {
            listener(action);
        };
        ipcRenderer.on(ipc.MENU_ACTION, wrappedListener);
        return () => ipcRenderer.off(ipc.MENU_ACTION, wrappedListener);
    },
} satisfies ChromaBridge;

contextBridge.exposeInMainWorld("chroma", chromaBridge);
