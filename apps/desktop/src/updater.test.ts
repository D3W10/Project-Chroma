import { EventEmitter } from "node:events";
import type { App, BrowserWindow } from "electron";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updater = vi.hoisted(() => ({
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    autoDownload: true,
    autoInstallOnAppQuit: false,
    autoRunAppAfterInstall: true,
}));
vi.mock("electron-updater", () => ({ autoUpdater: updater }));
const nativeUpdater = vi.hoisted(() => ({ on: vi.fn() }));
vi.mock("electron", () => ({ autoUpdater: nativeUpdater }));
import { createAutoUpdateService } from "./updater.ts";

describe("app updates", () => {
    let events: EventEmitter;
    const app = { isPackaged: true, getVersion: () => "0.1.0" } as App;
    const send = vi.fn();
    const window = { isDestroyed: () => false, webContents: { send } } as unknown as BrowserWindow;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        vi.stubEnv("CHROMA_DISABLE_AUTO_UPDATE", "0");
        vi.stubEnv("APPIMAGE", "/tmp/chroma.AppImage");
        events = new EventEmitter();
        updater.on.mockImplementation((event, listener) => events.on(event, listener));
        nativeUpdater.on.mockImplementation((event, listener) => events.on(`native:${event}`, listener));
        updater.checkForUpdates.mockResolvedValue(null);
        updater.downloadUpdate.mockResolvedValue([]);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
    });

    function create() {
        const service = createAutoUpdateService({ app, getWindow: () => window });
        service.configure();
        return service;
    }

    it("downloads in the background and waits for normal quit without relaunching", async () => {
        const service = create();
        await vi.advanceTimersByTimeAsync(3000);
        expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
        events.emit("update-available", { version: "0.1.1" });
        await Promise.resolve();
        expect(updater.downloadUpdate).toHaveBeenCalledTimes(1);
        events.emit("update-downloaded", { version: "0.1.1" });
        if (process.platform === "darwin") {
            expect(service.getState().status).toBe("downloading");
            events.emit("native:update-downloaded");
        }
        expect(service.getState().status).toBe("downloaded");
        expect(updater.autoInstallOnAppQuit).toBe(true);
        expect(updater.autoRunAppAfterInstall).toBe(false);
        expect(updater.quitAndInstall).not.toHaveBeenCalled();
        await service.checkForUpdates("menu");
        expect(service.getState().status).toBe("downloaded");
        expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
        expect(send.mock.calls.some(([, state]) => state.status === "available")).toBe(true);
    });

    it("only the explicit install action requests a relaunch", async () => {
        const service = create();
        await service.installDownloadedUpdate();
        expect(updater.quitAndInstall).not.toHaveBeenCalled();
        events.emit("update-downloaded", { version: "0.1.1" });
        events.emit("native:update-downloaded");
        await service.installDownloadedUpdate();
        expect(updater.autoRunAppAfterInstall).toBe(true);
        expect(updater.quitAndInstall).toHaveBeenCalledWith(true, true);
    });

    it("preserves an in-flight download when another check is requested", async () => {
        updater.downloadUpdate.mockImplementationOnce(() => new Promise(() => {}));
        const service = create();
        events.emit("update-available", { version: "0.1.1" });
        await service.checkForUpdates("menu");
        expect(service.getState().status).toBe("downloading");
        expect(updater.checkForUpdates).not.toHaveBeenCalled();
    });

    it("reports a failed download without quitting", async () => {
        updater.downloadUpdate.mockRejectedValueOnce(new Error("Download interrupted"));
        const service = create();
        events.emit("update-available", { version: "0.1.1" });
        await Promise.resolve();
        expect(service.getState()).toMatchObject({ status: "error", message: "Download interrupted" });
        expect(updater.quitAndInstall).not.toHaveBeenCalled();
    });
});
