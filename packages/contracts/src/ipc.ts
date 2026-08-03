import type { ChromaConfig } from "./config.ts";

import type { Result } from "@project-chroma/utils";

export const ipc = {
    WINDOW_ACTION: "chroma:window-action",
    OPEN_DIALOG: "chroma:open-dialog",
    SAVE_DIALOG: "chroma:save-dialog",
    CONFIG_GET: "chroma:config:get",
    CONFIG_SET: "chroma:config:set",
    CONFIG_UPDATE: "chroma:config:update",
    LIBRARY_GET: "chroma:library:get",
    LIBRARY_CHECK_HEALTH: "chroma:library:check-health",
    LIBRARY_GET_INFO_FROM_PATH: "chroma:library:get-info-from-path",
    LIBRARY_CREATE: "chroma:library:create",
    LIBRARY_ADD: "chroma:library:add",
    LIBRARY_UPDATE_PATH: "chroma:library:update-path",
    LIBRARY_UPGRADE: "chroma:library:upgrade",
    LIBRARY_REMOVE: "chroma:library:remove",
    ITEMS_GET: "chroma:items:get",
    ITEMS_VERIFY_CONFLICTS: "chroma:items:verify-conflicts",
    ITEMS_ADD: "chroma:items:add",
    ITEMS_SET_FAVORITE: "chroma:items:set-favorite",
    ITEMS_TRANSFER: "chroma:items:transfer",
    ITEMS_EXPORT: "chroma:items:export",
    ITEMS_DELETE: "chroma:items:delete",
    GEN_QUICK_THUMB: "chroma:gen-quick-thumb",
} as const;

export type ChromaIpcMap = {
    [ipc.WINDOW_ACTION]: (action: WindowAction) => void;
    [ipc.OPEN_DIALOG]: (options?: ChromaOpenDialogOptions) => string | string[] | null;
    [ipc.SAVE_DIALOG]: (options?: ChromaSaveDialogOptions) => string | null;
    [ipc.CONFIG_GET]:
        | (() => ChromaConfig)
        | {
              [TKey in keyof ChromaConfig]: (key: TKey) => ChromaConfig[TKey];
          }[keyof ChromaConfig];
    [ipc.CONFIG_SET]: (partial: Partial<ChromaConfig>) => void;
    [ipc.CONFIG_UPDATE]: (config: ChromaConfig) => void;
    [ipc.LIBRARY_GET]: () => Library[];
    [ipc.LIBRARY_CHECK_HEALTH]: (options: { libraryId: string }) => LibraryHealth;
    [ipc.LIBRARY_GET_INFO_FROM_PATH]: (options: { path: string }) => LibraryDetailsPath;
    [ipc.LIBRARY_CREATE]: (options: { name: string; icon: string; color: string; path: string }) => Library;
    [ipc.LIBRARY_ADD]: (options: { path: string }) => Library;
    [ipc.LIBRARY_UPDATE_PATH]: (options: { libraryId: string; newPath: string }) => void;
    [ipc.LIBRARY_UPGRADE]: (options: { libraryId: string }) => true;
    [ipc.LIBRARY_REMOVE]: (options: { libraryId: string }) => void;
    [ipc.ITEMS_GET]: (options: { libraryId: string }) => Item[];
    [ipc.ITEMS_VERIFY_CONFLICTS]: (options: { sourcePaths: string[]; checkLivePhotos: boolean; parseEdits: boolean }) => ImportCandidate;
    [ipc.ITEMS_ADD]: (options: { libraryId: string; items: ImportItem[]; deleteSource: boolean }) => { failures: AppError[] };
    [ipc.ITEMS_SET_FAVORITE]: (options: { libraryId: string; itemIds: string[]; value: boolean }) => void;
    [ipc.ITEMS_TRANSFER]: (options: { sourceId: string; targetId: string; itemIds: string[]; doMove: boolean }) => void;
    [ipc.ITEMS_EXPORT]: (options: { libraryId: string; destination: string; itemIds: string[]; live: boolean; edits: boolean; adjustments: boolean }) => void;
    [ipc.ITEMS_DELETE]: (options: { libraryId: string; itemIds: string[] }) => void;
    [ipc.GEN_QUICK_THUMB]: (options: { path: string }) => Uint8Array | undefined;
};

const bridgeSchema = {
    windowAction: ipc.WINDOW_ACTION,
    openDialog: ipc.OPEN_DIALOG,
    saveDialog: ipc.SAVE_DIALOG,
    config: {
        get: ipc.CONFIG_GET,
        set: ipc.CONFIG_SET,
        update: ipc.CONFIG_UPDATE,
    },
    library: {
        get: ipc.LIBRARY_GET,
        checkHealth: ipc.LIBRARY_CHECK_HEALTH,
        getInfoFromPath: ipc.LIBRARY_GET_INFO_FROM_PATH,
        create: ipc.LIBRARY_CREATE,
        add: ipc.LIBRARY_ADD,
        updatePath: ipc.LIBRARY_UPDATE_PATH,
        upgrade: ipc.LIBRARY_UPGRADE,
        remove: ipc.LIBRARY_REMOVE,
    },
    items: {
        get: ipc.ITEMS_GET,
        verifyConflicts: ipc.ITEMS_VERIFY_CONFLICTS,
        addItems: ipc.ITEMS_ADD,
        setItemsFavorite: ipc.ITEMS_SET_FAVORITE,
        transferItems: ipc.ITEMS_TRANSFER,
        exportItems: ipc.ITEMS_EXPORT,
        deleteItems: ipc.ITEMS_DELETE,
    },
    other: {
        genQuickThumb: ipc.GEN_QUICK_THUMB,
    },
} as const;

export type WindowAction = "minimize" | "toggleMaximize" | "close";

export type ChromaOpenDialogOptions = {
    directory?: boolean;
    multiple?: boolean;
    filters?: ChromaFileFilter[];
};

export type ChromaFileFilter = {
    name: string;
    extensions: string[];
};

export type ChromaSaveDialogOptions = {
    defaultPath?: string;
    canCreateDirectories?: boolean;
};
export type ChromaIpcInvoke = <
    TChannel extends ChromaIpcChannel,
    const TArgs extends ChromaIpcArgs<TChannel>,
>(
    channel: TChannel,
    ...args: TArgs
) => Promise<Result<ChromaIpcResult<TChannel, TArgs>>>;
