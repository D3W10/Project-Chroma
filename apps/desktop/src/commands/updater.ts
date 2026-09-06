import { ipc } from "@project-chroma/contracts/ipc";
import { registerHandle } from "./ipc.ts";
import type { AutoUpdateService } from "../updater.ts";

export function registerUpdaterCommands(autoUpdates: AutoUpdateService) {
    registerHandle(ipc.UPDATE_GET_STATE, () => autoUpdates.getState());
    registerHandle(ipc.UPDATE_CHECK, () => autoUpdates.checkForUpdates("ipc"));
    registerHandle(ipc.UPDATE_DOWNLOAD, () => autoUpdates.downloadUpdate());
    registerHandle(ipc.UPDATE_INSTALL, () => autoUpdates.installDownloadedUpdate());
}
