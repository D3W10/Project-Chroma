import { BrowserWindow, Menu, dialog } from "electron";
import type { App, MenuItemConstructorOptions } from "electron";
import { ipc } from "@project-chroma/contracts/ipc";
import type { MenuAction } from "@project-chroma/contracts/ipc";
import type { AutoUpdateService } from "./updater.ts";

type ConfigureApplicationMenuOptions = {
    app: App;
    autoUpdates: AutoUpdateService;
    getWindow(): BrowserWindow | null;
};

function sendMenuAction(action: MenuAction, getWindow: () => BrowserWindow | null): void {
    const window = BrowserWindow.getFocusedWindow() ?? getWindow();
    window?.webContents.send(ipc.MENU_ACTION, action);
}

async function checkForUpdates(
    autoUpdates: AutoUpdateService,
    getWindow: () => BrowserWindow | null,
): Promise<void> {
    const state = await autoUpdates.checkForUpdates("menu");
    const owner = getWindow();
    if (state.status === "up-to-date") {
        const options = {
            type: "info",
            title: "You're up to date",
            message: "Project Chroma is currently up to date.",
            buttons: ["OK"],
        } satisfies Electron.MessageBoxOptions;
        if (owner) await dialog.showMessageBox(owner, options);
        else await dialog.showMessageBox(options);
    }

    if (state.status === "error") {
        const options = {
            type: "warning",
            title: "Update check failed",
            message: "Could not check for updates.",
            detail: state.message ?? "Please try again later.",
            buttons: ["OK"],
        } satisfies Electron.MessageBoxOptions;
        if (owner) await dialog.showMessageBox(owner, options);
        else await dialog.showMessageBox(options);
    }
}

export function configureApplicationMenu({
    app,
    autoUpdates,
    getWindow,
}: ConfigureApplicationMenuOptions): void {
    const template: MenuItemConstructorOptions[] = [];
    const settingsItem: MenuItemConstructorOptions = {
        label: "Settings...",
        accelerator: "CmdOrCtrl+,",
        click: () => sendMenuAction("open-settings", getWindow),
    };
    const checkUpdatesItem: MenuItemConstructorOptions = {
        label: "Check for Updates...",
        click: () => {
            sendMenuAction("check-for-updates", getWindow);
            void checkForUpdates(autoUpdates, getWindow);
        },
    };

    if (process.platform === "darwin") {
        template.push({
            label: app.name,
            submenu: [
                {
                    label: `About ${app.name}`,
                    click: () => {
                        sendMenuAction("show-about", getWindow);
                        const owner = getWindow();
                        const options = {
                            type: "info",
                            title: app.name,
                            message: `${app.name} ${app.getVersion()}`,
                            buttons: ["OK"],
                        } satisfies Electron.MessageBoxOptions;
                        void (owner
                            ? dialog.showMessageBox(owner, options)
                            : dialog.showMessageBox(options));
                    },
                },
                checkUpdatesItem,
                { type: "separator" },
                settingsItem,
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" },
            ],
        });
    }

    template.push(
        {
            label: "File",
            submenu: [
                ...(process.platform === "darwin"
                    ? []
                    : [settingsItem, { type: "separator" as const }]),
                { role: process.platform === "darwin" ? "close" : "quit" },
            ],
        },
        { role: "editMenu" },
        {
            label: "View",
            submenu: [
                { role: "reload" },
                { role: "forceReload" },
                { role: "toggleDevTools" },
                { type: "separator" },
                { role: "resetZoom" },
                { role: "zoomIn", accelerator: "CmdOrCtrl+=" },
                { role: "zoomIn", accelerator: "CmdOrCtrl+Plus", visible: false },
                { role: "zoomOut" },
                { type: "separator" },
                { role: "togglefullscreen" },
            ],
        },
        { role: "windowMenu" },
        {
            role: "help",
            submenu: [
                checkUpdatesItem,
                {
                    label: `About ${app.name}`,
                    click: () => {
                        sendMenuAction("show-about", getWindow);
                        const owner = getWindow();
                        const options = {
                            type: "info",
                            title: app.name,
                            message: `${app.name} ${app.getVersion()}`,
                            buttons: ["OK"],
                        } satisfies Electron.MessageBoxOptions;
                        void (owner
                            ? dialog.showMessageBox(owner, options)
                            : dialog.showMessageBox(options));
                    },
                },
            ],
        },
    );

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
