import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { IconHelpCircle, IconPhotoVideo } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DialogPaged, useDialogPaged } from "@/components/custom/DialogPaged";
import { IconBox } from "@/components/custom/IconBox";
import { verifyConflicts, addItems } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { unwrapResult } from "@/lib/utils";
import type { Conflict, ImportItem } from "@/lib/models";

interface ImportOptions {
    livePhotos: boolean;
    edits: boolean;
    deleteImported: boolean;
    ignoreImported: boolean;
}

export function ImportItemsDialog({ openDialog, onOpenChange }: { openDialog: boolean; onOpenChange: (open: boolean) => void }) {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [finalItems, setFinalItems] = useState<ImportItem[]>([]);
    const queryClient = useQueryClient();
    const { selectedLibrary } = useLibrary();
    const { pushNoti, progressNoti } = useNotifications();

    async function handleImportRequest(opts: ImportOptions, setPage: (page: string) => unknown) {
        if (!selectedLibrary) return;

        if (opts.livePhotos || opts.edits) {
            const { data: result, error } = await verifyConflicts({
                sourcePaths: selectedItems,
                checkLivePhotos: opts.livePhotos,
                parseEdits: opts.edits,
            });

            if (error || !result) {
                pushNoti("Scan Error", "Failed to scan files", "error");
                return;
            }

            if (result.conflicts.length > 0) {
                setFinalItems(result.items_to_import);
                setConflicts(result.conflicts);
                setPage("conflicts");
            } else
                importItems(result.items_to_import, opts.deleteImported);
        } else {
            const items = selectedItems.map(p => ({
                source_path: p,
                live_video_path: null,
            }) as ImportItem);

            importItems(items, opts.deleteImported);
        }
    }

    async function importItems(items: ImportItem[], deleteImported: boolean) {
        if (!selectedLibrary) return;

        onOpenChange(false);

        const promise = unwrapResult(addItems({ libraryId: selectedLibrary.id, items, deleteSource: deleteImported }));

        const importNoti = pushNoti("Importing items", "Importing " + items.length + " items", "promise", {
            promise,
            hasProgress: true,
            peek: "Importing " + items.length + " items",
            success: () => ({ title: "Import success", description: items.length + " items added successfully" }),
            error: e => ({ title: "Error importing", description: "An error occurred while importing the selected items: " + e }),
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
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
                loading: {
                    height: 304,
                    closeable: false,
                    node: <LoadingPage onItemsSelected={setSelectedItems} />,
                },
                review: {
                    height: 473,
                    node: <ReviewPage selectedItems={selectedItems} onStartImport={handleImportRequest} />,
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
            setPage("loading");
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
                <Button onClick={next}>Next</Button>
            </DialogFooter>
        </>
    );
}

function LoadingPage({ onItemsSelected }: { onItemsSelected: (items: string[]) => unknown }) {
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

function ReviewPage({ selectedItems, onStartImport }: { selectedItems: string[]; onStartImport: (opts: ImportOptions, setPage: (p: string) => void) => void }) {
    const [livePhotos, setLivePhotos] = useState(false);
    const [edits, setEdits] = useState(false);
    const [deleteImported, setDeleteImported] = useState(false);
    const [ignoreImported, setIgnoreImported] = useState(false);
    const { setPage } = useDialogPaged();

    return (
        <>
            <DialogHeader>
                <DialogTitle>Review selection</DialogTitle>
                <DialogDescription>Review the items you&apos;re about to import</DialogDescription>
            </DialogHeader>
            <div className="w-full p-3 flex items-center gap-3 bg-foreground/3 rounded-lg ring-1 ring-input">
                <IconBox size="small">
                    <IconPhotoVideo />
                </IconBox>
                <p className="font-semibold text-foreground/80">{selectedItems.filter(p => !p.toLowerCase().endsWith(".aae")).length + " items selected"}</p>
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
                                <TooltipContent className="max-w-xs">
                                    Automatically detects and groups edited photos (IMG_Exxxx) with their originals (IMG_xxxx). The original photo will be preserved as well as the adjustments file (.aae) if one is selected.
                                </TooltipContent>
                            </Tooltip>
                        </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox id="optionDeleteImport" checked={deleteImported} onCheckedChange={e => setDeleteImported(!!e)} />
                        <FieldLabel htmlFor="optionDeleteImport">Delete originals after import</FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox id="optionIgnoreImported" checked={ignoreImported} onCheckedChange={e => setIgnoreImported(!!e)} />
                        <FieldLabel htmlFor="optionIgnoreImported">Ignore already imported items</FieldLabel>
                    </Field>
                </FieldGroup>
            </FieldSet>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPage("source", true)}>Back</Button>
                <Button disabled={!selectedItems.length} onClick={() => onStartImport({ livePhotos, edits, deleteImported, ignoreImported }, setPage)}>Import items</Button>
            </DialogFooter>
        </>
    );
}