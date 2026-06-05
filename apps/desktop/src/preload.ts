import { contextBridge, ipcRenderer } from "electron";
import { ipc } from "@project-chroma/contracts/ipc";
import type { ChromaConfig } from "@project-chroma/contracts/config";
import type { ChromaBridge, ChromaIpcInvoke, Result } from "@project-chroma/contracts/ipc";

const invoke: ChromaIpcInvoke = (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
};

function getConfig(): Promise<Result<ChromaConfig>>;
function getConfig<TKey extends keyof ChromaConfig>(key: TKey): Promise<Result<ChromaConfig[TKey]>>;
function getConfig(...args: [] | [keyof ChromaConfig]) {
    return invoke(ipc.CONFIG_GET, ...(args as []));
}

function setConfig<TKey extends keyof ChromaConfig>(
    key: TKey,
    value: ChromaConfig[TKey],
): Promise<Result<void>>;
function setConfig(...args: [keyof ChromaConfig, ChromaConfig[keyof ChromaConfig]]) {
    return invoke(ipc.CONFIG_SET, ...(args as never));
}

const chromaBridge = {
    windowAction: action => invoke(ipc.WINDOW_ACTION, action),
    openDialog: (options = {}) => invoke(ipc.OPEN_DIALOG, options),
    saveDialog: (options = {}) => invoke(ipc.SAVE_DIALOG, options),
    config: {
        get: getConfig,
        set: setConfig,
        update: config => invoke(ipc.CONFIG_UPDATE, config),
    },
} satisfies ChromaBridge;

contextBridge.exposeInMainWorld("chroma", chromaBridge);
