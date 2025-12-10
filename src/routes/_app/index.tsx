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
import { getPhotos, addPhoto, setPhotosFavorite } from "@/lib/invoker";
import { useNotifications } from "@/lib/useNotifications";
import { useLibrary } from "@/lib/useLibrary";
import type { Photo } from "@/lib/models";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

const gridSizes = ["grid-cols-3", "grid-cols-5", "grid-cols-7", "grid-cols-9"];

function RouteComponent() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selected, setSelected] = useState<Photo[]>([]);
    const [lastIndex, setLastIndex] = useState(-1);
    const [gridSize, setGridSize] = useState(2);
    const [squareThumb, setSquareThumb] = useState(false);
    const [openAddPhotos, setOpenAddPhotos] = useState(false);
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();

    const { isLoading, data } = useQuery({
        queryKey: ["photos"],
        queryFn: () => getPhotos(selectedLibrary?.id ?? ""),
    });

    function handleSelect(event: React.MouseEvent<HTMLElement, MouseEvent>, index: number, photo: Photo) {
        const isShift = event.shiftKey;
        const isCtrlOrCmd = event.metaKey || event.ctrlKey;

        if (isShift && lastIndex !== -1) {
            const [start, end] = [lastIndex, index].sort((a, b) => a - b);
            const rangeIds = photos.slice(start, end + 1);
            setSelected(prev => Array.from(new Set([...prev, ...rangeIds])));
        } else if (isCtrlOrCmd) {
            setSelected(prev => prev.includes(photo) ? prev.filter(p => p.id !== photo.id) : [...prev, photo]);
            setLastIndex(index);
        } else {
            setSelected([photo]);
            setLastIndex(index);
        }
    }

    function handleRightClick(index: number, photo: Photo) {
        if (selected.includes(photo)) return;

        setSelected([photo]);
        setLastIndex(index);
    }

    function unselectAll(event: React.MouseEvent<HTMLElement, MouseEvent>) {
        if (event.target === event.currentTarget || (event.target instanceof HTMLElement && (event.target.id === "photoGrid" || event.target.id === "toolHeader" || (!squareThumb && event.target.tagName === "DIV" && event.target.parentElement?.parentElement?.id === "photoGrid")))) {
            setSelected([]);
            setLastIndex(-1);
        }
    }

    async function setSelectedAsFavorites() {
        if (!selectedLibrary?.id) return;

        await setPhotosFavorite(selectedLibrary.id, selected.map(p => p.id), !selected.every(p => p.is_favorite));
        queryClient.invalidateQueries({ queryKey: ["photos"] });
    }

    useEffect(() => {
        const allPhotos = data?.data ?? [];
        const newSelected: Photo[] = [];

        setPhotos(allPhotos);

        selected.forEach(s => {
            const newPic = allPhotos.find(p => p.id === s.id);
            if (newPic)
                newSelected.push(newPic);
        });

        setSelected(newSelected);
    }, [data]);

    return (
        <div className="h-screen flex flex-col flex-1 relative overflow-y-auto" onClick={unselectAll}>
            <div id="toolHeader" className="p-2 flex justify-between items-center sticky top-0 left-0 right-0 z-10 before:absolute before:inset-0 before:backdrop-blur-xs before:mask-b-from-25% before:-z-10 after:absolute after:inset-0 after:bg-background/70 after:mask-b-from-40% after:-z-20">
                <div>
                    <Button onClick={() => setOpenAddPhotos(true)}>
                        <Add24Filled className="size-4 mr-0.5" />
                        Add photos
                    </Button>
                    <AddPhotosDialog openDialog={openAddPhotos} onOpenChange={setOpenAddPhotos} />
                </div>
                <div className="flex gap-2">
                    <div className="p-1 flex items-center gap-1 bg-background/10 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={photos.length === 0 || gridSize === 0} onClick={() => setGridSize(gridSize - 1)}>
                            <Add24Filled className="size-5" />
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={photos.length === 0 || gridSize === gridSizes.length - 1} onClick={() => setGridSize(gridSize + 1)}>
                            <Subtract24Filled className="size-5" />
                        </Button>
                    </div>
                    <div className="p-1 flex items-center gap-1 bg-background/10 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={photos.length === 0} onClick={() => setSquareThumb(!squareThumb)}>
                            <AutoFitHeight24Regular className="size-5" />
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={photos.length === 0}>
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
            <div id="photoGrid" className={`w-full min-h-0 p-2 pt-14 ${!isLoading && photos.length > 0 ? "grid gap-1" : "h-full flex justify-center items-center"} ${gridSizes[gridSize]} absolute`}>
                {isLoading && <GridLoading />}
                {photos.length > 0 ? photos.map((p, i) => (
                    <ContextMenu key={p.id}>
                        <ContextMenuTrigger className="contents">
                            <PhotoItem
                                photo={p}
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
                )) : <GridEmpty onAdd={() => setOpenAddPhotos(true)} />}
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
            <h1 className="text-xl font-bold">Loading photos</h1>
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
            <animate.p className="text-muted-foreground" delay={0.45}>Your library is currently empty, try adding some photos and fill it with memories!</animate.p>
            <animate.div className="w-full mt-2 flex justify-center" delay={0.6}>
                <Button onClick={onAdd}>Add photos</Button>
            </animate.div>
        </CenterLayout>
    );
}

interface PhotoItemProps {
    photo: Photo;
    selected: boolean;
    square: boolean;
    onClick?: React.MouseEventHandler<HTMLElement>;
    onContextMenu?: React.MouseEventHandler<HTMLElement>;
}

function PhotoItem({ photo, selected, square, onClick, onContextMenu }: PhotoItemProps) {
    const [error, setError] = useState(false);
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();

    const horizontal = !square ? photo.width > photo.height : photo.width < photo.height;
    const photoContainerStyles = {
        normal: `${horizontal ? "w-full" : "h-full"} flex justify-center items-center ${!square ? "relative" : ""} rounded-sm ${selected && !square ? "ring-3 ring-primary ring-offset-3 ring-offset-background" : ""} group overflow-hidden transition-[box-shadow]`,
        error: `size-full flex flex-col justify-center items-center ${!square ? "relative" : ""} gap-1 bg-muted rounded-sm ${selected && !square ? "ring-3 ring-primary ring-offset-3 ring-offset-background" : ""} group transition-[box-shadow]`,
    };

    function setPhotoFavorite(e: React.MouseEvent<HTMLElement, MouseEvent>) {
        if (!selectedLibrary?.id) return;

        e.stopPropagation();
        setPhotosFavorite(selectedLibrary.id, [photo.id], !photo.is_favorite);
        queryClient.invalidateQueries({ queryKey: ["photos"] });
    }

    return (
        <div className={`h-full ${!square ? "p-2" : "relative"} flex justify-center items-center rounded-sm overflow-hidden aspect-square transition-[padding] duration-200 before:absolute before:inset-0 before:rounded-sm ${selected && square ? "before:border-3 before:border-primary before:inset-ring-2 before:inset-ring-background" : "before:border-transparent before:inset-ring-transparent"} before:pointer-events-none before:transition-[border,box-shadow] before:z-1`}>
            <div className={photoContainerStyles[!error ? "normal" : "error"]} onClick={onClick} onContextMenu={onContextMenu}>
                {!error ? (
                    <img
                        src={convertFileSrc(selectedLibrary?.path + "/thumbnails/" + photo.id + ".webp")}
                        className={`${horizontal ? "w-full" : "h-full"} max-w-[unset]`}
                        onError={() => setError(true)}
                    />
                ) : (
                    <>
                        <p className="text-2xl">{photo.file_type.startsWith("image/") ? photo.file_type !== "image/gif" ? "📸" : "👾" : "🎥"}</p>
                        <p className="text-xs text-muted-foreground font-medium">{(/^[\s\S]+(?=\.)|^[\s\S]+$/g.exec(photo.original_name) ?? [])[0]}</p>
                    </>
                )}
                <button className={`size-4.25 flex absolute bottom-1.25 left-1.25 ${!photo.is_favorite ? "opacity-0 group-hover:opacity-100" : ""} drop-shadow-favorite transition-opacity *:size-full`} onClick={setPhotoFavorite}>
                    {!photo.is_favorite ? <Heart16Regular /> : <Heart16Filled />}
                </button>
            </div>
        </div>
    );
}

function AddPhotosDialog({ openDialog, onOpenChange }: { openDialog: boolean; onOpenChange: (open: boolean) => void }) {
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    // TODO: Improve performance by adding photos in batches
    function addPhotos() {
        if (!selectedLibrary) return;

        const promises: Promise<unknown>[] = [];

        for (const file of selectedPhotos)
            promises.push(addPhoto(selectedLibrary.id, file));

        onOpenChange(false);
        pushNoti("Importing items", "Importing " + selectedPhotos.length + " photos/videos", "promise", {
            promise: Promise.all(promises),
            peek: "Importing " + selectedPhotos.length + " items",
            success: { title: "Import success", description: selectedPhotos.length + " items added successfully" },
            error: { title: "Error importing", description: "An error occurred while importing the selected items" },
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ["photos"] }),
        });
    }

    return (
        <DialogPaged
            pages={{
                source: {
                    height: 332,
                    node: <SourcePage onPhotosSelected={setSelectedPhotos} />,
                },
                review: {
                    height: 418,
                    node: <ReviewPage selectedPhotos={selectedPhotos} onAdd={addPhotos} />,
                },
            }}
            defaultPage="source"
            open={openDialog}
            onOpenChange={onOpenChange}
            onPageSwitch={() => setSelectedPhotos([])}
        />
    );
}

function SourcePage({ onPhotosSelected }: { onPhotosSelected: (photos: string[]) => void }) {
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
                    onPhotosSelected(selected);
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
                <DialogTitle>Add photos</DialogTitle>
                <DialogDescription>Select the origin of the photos you want to add</DialogDescription>
            </DialogHeader>
            <FieldSet>
                <FieldGroup>
                    <RadioGroup defaultValue="computer" value={selectedSource.toString()} onValueChange={e => setSelectedSource(+e)}>
                        <FieldLabel htmlFor="computer">
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldTitle>This computer</FieldTitle>
                                    <FieldDescription>Select photos present on this computer</FieldDescription>
                                </FieldContent>
                                <RadioGroupItem value="0" id="computer" />
                            </Field>
                        </FieldLabel>
                        <FieldLabel htmlFor="ios">
                            <Field orientation="horizontal">
                                <FieldContent>
                                    <FieldTitle>iPhone/iPad</FieldTitle>
                                    <FieldDescription>Import photos from your iPhone or iPad</FieldDescription>
                                </FieldContent>
                                <RadioGroupItem value="1" id="ios" />
                            </Field>
                        </FieldLabel>
                    </RadioGroup>
                </FieldGroup>
            </FieldSet>
            <DialogFooter>
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button onClick={next}>Add photos</Button>
            </DialogFooter>
        </>
    );
}

function ReviewPage({ selectedPhotos, onAdd }: { selectedPhotos: string[]; onAdd: () => void }) {
    const { setPage } = useDialogPaged();

    return (
        <>
            <DialogHeader>
                <DialogTitle>Review photos</DialogTitle>
                <DialogDescription>Review the photos you&apos;re about to add</DialogDescription>
            </DialogHeader>
            <div className="w-full p-3 flex items-center gap-4 bg-muted rounded-2xl">
                <IconBox size="small" fixed>
                    {selectedPhotos.length ? <Image24Regular /> : <Spinner />}
                </IconBox>
                <p className="font-semibold text-foreground/80">{selectedPhotos.length ? selectedPhotos.length + " items selected" : "Select items to import..."}</p>
            </div>
            <FieldSeparator />
            <FieldSet>
                <FieldLegend variant="label">Import Options</FieldLegend>
                <FieldDescription>Customize the way items are imported</FieldDescription>
                <FieldGroup className="gap-3">
                    <Field orientation="horizontal">
                        <Checkbox id="optionLivePhotos" />
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
                        <Checkbox id="optionDeleteImport" />
                        <FieldLabel htmlFor="optionDeleteImport">Delete originals after import</FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox id="optionIgnoreImported" />
                        <FieldLabel htmlFor="optionIgnoreImported">Ignore already imported items</FieldLabel>
                    </Field>
                </FieldGroup>
            </FieldSet>
            <DialogFooter>
                <Button variant="outline" onClick={() => setPage("source", true)}>Back</Button>
                <Button disabled={!selectedPhotos.length} onClick={onAdd}>Add photos</Button>
            </DialogFooter>
        </>
    );
}