import type { BrowserWindow } from "electron";
import { autoUpdater as nativeUpdater } from "electron";
import type { App } from "electron";
import { autoUpdater } from "electron-updater";
import { ipc } from "@project-chroma/contracts/ipc";
import type { UpdateState } from "@project-chroma/contracts/ipc";

export type AutoUpdateService = {
    configure(): void;
    getState(): UpdateState;
    checkForUpdates(reason: string): Promise<UpdateState>;
    downloadUpdate(): Promise<UpdateState>;
    installDownloadedUpdate(): Promise<UpdateState>;
};

type AutoUpdateServiceOptions = {
    app: App;
    getWindow(): BrowserWindow | null;
};

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function shouldEnableUpdates(app: App): boolean {
    if (!app.isPackaged) return false;
    if (process.env.CHROMA_DISABLE_AUTO_UPDATE === "1") return false;
    if (process.platform === "linux" && !process.env.APPIMAGE) return false;
    return true;
}

export function createAutoUpdateService({ app, getWindow }: AutoUpdateServiceOptions): AutoUpdateService {
    let configured = false;
    let checkInFlight = false;
    let downloadInFlight = false;
    let pendingVersion: string | null = null;
    let state: UpdateState = shouldEnableUpdates(app)
        ? { status: "idle", message: null, version: app.getVersion() }
        : { status: "disabled", message: "Auto updates are disabled for this runtime.", version: app.getVersion() };

    function emitState(): void {
        const window = getWindow();
        if (window && !window.isDestroyed()) {
            window.webContents.send(ipc.UPDATE_STATE, state);
        }
    }

    function setState(next: UpdateState): UpdateState {
        state = next;
        emitState();
        return state;
    }

    function configure(): void {
        if (configured || state.status === "disabled") return;

        configured = true;
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.autoRunAppAfterInstall = false;

        autoUpdater.on("checking-for-update", () => {
            setState({ status: "checking", message: null, version: app.getVersion() });
        });
        autoUpdater.on("update-available", info => {
            setState({
                status: "available",
                message: null,
                version: app.getVersion(),
                availableVersion: info.version,
            });
            void downloadUpdate();
        });
        autoUpdater.on("update-not-available", () => {
            setState({
                status: "up-to-date",
                message: null,
                version: app.getVersion(),
                checkedAt: new Date().toISOString(),
            });
        });
        autoUpdater.on("download-progress", progress => {
            setState({
                status: "downloading",
                message: null,
                version: app.getVersion(),
                percent: progress.percent,
            });
        });
        function markDownloaded(version: string) {
            setState({
                status: "downloaded",
                message: "Update downloaded. It will be installed when Project Chroma closes.",
                version: app.getVersion(),
                downloadedVersion: version,
            });
        }
        autoUpdater.on("update-downloaded", info => {
            // Squirrel.Mac still needs to validate and stage the downloaded archive.
            if (process.platform === "darwin") pendingVersion = info.version;
            else markDownloaded(info.version);
        });
        if (process.platform === "darwin") {
            nativeUpdater.on("update-downloaded", () => {
                if (pendingVersion) markDownloaded(pendingVersion);
                pendingVersion = null;
            });
        }
        autoUpdater.on("error", error => {
            pendingVersion = null;
            setState({
                status: "error",
                message: formatError(error),
                version: app.getVersion(),
            });
        });

        setTimeout(() => {
            void checkForUpdates("startup");
        }, 3000).unref();
    }

    async function checkForUpdates(_reason: string): Promise<UpdateState> {
        if (!configured || checkInFlight || downloadInFlight || state.status === "disabled" || state.status === "downloading" || state.status === "downloaded") return state;
        checkInFlight = true;
        setState({ status: "checking", message: null, version: app.getVersion() });

        try {
            await autoUpdater.checkForUpdates();
            return state;
        } catch (error) {
            return setState({
                status: "error",
                message: formatError(error),
                version: app.getVersion(),
            });
        } finally {
            checkInFlight = false;
        }
    }

    async function downloadUpdate(): Promise<UpdateState> {
        if (!configured || downloadInFlight || state.status !== "available") return state;
        downloadInFlight = true;

        try {
            setState({ status: "downloading", message: null, version: app.getVersion(), percent: 0 });
            await autoUpdater.downloadUpdate();
            return state;
        } catch (error) {
            return setState({
                status: "error",
                message: formatError(error),
                version: app.getVersion(),
            });
        } finally {
            downloadInFlight = false;
        }
    }

    async function installDownloadedUpdate(): Promise<UpdateState> {
        if (!configured || state.status !== "downloaded") return state;

        try {
            autoUpdater.autoRunAppAfterInstall = true;
            autoUpdater.quitAndInstall(true, true);
            return state;
        } catch (error) {
            autoUpdater.autoRunAppAfterInstall = false;
            return setState({ status: "error", message: formatError(error), version: app.getVersion() });
        }
    }

    return {
        configure,
        getState: () => state,
        checkForUpdates,
        downloadUpdate,
        installDownloadedUpdate,
    };
}
