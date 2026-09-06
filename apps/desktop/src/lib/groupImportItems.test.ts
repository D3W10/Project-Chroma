import { describe, expect, it } from "vitest";
import { groupImportItems } from "./groupImportItems.ts";

describe("groupImportItems", () => {
    it("groups edited items only when their extensions match", () => {
        const { items } = groupImportItems(["/photos/IMG_0001.jpg", "/photos/IMG_E0001.jpg", "/photos/IMG_0002.heic", "/photos/IMG_E0002.jpg"], false, true);

        expect(items).toEqual([
            { sourcePath: "/photos/IMG_E0001.jpg", originalSourcePath: "/photos/IMG_0001.jpg" },
            { sourcePath: "/photos/IMG_0002.heic" },
            { sourcePath: "/photos/IMG_E0002.jpg" },
        ]);
    });

    it("does not overwrite files whose extensions differ only by case", () => {
        expect(groupImportItems(["/photos/IMG_0001.jpg", "/photos/IMG_0001.JPG"], false, false).items).toEqual([
            { sourcePath: "/photos/IMG_0001.jpg" },
            { sourcePath: "/photos/IMG_0001.JPG" },
        ]);
    });

    it("groups Live Photo components while keeping different image extensions separate", () => {
        const { items } = groupImportItems(
            ["/photos/IMG_0001.heic", "/photos/IMG_0001.mov", "/photos/IMG_E0001.jpg", "/photos/IMG_E0001.mov"],
            true,
            true,
        );

        expect(items).toEqual([
            { sourcePath: "/photos/IMG_0001.heic", livePath: "/photos/IMG_0001.mov" },
            { sourcePath: "/photos/IMG_E0001.jpg", livePath: "/photos/IMG_E0001.mov" },
        ]);
    });

    it("never creates an import item for an AAE selection", () => {
        expect(groupImportItems(["/photos/IMG_0001.jpg", "/photos/IMG_0001.aae"], false, true).items).toEqual([
            { sourcePath: "/photos/IMG_0001.jpg", adjustmentsPath: "/photos/IMG_0001.aae" },
        ]);
        expect(groupImportItems(["/photos/IMG_0001.aae"], false, true).items).toEqual([]);
    });

    it("does not group same-named items from different folders", () => {
        expect(groupImportItems(["/one/IMG_0001.jpg", "/two/IMG_E0001.jpg"], false, true).items).toEqual([
            { sourcePath: "/one/IMG_0001.jpg" },
            { sourcePath: "/two/IMG_E0001.jpg" },
        ]);
    });

    it("changes the resulting item count with the selected grouping options", () => {
        const sourcePaths = ["/photos/IMG_0001.jpg", "/photos/IMG_E0001.jpg", "/photos/IMG_0001.mov", "/photos/IMG_E0001.mov", "/photos/IMG_0001.aae"];

        expect(groupImportItems(sourcePaths, false, false).items).toHaveLength(4);
        expect(groupImportItems(sourcePaths, true, false).items).toHaveLength(2);
        expect(groupImportItems(sourcePaths, false, true).items).toHaveLength(2);
        expect(groupImportItems(sourcePaths, true, true).items).toHaveLength(1);
    });

    it("reports ambiguous Live Photo videos for manual resolution", () => {
        const result = groupImportItems(["/photos/IMG_0001.jpg", "/photos/IMG_0001.mp4", "/photos/IMG_0001.mov", "/photos/IMG_0001.avi"], true, false);

        expect(result.items).toEqual([
            { sourcePath: "/photos/IMG_0001.jpg" },
            { sourcePath: "/photos/IMG_0001.mp4" },
            { sourcePath: "/photos/IMG_0001.mov" },
            { sourcePath: "/photos/IMG_0001.avi" },
        ]);
        expect(result.livePhotoConflicts).toEqual([
            {
                itemIndex: 0,
                field: "livePath",
                candidatePaths: ["/photos/IMG_0001.mp4", "/photos/IMG_0001.mov", "/photos/IMG_0001.avi"],
            },
        ]);
    });

    it("reports a video that could belong to multiple same-named photos", () => {
        const result = groupImportItems(["/photos/IMG_0001.heic", "/photos/IMG_0001.jpeg", "/photos/IMG_0001.mov"], true, false);

        expect(result.items).toEqual([
            { sourcePath: "/photos/IMG_0001.heic" },
            { sourcePath: "/photos/IMG_0001.jpeg" },
            { sourcePath: "/photos/IMG_0001.mov" },
        ]);
        expect(result.livePhotoConflicts).toEqual([
            { itemIndex: 0, field: "livePath", candidatePaths: ["/photos/IMG_0001.mov"] },
            { itemIndex: 1, field: "livePath", candidatePaths: ["/photos/IMG_0001.mov"] },
        ]);
    });

    it("groups video edits without assigning a Live Photo video", () => {
        const result = groupImportItems(["/videos/IMG_0001.mov", "/videos/IMG_E0001.mov"], true, true);

        expect(result.items).toEqual([{ sourcePath: "/videos/IMG_E0001.mov", originalSourcePath: "/videos/IMG_0001.mov" }]);
        expect(result.items.every(item => !item.livePath && !item.originalLivePath)).toBe(true);
        expect(result.livePhotoConflicts).toEqual([]);
    });

    it("attaches an AAE file to an edited video pair", () => {
        const result = groupImportItems(["/videos/IMG_0902.AAE", "/videos/IMG_0902.MOV", "/videos/IMG_E0902.MOV"], true, true);

        expect(result.items).toEqual([
            {
                sourcePath: "/videos/IMG_E0902.MOV",
                originalSourcePath: "/videos/IMG_0902.MOV",
                adjustmentsPath: "/videos/IMG_0902.AAE",
            },
        ]);
        expect(result.livePhotoConflicts).toEqual([]);
        expect(result.adjustmentConflicts).toEqual([]);
    });

    it("does not offer Live Photo candidate videos as AAE targets", () => {
        const sourcePaths = [
            "IMG_0742.HEIC",
            "IMG_0742.jpeg",
            "IMG_0742.MOV",
            "IMG_0902.AAE",
            "IMG_0902.HEIC",
            "IMG_0902.jpeg",
            "IMG_0902.MOV",
            "IMG_0902.mp4",
            "IMG_E0902.HEIC",
            "IMG_E0902.jpeg",
            "IMG_E0902.MOV",
            "IMG_E0902.mp4",
        ].map(name => `/photos/${name}`);

        const result = groupImportItems(sourcePaths, true, true);

        expect(result.livePhotoConflicts).toHaveLength(6);
        expect(result.adjustmentConflicts).toEqual([
            {
                adjustmentPath: "/photos/IMG_0902.AAE",
                candidateItemIndexes: [3, 4],
            },
        ]);
    });

    it("reports an AAE that could belong to multiple photo combos", () => {
        const result = groupImportItems(
            ["/photos/IMG_1750.heic", "/photos/IMG_1750.jpeg", "/photos/IMG_E1750.heic", "/photos/IMG_E1750.jpeg", "/photos/IMG_1750.aae"],
            false,
            true,
        );

        expect(result.items).toEqual([
            { sourcePath: "/photos/IMG_E1750.heic", originalSourcePath: "/photos/IMG_1750.heic" },
            { sourcePath: "/photos/IMG_E1750.jpeg", originalSourcePath: "/photos/IMG_1750.jpeg" },
        ]);
        expect(result.adjustmentConflicts).toEqual([
            {
                adjustmentPath: "/photos/IMG_1750.aae",
                candidateItemIndexes: [0, 1],
            },
        ]);
    });

    it("reports multiple AAE files competing for the same photo combo", () => {
        const result = groupImportItems(["/photos/IMG_1750.heic", "/photos/IMG_E1750.heic", "/photos/IMG_1750.aae", "/photos/IMG_E1750.aae"], false, true);

        expect(result.items).toEqual([{ sourcePath: "/photos/IMG_E1750.heic", originalSourcePath: "/photos/IMG_1750.heic" }]);
        expect(result.adjustmentConflicts).toEqual([
            { adjustmentPath: "/photos/IMG_1750.aae", candidateItemIndexes: [0] },
            { adjustmentPath: "/photos/IMG_E1750.aae", candidateItemIndexes: [0] },
        ]);
    });
});
