import { BrowserWindow, dialog, ipcMain } from "electron";
import { ipc } from "@project-chroma/contracts/ipc";
import { Errors, Result, safeBound, toResult, type AppError } from "@project-chroma/utils";
import { registerConfigCommands } from "./config.ts";
import { registerUpdaterCommands } from "./updater.ts";
import { registerLibraryCommands } from "./library.ts";
import type { ChromaIpcArgs, ChromaIpcChannel, ChromaIpcHandler, ChromaIpcRegister, WindowAction } from "@project-chroma/contracts/ipc";
import type { ConfigStore } from "../lib/config.ts";
import type { AutoUpdateService } from "../updater.ts";

type RegisterIpcHandlersOptions = {
    app: Electron.App;
    config: ConfigStore;
    getWindow(): BrowserWindow | null;
    autoUpdates: AutoUpdateService;
};

function removeKnownHandlers() {
    for (const channel of Object.values(ipc)) {
        ipcMain.removeHandler(channel);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

const objectChannels = new Set<ChromaIpcChannel>([
    ipc.LIBRARY_CHECK_HEALTH,
    ipc.LIBRARY_GET_INFO_FROM_PATH,
    ipc.LIBRARY_CREATE,
    ipc.LIBRARY_ADD,
    ipc.LIBRARY_UPDATE_PATH,
    ipc.LIBRARY_UPGRADE,
    ipc.LIBRARY_REMOVE,
    ipc.ITEMS_GET,
    ipc.ITEMS_GROUP,
    ipc.ITEMS_ADD,
    ipc.ITEMS_SET_FAVORITE,
    ipc.ITEMS_TRANSFER,
    ipc.ITEMS_EXPORT,
    ipc.ITEMS_DELETE,
    ipc.ALBUMS_GET,
    ipc.ALBUMS_CREATE,
    ipc.ALBUMS_GET_ITEMS,
    ipc.ALBUMS_ADD_ITEMS,
    ipc.GEN_QUICK_THUMB,
    ipc.TAGS_GET,
    ipc.TAGS_CREATE,
    ipc.TAGS_UPDATE,
    ipc.TAGS_DELETE,
    ipc.TAGS_GET_ITEMS,
    ipc.TAGS_SET_ON_ITEMS,
    ipc.SEARCH_GET_STATUS,
    ipc.SEARCH_ENABLE,
    ipc.SEARCH_ITEMS,
]);

function invalidIpcArguments(channel: ChromaIpcChannel): AppError {
    return Errors.invalidIpcArguments({ message: `Invalid arguments for ${channel}`, details: { channel } });
}

function validateIpcArgs(channel: ChromaIpcChannel, args: unknown[]): AppError | null {
    if (objectChannels.has(channel)) {
        return args.length === 1 && isRecord(args[0]) ? null : invalidIpcArguments(channel);
    }

    if (channel === ipc.WINDOW_ACTION) {
        return args.length === 1 && ["minimize", "toggleMaximize", "close"].includes(args[0] as string) ? null : invalidIpcArguments(channel);
    }

    if (channel === ipc.OPEN_DIALOG || channel === ipc.SAVE_DIALOG) {
        return args.length <= 1 && (args.length === 0 || isRecord(args[0])) ? null : invalidIpcArguments(channel);
    }

    if (channel === ipc.CONFIG_GET) {
        return args.length <= 1 && (args.length === 0 || typeof args[0] === "string") ? null : invalidIpcArguments(channel);
    }

    if (channel === ipc.CONFIG_SET || channel === ipc.CONFIG_UPDATE) {
        return args.length === 1 && isRecord(args[0]) ? null : invalidIpcArguments(channel);
    }

    return args.length === 0 ? null : invalidIpcArguments(channel);
}

export const registerHandle = (<TChannel extends ChromaIpcChannel>(channel: TChannel, listener: ChromaIpcHandler<Electron.IpcMainInvokeEvent, TChannel>) => {
    ipcMain.handle(channel, (event, ...args) =>
        safeBound(async () => {
            const validationError = validateIpcArgs(channel, args);
            if (validationError) return Result.reject(validationError);
            return toResult(await listener(event, ...(args as ChromaIpcArgs<TChannel>)));
        }),
    );
}) satisfies ChromaIpcRegister<Electron.IpcMainInvokeEvent>;

function getDialogOwner(getWindow: () => BrowserWindow | null): BrowserWindow | undefined {
    return BrowserWindow.getFocusedWindow() ?? getWindow() ?? undefined;
}

export function registerIpcHandlers({ app, config, getWindow, autoUpdates }: RegisterIpcHandlersOptions) {
    removeKnownHandlers();

    registerHandle(ipc.WINDOW_ACTION, async (_, action: WindowAction) => {
        const window = getWindow();
        if (!window) return;

        if (action === "minimize") window.minimize();
        if (action === "toggleMaximize") {
            if (window.isMaximized()) window.unmaximize();
            else window.maximize();
        }
        if (action === "close") window.close();
    });

    registerHandle(ipc.OPEN_DIALOG, async (_, options = {}) => {
        const dialogOptions = {
            properties: [options.directory ? "openDirectory" : "openFile", ...(options.multiple ? (["multiSelections"] as const) : []), "createDirectory"],
            ...(options.filters ? { filters: options.filters } : {}),
        } satisfies Electron.OpenDialogOptions;

        const owner = getDialogOwner(getWindow);
        const result = owner ? await dialog.showOpenDialog(owner, dialogOptions) : await dialog.showOpenDialog(dialogOptions);

        if (result.canceled) return null;
        return result.filePaths;
    });

    registerHandle(ipc.SAVE_DIALOG, async (_, options = {}) => {
        const dialogOptions = {
            ...(options.defaultPath ? { defaultPath: options.defaultPath } : {}),
            properties: ["createDirectory"],
        } satisfies Electron.SaveDialogOptions;

        const owner = getDialogOwner(getWindow);
        const result = owner ? await dialog.showSaveDialog(owner, dialogOptions) : await dialog.showSaveDialog(dialogOptions);

        return result.canceled ? null : (result.filePath ?? null);
    });

    registerConfigCommands(config);
    registerUpdaterCommands(autoUpdates);
    registerLibraryCommands(app, config);
}
