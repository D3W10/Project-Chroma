import fs from "node:fs/promises";
import path from "node:path";
import { cpus } from "node:os";
import sharp from "sharp";
import { Piscina } from "piscina";
import { ipc } from "@project-chroma/contracts/ipc";
import { Errors, extToMime, Result, type AppError } from "@project-chroma/utils";
import { registerHandle } from "./ipc.ts";
import * as utils from "./utils.ts";
import * as DB from "../db/index.ts";
import type { ConflictGroup, ImportItem, Item, Library } from "@project-chroma/contracts/gallery";
import type { ConfigStore } from "../lib/config.ts";
import type { PrepareItemProps } from "../workers/prepareItem.worker.ts";

const originalsDir = (root: string) => path.join(root, "originals");
const thumbsDir = (root: string) => path.join(root, "thumbnails");
const adjustmentsDir = (root: string) => path.join(root, "adjustments");

async function createDirectories(root: string) {
    await fs.mkdir(originalsDir(root), { recursive: true });
    await fs.mkdir(thumbsDir(root), { recursive: true });
    await fs.mkdir(adjustmentsDir(root), { recursive: true });
}

export function registerLibraryCommands(app: Electron.App, config: ConfigStore) {
    const getConfig = () => config.get();
    const getLib = async (id: string) => (await getConfig()).libraries.find(l => l.id === id);

    // Library

    registerHandle(ipc.LIBRARY_GET, async () => (await getConfig()).libraries);
    registerHandle(ipc.LIBRARY_CHECK_HEALTH, async (_, { libraryId }) => {
        const lib = await getLib(libraryId);
        if (!lib) return Result.reject(Errors.libraryNotFound());

        return DB.withDatabase(lib.path, db => DB.library.checkVersionState(db));
    });
    registerHandle(ipc.LIBRARY_GET_INFO_FROM_PATH, (_, { path: rootPath }) => {
        const info = DB.withDatabase(rootPath, DB.library.fetchInfo);
        if (!info.success) return Result.reject(info.error);

        return { ...info.data, path: rootPath };
    });
    registerHandle(ipc.LIBRARY_CREATE, async (_, { name, color, icon, path: rootPath }) => {
        await fs.mkdir(rootPath, { recursive: true });
        const db = DB.createConnection(path.join(rootPath, "lib.db"));

        try {
            DB.createSchema(db);
            DB.library.fillMetadata(db, name, icon, color);
        } finally {
            db.close();
        }

        createDirectories(rootPath);

        const lib = {
            id: crypto.randomUUID(),
            name: name,
            icon: icon,
            color: color,
            path: rootPath,
        } satisfies Library;
        await config.set({ libraries: [...(await getConfig()).libraries, lib] });

        return lib;
    });
    registerHandle(ipc.LIBRARY_ADD, async (_, { path: rootPath }) => {
        const info = DB.withDatabase(rootPath, DB.library.fetchInfo);
        if (!info.success) return Result.reject(info.error);

        const lib = {
            id: crypto.randomUUID(),
            name: info.data.name,
            icon: info.data.icon,
            color: info.data.color,
            path: rootPath,
        } satisfies Library;
        await config.set({ libraries: [...(await getConfig()).libraries, lib] });

        return lib;
    });
    registerHandle(
        ipc.LIBRARY_UPDATE_PATH,
        async (_, { libraryId, newPath }) => await config.set({ libraries: (await getConfig()).libraries.map(l => (l.id === libraryId ? { ...l, path: newPath } : l)) }),
    );
    registerHandle(ipc.LIBRARY_REMOVE, async (_, { libraryId }) => Result.accept(await config.set({ libraries: (await getConfig()).libraries.filter(l => l.id !== libraryId) })));

    // Items

    registerHandle(ipc.ITEMS_GET, async (_, { libraryId }) => {
        const lib = await getLib(libraryId);
        if (!lib) return Result.reject(Errors.libraryNotFound());

        return DB.withDatabase(lib.path, db => DB.items.getAllItems(db));
    });
    registerHandle(ipc.ITEMS_VERIFY_CONFLICTS, async (_, { sourcePaths, checkLivePhotos, parseEdits }) => {
        const groups = new Map<string, ConflictGroup>();

        const emptyGroup = (): ConflictGroup => ({
            originalItems: [],
            editedItems: [],
            originalVideos: [],
            editedVideos: [],
        });

        const uneditedName = (name: string) => `IMG_${name.slice(5)}`;

        for (const pathStr of sourcePaths) {
            const sourcePath = path.parse(pathStr);

            if (!sourcePath.name) continue;

            const stem = sourcePath.name;
            const ext = sourcePath.ext.slice(1).toLowerCase();
            const mime = extToMime(ext);

            if (ext === "aae") {
                const group = groups.get(stem) ?? emptyGroup();
                group.adjustments = pathStr;
                groups.set(stem, group);
                continue;
            }

            if (mime.startsWith("image/")) {
                if (parseEdits && stem.startsWith("IMG_E")) {
                    const key = uneditedName(stem);
                    const group = groups.get(key) ?? emptyGroup();
                    group.editedItems.push(pathStr);
                    groups.set(key, group);
                } else {
                    const group = groups.get(stem) ?? emptyGroup();
                    group.originalItems.push(pathStr);
                    groups.set(stem, group);
                }
            } else if (mime.startsWith("video/")) {
                if (parseEdits && stem.startsWith("IMG_E")) {
                    const key = uneditedName(stem);
                    const group = groups.get(key) ?? emptyGroup();

                    if (checkLivePhotos) {
                        group.editedVideos.push(pathStr);
                    } else {
                        group.editedItems.push(pathStr);
                    }

                    groups.set(key, group);
                } else {
                    let key = stem;

                    if (!checkLivePhotos && !parseEdits) {
                        key += "_V";
                    }

                    const group = groups.get(key) ?? emptyGroup();

                    if (checkLivePhotos) {
                        group.originalVideos.push(pathStr);
                    } else {
                        group.originalItems.push(pathStr);
                    }

                    groups.set(key, group);
                }
            }
        }

        const itemsToImport: ImportItem[] = [];
        const conflicts: ConflictGroup[] = [];

        for (const group of groups.values()) {
            if (group.originalItems.length > 1 || group.editedItems.length > 1 || group.originalVideos.length > 1 || group.editedVideos.length > 1) {
                conflicts.push(group);
                continue;
            }

            const origItem = group.originalItems[0];
            const editItem = group.editedItems[0];
            const origLiveVideo = group.originalVideos[0];
            const editLiveVideo = group.editedVideos[0];

            if (parseEdits && editItem) {
                itemsToImport.push({
                    sourcePath: editItem,
                    livePath: editLiveVideo,
                    originalSourcePath: origItem,
                    originalLivePath: origLiveVideo,
                    adjustmentsPath: group.adjustments,
                });
            } else if (origItem) {
                itemsToImport.push({
                    sourcePath: origItem,
                    livePath: origLiveVideo,
                    originalSourcePath: undefined,
                    originalLivePath: undefined,
                    adjustmentsPath: group.adjustments,
                });
            } else if (editLiveVideo) {
                itemsToImport.push({
                    sourcePath: editLiveVideo,
                    livePath: undefined,
                    originalSourcePath: origLiveVideo,
                    originalLivePath: undefined,
                    adjustmentsPath: group.adjustments,
                });
            } else if (origLiveVideo) {
                itemsToImport.push({
                    sourcePath: origLiveVideo,
                    livePath: undefined,
                    originalSourcePath: undefined,
                    originalLivePath: undefined,
                    adjustmentsPath: group.adjustments,
                });
            }
        }

        return {
            itemsToImport,
            conflicts,
        };
    });
    registerHandle(ipc.ITEMS_SET_FAVORITE, async (_, { libraryId, itemIds, value }) => {
        const lib = await getLib(libraryId);
        if (!lib) return Result.reject(Errors.libraryNotFound());

        return DB.withDatabase(lib.path, db => DB.items.setFavoriteState(db, itemIds, value));
    });
    registerHandle(ipc.GEN_QUICK_THUMB, async (_, { path }) => {
        const image = sharp(await fs.readFile(path));
        const thumb = await utils.generateImageThumbnail(image, { size: 48 });

        if (!thumb) return Result.reject(Errors.missingSource());
        return thumb;
    });
