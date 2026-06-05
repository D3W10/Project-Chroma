import { BrowserWindow, dialog, ipcMain } from "electron";
import type { ConfigStore } from "./config.ts";
type RegisterIpcHandlersOptions = {
    config: ConfigStore;
    getWindow(): BrowserWindow | null;
};

function removeKnownHandlers() {
    for (const channel of Object.values(ipc)) {
        ipcMain.removeHandler(channel);
    }
}

async function tryCatch<T, E = string>(fn: () => Promise<T>): Promise<Result<T, E>> {
    try {
        return { success: true, data: await fn(), error: null };
    } catch (err) {
    }
}

const registerHandle: RegisterChromaIpcHandle<Electron.IpcMainInvokeEvent> = (
    channel,
    listener,
) => {
    ipcMain.handle(channel, (event, ...args) =>
        tryCatch(async () => listener(event, ...(args as ChromaIpcMap[typeof channel]["args"]))),
    );
};

function getDialogOwner(getWindow: () => BrowserWindow | null): BrowserWindow | undefined {
    return BrowserWindow.getFocusedWindow() ?? getWindow() ?? undefined;
}

export function registerIpcHandlers({
    config,
    getWindow,
}: RegisterIpcHandlersOptions) {
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
            properties: [
                options.directory ? "openDirectory" : "openFile",
                ...(options.multiple ? (["multiSelections"] as const) : []),
                "createDirectory",
            ],
            ...(options.filters ? { filters: options.filters } : {}),
        } satisfies Electron.OpenDialogOptions;

        const owner = getDialogOwner(getWindow);
        const result = owner
            ? await dialog.showOpenDialog(owner, dialogOptions)
            : await dialog.showOpenDialog(dialogOptions);

        if (result.canceled) return null;
        return result.filePaths;
    });

    registerHandle(ipc.SAVE_DIALOG, async (_, options = {}) => {
        const dialogOptions = {
            ...(options.defaultPath ? { defaultPath: options.defaultPath } : {}),
            properties: ["createDirectory"],
        } satisfies Electron.SaveDialogOptions;

        const owner = getDialogOwner(getWindow);
        const result = owner
            ? await dialog.showSaveDialog(owner, dialogOptions)
            : await dialog.showSaveDialog(dialogOptions);

        return result.canceled ? null : (result.filePath ?? null);
    });

    registerHandle(ipc.CONFIG_GET, async (_, key?) => {
        const current = await config.get();
        if (key === undefined) return current;
        return current[key];
    });

    registerHandle(ipc.CONFIG_SET, (_, key, value) => config.set(key, value));
    registerHandle(ipc.CONFIG_UPDATE, (_, nextConfig) => config.update(nextConfig));
}
