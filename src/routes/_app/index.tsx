import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Add24Filled, AlbumAdd24Regular, AutoFitHeight24Regular, Delete24Regular, EyeOff24Regular, Filter24Regular, Heart16Filled, Heart16Regular, Heart24Filled, Heart24Regular, Image24Regular, Info24Regular, QuestionCircle12Regular, Share24Regular, Subtract24Filled } from "@fluentui/react-icons";
import { animate } from "@/components/animated";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@/components/ui/field";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IconBox } from "@/components/custom/IconBox";
import { Spinner } from "@/components/custom/Spinner";
import { DialogPaged, useDialogPaged } from "@/components/custom/DialogPaged";
import { getItems, addItems, setItemsFavorite } from "@/lib/invoker";
import { useNotifications } from "@/lib/useNotifications";
import { useLibrary } from "@/lib/useLibrary";
import type { Item } from "@/lib/models";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

const gridSizes = ["grid-cols-3", "grid-cols-5", "grid-cols-7", "grid-cols-9"];

function RouteComponent() {
    const [items, setItems] = useState<Item[]>([]);
    const [selected, setSelected] = useState<Item[]>([]);
    const [lastIndex, setLastIndex] = useState(-1);
    const [gridSize, setGridSize] = useState(2);
    const [squareThumb, setSquareThumb] = useState(false);
    const [openAddItems, setOpenAddItems] = useState(false);
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();

    const { isLoading, data } = useQuery({
        queryKey: ["items"],
        queryFn: () => getItems(selectedLibrary?.id ?? ""),
    });

    function handleSelect(event: React.MouseEvent<HTMLElement, MouseEvent>, index: number, item: Item) {
        const isShift = event.shiftKey;
        const isCtrlOrCmd = event.metaKey || event.ctrlKey;

        if (isShift && lastIndex !== -1) {
            const [start, end] = [lastIndex, index].sort((a, b) => a - b);
            const rangeIds = items.slice(start, end + 1);
            setSelected(prev => Array.from(new Set([...prev, ...rangeIds])));
        } else if (isCtrlOrCmd) {
            setSelected(prev => prev.includes(item) ? prev.filter(p => p.id !== item.id) : [...prev, item]);
            setLastIndex(index);
        } else {
            setSelected([item]);
            setLastIndex(index);
        }
    }

    function handleRightClick(index: number, item: Item) {
        if (selected.includes(item)) return;

        setSelected([item]);
        setLastIndex(index);
    }

    function unselectAll(event: React.MouseEvent<HTMLElement, MouseEvent>) {
        if (event.target === event.currentTarget || (event.target instanceof HTMLElement && (event.target.id === "itemGrid" || event.target.id === "toolHeader" || (!squareThumb && event.target.tagName === "DIV" && event.target.parentElement?.parentElement?.id === "itemGrid")))) {
            setSelected([]);
            setLastIndex(-1);
        }
    }

    async function setSelectedAsFavorites() {
        if (!selectedLibrary?.id) return;

        await setItemsFavorite(selectedLibrary.id, selected.map(p => p.id), !selected.every(p => p.is_favorite));
        queryClient.invalidateQueries({ queryKey: ["items"] });
    }

    useEffect(() => {
        const allItems = data?.data ?? [];
        const newSelected: Item[] = [];

        setItems(allItems);

        selected.forEach(s => {
            const newPic = allItems.find(p => p.id === s.id);
            if (newPic)
                newSelected.push(newPic);
        });

        setSelected(newSelected);
    }, [data]);

    return (
        <div className="h-screen flex flex-col flex-1 relative overflow-y-auto" onClick={unselectAll}>
            <div id="toolHeader" className="p-2 flex justify-between items-center sticky top-0 left-0 right-0 z-10 before:absolute before:inset-0 before:backdrop-blur-xs before:mask-b-from-25% before:-z-10 after:absolute after:inset-0 after:bg-background/70 after:mask-b-from-40% after:-z-20">
                <div>
                    <Button onClick={() => setOpenAddItems(true)}>
                        <Add24Filled className="size-4 mr-0.5" />
                        Import items
                    </Button>
                    <ImportDialog openDialog={openAddItems} onOpenChange={setOpenAddItems} />
                </div>
                <div className="flex gap-2">
                    <div className="p-1 flex items-center gap-1 bg-background/10 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={items.length === 0 || gridSize === 0} onClick={() => setGridSize(gridSize - 1)}>
                            <Add24Filled className="size-5" />
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={items.length === 0 || gridSize === gridSizes.length - 1} onClick={() => setGridSize(gridSize + 1)}>
                            <Subtract24Filled className="size-5" />
                        </Button>
                    </div>
                    <div className="p-1 flex items-center gap-1 bg-background/10 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={items.length === 0} onClick={() => setSquareThumb(!squareThumb)}>
                            <AutoFitHeight24Regular className="size-5" />
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={items.length === 0}>
                            <Filter24Regular className="size-5" />
                        </Button>
                    </div>
                    <div className="p-1 flex items-center gap-1 bg-background/10 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={selected.length === 0} onClick={setSelectedAsFavorites}>
                            {selected.length !== 0 && selected.every(p => p.is_favorite) ? <Heart24Filled className="size-5" /> : <Heart24Regular className="size-5" />}
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={selected.length === 0}>
                            <AlbumAdd24Regular className="size-5" />
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={selected.length === 0}>
                            <Share24Regular className="size-5" />
                        </Button>
                    </div>
                </div>
            </div>
            <div id="itemGrid" className={`w-full min-h-0 p-2 pt-14 ${!isLoading && items.length > 0 ? "grid gap-1" : "h-full flex justify-center items-center"} ${gridSizes[gridSize]} absolute`}>
                {isLoading && <GridLoading />}
                {items.length > 0 ? items.map((p, i) => (
                    <ContextMenu key={p.id}>
                        <ContextMenuTrigger className="contents">
                            <GridItem
                                item={p}
                                square={squareThumb}
                                selected={!!selected.find(s => s.id === p.id)}
                                onClick={e => handleSelect(e, i, p)}
                                onContextMenu={() => handleRightClick(i, p)}
                            />
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem>
                                <Info24Regular className="size-4.5" />
                                Info
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={setSelectedAsFavorites}>
                                {selected.length !== 0 && selected.every(p => p.is_favorite) ? (
                                    <>
                                        <Heart24Filled className="size-4.5" />
                                        Unfavorite
                                    </>
                                ) : (
                                    <>
                                        <Heart24Regular className="size-4.5" />
                                        Favorite
                                    </>
                                )}
                                {selected.length > 1 && ` ${selected.length} items`}
                            </ContextMenuItem>
                            <ContextMenuItem>
                                <Share24Regular className="size-4.5" />
                                Export
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem>
                                <EyeOff24Regular className="size-4.5" />
                                Hide
                                {selected.length > 1 && ` ${selected.length} items`}
                            </ContextMenuItem>
                            <ContextMenuItem>
                                <Delete24Regular className="size-4.5" />
                                Delete
                                {selected.length > 1 && ` ${selected.length} items`}
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                )) : <GridEmpty onAdd={() => setOpenAddItems(true)} />}
            </div>
        </div>
    );
}

function GridLoading() {
    return (
        <div className="flex items-center gap-x-6">
            <IconBox size="medium">
                <Spinner />
            </IconBox>
            <h1 className="text-xl font-bold">Loading items</h1>
        </div>
    );
}

function GridEmpty({ onAdd }: { onAdd: () => unknown }) {
    return (
        <CenterLayout>
            <IconBox className="mb-4">
                <Info24Regular />
            </IconBox>
            <animate.h1 className="text-xl font-bold" delay={0.3}>Empty library</animate.h1>
            <animate.p className="text-muted-foreground" delay={0.45}>Your library is currently empty, try adding some items/videos and fill it with memories!</animate.p>
            <animate.div className="w-full mt-2 flex justify-center" delay={0.6}>
                <Button onClick={onAdd}>Import items</Button>
            </animate.div>
        </CenterLayout>
    );
}

interface GridItemProps {
    item: Item;
    selected: boolean;
    square: boolean;
    onClick?: React.MouseEventHandler<HTMLElement>;
    onContextMenu?: React.MouseEventHandler<HTMLElement>;
}

function GridItem({ item, selected, square, onClick, onContextMenu }: GridItemProps) {
    const [error, setError] = useState(false);
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();

    const horizontal = !square ? item.width > item.height : item.width < item.height;
    const itemContainerStyles = {
        normal: `${horizontal ? "w-full" : "h-full"} flex justify-center items-center ${!square ? "relative" : ""} rounded-sm ${selected && !square ? "ring-3 ring-primary ring-offset-3 ring-offset-background" : ""} group overflow-hidden transition-[box-shadow]`,
        error: `size-full flex flex-col justify-center items-center ${!square ? "relative" : ""} gap-1 bg-muted rounded-sm ${selected && !square ? "ring-3 ring-primary ring-offset-3 ring-offset-background" : ""} group transition-[box-shadow]`,
    };

    function setItemFavorite(e: React.MouseEvent<HTMLElement, MouseEvent>) {
        if (!selectedLibrary?.id) return;

        e.stopPropagation();
        setItemsFavorite(selectedLibrary.id, [item.id], !item.is_favorite);
        queryClient.invalidateQueries({ queryKey: ["items"] });
    }

    return (
        <div className={`h-full ${!square ? "p-2" : "relative"} flex justify-center items-center rounded-sm overflow-hidden aspect-square transition-[padding] duration-200 before:absolute before:inset-0 before:rounded-sm ${selected && square ? "before:border-3 before:border-primary before:inset-ring-2 before:inset-ring-background" : "before:border-transparent before:inset-ring-transparent"} before:pointer-events-none before:transition-[border,box-shadow] before:z-1`}>
            <div className={itemContainerStyles[!error ? "normal" : "error"]} onClick={onClick} onContextMenu={onContextMenu}>
                {!error ? (
                    <img
                        src={convertFileSrc(selectedLibrary?.path + "/thumbnails/" + item.id + ".webp")}
                        className={`${horizontal ? "w-full" : "h-full"} max-w-[unset]`}
                        onError={() => setError(true)}
                    />
                ) : (
                    <>
                        <p className="text-2xl">{item.file_type.startsWith("image/") ? item.file_type !== "image/gif" ? "📸" : "👾" : "🎥"}</p>
                        <p className="text-xs text-muted-foreground font-medium">{(/^[\s\S]+(?=\.)|^[\s\S]+$/g.exec(item.original_name) ?? [])[0]}</p>
                    </>
                )}
                <button className={`size-4.25 flex absolute bottom-1.25 left-1.25 ${!item.is_favorite ? "opacity-0 group-hover:opacity-100" : ""} drop-shadow-favorite transition-opacity *:size-full`} onClick={setItemFavorite}>
                    {!item.is_favorite ? <Heart16Regular /> : <Heart16Filled />}
                </button>
            </div>
        </div>
    );
}

interface ImportOptions {
    livePhotos: boolean;
    deleteImported: boolean;
    ignoreImported: boolean;
}

function ImportDialog({ openDialog, onOpenChange }: { openDialog: boolean; onOpenChange: (open: boolean) => void }) {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    async function importItems(opts: ImportOptions) {
        if (!selectedLibrary) return;

        onOpenChange(false);
        pushNoti("Importing items", "Importing " + selectedItems.length + " items", "promise", {
            promise: addItems(selectedLibrary.id, selectedItems, opts.deleteImported),
            peek: "Importing " + selectedItems.length + " items",
            success: { title: "Import success", description: selectedItems.length + " items added successfully" },
            error: { title: "Error importing", description: "An error occurred while importing the selected items" },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
        });
    }

    return (
        <DialogPaged
            pages={{
                source: {
                    height: 332,
                    node: <SourcePage onItemsSelected={setSelectedItems} />,
                },
                review: {
                    height: 418,
                    node: <ReviewPage selectedItems={selectedItems} onImport={importItems} />,
                },
            }}
            defaultPage="source"
            open={openDialog}
            onOpenChange={onOpenChange}
            onPageSwitch={() => setSelectedItems([])}
        />
    );
}

function SourcePage({ onItemsSelected }: { onItemsSelected: (items: string[]) => void }) {
    const [selectedSource, setSelectedSource] = useState(0);
    const { close, setPage } = useDialogPaged();
    const { pushNoti } = useNotifications();

    async function next() {
        if (selectedSource === 0) {
            setPage("review");

            try {
                await new Promise(resolve => setTimeout(resolve, 600));

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
                    ],
                });

                if (selected && selected.length)
                    onItemsSelected(selected);
                else
                    setPage("source", true);
            } catch (err) {
                console.error(err);
                pushNoti("Import error", "Failed to open the system file dialog", "error");
                setPage("source", true);
            }
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
                    <RadioGroup defaultValue="computer" value={selectedSource.toString()} onValueChange={e => setSelectedSource(+e)}>
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

function ReviewPage({ selectedItems, onImport }: { selectedItems: string[]; onImport: (opts: ImportOptions) => void }) {
    const [livePhotos, setLivePhotos] = useState(false);
    const [deleteImported, setDeleteImported] = useState(false);
    const [ignoreImported, setIgnoreImported] = useState(false);
    const { setPage } = useDialogPaged();

    return (
        <>
            <DialogHeader>
                <DialogTitle>Review selection</DialogTitle>
                <DialogDescription>Review the items you&apos;re about to import</DialogDescription>
            </DialogHeader>
            <div className="w-full p-3 flex items-center gap-4 bg-muted rounded-2xl">
                <IconBox size="small" fixed>
                    {selectedItems.length ? <Image24Regular /> : <Spinner />}
                </IconBox>
                <p className="font-semibold text-foreground/80">{selectedItems.length ? selectedItems.length + " items selected" : "Select items to import..."}</p>
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
                                <TooltipTrigger asChild>
                                    <QuestionCircle12Regular className="size-4.5 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>If a photo and a video are present on the same folder<br />with the same name, both will be imported as a live photo</p>
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
                <Button disabled={!selectedItems.length} onClick={() => onImport({ livePhotos, deleteImported, ignoreImported })}>Import items</Button>
            </DialogFooter>
        </>
    );
}