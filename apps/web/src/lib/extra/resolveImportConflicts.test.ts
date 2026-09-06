import { describe, expect, it } from "vitest";
import { resolveImportConflicts } from "./resolveImportConflicts.ts";
import type { ImportGroupingResult } from "@project-chroma/contracts/gallery";

describe("resolveImportConflicts", () => {
    it("does not leave paired video edits behind when both are assigned as Live Photo videos", () => {
        const grouping: ImportGroupingResult = {
            items: [{ sourcePath: "/photos/IMG_E0001.heic" }, { sourcePath: "/photos/IMG_0001.jpeg" }, { sourcePath: "/photos/IMG_E0001.mov", originalSourcePath: "/photos/IMG_0001.mov" }],
            livePhotoConflicts: [
                { itemIndex: 0, field: "livePath", candidatePaths: ["/photos/IMG_E0001.mov"] },
                { itemIndex: 1, field: "livePath", candidatePaths: ["/photos/IMG_0001.mov"] },
            ],
            adjustmentConflicts: [],
        };

        expect(resolveImportConflicts(grouping, { 0: "/photos/IMG_E0001.mov", 1: "/photos/IMG_0001.mov" }, {})).toEqual([
            { sourcePath: "/photos/IMG_E0001.heic", livePath: "/photos/IMG_E0001.mov" },
            { sourcePath: "/photos/IMG_0001.jpeg", livePath: "/photos/IMG_0001.mov" },
        ]);
    });

    it("keeps videos separate when the user chooses no Live Photo", () => {
        const grouping: ImportGroupingResult = {
            items: [{ sourcePath: "/photos/IMG_0001.heic" }, { sourcePath: "/photos/IMG_0001.mov" }],
            livePhotoConflicts: [{ itemIndex: 0, field: "livePath", candidatePaths: ["/photos/IMG_0001.mov"] }],
            adjustmentConflicts: [],
        };

        expect(resolveImportConflicts(grouping, { 0: "none" }, {})).toEqual(grouping.items);
    });
});
