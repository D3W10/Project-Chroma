import { BrowserWindow, dialog, ipcMain } from "electron";
import { ipc } from "@project-chroma/contracts/ipc";
import { safeBound, toResult } from "@project-chroma/utils";
import { registerConfigCommands } from "./config.ts";
import { registerLibraryCommands } from "./library.ts";
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

export const registerHandle = (<TChannel extends ChromaIpcChannel, const TArgs extends ChromaIpcArgs<TChannel>>(
    channel: TChannel,
    listener: ChromaIpcHandler<Electron.IpcMainInvokeEvent, TChannel, TArgs>,
) => {
    ipcMain.handle(channel, (event, ...args) => safeBound(async () => toResult(await listener(event, ...(args as TArgs)))));
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


    registerLibraryCommands(config);
}
