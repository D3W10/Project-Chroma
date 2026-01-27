import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconArrowAutofitHeight, IconFilter2, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconMinus, IconPlus, IconShare2 } from "@tabler/icons-react";
import { animate } from "@/components/animated";
import { PhotoViewer } from "@/components/PhotoViewer";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconBox } from "@/components/custom/IconBox";
import { Toolbar } from "@/components/custom/Toolbar";
import { ImportItemsDialog } from "@/components/overlays/ImportItemsDialog";
import { ItemContextMenu } from "@/components/overlays/ItemContextMenu";
import { DeleteItemDialog } from "@/components/overlays/DeleteItemDialog";
import { SelectAlbumDialog } from "@/components/overlays/SelectAlbumDialog";
import { addItemsToAlbum, deleteItems, getItems, getLibraries, moveItems, setItemsFavorite } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useSelection } from "@/lib/useSelection";
import { useSettings } from "@/lib/useSettings";
import { cn, cva } from "@/lib/utils";
import type { Album, Item } from "@/lib/models";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

const gridSizes = ["grid-cols-3", "grid-cols-5", "grid-cols-7", "grid-cols-9"];

function RouteComponent() {
    const [items, setItems] = useState<Item[]>([]);
    const [viewingItem, setViewingItem] = useState<Item | null>(null);
    const [openAddItems, setOpenAddItems] = useState(false);
    const [addToAlbumDialog, setAddToAlbumDialog] = useState(false);
    const [deleteItemDialog, setDeleteItemDialog] = useState(false);
    const queryClient = useQueryClient();
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const { selected, setSelected, handleSelect, handleRightClick, unselectAll } = useSelection({ items });
    const { settings, updateSettings } = useSettings();

    const { isPending, data } = useQuery({
        queryKey: [selectedLibrary?.id, "items"],
        queryFn: () => getItems({ libraryId: selectedLibrary?.id ?? "" }),
    });

    async function setSelectedAsFavorites() {
        if (!selectedLibrary) return;

        await setItemsFavorite({ libraryId: selectedLibrary.id, itemIds: selected.map(p => p.id), value: !selected.every(p => p.is_favorite) });
        queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "items"] });
    }

    async function addToAlbum(album: Album) {
        if (!selectedLibrary) return;

        const nItems = selected.length;

        pushNoti("Adding items to \"" + album.name + "\"", `Adding ${nItems} items to album "${album.name}"`, "success", {
            promise: addItemsToAlbum({ libraryId: selectedLibrary.id, albumId: album.id, itemIds: selected.map(p => p.id) }),
            peek: "Adding items",
            success: () => ({
                title: "Items added to \"" + album.name + "\"",
                description: nItems + "items have been added to the album \"" + album.name + "\"",
            }),
            error: e => ({
                title: "Error adding items to \"" + album.name + "\"",
                description: e,
            }),
            onSuccess: () => queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "albums"] }),
        });
    }

    async function deleteSelected() {
        if (!selectedLibrary || !selected.length) return;

        await deleteItems({ libraryId: selectedLibrary.id, itemIds: selected.map(p => p.id) });
        setSelected([]);
        queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "items"] });
        pushNoti("Items deleted", `${selected.length} items have been deleted`, "success");
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
            <Toolbar>
                <div className="flex gap-2">
                    <Button onClick={() => setOpenAddItems(true)}>
                        <IconPlus className="size-4 mr-0.5" />
                        Import items
                    </Button>
                    <ImportItemsDialog openDialog={openAddItems} onOpenChange={setOpenAddItems} />
                    <SelectAlbumDialog open={addToAlbumDialog} onOpenChange={setAddToAlbumDialog} onSuccess={addToAlbum} />
                    <DeleteItemDialog open={deleteItemDialog} onOpenChange={setDeleteItemDialog} items={selected} onConfirm={deleteSelected} />
                </div>
                <div className="flex gap-2">
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={items.length === 0 || settings.libraryZoom === 0} onClick={() => updateSettings({ libraryZoom: settings.libraryZoom - 1 })}>
                            <IconPlus className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={items.length === 0 || settings.libraryZoom === gridSizes.length - 1} onClick={() => updateSettings({ libraryZoom: settings.libraryZoom + 1 })}>
                            <IconMinus className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={items.length === 0} onClick={() => updateSettings({ libraryExpanded: !settings.libraryExpanded })}>
                            <IconArrowAutofitHeight className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={items.length === 0}>
                            <IconFilter2 className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={selected.length === 0} onClick={setSelectedAsFavorites}>
                            {selected.length !== 0 && selected.every(p => p.is_favorite) ? <IconHeartFilled className="size-5" /> : <IconHeart className="size-5" />}
                        </Button>
                        <Button variant="outline" size="icon" disabled={selected.length === 0} onClick={() => setAddToAlbumDialog(true)}>
                            <IconFolderPlus className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={selected.length === 0}>
                            <IconShare2 className="size-5" />
                        </Button>
                    </ButtonGroup>
                </div>
            </Toolbar>
            <div className={`w-full min-h-0 p-2 pt-14 ${isPending || items.length > 0 ? "grid gap-1" : "h-full flex justify-center items-center"} ${gridSizes[settings.libraryZoom]} absolute`}>
                {isPending && <GridLoading />}
                {items.length > 0 ? items.map((p, i) => (
                    <ItemContextMenu
                        key={p.id}
                        selected={selected}
                        onMoveToLib={() => setMoveToLibDialog(true)}
                        onAddToAlbum={() => setAddToAlbumDialog(true)}
                        onSetFavorite={setSelectedAsFavorites}
                        onDelete={() => setDeleteItemDialog(true)}
                    >
                        <GridItem
                            item={p}
                            expanded={settings.libraryExpanded}
                            selected={!!selected.find(s => s.id === p.id)}
                            onClick={e => handleSelect(e, i, p)}
                            onDoubleClick={() => setViewingItem(p)}
                            onContextMenu={() => handleRightClick(i, p)}
                        />
                    </ItemContextMenu>
                )) : <GridEmpty onAdd={() => setOpenAddItems(true)} />}
            </div>
            <AnimatePresence>
                {viewingItem && (
                    <PhotoViewer item={viewingItem} onClose={() => setViewingItem(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}

function GridLoading() {
    return Array(60).fill(null).map((_, i) => (
        <div key={i} className="size-full p-1 aspect-square">
            <div className="size-full bg-foreground/5 rounded-sm animate-pulse delay-(--loading-delay)" style={{ "--loading-delay": `${i * 0.05}s` } as React.CSSProperties} />
        </div>
    ));
}

function GridEmpty({ onAdd }: { onAdd: () => unknown }) {
    return (
        <CenterLayout>
            <IconBox className="mb-4">
                <IconInfoCircle />
            </IconBox>
            <animate.h1 className="text-xl font-bold" delay={0.15}>Empty library</animate.h1>
            <animate.p className="text-muted-foreground" delay={0.3}>Your library is currently empty, try adding some photos/videos and fill it with memories!</animate.p>
            <animate.div className="w-full mt-2 flex justify-center" delay={0.45}>
                <Button onClick={onAdd}>Import items</Button>
            </animate.div>
        </CenterLayout>
    );
}

interface GridItemProps {
    item: Item;
    selected: boolean;
    expanded: boolean;
    onClick?: React.MouseEventHandler<HTMLElement>;
    onDoubleClick?: React.MouseEventHandler<HTMLElement>;
    onContextMenu?: React.MouseEventHandler<HTMLElement>;
}

const gridItemStyles = cva(
    "h-full flex justify-center items-center rounded-sm overflow-hidden aspect-square transition-[padding] duration-200 before:absolute before:inset-0 before:rounded-sm before:pointer-events-none before:transition-[border,box-shadow] before:z-1 before:border-transparent before:inset-ring-transparent",
    {
        variants: {
            expanded: {
                true: "relative",
                false: "p-2",
            },
            selected: {
                true: "",
                false: "",
            },
        },
        compoundVariants: [
            {
                expanded: true,
                selected: true,
                class: "before:border-3 before:border-primary before:inset-ring-2 before:inset-ring-background",
            },
        ],
    },
);

const gridItemInnerStyles = cva(
    "flex justify-center items-center rounded-sm group transition-shadow",
    {
        variants: {
            error: {
                true: "size-full flex-col gap-1 bg-muted",
                false: "overflow-hidden",
            },
            expanded: {
                true: "",
                false: "relative",
            },
            selected: {
                true: "",
                false: "",
            },
            horizontal: {
                true: "",
                false: "",
            },
        },
        compoundVariants: [
            {
                selected: true,
                expanded: false,
                class: "ring-3 ring-primary ring-offset-3 ring-offset-background",
            },
            {
                error: false,
                horizontal: true,
                class: "w-full",
            },
            {
                error: false,
                horizontal: false,
                class: "h-full",
            },
        ],
    },
);

function GridItem({ item, selected, expanded, onClick, onDoubleClick, onContextMenu }: GridItemProps) {
    const [error, setError] = useState(false);
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();

    const horizontal = !expanded ? item.width > item.height : item.width < item.height;
    const type = item.file_type.startsWith("image/") ? item.file_type !== "image/gif" ? "photo" : "gif" : "video";

    function setItemFavorite(e: React.MouseEvent<HTMLElement, MouseEvent>) {
        if (!selectedLibrary?.id) return;

        e.stopPropagation();
        setItemsFavorite({ libraryId: selectedLibrary.id, itemIds: [item.id], value: !item.is_favorite });
        queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "items"] });
    }

    return (
        <div className={cn(gridItemStyles({ expanded, selected }))}>
            <motion.div layoutId={"item-" + item.id} className={cn(gridItemInnerStyles({ error, expanded, selected, horizontal }))} onClick={onClick} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
                {!error ? (
                    <img
                        src={convertFileSrc(selectedLibrary?.path + "/thumbnails/" + item.id + ".webp")}
                        className={cn("max-w-[unset]", horizontal ? "w-full" : "h-full")}
                        onError={() => setError(true)}
                    />
                ) : (
                    <>
                        <p className="text-2xl">{type === "photo" ? "📸" : type === "gif" ? "👾" : "🎥"}</p>
                        <p className="text-xs text-muted-foreground font-medium">{(/^[\s\S]+(?=\.)|^[\s\S]+$/g.exec(item.original_name) ?? [])[0]}</p>
                    </>
                )}
                <button className={cn("size-4 flex absolute text-white drop-shadow-favorite transition-opacity *:size-full", !item.is_favorite ? "opacity-0 group-hover:opacity-100" : "", !expanded ? "bottom-1 left-1" : "bottom-2 left-2")} onClick={setItemFavorite}>
                    {!item.is_favorite ? <IconHeart /> : <IconHeartFilled />}
                </button>
                {type === "video" && (
                    <div className="px-1 py-0.5 absolute bottom-0 right-0 bg-black/50 rounded-tl-sm rounded-br-sm backdrop-blur-md text-[10px] text-white font-medium pointer-events-none">
                        {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, "0")}
                    </div>
                )}
            </motion.div>
        </div>
    );
}