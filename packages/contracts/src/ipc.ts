import type { ChromaConfig } from "./config.ts";

export type Result<T, E = string> =
    | { success: true; data: T; error: null }
    | { success: false; data: null; error: E };

export const ipc = {
    WINDOW_ACTION: "chroma:window-action",
    OPEN_DIALOG: "chroma:open-dialog",
    SAVE_DIALOG: "chroma:save-dialog",
    CONFIG_GET: "chroma:config:get",
    CONFIG_SET: "chroma:config:set",
    CONFIG_UPDATE: "chroma:config:update",
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
    [ipc.CONFIG_SET]: {
        [TKey in keyof ChromaConfig]: (key: TKey, value: ChromaConfig[TKey]) => void;
    }[keyof ChromaConfig];
    [ipc.CONFIG_UPDATE]: (config: ChromaConfig) => void;
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
