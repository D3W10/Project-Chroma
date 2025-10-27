import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Add24Filled, AlbumAdd24Regular, AutoFitHeight24Regular, Delete24Regular, EyeOff24Regular, Filter24Regular, Heart24Regular, Info24Regular, Share24Regular, Subtract24Filled } from "@fluentui/react-icons";
import { animate } from "@/components/animated";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldTitle } from "@/components/ui/field";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { IconBox } from "@/components/custom/IconBox";
import { getPhotos, addPhoto } from "@/lib/invoker";
import { useNotifications } from "@/lib/useNotifications";
import { useLibrary } from "@/lib/useLibrary";
import type { Photo } from "@/lib/models";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

const gridSizes = ["grid-cols-3", "grid-cols-5", "grid-cols-7", "grid-cols-9"];

function RouteComponent() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [lastIndex, setLastIndex] = useState(-1);
    const [gridSize, setGridSize] = useState(2);
    const [squareThumb, setSquareThumb] = useState(false);
    const [openAddPhotos, setOpenAddPhotos] = useState(false);
    const [selectedSource, setSelectedSource] = useState(0);
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ["photos"],
        queryFn: () => getPhotos(selectedLibrary?.id ?? ""),
    });

    async function handleAddPhotos() {
        if (selectedSource === 0) {
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
                    ],
                });

                if (selected && selectedLibrary) {
                    for (const file of selected)
                        addPhoto(selectedLibrary.id, file);

                    queryClient.invalidateQueries({ queryKey: ["photos"] });
                    pushNoti("Import success", selected.length + " photos were added successfully!", "success");
                }
            } catch (err) {
                console.error(err);
                pushNoti("Import error", "Failed to open the system file dialog", "error");
            }
        }
    }

    function handleSelect(event: React.MouseEvent<HTMLElement, MouseEvent>, index: number, photoId: string) {
        const isShift = event.shiftKey;
        const isCtrlOrCmd = event.metaKey || event.ctrlKey;

        if (isShift && lastIndex !== -1) {
            const [start, end] = [lastIndex, index].sort((a, b) => a - b);
            const rangeIds = photos.slice(start, end + 1).map(p => p.id);
            setSelected(prev => Array.from(new Set([...prev, ...rangeIds])));
        } else if (isCtrlOrCmd) {
            setSelected(prev => prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]);
            setLastIndex(index);
        } else {
            setSelected([photoId]);
            setLastIndex(index);
        }
    }

    function handleRightClick(index: number, photoId: string) {
        if (selected.includes(photoId)) return;

        setSelected([photoId]);
        setLastIndex(index);
    }

    function unselectAll(event: React.MouseEvent<HTMLElement, MouseEvent>) {
        if (event.target === event.currentTarget || (event.target instanceof HTMLElement && (event.target.id === "photoGrid" || (!squareThumb && event.target.tagName === "DIV" && event.target.parentElement?.parentElement?.id === "photoGrid")))) {
            setSelected([]);
            setLastIndex(-1);
        }
    }

    useEffect(() => {
        setPhotos(data?.data ?? []);
    }, [data]);

    return (
        <div className="h-screen flex flex-col flex-1 relative overflow-y-auto" onClick={unselectAll}>
            <div className="p-2 flex justify-between items-center sticky top-0 left-0 right-0 z-10 before:absolute before:inset-0 before:backdrop-blur-xs before:mask-b-from-25% before:-z-10 after:absolute after:inset-0 after:bg-background/70 after:mask-b-from-40% after:-z-20">
                <div>
                    <Button onClick={() => setOpenAddPhotos(true)}>
                        <Add24Filled className="size-4 mr-0.5" />
                        Add photos
                    </Button>
                    <Dialog open={openAddPhotos} onOpenChange={setOpenAddPhotos}>
                        <DialogContent>
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
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setOpenAddPhotos(false)}>Cancel</Button>
                                <Button onClick={handleAddPhotos}>Add photos</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="flex gap-2">
                    <div className="p-1 flex items-center gap-1 bg-background/10 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={gridSize === 0} onClick={() => setGridSize(gridSize - 1)}>
                            <Add24Filled className="size-5" />
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={gridSize === gridSizes.length - 1} onClick={() => setGridSize(gridSize + 1)}>
                            <Subtract24Filled className="size-5" />
                        </Button>
                    </div>
                    <div className="p-1 flex items-center gap-1 bg-background/10 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" onClick={() => setSquareThumb(!squareThumb)}>
                            <AutoFitHeight24Regular className="size-5" />
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10">
                            <Filter24Regular className="size-5" />
                        </Button>
                    </div>
                    <div className="p-1 flex items-center gap-1 bg-background/10 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" className="enabled:hover:bg-foreground/10" disabled={selected.length === 0}>
                            <Heart24Regular className="size-5" />
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
            <div id="photoGrid" className={`w-full min-h-0 p-2 pt-14 ${photos.length > 0 ? "grid gap-1" : "h-full flex justify-center items-center"} ${gridSizes[gridSize]} absolute`}>
                {photos.length > 0 ? photos.map((p, i) => (
                    <PhotoItem photo={p} square={squareThumb} selected={selected.includes(p.id)} onClick={e => handleSelect(e, i, p.id)} onContextMenu={() => handleRightClick(i, p.id)} key={p.id} />
                )) : <GridEmpty onAdd={() => setOpenAddPhotos(true)} />}
            </div>
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

function PhotoItem({ photo, selected, square, onClick, onContextMenu }: { photo: Photo; selected: boolean; square: boolean; onClick?: React.MouseEventHandler<HTMLElement>; onContextMenu?: React.MouseEventHandler<HTMLElement> }) {
    const [error, setError] = useState(false);
    const { selectedLibrary } = useLibrary();

    const horizontal = !square ? photo.width > photo.height : photo.width < photo.height;

    return (
        <ContextMenu>
            <ContextMenuTrigger className="contents">
                <div className={`h-full ${!square ? "p-2" : ""} flex justify-center items-center relative rounded-sm overflow-hidden aspect-square transition-[padding] duration-200 before:absolute before:inset-0 before:rounded-sm ${selected && square ? "before:border-3 before:border-primary before:inset-ring-2 before:inset-ring-background" : "before:border-transparent before:inset-ring-transparent"} before:pointer-events-none before:transition-[border,filter]`}>
                    {!error ? (
                        <img
                            src={convertFileSrc(selectedLibrary?.path + "/thumbnails/" + photo.id + ".webp")}
                            className={`${horizontal ? "w-full" : "h-full"} max-w-[unset] rounded-sm ${selected && !square ? "outline-3 outline-primary outline-offset-3" : ""} transition-[outline]`}
                            onClick={onClick}
                            onContextMenu={onContextMenu}
                            onError={() => setError(true)}
                        />
                    ) : (
                        <div className={`size-full flex flex-col justify-center items-center gap-1 bg-secondary/75 rounded-sm  ${selected && !square ? "outline-3 outline-primary outline-offset-3" : ""} transition-[outline]`} onClick={onClick} onContextMenu={onContextMenu}>
                            <p className="text-2xl">📸</p>
                            <p className="text-xs text-muted-foreground font-medium">{photo.original_name}</p>
                        </div>
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>
                    <Info24Regular className="size-4.5" />
                    Info
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <Heart24Regular className="size-4.5" />
                    Favorite
                </ContextMenuItem>
                <ContextMenuItem>
                    <Share24Regular className="size-4.5" />
                    Export
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <EyeOff24Regular className="size-4.5" />
                    Hide
                </ContextMenuItem>
                <ContextMenuItem>
                    <Delete24Regular className="size-4.5" />
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}