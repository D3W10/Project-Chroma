import { app, BrowserWindow, nativeTheme, net, protocol, session, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConfigStore } from "./lib/config.ts";
import { registerIpcHandlers } from "./commands/ipc.ts";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;

protocol.registerSchemesAsPrivileged([
    {
        scheme: "chroma",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
        },
    },
]);

function getInitialWindowBackgroundColor(): string {
    return nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff";
}

function getRendererUrl(): string {
    if (isDev) {
        return process.env.ELECTRON_START_URL ?? "http://localhost:5173";
    }

    return `file://${path.join(__dirname, "../../web/dist/index.html")}`;
}

function revealWindow(window: BrowserWindow): void {
    if (window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    if (!window.isVisible()) window.show();
    if (process.platform === "darwin") app.focus({ steal: true });
    window.focus();
}

function createWindow() {
    const window = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 620,
        show: false,
        backgroundColor: getInitialWindowBackgroundColor(),
        title: app.name,
        titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
        trafficLightPosition: { x: 17, y: 17 },
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://") || url.startsWith("mailto:")) {
            void shell.openExternal(url);
        }

        return { action: "deny" };
    });

    window.once("ready-to-show", () => revealWindow(window));
    if (process.platform === "linux") {
        window.webContents.once("did-finish-load", () => revealWindow(window));
    }

    void window.loadURL(getRendererUrl());
    if (isDev) {
        window.webContents.openDevTools({ mode: "detach" });
    }

    window.on("closed", () => {
        if (mainWindow === window) {
            mainWindow = null;
        }
    });

    mainWindow = window;
}
const config = createConfigStore({
    app,
    fileName: "config.json",
});
app.whenReady()
    .then(() => {
        registerIpcHandlers({
            app,
            config,
            getWindow: () => mainWindow,
        });
            getWindow: () => mainWindow,
        createWindow();
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
