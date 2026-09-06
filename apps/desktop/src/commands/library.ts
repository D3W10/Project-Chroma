import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { cpus } from "node:os";
import sharp from "sharp";
import { Piscina } from "piscina";
import { v4 as uuidv4 } from "uuid";
import { ipc } from "@project-chroma/contracts/ipc";
import { Errors, extToMime, formatExportDate, Result, type AppError } from "@project-chroma/utils";
import { registerHandle } from "./ipc.ts";
import * as utils from "./utils.ts";
import * as DB from "../db/index.ts";
import { groupImportItems } from "../lib/groupImportItems.ts";
import { createSearchService } from "../lib/search.ts";
import type { Item, Library } from "@project-chroma/contracts/gallery";
import type { ConfigStore } from "../lib/config.ts";
import type { PrepareItemProps } from "../workers/prepareItem.worker.ts";

const originalsDir = (root: string) => path.join(root, "originals");
const thumbsDir = (root: string) => path.join(root, "thumbnails");
const adjustmentsDir = (root: string) => path.join(root, "adjustments");
const fileExtension = (filePath: string) => path.extname(filePath).slice(1).toLowerCase();

async function createDirectories(root: string) {
    await fs.mkdir(originalsDir(root), { recursive: true });
    await fs.mkdir(thumbsDir(root), { recursive: true });
    await fs.mkdir(adjustmentsDir(root), { recursive: true });
}

function storedItemFiles(root: string, item: Item): string[] {
    return [
        path.join(originalsDir(root), `${item.id}.${item.extension}`),
        ...(item.liveVideo ? [path.join(originalsDir(root), item.liveVideo)] : []),
        ...(item.rawOriginalName ? [path.join(originalsDir(root), item.rawOriginalName)] : []),
        ...(item.rawLiveVideo ? [path.join(originalsDir(root), item.rawLiveVideo)] : []),
        ...(item.hasAdjustments ? [path.join(adjustmentsDir(root), `${item.id}.AAE`), path.join(adjustmentsDir(root), `${item.id}.aae`)] : []),
        path.join(thumbsDir(root), `${item.id}.webp`),
    ];
}

type FileCopy = {
    source: string;
    destination: string;
};

async function pathExists(filePath: string): Promise<boolean> {
    return fs.access(filePath).then(
        () => true,
        () => false,
    );
}

type StoredFileOptions = {
    live: boolean;
    edits: boolean;
    adjustments: boolean;
    thumbnail: boolean;
};

async function resolveStoredItemFiles(root: string, item: Item, options: StoredFileOptions): Promise<string[]> {
    const candidates = [
        [path.join(originalsDir(root), `${item.id}.${item.extension}`)],
        ...(options.live && item.liveVideo ? [[path.join(originalsDir(root), path.basename(item.liveVideo))]] : []),
        ...(options.edits && item.rawOriginalName
            ? [[path.join(originalsDir(root), `${item.id}-raw${path.extname(item.rawOriginalName)}`)]]
            : []),
        ...(options.live && options.edits && item.rawLiveVideo
            ? [[path.join(originalsDir(root), path.basename(item.rawLiveVideo)), path.join(originalsDir(root), `${item.id}-orig${path.extname(item.rawLiveVideo)}`)]]
            : []),
        ...(options.adjustments && item.hasAdjustments
            ? [[path.join(adjustmentsDir(root), `${item.id}.AAE`), path.join(adjustmentsDir(root), `${item.id}.aae`)]]
            : []),
        ...(options.thumbnail ? [[path.join(thumbsDir(root), `${item.id}.webp`)]] : []),
    ];

    return Promise.all(
        candidates.map(async paths => {
            const existing = (await Promise.all(paths.map(async candidate => ((await pathExists(candidate)) ? candidate : undefined)))).find(Boolean);
            if (!existing) throw new Error(`Missing stored file for item ${item.id}: ${paths.join(" or ")}`);
            return existing;
        }),
    );
}

async function copyFiles(files: readonly FileCopy[]): Promise<string[]> {
    const copied: string[] = [];
    const results = await Promise.allSettled(
        files.map(async file => {
            await fs.mkdir(path.dirname(file.destination), { recursive: true });
            await fs.copyFile(file.source, file.destination, fsConstants.COPYFILE_EXCL);
            copied.push(file.destination);
        }),
    );
    const failure = results.find(result => result.status === "rejected");

    if (failure?.status === "rejected") {
        await cleanupFiles(copied);
        throw failure.reason;
    }

    return copied;
}

async function cleanupFiles(filePaths: readonly string[]): Promise<void> {
    await Promise.allSettled(filePaths.map(filePath => fs.rm(filePath, { force: true })));
}

async function removeFiles(filePaths: readonly string[]): Promise<void> {
    const results = await Promise.allSettled(filePaths.map(filePath => fs.rm(filePath)));
    const failure = results.find(result => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
}

async function restoreFiles(files: readonly FileCopy[]): Promise<void> {
    const results = await Promise.allSettled(files.map(file => fs.copyFile(file.destination, file.source)));
    const failure = results.find(result => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
}

export function registerLibraryCommands(app: Electron.App, config: ConfigStore) {
    const getConfig = () => config.get();
    const getLib = async (id: string) => (await getConfig()).libraries.find(l => l.id === id);
    const withLibrary = async <T>(libraryId: string, callback: (library: Library) => T | Promise<T>) => {
        const library = await getLib(libraryId);
        return library ? callback(library) : Result.reject(Errors.libraryNotFound());
    };
    const pathBelongsToLibrary = (candidatePath: string, libraryPath: string) => {
        const relativePath = path.relative(path.resolve(libraryPath), path.resolve(candidatePath));
        return relativePath === "" || (!relativePath.startsWith(".." + path.sep) && relativePath !== "..");
    };
    const rejectConflictingPath = async (candidatePath: string, excludedLibraryId?: string) => {
        const conflict = (await getConfig()).libraries.find(library => library.id !== excludedLibraryId && pathBelongsToLibrary(candidatePath, library.path));
        if (!conflict) return;

        return Result.reject(Errors.libraryPathConflict({ details: { path: candidatePath, libraryId: conflict.id } }));
    };
    const withTagDatabase = <T>(libraryId: string, callback: (db: DB.ChromaDB) => T) =>
        withLibrary(libraryId, lib =>
            DB.withDatabase(lib.path, db => {
                try {
                    return callback(db);
                } catch (error) {
                    return Result.reject(Errors.tagOperationFail({ error }));
                }
            }),
        );
    const search = createSearchService({ app, config });

    // Library

    registerHandle(ipc.LIBRARY_GET, async () => (await getConfig()).libraries);
    registerHandle(ipc.LIBRARY_CHECK_HEALTH, (_, { libraryId }) => withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.library.checkVersionState(db))));
    registerHandle(ipc.LIBRARY_GET_INFO_FROM_PATH, (_, { path: rootPath }) => {
        const info = DB.withDatabase(rootPath, DB.library.fetchInfo);
        if (!info.success) return Result.reject(info.error);

        return { ...info.data, path: rootPath };
    });
    registerHandle(ipc.LIBRARY_CREATE, async (_, { name, color, icon, path: rootPath }) => {
        const pathConflict = await rejectConflictingPath(rootPath);
        if (pathConflict) return pathConflict;

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
        const pathConflict = await rejectConflictingPath(rootPath);
        if (pathConflict) return pathConflict;

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
        async (_, { libraryId, newPath }) => {
            const pathConflict = await rejectConflictingPath(newPath, libraryId);
            if (pathConflict) return pathConflict;

            return await config.set({ libraries: (await getConfig()).libraries.map(l => (l.id === libraryId ? { ...l, path: newPath } : l)) });
        },
    );
    registerHandle(ipc.LIBRARY_UPGRADE, (_, { libraryId }) =>
        withLibrary(libraryId, lib => {
            const db = DB.openConnection(lib.path);
            if (!db.success) return Result.reject(db.error);

            try {
                const migrated = DB.migrateToLatest(db.data);
                return migrated.success ? (true as const) : Result.reject(Errors.unknown(migrated.error));
            } finally {
                db.data.close();
            }
        }),
    );
    registerHandle(ipc.LIBRARY_REMOVE, async (_, { libraryId }) => Result.accept(await config.set({ libraries: (await getConfig()).libraries.filter(l => l.id !== libraryId) })));

    // Items

    registerHandle(ipc.ITEMS_GET, async (_, { libraryId }) => withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.items.getAll(db))));
    registerHandle(ipc.ITEMS_GROUP, (_, { sourcePaths, checkLivePhotos, parseEdits }) => groupImportItems(sourcePaths, checkLivePhotos, parseEdits));
    registerHandle(ipc.ITEMS_ADD, async (_, { libraryId, items, deleteSource }) =>
        withLibrary(libraryId, async lib => {
            await createDirectories(lib.path);

            const piscina = new Piscina<PrepareItemProps, Result<Item, AppError>>({
                filename: new URL("../dist-electron/workers/prepareItem.worker.cjs", import.meta.url).href,
                maxThreads: cpus().length,
            });

            let processedCount = 0;
            const processingPool = await Promise.all(
                items.map(async item => {
                    const result = await piscina.run({
                        importItem: item,
                        originalsDir: originalsDir(lib.path),
                        thumbsDir: thumbsDir(lib.path),
                        adjustmentsDir: adjustmentsDir(lib.path),
                        deleteSource,
                    });

                    processedCount++;
                    app.emit("import-progress", processedCount);

                    return result;
                }),
            );

            DB.withDatabase(lib.path, db =>
                DB.items.add(
                    db,
                    processingPool.filter(p => p.success).map(p => p.data),
                ),
            );

            await search.indexNewItems(lib);

            return { failures: processingPool.filter(p => !p.success).map(p => p.error) };
        }),
    );
    registerHandle(ipc.ITEMS_SET_FAVORITE, async (_, { libraryId, itemIds, value }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.items.setFavoriteState(db, itemIds, value)));
    });
    registerHandle(ipc.ITEMS_TRANSFER, async (_, { sourceId, targetId, itemIds, doMove }) => {
        if (sourceId === targetId) return Result.reject(Errors.itemTransferFail({ message: "Choose a different destination library." }));
        const uniqueItemIds = [...new Set(itemIds)];
        if (uniqueItemIds.length === 0) return { itemCount: 0, fileCount: 0 };

        return withLibrary(sourceId, source =>
            withLibrary(targetId, async target => {
                await createDirectories(target.path);
                const sourceItems = DB.withDatabase(source.path, db => DB.items.getByIds(db, uniqueItemIds));
                if (!sourceItems.success) return Result.reject(sourceItems.error);
                if (sourceItems.data.length !== uniqueItemIds.length) {
                    return Result.reject(Errors.itemTransferFail({ message: "One or more selected items no longer exist in the source library." }));
                }

                const sourceDb = DB.openConnection(source.path);
                const targetDb = DB.openConnection(target.path);
                if (!sourceDb.success) return Result.reject(sourceDb.error);
                if (!targetDb.success) {
                    sourceDb.data.close();
                    return Result.reject(targetDb.error);
                }

                try {
                    const sourceHealth = DB.library.checkVersionState(sourceDb.data);
                    const targetHealth = DB.library.checkVersionState(targetDb.data);
                    if (sourceHealth !== "healthy" || targetHealth !== "healthy") {
                        return Result.reject(
                            Errors.itemTransferFail({
                                message: "Both libraries must be up-to-date before items can be transferred.",
                                details: { sourceHealth, targetHealth },
                            }),
                        );
                    }

                    const existingItems = DB.items.getByIds(targetDb.data, uniqueItemIds);
                    if (existingItems.length > 0) {
                        return Result.reject(
                            Errors.itemTransferFail({
                                message: "One or more selected items already exist in the destination library.",
                                details: { itemIds: existingItems.map(item => item.id) },
                            }),
                        );
                    }

                    const fileGroups = await Promise.all(
                        sourceItems.data.map(async item => {
                            const sourcePaths = await resolveStoredItemFiles(source.path, item, { live: true, edits: true, adjustments: true, thumbnail: true });
                            return sourcePaths.map(sourcePath => ({ source: sourcePath, destination: path.join(target.path, path.relative(source.path, sourcePath)) }));
                        }),
                    );
                    const files = fileGroups.flat();
                    const copiedFiles = await copyFiles(files);

                    try {
                        DB.items.add(targetDb.data, sourceItems.data);

                        if (doMove) {
                            try {
                                await removeFiles(files.map(file => file.source));
                                DB.items.deleteByIds(sourceDb.data, uniqueItemIds);
                            } catch (error) {
                                try {
                                    await restoreFiles(files);
                                } finally {
                                    DB.items.deleteByIds(targetDb.data, uniqueItemIds);
                                }
                                throw error;
                            }
                        }
                    } catch (error) {
                        await cleanupFiles(copiedFiles);
                        throw error;
                    }

                    void search.indexNewItems(target).catch(() => undefined);
                    return { itemCount: sourceItems.data.length, fileCount: files.length };
                } catch (error) {
                    return Result.reject(
                        Errors.itemTransferFail({
                            error,
                            message: `The selected items could not be ${doMove ? "moved" : "copied"} safely. No existing destination files were overwritten.`,
                            details: { sourceId, targetId, itemIds: uniqueItemIds },
                        }),
                    );
                } finally {
                    sourceDb.data.close();
                    targetDb.data.close();
                }
            }),
        );
    });
    registerHandle(ipc.ITEMS_EXPORT, async (_, { libraryId, destination, itemIds, live, edits, adjustments, nameByTakenDate, dateFormat }) =>
        withLibrary(libraryId, async lib => {
            const uniqueItemIds = [...new Set(itemIds)];
            if (uniqueItemIds.length === 0) return { itemCount: 0, fileCount: 0 };
            if (!destination.trim()) return Result.reject(Errors.itemExportFail({ message: "Choose a destination folder." }));
            if (pathBelongsToLibrary(destination, lib.path)) {
                return Result.reject(Errors.itemExportFail({ message: "Choose a destination outside the library folder." }));
            }

            const items = DB.withDatabase(lib.path, db => DB.items.getByIds(db, uniqueItemIds));
            if (!items.success) return Result.reject(items.error);
            if (items.data.length !== uniqueItemIds.length) {
                return Result.reject(Errors.itemExportFail({ message: "One or more selected items no longer exist in the library." }));
            }

            try {
                await fs.mkdir(destination, { recursive: true });
                const reserved = new Set<string>();
                const files: FileCopy[] = [];

                for (const item of items.data) {
                    const exportStem = nameByTakenDate ? formatExportDate(item.takenDate, dateFormat) : path.parse(item.originalName).name;
                    const storedFiles = await resolveStoredItemFiles(lib.path, item, { live, edits, adjustments, thumbnail: false });
                    let storedFileIndex = 0;
                    const mainSource = storedFiles[storedFileIndex++]!;
                    const liveSource = live && item.liveVideo ? storedFiles[storedFileIndex++] : undefined;
                    const rawSource = edits && item.rawOriginalName ? storedFiles[storedFileIndex++] : undefined;
                    const rawLiveSource = live && edits && item.rawLiveVideo ? storedFiles[storedFileIndex++] : undefined;
                    const adjustmentSource = adjustments && item.hasAdjustments ? storedFiles[storedFileIndex] : undefined;
                    const tasks = [
                        { source: mainSource, suffix: "", extension: item.extension },
                        ...(liveSource && item.liveVideo ? [{ source: liveSource, suffix: "", extension: fileExtension(item.liveVideo) }] : []),
                        ...(rawSource && item.rawOriginalName ? [{ source: rawSource, suffix: "-orig", extension: fileExtension(item.rawOriginalName) }] : []),
                        ...(rawLiveSource && item.rawLiveVideo ? [{ source: rawLiveSource, suffix: "-orig", extension: fileExtension(item.rawLiveVideo) }] : []),
                        ...(adjustmentSource ? [{ source: adjustmentSource, suffix: "", extension: "aae" }] : []),
                    ];

                    let counter = 0;
                    let targetStem = exportStem;
                    while (
                        (
                            await Promise.all(
                                tasks.map(task => {
                                    const targetPath = path.join(destination, `${targetStem}${task.suffix}.${task.extension}`);
                                    return reserved.has(targetPath) ? true : pathExists(targetPath);
                                }),
                            )
                        ).some(Boolean)
                    ) {
                        targetStem = `${exportStem} (${++counter})`;
                    }

                    for (const task of tasks) {
                        const destinationPath = path.join(destination, `${targetStem}${task.suffix}.${task.extension}`);
                        reserved.add(destinationPath);
                        files.push({ source: task.source, destination: destinationPath });
                    }
                }

                await copyFiles(files);
                return { itemCount: items.data.length, fileCount: files.length };
            } catch (error) {
                return Result.reject(
                    Errors.itemExportFail({
                        error,
                        message: "The selected items could not be exported completely. Any files created by this export were removed.",
                        details: { libraryId, destination, itemIds: uniqueItemIds },
                    }),
                );
            }
        }),
    );
    registerHandle(ipc.ITEMS_DELETE, async (_, { libraryId, itemIds }) => {
        return withLibrary(libraryId, async lib => {
            const db = DB.openConnection(lib.path);
            if (!db.success) return db;
            try {
                const items = DB.items.getByIds(db.data, itemIds);
                DB.items.deleteByIds(db.data, itemIds);
                await Promise.all(items.flatMap(item => storedItemFiles(lib.path, item).map(filePath => fs.rm(filePath, { force: true }))));
            } finally {
                db.data.close();
            }
        });
    });

    // Albums

    registerHandle(ipc.ALBUMS_GET, async (_, { libraryId, parent }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.albums.getFromParent(db, parent)));
    });
    registerHandle(ipc.ALBUMS_CREATE, async (_, { libraryId, album }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.albums.add(db, { id: uuidv4(), ...album })));
    });
    registerHandle(ipc.ALBUMS_GET_ITEMS, async (_, { libraryId, albumId }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.albums.getItems(db, albumId)));
    });
    registerHandle(ipc.ALBUMS_ADD_ITEMS, async (_, { libraryId, albumId, itemIds }) => {
        return withLibrary(libraryId, lib => DB.withDatabase(lib.path, db => DB.albums.addItems(db, albumId, itemIds)));
    });

    // Tags

    registerHandle(ipc.TAGS_GET, (_, { libraryId }) => withTagDatabase(libraryId, db => DB.items.getTags(db)));
    registerHandle(ipc.TAGS_GET_ITEMS, (_, { libraryId, itemIds }) => withTagDatabase(libraryId, db => DB.items.getItemsTags(db, [...new Set(itemIds)])));
    registerHandle(ipc.TAGS_CREATE, async (_, { libraryId, name, color }) => {
        const normalizedName = name.trim();
        const normalizedColor = color.trim();
        if (!normalizedName || normalizedName.length > 20 || !normalizedColor) return Result.reject(Errors.tagInvalid());

        return withTagDatabase(libraryId, db => {
            const duplicate = DB.items.getTags(db).some(tag => tag.name.localeCompare(normalizedName, undefined, { sensitivity: "accent" }) === 0);
            if (duplicate) return Result.reject(Errors.tagInvalid({ message: `A tag named "${normalizedName}" already exists.` }));

            const tag = { id: uuidv4(), name: normalizedName, color: normalizedColor, createdAt: new Date().toISOString() };
            DB.items.createTag(db, tag);
            return tag;
        });
    });
    registerHandle(ipc.TAGS_UPDATE, (_, { libraryId, tagId, name, color }) => {
        const normalizedName = name?.trim();
        const normalizedColor = color?.trim();
        if (normalizedName === "" || (normalizedName && normalizedName.length > 20) || normalizedColor === "") return Result.reject(Errors.tagInvalid());

        return withTagDatabase(libraryId, db => {
            const tags = DB.items.getTags(db);
            if (!tags.some(tag => tag.id === tagId)) return Result.reject(Errors.tagNotFound());
            if (normalizedName && tags.some(tag => tag.id !== tagId && tag.name.localeCompare(normalizedName, undefined, { sensitivity: "accent" }) === 0)) {
                return Result.reject(Errors.tagInvalid({ message: `A tag named "${normalizedName}" already exists.` }));
            }

            return DB.items.updateTag(db, tagId, normalizedName, normalizedColor)!;
        });
    });
    registerHandle(ipc.TAGS_DELETE, (_, { libraryId, tagIds }) => withTagDatabase(libraryId, db => DB.items.deleteTags(db, [...new Set(tagIds)])));
    registerHandle(ipc.TAGS_SET_ON_ITEMS, (_, { libraryId, itemIds, tagIds, assigned }) =>
        withTagDatabase(libraryId, db => {
            const uniqueItemIds = [...new Set(itemIds)];
            const uniqueTagIds = [...new Set(tagIds)];
            if (uniqueItemIds.length === 0 || uniqueTagIds.length === 0) return;

            const existingTagIds = new Set(DB.items.getTags(db).map(tag => tag.id));
            if (uniqueTagIds.some(tagId => !existingTagIds.has(tagId))) return Result.reject(Errors.tagNotFound());
            if (DB.items.getByIds(db, uniqueItemIds).length !== uniqueItemIds.length) {
                return Result.reject(Errors.tagOperationFail({ message: "One or more selected items no longer exist." }));
            }

            DB.items.setTagsOnItems(db, uniqueItemIds, uniqueTagIds, assigned);
        }),
    );

    // Search

    registerHandle(ipc.SEARCH_GET_STATUS, (_, { libraryId }) => withLibrary(libraryId, lib => search.getStatus(lib)));
    registerHandle(ipc.SEARCH_ENABLE, (_, { libraryId }) => withLibrary(libraryId, lib => search.enable(lib)));
    registerHandle(ipc.SEARCH_ITEMS, (_, { libraryId, query, limit, minScore }) =>
        withLibrary(libraryId, lib => search.search(lib, query, limit, minScore)),
    );

    // Other

    registerHandle(ipc.GEN_QUICK_THUMB, async (_, { path }) => {
        const mime = extToMime(fileExtension(path));
        if (mime.startsWith("video/")) {
            return utils.generateVideoThumbnail(path, { size: 96 });
        }

        const image = sharp(await fs.readFile(path));
        const thumb = await utils.generateImageThumbnail(image, { size: 96 });

        if (!thumb) return Result.reject(Errors.missingSource());
        return thumb;
    });
}
