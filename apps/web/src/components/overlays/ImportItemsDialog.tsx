import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconChevronLeft, IconChevronRight, IconHelpCircle, IconMinus, IconPhotoVideo, IconPlus } from "@tabler/icons-react";
import { Button } from "@project-chroma/ui/button";
import { Checkbox } from "@project-chroma/ui/checkbox";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@project-chroma/ui/dialog";
import { Spinner } from "@project-chroma/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@project-chroma/ui/tooltip";
import { extToMime, uint8ToBase64 } from "@project-chroma/utils";
import { DialogPaged, useDialogPaged } from "@/components/DialogPaged";
import { IconBox } from "@/components/IconBox";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useSettings } from "@/lib/useSettings";
import type { ConflictGroup, ImportItem } from "@project-chroma/contracts/gallery";

interface ImportItemsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
}

export function ImportItemsDialog({ open, onOpenChange }: ImportItemsDialogProps) {
    const { settings, updateSettings } = useSettings();
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [livePhotos, setLivePhotos] = useState(settings.importOptions.livePhotos);
    const [edits, setEdits] = useState(settings.importOptions.edits);
    const [conflicts, setConflicts] = useState<ConflictGroup[]>([]);
    const [finalItems, setFinalItems] = useState<ImportItem[]>([]);
    const [deleteImported, setDeleteImported] = useState(false);
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();
    const { progressNoti, pushNoti } = useNotifications();

    async function handleImportRequest(setPage: (page: string) => unknown) {
        if (!selectedLibrary) return;

        const { data: result, error } = await window.chroma!.items.verifyConflicts({
            sourcePaths: selectedItems,
            checkLivePhotos: livePhotos,
            parseEdits: edits,
        });

        if (error || !result) {
            pushNoti({
                title: "Scan Error",
                description: "Failed to scan files",
                type: "error",
            });
            return;
        }

        setDeleteImported(deleteImported);

        if (result.conflicts.length > 0) {
            setFinalItems(result.itemsToImport);
            setConflicts(result.conflicts);
            setPage("conflicts");
        } else importItems(result.itemsToImport);
    }

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
            onSuccess: () => queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "items"] }),
        });

        const unlisten = window.chroma.on<number>("import-progress", payload => {
            progressNoti(importNoti, payload / items.length);
        });

        promise.finally(unlisten);
    }

    return (
        <DialogPaged
            pages={{
                source: {
                    height: 319,
                    node: <SourcePage />,
                },
                select: {
                    height: 280,
                    closeable: false,
                    node: <SelectPage onItemsSelected={setSelectedItems} />,
                },
                review: {
                    height: 442,
                    node: (
                        <ReviewPage
                            selectedItems={selectedItems}
                            livePhotos={livePhotos}
                            setLivePhotos={setLivePhotos}
                            edits={edits}
                            setEdits={setEdits}
                            deleteImported={deleteImported}
                            setDeleteImported={setDeleteImported}
                            onStartImport={handleImportRequest}
                        />
                    ),
                },
            }}
            defaultPage="source"
            open={open}
            onOpenChange={onOpenChange}
        />
    );
}

function SourcePage() {
    const [selectedSource, setSelectedSource] = useState(0);
    const { close, setPage } = useDialogPaged();

    async function next() {
        if (selectedSource === 0) setPage("select");
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
                <Button variant="outline" onClick={close}>
                    Cancel
                </Button>
                <Button className="w-20" onClick={next}>
                    Next
                </Button>
            </DialogFooter>
        </>
    );
}

function SelectPage({ onItemsSelected }: { onItemsSelected: (items: string[]) => unknown }) {
    const { setPage } = useDialogPaged();
    const { pushNoti } = useNotifications();

    useEffect(() => {
        if (!window.chroma) {
            setPage("source", true);
            return;
        }

        try {
            window.chroma
                .openDialog({
                    multiple: true,
                    filters: [
                        {
                            name: "Photos, Videos and Adjustments",
                            extensions: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "mp4", "mov", "avi", "aae"],
                        },
                    ],
                })
                .then(({ data: selected }) => {
                    if (Array.isArray(selected) && selected.filter(p => !p.toLowerCase().endsWith(".aae")).length) {
                        onItemsSelected(selected);
                        setPage("review");
                    } else setPage("source", true);
                });
        } catch (err) {
            console.error(err);
            pushNoti({
                title: "Import error",
                description: "Failed to open the system file dialog",
                type: "error",
            });
            setPage("source", true);
        }
    }, []);

    return (
        <div className="w-full h-64 flex flex-col justify-center items-center">
            <IconBox className="mb-4">
                <Spinner />
            </IconBox>
            <h1 className="text-xl font-bold">Loading items</h1>
        </div>
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
    const ext = /\w+$/.exec(path);
    const isError = !ext || ext.length === 0;

    if (isPending) return <Spinner className="size-6 text-muted-foreground" />;
    if (!thumb || error || isError) return <IconPhotoVideo className="size-6 text-muted-foreground" />;

    return <img src={"data:" + extToMime(ext[0]) + ";base64," + uint8ToBase64(thumb)} className="size-full object-cover" alt="Preview" />;
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
    const mediaItems = selectedItems.filter(p => !p.toLowerCase().endsWith(".aae"));

    return (
        <>
            <DialogHeader>
                <DialogTitle>Review selection</DialogTitle>
                <DialogDescription>Review the items you&apos;re about to import</DialogDescription>
            </DialogHeader>
            <div className="w-full p-3 flex items-center gap-4 bg-muted/40 rounded-xl ring ring-input">
                {mediaItems.length > 0 ? (
                    <div className="size-12 flex items-center relative">
                        {mediaItems.slice(0, 3).map((path, index) => (
                            <div
                                key={path}
                                className="size-12 flex justify-center items-center absolute bg-muted rounded-lg shadow-lg inset-ring inset-ring-input/75 overflow-hidden"
                                style={{
                                    zIndex: 3 - index,
                                    transform: `rotate(${index === 0 ? 0 : index === 1 ? 22 : -14}deg)`,
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
                <p className="text-secondary-foreground font-semibold">{mediaItems.length + " items selected"}</p>
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
                                <TooltipContent>When a photo and a video are both selected and present on the same folder with the same name, they will be imported as a live photo</TooltipContent>
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
                                    Automatically detects and groups edited photos (IMG_Exxxx) with their originals (IMG_xxxx). The original photo will be preserved as well as the adjustments file
                                    (.aae) if one is selected.
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
                <Button variant="outline" onClick={() => setPage("source", true)}>
                    Back
                </Button>
                <Button disabled={!selectedItems.length} onClick={() => onStartImport(setPage)}>
                    Import items
                </Button>
            </DialogFooter>
        </>
    );
}
