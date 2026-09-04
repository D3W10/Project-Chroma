import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { IconAdjustmentsHorizontal, IconAlertTriangle, IconHelpCircle, IconPhotoVideo } from "@tabler/icons-react";
import { Button } from "@project-chroma/ui/button";
import { Checkbox } from "@project-chroma/ui/checkbox";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@project-chroma/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@project-chroma/ui/field";
import { RadioGroup, RadioGroupItem } from "@project-chroma/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@project-chroma/ui/select";
import { Spinner } from "@project-chroma/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@project-chroma/ui/tooltip";
import { cn, uint8ToBase64 } from "@project-chroma/utils";
import { DialogPaged, useDialogPaged } from "@/components/DialogPaged";
import { pathToName, queryKeys } from "@/lib/utils";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useSettings } from "@/lib/useSettings";
import { resolveImportConflicts, type AdjustmentSelections, type LivePhotoSelections } from "@/lib/extra/resolveImportConflicts";
import type { ImportGroupingResult, ImportItem } from "@project-chroma/contracts/gallery";

interface ImportItemsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
}

export function ImportItemsDialog({ open, onOpenChange }: ImportItemsDialogProps) {
    const { settings, updateSettings } = useSettings();
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);
    const [livePhotos, setLivePhotos] = useState(settings.importOptions.livePhotos);
    const [edits, setEdits] = useState(settings.importOptions.edits);
    const [deleteImported, setDeleteImported] = useState(false);
    const [groupingToResolve, setGroupingToResolve] = useState<ImportGroupingResult>();
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();
    const { progressNoti, pushNoti } = useNotifications();

    async function importItems(items: ImportItem[]) {
        if (!selectedLibrary || !window.chroma) return;

        updateSettings({
            importOptions: {
                livePhotos,
                edits,
            },
        });
        onOpenChange(false);

        const promise = window.chroma.items.addItems({ libraryId: selectedLibrary.id, items, deleteSource: deleteImported });
        const importNoti = pushNoti({
            title: "Importing items",
            description: `Importing ${items.length} items`,
            type: "promise",
            promise,
            hasProgress: true,
            peek: `Importing ${items.length} items`,
            success: () => ({ title: "Import success", description: `${items.length} items added successfully` }),
            error: e => ({ title: "Error importing", description: "An error occurred while importing the selected items: " + e }),
            onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.items(selectedLibrary.id) }),
        });

        const unlisten = window.chroma.on("import-progress", payload => {
            progressNoti(importNoti, payload / items.length);
        });

        promise.finally(unlisten);
    }

    return (
        <DialogPaged
            pages={{
                source: {
                    node: <SourcePage onItemsSelected={setSelectedItems} setIsSelecting={setIsSelecting} />,
                },
                review: {
                    node: (
                        <ReviewPage
                            selectedItems={selectedItems}
                            isSelecting={isSelecting}
                            livePhotos={livePhotos}
                            setLivePhotos={setLivePhotos}
                            edits={edits}
                            setEdits={setEdits}
                            deleteImported={deleteImported}
                            setDeleteImported={setDeleteImported}
                            onStartImport={importItems}
                            onResolveConflicts={setGroupingToResolve}
                        />
                    ),
                },
                conflicts: {
                    node: <ConflictsPage grouping={groupingToResolve} onStartImport={importItems} />,
                },
            }}
            defaultPage="source"
            open={open}
            onOpenChange={onOpenChange}
        />
    );
}

interface SourcePageProps {
    onItemsSelected: (items: string[]) => unknown;
    setIsSelecting: (isSelecting: boolean) => void;
}

function SourcePage({ onItemsSelected, setIsSelecting }: SourcePageProps) {
    const [selectedSource, setSelectedSource] = useState(0);
    const { close, setPage } = useDialogPaged();
    const { pushNoti } = useNotifications();

    async function next() {
        if (selectedSource !== 0 || !window.chroma) return;

        setIsSelecting(true);
        onItemsSelected([]);
        setPage("review");
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const { data: selected } = await window.chroma.openDialog({
                multiple: true,
                filters: [
                    {
                        name: "Photos, Videos and Adjustments",
                        extensions: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "mp4", "mov", "avi", "aae"],
                    },
                ],
            });

            if (Array.isArray(selected) && selected.some(path => !path.toLowerCase().endsWith(".aae"))) {
                onItemsSelected(selected);
            } else setPage("source", true);
        } catch (error) {
            console.error(error);
            pushNoti({
                title: "Import error",
                description: "Failed to open the system file dialog",
                type: "error",
            });
            setPage("source", true);
        } finally {
            setIsSelecting(false);
        }
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>Import items</DialogTitle>
                <DialogDescription>Select the origin of the items you want to import</DialogDescription>
            </DialogHeader>
            <FieldSet>
                <FieldGroup>
                    <RadioGroup defaultValue="computer" value={selectedSource.toString()} onValueChange={e => setSelectedSource(Number(e))}>
                        <FieldLabel htmlFor="computer">
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldTitle>This computer</FieldTitle>
                                    <FieldDescription>Select items from this computer</FieldDescription>
                                </FieldContent>
                                <RadioGroupItem value="0" id="computer" />
                            </Field>
                        </FieldLabel>
                        <FieldLabel htmlFor="ios">
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldTitle>iPhone/iPad</FieldTitle>
                                    <FieldDescription>Import from your iPhone or iPad</FieldDescription>
                                </FieldContent>
                                <RadioGroupItem value="1" id="ios" />
                            </Field>
                        </FieldLabel>
                    </RadioGroup>
                </FieldGroup>
            </FieldSet>
            <DialogFooter>
                <Button variant="secondary" onClick={close}>
                    Cancel
                </Button>
                <Button className="w-20" onClick={next}>
                    Next
                </Button>
            </DialogFooter>
        </>
    );
}

function ItemPreview({ path }: { path: string }) {
    const {
        isPending,
        data: thumb,
        error,
    } = useQuerySafe({
        queryKey: ["quick-thumb", path],
        queryFn: () => window.chroma!.other.genQuickThumb({ path }),
    });
    if (isPending) return <Spinner className="size-6 text-muted-foreground" />;
    if (!thumb || error) return <IconPhotoVideo className="size-6 text-muted-foreground" />;

    return <img src={"data:image/webp;base64," + uint8ToBase64(thumb)} className="size-full object-cover" alt="Preview" />;
}

interface ReviewPageProps {
    selectedItems: string[];
    isSelecting: boolean;
    livePhotos: boolean;
    setLivePhotos: (v: boolean) => void;
    edits: boolean;
    setEdits: (v: boolean) => void;
    deleteImported: boolean;
    setDeleteImported: (v: boolean) => void;
    onStartImport: (items: ImportItem[]) => void;
    onResolveConflicts: (grouping: ImportGroupingResult) => void;
}

function ReviewPage({ selectedItems, isSelecting, livePhotos, setLivePhotos, edits, setEdits, deleteImported, setDeleteImported, onStartImport, onResolveConflicts }: ReviewPageProps) {
    const { setPage } = useDialogPaged();
    const mediaItems = selectedItems.filter(p => !p.toLowerCase().endsWith(".aae"));
    const {
        data: groupingResult,
        isFetching,
        isError,
    } = useQuerySafe({
        queryKey: ["group-import-items", selectedItems, livePhotos, edits],
        queryFn: () =>
            window.chroma!.items.groupItems({
                sourcePaths: selectedItems,
                checkLivePhotos: livePhotos,
                parseEdits: edits,
            }),
        enabled: !!window.chroma && mediaItems.length > 0,
        placeholderData: previousGrouping => (isSelecting ? { items: [], livePhotoConflicts: [], adjustmentConflicts: [] } : previousGrouping),
    });
    const itemCount = groupingResult?.items.length ?? 0;
    const hasConflicts = !!groupingResult && groupingResult.livePhotoConflicts.length + groupingResult.adjustmentConflicts.length > 0;

    function openConflictResolution() {
        if (!groupingResult) return;
        onResolveConflicts(groupingResult);
        setPage("conflicts");
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>Review selection</DialogTitle>
                <DialogDescription>Review the items you&apos;re about to import</DialogDescription>
            </DialogHeader>
            <div className={cn("w-full p-3 flex justify-between items-center bg-muted/40 rounded-xl ring", !hasConflicts ? "ring-input" : "ring-yellow-500/30")}>
                <div className="flex items-center gap-4">
                    {isSelecting ? (
                        <div className="size-12 flex justify-center items-center bg-muted rounded-lg shadow-lg inset-ring inset-ring-input/75">
                            <Spinner className="size-6 text-muted-foreground" />
                        </div>
                    ) : mediaItems.length > 0 ? (
                        <div className="size-12 flex items-center relative">
                            {mediaItems.slice(0, 3).map((path, index) => (
                                <div
                                    key={path}
                                    className="size-12 flex justify-center items-center absolute bg-muted rounded-lg shadow-lg inset-ring inset-ring-input/75 overflow-hidden"
                                    style={{
                                        opacity: 1 - 0.2 * index,
                                        transform: `rotate(${index === 0 ? 0 : index === 1 ? 22 : -14}deg)`,
                                        zIndex: 3 - index,
                                    }}
                                >
                                    <ItemPreview path={path} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="size-12 flex justify-center items-center">
                            <IconPhotoVideo className="size-6 text-muted-foreground" />
                        </div>
                    )}
                    <AnimatePresence mode="popLayout">
                        <motion.p
                            key={`${isSelecting}-${itemCount}`}
                            className="font-semibold"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: !isSelecting ? 1 : 0.5,
                                color: "var(--secondary-foreground)",
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {isSelecting ? "Selecting items..." : `${itemCount} ${itemCount === 1 ? "item" : "items"} to be imported`}
                        </motion.p>
                    </AnimatePresence>
                </div>
                {hasConflicts && (
                    <Tooltip>
                        <TooltipTrigger className="mr-2 text-yellow-500">
                            <IconAlertTriangle className="size-5 " />
                        </TooltipTrigger>
                        <TooltipContent>Ambiguous matching on live videos and/or adjustment files</TooltipContent>
                    </Tooltip>
                )}
            </div>
            <FieldSeparator />
            <FieldSet>
                <FieldLegend variant="label">Import Options</FieldLegend>
                <FieldDescription>Customize the way items are imported</FieldDescription>
                <FieldGroup className="gap-3">
                    <Field orientation="horizontal">
                        <Checkbox id="optionLivePhotos" checked={livePhotos} disabled={isSelecting} onCheckedChange={e => setLivePhotos(!!e)} />
                        <FieldLabel htmlFor="optionLivePhotos">
                            Import as Live Photos
                            <Tooltip>
                                <TooltipTrigger>
                                    <IconHelpCircle className="size-4.5 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent>When a photo and a video are both selected and present on the same folder with the same name, they will be imported as a live photo</TooltipContent>
                            </Tooltip>
                        </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox id="optionEdits" checked={edits} disabled={isSelecting} onCheckedChange={e => setEdits(!!e)} />
                        <FieldLabel htmlFor="optionEdits">
                            Combine edited photos
                            <Tooltip>
                                <TooltipTrigger>
                                    <IconHelpCircle className="size-4.5 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    Automatically detects and groups edited photos (IMG_Exxxx.heic) with their originals (IMG_xxxx.heic). The original photo will be preserved as well as the
                                    adjustments file (.aae) if one is selected.
                                </TooltipContent>
                            </Tooltip>
                        </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox id="optionDeleteImport" checked={deleteImported} disabled={isSelecting} onCheckedChange={e => setDeleteImported(!!e)} />
                        <FieldLabel htmlFor="optionDeleteImport">Delete originals after import</FieldLabel>
                    </Field>
                </FieldGroup>
            </FieldSet>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setPage("source", true)}>
                    Back
                </Button>
                <Button
                    disabled={isSelecting || isFetching || isError || !groupingResult?.items.length}
                    onClick={() => (hasConflicts ? openConflictResolution() : groupingResult && onStartImport(groupingResult.items))}
                >
                    {!hasConflicts ? "Import items" : "Resolve conflicts"}
                </Button>
            </DialogFooter>
        </>
    );
}

interface ConflictsPageProps {
    grouping?: ImportGroupingResult;
    onStartImport: (items: ImportItem[]) => void;
}

function ConflictsPage({ grouping, onStartImport }: ConflictsPageProps) {
    const [livePhotoSelections, setLivePhotoSelections] = useState<LivePhotoSelections>({});
    const [adjustmentSelections, setAdjustmentSelections] = useState<AdjustmentSelections>({});
    const { setPage } = useDialogPaged();

    if (!grouping) return null;

    const unresolvedLivePhotos = grouping.livePhotoConflicts.some((_, index) => !livePhotoSelections[index]);
    const unresolvedAdjustments = grouping.adjustmentConflicts.some((_, index) => adjustmentSelections[index] === undefined);
    const livePhotoConflictGroups = grouping.livePhotoConflicts.reduce((groups, conflict, index) => {
        const conflictGroup = groups.get(conflict.itemIndex);
        const entry = { conflict, index };

        if (conflictGroup) conflictGroup.push(entry);
        else groups.set(conflict.itemIndex, [entry]);

        return groups;
    }, new Map<number, { conflict: (typeof grouping.livePhotoConflicts)[number]; index: number }[]>());

    return (
        <>
            <DialogHeader>
                <DialogTitle>Resolve conflicts</DialogTitle>
                <DialogDescription>Select the live videos and/or adjustments for each item. Unmatched videos will still be imported separately.</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 p-0.5 space-y-4 overflow-y-auto">
                {Array.from(livePhotoConflictGroups.entries()).map(([itemIndex, conflicts]) => (
                    <div key={itemIndex} className="rounded-xl ring ring-input divide-y divide-input overflow-hidden">
                        {conflicts.map(({ conflict, index }) => {
                            const item = grouping.items[conflict.itemIndex];
                            const itemPath = conflict.field === "originalLivePath" ? item?.originalSourcePath : item?.sourcePath;
                            if (!item || !itemPath) return null;

                            return (
                                <div key={conflict.field} className="p-3 flex items-center gap-3 bg-secondary">
                                    <div className="size-14 flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted shadow-lg inset-ring inset-ring-input/75">
                                        <ItemPreview path={itemPath} />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.75">
                                        <p className="text-sm font-semibold truncate">{pathToName(itemPath)}</p>
                                        <Select value={livePhotoSelections[index] ?? null} onValueChange={value => setLivePhotoSelections(previous => ({ ...previous, [index]: value ?? undefined }))}>
                                            <SelectTrigger className="w-56">
                                                {(() => {
                                                    const val = livePhotoSelections[index];
                                                    if (val === undefined) return "Choose live video";
                                                    if (val === "none") return "Import without Live Photo";
                                                    return pathToName(val);
                                                })()}
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Import without Live Photo</SelectItem>
                                                {conflict.candidatePaths
                                                    .filter(
                                                        candidatePath =>
                                                            candidatePath === livePhotoSelections[index] ||
                                                            !Object.entries(livePhotoSelections).some(
                                                                ([selectionIndex, selectedPath]) => Number(selectionIndex) !== index && selectedPath === candidatePath,
                                                            ),
                                                    )
                                                    .map(candidatePath => (
                                                        <SelectItem key={candidatePath} value={candidatePath}>
                                                            {pathToName(candidatePath)}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
                {grouping.adjustmentConflicts.map((conflict, index) => (
                    <div key={conflict.adjustmentPath} className="p-3 flex items-center gap-3 bg-secondary rounded-xl ring ring-input">
                        <div className="size-14 flex shrink-0 items-center justify-center rounded-md bg-muted shadow-lg inset-ring inset-ring-input/75">
                            <IconAdjustmentsHorizontal className="size-6 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.75">
                            <p className="text-sm font-semibold truncate">{pathToName(conflict.adjustmentPath)}</p>
                            <Select value={adjustmentSelections[index] ?? null} onValueChange={value => setAdjustmentSelections(previous => ({ ...previous, [index]: value ?? undefined }))}>
                                <SelectTrigger className="w-56">
                                    {(() => {
                                        const val = adjustmentSelections[index];
                                        if (val === undefined) return "Choose pair";
                                        if (val === "none") return "Don't attach";
                                        return pathToName(grouping.items[+val].sourcePath);
                                    })()}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Don't attach</SelectItem>
                                    {conflict.candidateItemIndexes.map(itemIndex => {
                                        const item = grouping.items[itemIndex];
                                        if (!item) return null;

                                        const itemValue = itemIndex.toString();
                                        const selectedElsewhere = Object.entries(adjustmentSelections).some(
                                            ([selectionIndex, selectedItemIndex]) => Number(selectionIndex) !== index && selectedItemIndex === itemValue,
                                        );
                                        if (selectedElsewhere && adjustmentSelections[index] !== itemValue) return null;

                                        return (
                                            <SelectItem key={itemIndex} value={itemValue}>
                                                {pathToName(item.sourcePath)}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ))}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setPage("review", true)}>
                    Back
                </Button>
                <Button disabled={unresolvedLivePhotos || unresolvedAdjustments} onClick={() => onStartImport(resolveImportConflicts(grouping, livePhotoSelections, adjustmentSelections))}>
                    Import items
                </Button>
            </DialogFooter>
        </>
    );
}
