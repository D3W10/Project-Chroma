import type { ImportGroupingResult, ImportItem } from "@project-chroma/contracts/gallery";

export type LivePhotoSelections = Record<number, string | undefined>;
export type AdjustmentSelections = Record<number, string | undefined>;

export function resolveImportConflicts(grouping: ImportGroupingResult, livePhotoSelections: LivePhotoSelections, adjustmentSelections: AdjustmentSelections): ImportItem[] {
    const resolvedItems = grouping.items.map(item => ({ ...item }));
    const selectedPaths = new Set<string>();

    grouping.livePhotoConflicts.forEach((conflict, index) => {
        const selectedPath = livePhotoSelections[index];
        const item = resolvedItems[conflict.itemIndex];
        if (!selectedPath || selectedPath === "none" || !item) return;

        item[conflict.field] = selectedPath;
        selectedPaths.add(selectedPath);
    });

    grouping.adjustmentConflicts.forEach((conflict, index) => {
        const selectedItemIndex = adjustmentSelections[index];
        if (selectedItemIndex === undefined || selectedItemIndex === "none") return;

        const item = resolvedItems[Number(selectedItemIndex)];
        if (item) item.adjustmentsPath = conflict.adjustmentPath;
    });

    return resolvedItems.flatMap((item, itemIndex) => {
        if (grouping.livePhotoConflicts.some(conflict => conflict.itemIndex === itemIndex)) return [item];

        const sourceSelected = selectedPaths.has(item.sourcePath);
        const originalSelected = !!item.originalSourcePath && selectedPaths.has(item.originalSourcePath);
        if (sourceSelected && originalSelected) return [];
        if (sourceSelected) return item.originalSourcePath ? [{ sourcePath: item.originalSourcePath }] : [];
        if (originalSelected) {
            const { originalSourcePath: _, ...itemWithoutOriginal } = item;
            return [itemWithoutOriginal];
        }

        return [item];
    });
}
