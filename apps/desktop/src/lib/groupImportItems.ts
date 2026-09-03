import path from "node:path";
import { extToMime } from "@project-chroma/utils";
import type { ImportAdjustmentConflict, ImportGroupingResult, ImportItem, ImportLivePhotoConflict } from "@project-chroma/contracts/gallery";

type MediaPair = {
    original?: string;
    edited?: string;
};

type MediaGroup = {
    images: Map<string, MediaPair>;
    videos: Map<string, MediaPair>;
    adjustments: string[];
};

type ImportEntry = {
    item: ImportItem;
};

const uneditedName = (name: string) => `IMG_${name.slice(5)}`;

function groupKey(directory: string, stem: string) {
    return `${directory}\0${stem}`;
}

function importItemFromPair(pair: MediaPair): ImportItem | undefined {
    if (pair.edited) {
        return {
            sourcePath: pair.edited,
            ...(pair.original ? { originalSourcePath: pair.original } : {}),
        };
    }

    if (pair.original) return { sourcePath: pair.original };
}

function addToPair(pairs: Map<string, MediaPair>, extension: string, role: keyof MediaPair, sourcePath: string) {
    const pair = pairs.get(extension) ?? {};
    pair[role] = sourcePath;
    pairs.set(extension, pair);
}

export function groupImportItems(sourcePaths: string[], checkLivePhotos: boolean, parseEdits: boolean): ImportGroupingResult {
    const groups = new Map<string, MediaGroup>();
    const getGroup = (key: string) => {
        const existing = groups.get(key);
        if (existing) return existing;

        const group: MediaGroup = { images: new Map(), videos: new Map(), adjustments: [] };
        groups.set(key, group);
        return group;
    };

    for (const sourcePath of sourcePaths) {
        const parsedPath = path.parse(sourcePath);
        if (!parsedPath.name) continue;

        const extension = parsedPath.ext.slice(1);
        const normalizedExtension = extension.toLowerCase();
        if (normalizedExtension === "aae") {
            const stem = parseEdits && parsedPath.name.startsWith("IMG_E") ? uneditedName(parsedPath.name) : parsedPath.name;
            getGroup(groupKey(parsedPath.dir, stem)).adjustments.push(sourcePath);
            continue;
        }

        const mime = extToMime(normalizedExtension);
        if (!mime.startsWith("image/") && !mime.startsWith("video/")) continue;

        const edited = parseEdits && parsedPath.name.startsWith("IMG_E");
        const stem = edited ? uneditedName(parsedPath.name) : parsedPath.name;
        const group = getGroup(groupKey(parsedPath.dir, stem));
        const pairs = mime.startsWith("image/") ? group.images : group.videos;

        addToPair(pairs, extension, edited ? "edited" : "original", sourcePath);
    }

    const entries: ImportEntry[] = [];
    const livePhotoConflicts: ImportLivePhotoConflict[] = [];
    const adjustmentConflicts: ImportAdjustmentConflict[] = [];

    for (const group of groups.values()) {
        const imageEntries = Array.from(group.images.values())
            .map(pair => importItemFromPair(pair))
            .filter(item => !!item)
            .map(item => ({ item }));
        const adjustmentCandidateEntries = [...imageEntries];
        entries.push(...imageEntries);

        const usedVideos = new Set<string>();
        const livePhotoCandidateVideos = new Set<string>();

        if (checkLivePhotos && imageEntries.length > 0) {
            const slotsByStem = new Map<string, { entry: ImportEntry; field: "livePath" | "originalLivePath" }[]>();
            const videosByStem = new Map<string, string[]>();

            for (const entry of imageEntries) {
                const sourceStem = path.parse(entry.item.sourcePath).name;
                slotsByStem.set(sourceStem, [...(slotsByStem.get(sourceStem) ?? []), { entry, field: "livePath" }]);

                if (entry.item.originalSourcePath) {
                    const originalStem = path.parse(entry.item.originalSourcePath).name;
                    slotsByStem.set(originalStem, [...(slotsByStem.get(originalStem) ?? []), { entry, field: "originalLivePath" }]);
                }
            }

            for (const pair of group.videos.values()) {
                for (const videoPath of [pair.original, pair.edited].filter((videoPath): videoPath is string => !!videoPath)) {
                    const videoStem = path.parse(videoPath).name;
                    videosByStem.set(videoStem, [...(videosByStem.get(videoStem) ?? []), videoPath]);
                }
            }

            for (const [stem, slots] of slotsByStem) {
                const videoPaths = videosByStem.get(stem) ?? [];
                if (videoPaths.length === 0) continue;
                for (const videoPath of videoPaths) livePhotoCandidateVideos.add(videoPath);

                if (slots.length === 1 && videoPaths.length === 1) {
                    slots[0]!.entry.item[slots[0]!.field] = videoPaths[0]!;
                    usedVideos.add(videoPaths[0]!);
                    continue;
                }

                for (const slot of slots) {
                    livePhotoConflicts.push({
                        itemIndex: entries.indexOf(slot.entry),
                        field: slot.field,
                        candidatePaths: videoPaths,
                    });
                }
            }
        }

        for (const pair of group.videos.values()) {
            const remainingPair = {
                ...(pair.original && !usedVideos.has(pair.original) ? { original: pair.original } : {}),
                ...(pair.edited && !usedVideos.has(pair.edited) ? { edited: pair.edited } : {}),
            };
            const item = importItemFromPair(remainingPair);
            if (item) {
                const entry = { item };
                const canOnlyBeImportedAsVideo = ![item.sourcePath, item.originalSourcePath].some(itemPath => itemPath && livePhotoCandidateVideos.has(itemPath));
                if (canOnlyBeImportedAsVideo) adjustmentCandidateEntries.push(entry);
                entries.push(entry);
            }
        }

        const adjustmentMatches = group.adjustments.map(adjustmentPath => {
            const adjustmentStem = path.parse(adjustmentPath).name;
            const candidates = adjustmentCandidateEntries.filter(
                entry => path.parse(entry.item.sourcePath).name === adjustmentStem || (entry.item.originalSourcePath && path.parse(entry.item.originalSourcePath).name === adjustmentStem),
            );
            return { adjustmentPath, candidates };
        });
        const adjustmentCandidateCounts = new Map<ImportEntry, number>();
        for (const match of adjustmentMatches) {
            for (const candidate of match.candidates) adjustmentCandidateCounts.set(candidate, (adjustmentCandidateCounts.get(candidate) ?? 0) + 1);
        }

        for (const match of adjustmentMatches) {
            if (match.candidates.length === 1 && adjustmentCandidateCounts.get(match.candidates[0]!) === 1) {
                match.candidates[0]!.item.adjustmentsPath = match.adjustmentPath;
            } else if (match.candidates.length > 0) {
                adjustmentConflicts.push({
                    adjustmentPath: match.adjustmentPath,
                    candidateItemIndexes: match.candidates.map(candidate => entries.indexOf(candidate)),
                });
            }
        }
    }

    return {
        items: entries.map(entry => entry.item),
        livePhotoConflicts,
        adjustmentConflicts,
    };
}
