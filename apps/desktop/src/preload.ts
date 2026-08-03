import { contextBridge, ipcRenderer } from "electron";
import { ipc } from "@project-chroma/contracts/ipc";
import type { ChromaConfig } from "@project-chroma/contracts/config";
import type { ChromaBridge, ChromaIpcInvoke } from "@project-chroma/contracts/ipc";
import type { Result } from "@project-chroma/utils";

const invoke: ChromaIpcInvoke = (channel, ...args) => {
    return ipcRenderer.invoke(channel, ...args);
};

function getConfig(): Promise<Result<ChromaConfig>>;
function getConfig<TKey extends keyof ChromaConfig>(key: TKey): Promise<Result<ChromaConfig[TKey]>>;
function getConfig(...args: [] | [keyof ChromaConfig]) {
    return invoke(ipc.CONFIG_GET, ...(args as []));
}

const chromaBridge = {
    windowAction: action => invoke(ipc.WINDOW_ACTION, action),
    openDialog: (options = {}) => invoke(ipc.OPEN_DIALOG, options),
    saveDialog: (options = {}) => invoke(ipc.SAVE_DIALOG, options),
    config: {
        get: getConfig,
        set: partial => invoke(ipc.CONFIG_SET, partial),
        update: config => invoke(ipc.CONFIG_UPDATE, config),
    },
    library: {
        get: () => invoke(ipc.LIBRARY_GET),
        checkHealth: options => invoke(ipc.LIBRARY_CHECK_HEALTH, options),
        getInfoFromPath: options => invoke(ipc.LIBRARY_GET_INFO_FROM_PATH, options),
        create: options => invoke(ipc.LIBRARY_CREATE, options),
        add: options => invoke(ipc.LIBRARY_ADD, options),
        updatePath: options => invoke(ipc.LIBRARY_UPDATE_PATH, options),
        upgrade: options => invoke(ipc.LIBRARY_UPGRADE, options),
        remove: options => invoke(ipc.LIBRARY_REMOVE, options),
    },
    items: {
        get: options => invoke(ipc.ITEMS_GET, options),
        verifyConflicts: options => invoke(ipc.ITEMS_VERIFY_CONFLICTS, options),
        addItems: options => invoke(ipc.ITEMS_ADD, options),
        setItemsFavorite: options => invoke(ipc.ITEMS_SET_FAVORITE, options),
        deleteItems: options => invoke(ipc.ITEMS_DELETE, options),
        exportItems: options => invoke(ipc.ITEMS_EXPORT, options),
        transferItems: options => invoke(ipc.ITEMS_TRANSFER, options),
    },
    other: {
        genQuickThumb: options => invoke(ipc.GEN_QUICK_THUMB, options),
    },
} satisfies ChromaBridge;

contextBridge.exposeInMainWorld("chroma", chromaBridge);
