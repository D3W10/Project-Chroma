import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { IconChevronLeft, IconChevronRight, IconHelpCircle, IconMinus, IconPhotoVideo, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { animate, slideVariants, type Direction } from "@/components/animated";
import { DialogPaged, useDialogPaged } from "@/components/custom/DialogPaged";
import { IconBox } from "@/components/custom/IconBox";
import { verifyConflicts, addItems } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useSettings } from "@/lib/useSettings";
import { unwrapResult } from "@/lib/utils";
import type { Group, ImportItem } from "@/lib/models";

export function ImportItemsDialog({ openDialog, onOpenChange }: { openDialog: boolean; onOpenChange: (open: boolean) => void }) {
    const { settings, updateSettings } = useSettings();
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [livePhotos, setLivePhotos] = useState(settings.importOptions.livePhotos);
    const [edits, setEdits] = useState(settings.importOptions.edits);
    const [conflicts, setConflicts] = useState<Group[]>([]);
    const [finalItems, setFinalItems] = useState<ImportItem[]>([]);
    const [deleteImported, setDeleteImported] = useState(false);
    const queryClient = useQueryClient();
    const { selectedLibrary } = useLibrary();
    const { pushNoti, progressNoti } = useNotifications();

    async function handleImportRequest(setPage: (page: string) => unknown) {
        if (!selectedLibrary) return;

        const { data: result, error } = await verifyConflicts({
            sourcePaths: selectedItems,
            checkLivePhotos: livePhotos,
            parseEdits: edits,
        });

        if (error || !result) {
            pushNoti("Scan Error", "Failed to scan files", "error");
            return;
        }

        setDeleteImported(deleteImported);

        if (result.conflicts.length > 0) {
            setFinalItems(result.items_to_import);
            setConflicts(result.conflicts);
            setPage("conflicts");
        } else
            importItems(result.items_to_import);
    }

    async function importItems(items: ImportItem[]) {
        if (!selectedLibrary) return;

        updateSettings({ importOptions: {
            livePhotos,
            edits,
        } });
        onOpenChange(false);

        const promise = unwrapResult(addItems({ libraryId: selectedLibrary.id, items, deleteSource: deleteImported }));

        const importNoti = pushNoti("Importing items", "Importing " + items.length + " items", "promise", {
            promise,
            hasProgress: true,
            peek: "Importing " + items.length + " items",
            success: () => ({ title: "Import success", description: items.length + " items added successfully" }),
            error: e => ({ title: "Error importing", description: "An error occurred while importing the selected items: " + e }),
            onSuccess: () => queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "items"] }),
        });

        const unlisten = await listen<number>("import-progress", event => {
            progressNoti(importNoti, event.payload / items.length);
        });

        promise.finally(unlisten);
    }

    return (
        <DialogPaged
            pages={{
                source: {
                    height: 324,
                    node: <SourcePage />,
                },
                select: {
                    height: 304,
                    closeable: false,
                    node: <SelectPage onItemsSelected={setSelectedItems} />,
                },
                review: {
                    height: 442,
                    node: <ReviewPage selectedItems={selectedItems} livePhotos={livePhotos} setLivePhotos={setLivePhotos} edits={edits} setEdits={setEdits} deleteImported={deleteImported} setDeleteImported={setDeleteImported} onStartImport={handleImportRequest} />,
                },
                conflicts: {
                    height: 548,
                    node: <ConflictPage conflicts={conflicts} existingItems={finalItems} livePhotos={livePhotos} edits={edits} onResolve={importItems} />,
                },
            }}
            defaultPage="source"
            open={openDialog}
            onOpenChange={onOpenChange}
        />
    );
}

function SourcePage() {
    const [selectedSource, setSelectedSource] = useState(0);
    const { close, setPage } = useDialogPaged();

    async function next() {
        if (selectedSource === 0)
            setPage("select");
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
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button className="w-20" onClick={next}>Next</Button>
            </DialogFooter>
        </>
    );
}

function SelectPage({ onItemsSelected }: { onItemsSelected: (items: string[]) => unknown }) {
    const { setPage } = useDialogPaged();
    const { pushNoti } = useNotifications();

    useEffect(() => {
        const timeout = setTimeout(async () => {
            try {
                const selected = await open({
                    multiple: true,
                    filters: [
                        {
                            name: "Images",
                            extensions: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"],
                        },
                        {
                            name: "Videos",
                            extensions: ["mp4", "mov", "avi"],
                        },
                        {
                            name: "Adjustments",
                            extensions: ["aae"],
                        },
                    ],
                });

                if (selected && selected.filter(p => !p.toLowerCase().endsWith(".aae")).length) {
                    onItemsSelected(selected);
                    setPage("review");
                } else
                    setPage("source", true);
            } catch (err) {
                console.error(err);
                pushNoti("Import error", "Failed to open the system file dialog", "error");
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <>
            <div className="w-full h-64 flex flex-col justify-center items-center">
                <IconBox className="mb-4">
                    <Spinner />
                </IconBox>
                <h1 className="text-xl font-bold">Loading items</h1>
            </div>
        </>
    );
}

interface ReviewPageProps {
    selectedItems: string[];
    livePhotos: boolean;
    setLivePhotos: (v: boolean) => void;
    edits: boolean;
    setEdits: (v: boolean) => void;
    deleteImported: boolean;
    setDeleteImported: (v: boolean) => void;
    onStartImport: (setPage: (p: string) => void) => void;
}

function ReviewPage({ selectedItems, livePhotos, setLivePhotos, edits, setEdits, deleteImported, setDeleteImported, onStartImport }: ReviewPageProps) {
    const { setPage } = useDialogPaged();

    return (
        <>
            <DialogHeader>
                <DialogTitle>Review selection</DialogTitle>
                <DialogDescription>Review the items you&apos;re about to import</DialogDescription>
            </DialogHeader>
            <div className="w-full p-3 flex items-center gap-3.5 bg-muted/40 rounded-xl ring-1 ring-input">
                <IconBox size="small">
                    <IconPhotoVideo />
                </IconBox>
                <p className="font-semibold text-secondary-foreground">{selectedItems.filter(p => !p.toLowerCase().endsWith(".aae")).length + " items selected"}</p>
            </div>
            <FieldSeparator />
            <FieldSet>
                <FieldLegend variant="label">Import Options</FieldLegend>
                <FieldDescription>Customize the way items are imported</FieldDescription>
                <FieldGroup className="gap-3">
                    <Field orientation="horizontal">
                        <Checkbox id="optionLivePhotos" checked={livePhotos} onCheckedChange={e => setLivePhotos(!!e)} />
                        <FieldLabel htmlFor="optionLivePhotos">
                            Import as Live Photos
                            <Tooltip>
                                <TooltipTrigger>
                                    <IconHelpCircle className="size-4.5 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    When a photo and a video are both selected and present on the same folder with the same name, they will be imported as a live photo
                                </TooltipContent>
                            </Tooltip>
                        </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox id="optionEdits" checked={edits} onCheckedChange={e => setEdits(!!e)} />
                        <FieldLabel htmlFor="optionEdits">
                            Combine edited photos
                            <Tooltip>
                                <TooltipTrigger>
                                    <IconHelpCircle className="size-4.5 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    Automatically detects and groups edited photos (IMG_Exxxx) with their originals (IMG_xxxx). The original photo will be preserved as well as the adjustments file (.aae) if one is selected.
                                </TooltipContent>
                            </Tooltip>
                        </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox id="optionDeleteImport" checked={deleteImported} onCheckedChange={e => setDeleteImported(!!e)} />
                        <FieldLabel htmlFor="optionDeleteImport">Delete originals after import</FieldLabel>
                    </Field>
                </FieldGroup>
            </FieldSet>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPage("source", true)}>Back</Button>
                <Button disabled={!selectedItems.length} onClick={() => onStartImport(setPage)}>Import items</Button>
            </DialogFooter>
        </>
    );
}

type GroupingBehavior = "separate" | "ignore";

interface ConflictPageProps {
    conflicts: Group[];
    existingItems: ImportItem[];
    livePhotos: boolean;
    edits: boolean;
    onResolve: (items: ImportItem[]) => unknown;
}

function ConflictPage({ conflicts, existingItems, livePhotos, edits, onResolve }: ConflictPageProps) {
    const [selectedConflict, setSelectedConflict] = useState(0);
    const [direction, setDirection] = useState<Direction>(1);
    const [importGroups, setImportGroups] = useState<Partial<ImportItem>[][]>(Array.from({ length: conflicts.length }, () => [{}]));
    const [ungrouped, setUngrouped] = useState<GroupingBehavior>("separate");
    const { setPage } = useDialogPaged();

    const getAllItems = (g: Group, o: boolean = false) => !o
        ? [...g.edited_items, ...g.edited_videos, ...g.original_items, ...g.original_videos]
        : [...g.original_items, ...g.original_videos, ...g.edited_items, ...g.edited_videos];
    const getAllVideos = (g: Group, o: boolean = false) => !o
        ? [...g.edited_videos, ...g.original_videos]
        : [...g.original_videos, ...g.edited_videos];
    const pathToName = (p: string) => p.split("/").pop() || "";
    const pathToStem = (p: string) => /([^/\\]+?)(?:\.[^.]*$|$)/g.exec(p)?.[1] || "";
    const getAllUsedPaths = () => importGroups.flat().flatMap(g => Object.values(g));
    const getConflictName = (g: Group) => {
        if (g.original_items.length) return pathToStem(g.original_items[0]);
        if (g.original_videos.length) return pathToStem(g.original_videos[0]);
        if (g.edited_items.length) return pathToStem(g.edited_items[0]);
        if (g.edited_videos.length) return pathToStem(g.edited_videos[0]);
        return "";
    };

    function setConflict(newDirection: Direction) {
        setDirection(newDirection);
        setSelectedConflict(selectedConflict + newDirection);
    }

    function setImportItem(groupIndex: number, type: keyof ImportItem, path: string) {
        setImportGroups(prev =>
            prev.map((conflictGroups, conflictIdx) =>
                conflictIdx === selectedConflict
                    ? conflictGroups.map((group, idx) =>
                        idx === groupIndex
                            ? { ...group, [type]: path !== "none" ? path : undefined }
                            : group,
                    )
                    : conflictGroups,
            ),
        );
    }

    function addImportGroup() {
        setImportGroups(prev =>
            prev.map((conflictGroups, idx) =>
                idx === selectedConflict
                    ? [...conflictGroups, {}]
                    : conflictGroups,
            ),
        );
    }

    function removeImportGroup(i: number) {
        setImportGroups(prev =>
            prev.map((conflictGroups, idx) =>
                idx === selectedConflict
                    ? conflictGroups.filter((_, idx2) => idx2 !== i)
                    : conflictGroups,
            ),
        );
    }

    function handleImport() {
        const flatGroups = importGroups.flat();
        if (flatGroups.some(g => !g.source_path)) return;

        let itemsToImport = [...existingItems, ...flatGroups as ImportItem[]];

        if (ungrouped === "separate") {
            const used = getAllUsedPaths();
            const remaining = conflicts.flatMap(g => getAllItems(g)).filter(p => !used.includes(p));

            itemsToImport = [...itemsToImport, ...remaining.map(p => ({
                source_path: p,
            }) satisfies ImportItem)];
        }

        onResolve(itemsToImport);
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>Resolve conflicts</DialogTitle>
                <DialogDescription>While importing your items, many files with ambiguous names were found. Please group the correct files for each import</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
                <div className="h-64 flex">
                    <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                        <animate.div
                            key={selectedConflict}
                            variants={slideVariants}
                            custom={direction}
                            initial="initial"
                            animate="target"
                            exit="exit"
                            className="min-w-full flex bg-muted/40 rounded-xl ring-1 ring-input"
                        >
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-32 flex items-center gap-2">
                                            {`${edits ? "Main" : ""} Item`}
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <IconHelpCircle className="size-4.5 text-primary" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    This is the main photo/video that will show up on the grid, should point to the edited version if one is available!
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        {livePhotos && <TableHead className="min-w-32">{edits ? "Main" : ""} Live</TableHead>}
                                        {edits && <TableHead className="min-w-32">Original Item</TableHead>}
                                        {livePhotos && edits && <TableHead className="min-w-32">Original Live</TableHead>}
                                        {edits && <TableHead className="min-w-32">Adjustments</TableHead>}
                                        <TableHead className="w-px" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {importGroups[selectedConflict].map((g, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Select value={g.source_path} onValueChange={v => setImportItem(i, "source_path", v)}>
                                                    <SelectTrigger size="sm" className="w-full">
                                                        <SelectValue placeholder="Select item" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {getAllItems(conflicts[selectedConflict])
                                                            .filter(p => p == g.source_path || !getAllUsedPaths().includes(p))
                                                            .map((p, i) => (
                                                                <SelectItem key={i} value={p}>
                                                                    {pathToName(p)}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            {livePhotos && (
                                                <TableCell>
                                                    <Select disabled={!g.source_path} value={g.live_path} onValueChange={v => setImportItem(i, "live_path", v)}>
                                                        <SelectTrigger size="sm" className="w-full">
                                                            <SelectValue placeholder="Select item" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            {getAllVideos(conflicts[selectedConflict])
                                                                .filter(p => p == g.live_path || !getAllUsedPaths().includes(p))
                                                                .map((p, i) => (
                                                                    <SelectItem key={i} value={p}>
                                                                        {pathToName(p)}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            )}
                                            {edits && (
                                                <TableCell>
                                                    <Select disabled={!g.source_path} value={g.original_source_path} onValueChange={v => setImportItem(i, "original_source_path", v)}>
                                                        <SelectTrigger size="sm" className="w-full">
                                                            <SelectValue placeholder="Select item" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            {getAllItems(conflicts[selectedConflict], true)
                                                                .filter(p => p == g.original_source_path || !getAllUsedPaths().includes(p))
                                                                .map((p, i) => (
                                                                    <SelectItem key={i} value={p}>
                                                                        {pathToName(p)}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            )}
                                            {livePhotos && edits && (
                                                <TableCell>
                                                    <Select disabled={!g.source_path} value={g.original_live_path} onValueChange={v => setImportItem(i, "original_live_path", v)}>
                                                        <SelectTrigger size="sm" className="w-full">
                                                            <SelectValue placeholder="Select item" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            {getAllVideos(conflicts[selectedConflict], true)
                                                                .filter(p => p == g.original_live_path || !getAllUsedPaths().includes(p))
                                                                .map((p, i) => (
                                                                    <SelectItem key={i} value={p}>
                                                                        {pathToName(p)}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            )}
                                            {edits && (
                                                <TableCell>
                                                    <Select disabled={!g.source_path || !g.original_source_path} value={g.adjustments_path} onValueChange={v => setImportItem(i, "adjustments_path", v)}>
                                                        <SelectTrigger size="sm" className="w-full">
                                                            <SelectValue placeholder="Select item" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            {g.source_path && g.original_source_path && conflicts[selectedConflict].adjustments && (
                                                                pathToStem(g.source_path) === pathToStem(conflicts[selectedConflict].adjustments)
                                                                || pathToStem(g.original_source_path) === pathToStem(conflicts[selectedConflict].adjustments)) && (
                                                                <SelectItem value={conflicts[selectedConflict].adjustments}>
                                                                    {pathToName(conflicts[selectedConflict].adjustments)}
                                                                </SelectItem>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <Button variant="outline" size="icon-sm" className={i == 0 ? "invisible" : ""} onClick={() => removeImportGroup(i)}>
                                                    <IconMinus />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="last:border-b">
                                        <TableCell colSpan={6}>
                                            <Button variant="outline" size="sm" onClick={() => addImportGroup()}>
                                                <IconPlus className="mr-1" />
                                                Add group
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </animate.div>
                    </AnimatePresence>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" disabled={selectedConflict === 0} onClick={() => setConflict(-1)}>
                        <IconChevronLeft className="size-5" />
                    </Button>
                    <div className="flex justify-center items-center flex-1 rounded-md ring-1 ring-input">
                        <AnimatePresence initial={false} mode="popLayout">
                            <motion.p key={selectedConflict} className="text-secondary-foreground font-medium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{getConflictName(conflicts[selectedConflict])}</motion.p>
                        </AnimatePresence>
                    </div>
                    <Button variant="outline" size="icon" disabled={selectedConflict === conflicts.length - 1} onClick={() => setConflict(1)}>
                        <IconChevronRight className="size-5" />
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-secondary-foreground font-medium">For all the items not grouped:</p>
                    <Select value={ungrouped} onValueChange={v => setUngrouped(v as GroupingBehavior)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="separate">Import separately</SelectItem>
                            <SelectItem value="ignore">Do not import</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPage("review", true)}>Back</Button>
                <Button disabled={importGroups.flat().length < 1 || importGroups.flat().some(g => !g.source_path)} onClick={handleImport}>Import items</Button>
            </DialogFooter>
        </>
    );
}