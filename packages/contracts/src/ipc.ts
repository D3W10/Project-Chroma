import type { AppError, ResultCore } from "@project-chroma/core";
import type { ChromaConfig } from "./config.ts";
import type { Album, AlbumComp, ImportCandidate, ImportItem, Item, ItemAlbumRef, Library, LibraryHealth, LibraryMetadataPath, Tag, TagItemRef } from "./gallery.ts";

export const ipc = {
    WINDOW_ACTION: "chroma:window-action",
    OPEN_DIALOG: "chroma:open-dialog",
    SAVE_DIALOG: "chroma:save-dialog",
    CONFIG_GET: "chroma:config:get",
    CONFIG_SET: "chroma:config:set",
    CONFIG_UPDATE: "chroma:config:update",
    LIBRARY_GET: "chroma:library:get",
    LIBRARY_CHECK_HEALTH: "chroma:library:check-health",
    LIBRARY_GET_INFO_FROM_PATH: "chroma:library:get-info-from-path",
    LIBRARY_CREATE: "chroma:library:create",
    LIBRARY_ADD: "chroma:library:add",
    LIBRARY_UPDATE_PATH: "chroma:library:update-path",
    LIBRARY_UPGRADE: "chroma:library:upgrade",
    LIBRARY_REMOVE: "chroma:library:remove",
    ITEMS_GET: "chroma:items:get",
    ITEMS_VERIFY_CONFLICTS: "chroma:items:verify-conflicts",
    ITEMS_ADD: "chroma:items:add",
    ITEMS_SET_FAVORITE: "chroma:items:set-favorite",
    ITEMS_TRANSFER: "chroma:items:transfer",
    ITEMS_EXPORT: "chroma:items:export",
    ITEMS_DELETE: "chroma:items:delete",
    ALBUMS_GET: "chroma:albums:get",
    ALBUMS_CREATE: "chroma:albums:create",
    ALBUMS_GET_ITEMS: "chroma:albums:get-items",
    ALBUMS_ADD_ITEMS: "chroma:albums:add-items",
    TAGS_GET: "chroma:tags:get",
    TAGS_CREATE: "chroma:tags:create",
    TAGS_UPDATE: "chroma:tags:update",
    TAGS_DELETE: "chroma:tags:delete",
    TAGS_GET_ITEM: "chroma:tags:get-item",
    TAGS_ADD_TO_ITEMS: "chroma:tags:add-to-items",
    TAGS_REMOVE_FROM_ITEMS: "chroma:tags:remove-from-items",
    SEARCH_GET_STATUS: "chroma:search:get-status",
    SEARCH_ENABLE: "chroma:search:enable",
    SEARCH_ITEMS: "chroma:search:items",
    GEN_QUICK_THUMB: "chroma:gen-quick-thumb",
} as const;

type IpcCall<TChannel extends string, TArgs extends unknown[], TResult> = {
    readonly channel: TChannel;
    readonly args?: TArgs;
    readonly result?: TResult;
};

const defineCall =
    <TArgs extends unknown[], TResult>() =>
    <const TChannel extends string>(channel: TChannel): IpcCall<TChannel, TArgs, TResult> => ({ channel });

export const ipcDefinition = {
    windowAction: defineCall<[action: WindowAction], void>()(ipc.WINDOW_ACTION),
    openDialog: defineCall<[options?: ChromaOpenDialogOptions], string | string[] | null>()(ipc.OPEN_DIALOG),
    saveDialog: defineCall<[options?: ChromaSaveDialogOptions], string | null>()(ipc.SAVE_DIALOG),
    config: {
        get: defineCall<[] | [key: keyof ChromaConfig], ChromaConfig | ChromaConfig[keyof ChromaConfig]>()(ipc.CONFIG_GET),
        set: defineCall<[partial: Partial<ChromaConfig>], void>()(ipc.CONFIG_SET),
        update: defineCall<[config: ChromaConfig], void>()(ipc.CONFIG_UPDATE),
    },
    updates: {
        getState: defineCall<[], UpdateState>()(ipc.UPDATE_GET_STATE),
        check: defineCall<[], UpdateState>()(ipc.UPDATE_CHECK),
        download: defineCall<[], UpdateState>()(ipc.UPDATE_DOWNLOAD),
        install: defineCall<[], UpdateState>()(ipc.UPDATE_INSTALL),
    },
    library: {
        get: defineCall<[], Library[]>()(ipc.LIBRARY_GET),
        checkHealth: defineCall<[{ libraryId: string }], LibraryHealth>()(ipc.LIBRARY_CHECK_HEALTH),
        getInfoFromPath: defineCall<[{ path: string }], LibraryMetadataPath>()(ipc.LIBRARY_GET_INFO_FROM_PATH),
        create: defineCall<[{ name: string; icon: string; color: string; path: string }], Library>()(ipc.LIBRARY_CREATE),
        add: defineCall<[{ path: string }], Library>()(ipc.LIBRARY_ADD),
        updatePath: defineCall<[{ libraryId: string; newPath: string }], void>()(ipc.LIBRARY_UPDATE_PATH),
        upgrade: defineCall<[{ libraryId: string }], true>()(ipc.LIBRARY_UPGRADE),
        remove: defineCall<[{ libraryId: string }], void>()(ipc.LIBRARY_REMOVE),
    },
    items: {
        get: defineCall<[{ libraryId: string }], Item[]>()(ipc.ITEMS_GET),
        verifyConflicts: defineCall<[{ sourcePaths: string[]; checkLivePhotos: boolean; parseEdits: boolean }], ImportCandidate>()(ipc.ITEMS_VERIFY_CONFLICTS),
        addItems: defineCall<[{ libraryId: string; items: ImportItem[]; deleteSource: boolean }], { failures: AppError[] }>()(ipc.ITEMS_ADD),
        setItemsFavorite: defineCall<[{ libraryId: string; itemIds: string[]; value: boolean }], void>()(ipc.ITEMS_SET_FAVORITE),
        transferItems: defineCall<[{ sourceId: string; targetId: string; itemIds: string[]; doMove: boolean }], void>()(ipc.ITEMS_TRANSFER),
        exportItems: defineCall<[{ libraryId: string; destination: string; itemIds: string[]; live: boolean; edits: boolean; adjustments: boolean }], void>()(ipc.ITEMS_EXPORT),
        deleteItems: defineCall<[{ libraryId: string; itemIds: string[] }], void>()(ipc.ITEMS_DELETE),
    },
    albums: {
        get: defineCall<[{ libraryId: string; parent?: string }], AlbumComp[]>()(ipc.ALBUMS_GET),
        create: defineCall<[{ libraryId: string; album: Omit<Album, "id"> }], void>()(ipc.ALBUMS_CREATE),
        getItems: defineCall<[{ libraryId: string; albumId: string }], ItemAlbumRef[]>()(ipc.ALBUMS_GET_ITEMS),
        addItems: defineCall<[{ libraryId: string; albumId: string; itemIds: string[]; parent?: string }], void>()(ipc.ALBUMS_ADD_ITEMS),
    },
    tags: {
        get: defineCall<[{ libraryId: string }], Tag[]>()(ipc.TAGS_GET),
        create: defineCall<[{ libraryId: string; name: string; color: string }], Tag>()(ipc.TAGS_CREATE),
        update: defineCall<[{ libraryId: string; tagId: string; name?: string; color?: string }], Tag | undefined>()(ipc.TAGS_UPDATE),
        delete: defineCall<[{ libraryId: string; tagIds: string[] }], void>()(ipc.TAGS_DELETE),
        getItem: defineCall<[{ libraryId: string; itemId: string }], TagItemRef[]>()(ipc.TAGS_GET_ITEM),
        addToItems: defineCall<[{ libraryId: string; itemIds: string[]; tagIds: string[] }], void>()(ipc.TAGS_ADD_TO_ITEMS),
        removeFromItems: defineCall<[{ libraryId: string; itemIds: string[]; tagIds: string[] }], void>()(ipc.TAGS_REMOVE_FROM_ITEMS),
    },
    search: {
        getStatus: defineCall<[{ libraryId: string }], ItemSearchStatus>()(ipc.SEARCH_GET_STATUS),
        enable: defineCall<[{ libraryId: string }], ItemSearchStatus>()(ipc.SEARCH_ENABLE),
        items: defineCall<[{ libraryId: string; query: string; limit: number; minScore?: number }], ItemSearchMatch[]>()(ipc.SEARCH_ITEMS),
    },
    other: {
        genQuickThumb: defineCall<[{ path: string }], Uint8Array | undefined>()(ipc.GEN_QUICK_THUMB),
    },
} as const;

export type WindowAction = "minimize" | "toggleMaximize" | "close";

export type ChromaOpenDialogOptions = {
    directory?: boolean;
    multiple?: boolean;
    filters?: ChromaFileFilter[];
};

export type ChromaFileFilter = {
    name: string;
    extensions: string[];
};

export type ChromaSaveDialogOptions = {
    defaultPath?: string;
    canCreateDirectories?: boolean;
};

type MaybePromise<T> = Promise<T> | T;
type MaybeResult<T> = ResultCore<T> | T;
type UnionToIntersection<T> = (T extends unknown ? (value: T) => void : never) extends (value: infer I) => void ? I : never;
type IpcMapFromDefinition<T> =
    T extends IpcCall<infer TChannel, infer TArgs, infer TResult>
        ? { [K in TChannel]: (...args: TArgs) => TResult }
        : T extends object
          ? UnionToIntersection<{ [K in keyof T]: IpcMapFromDefinition<T[K]> }[keyof T]>
          : never;

export type ChromaIpcMap = IpcMapFromDefinition<typeof ipcDefinition>;
export type ChromaIpcChannel = keyof ChromaIpcMap;

export type ChromaIpcArgs<TChannel extends ChromaIpcChannel> = Parameters<ChromaIpcMap[TChannel]>;

type ChromaIpcResult<TChannel extends ChromaIpcChannel> = ReturnType<ChromaIpcMap[TChannel]>;

export type ChromaIpcHandler<TEvent, TChannel extends ChromaIpcChannel> = (event: TEvent, ...args: ChromaIpcArgs<TChannel>) => MaybePromise<MaybeResult<ChromaIpcResult<TChannel>>>;

export type ChromaIpcRegister<TEvent> = <TChannel extends ChromaIpcChannel>(channel: TChannel, listener: ChromaIpcHandler<TEvent, TChannel>) => void;

type BridgeFromSchema<Schema> =
    Schema extends IpcCall<string, infer TArgs, infer TResult>
        ? (...args: TArgs) => Promise<ResultCore<TResult>>
        : {
              [K in keyof Schema]: BridgeFromSchema<Schema[K]>;
          };

type DerivedChromaBridge = BridgeFromSchema<typeof ipcDefinition>;

export type ChromaIpcInvoke = <TChannel extends ChromaIpcChannel, const TArgs extends ChromaIpcArgs<TChannel>>(channel: TChannel, ...args: TArgs) => Promise<Result<ChromaIpcResult<TChannel, TArgs>>>;

export type ChromaIpcHandler<TEvent, TChannel extends ChromaIpcChannel, TArgs extends ChromaIpcArgs<TChannel> = ChromaIpcArgs<TChannel>> = (
    event: TEvent,
    ...args: TArgs
) => MaybePromise<MaybeResult<ChromaIpcResult<TChannel, TArgs>>>;

export type ChromaEventChannel = keyof ChromaEventMap;
export type ChromaEventListener<TChannel extends ChromaEventChannel> = (payload: ChromaEventMap[TChannel]) => void;
