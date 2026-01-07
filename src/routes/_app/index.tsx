import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconArrowAutofitHeight, IconFilter2, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconMinus, IconPlus, IconShare2 } from "@tabler/icons-react";
import { animate } from "@/components/animated";
import { IconBox } from "@/components/IconBox";
import { PhotoViewer } from "@/components/PhotoViewer";
import { Toolbar } from "@/components/Toolbar";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportItemsDialog } from "@/components/overlays/ImportItemsDialog";
import { ItemContextMenu } from "@/components/overlays/ItemContextMenu";
import { DeleteItemDialog } from "@/components/overlays/DeleteItemDialog";
import { deleteItems, getItems, getLibraries, moveItems, setItemsFavorite } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useSelection } from "@/lib/useSelection";
import { cn, cva } from "@/lib/utils";
import type { Item } from "@/lib/models";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

const gridSizes = ["grid-cols-3", "grid-cols-5", "grid-cols-7", "grid-cols-9"];

function RouteComponent() {
    const [items, setItems] = useState<Item[]>([]);
    const [viewingItem, setViewingItem] = useState<Item | null>(null);
    const [gridSize, setGridSize] = useState(2);
    const [squareThumb, setSquareThumb] = useState(false);
    const [openAddItems, setOpenAddItems] = useState(false);
    const [deleteItemDialog, setDeleteItemDialog] = useState(false);
    const queryClient = useQueryClient();
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const { selected, setSelected, handleSelect, handleRightClick, unselectAll } = useSelection({ items });

    const { isLoading, data } = useQuery({
        queryKey: ["items"],
        queryFn: () => getItems({ libraryId: selectedLibrary?.id ?? "" }),
    });

    async function setSelectedAsFavorites() {
        if (!selectedLibrary) return;

        await setItemsFavorite({ libraryId: selectedLibrary.id, itemIds: selected.map(p => p.id), value: !selected.every(p => p.is_favorite) });
        queryClient.invalidateQueries({ queryKey: ["items"] });
    }

    async function deleteSelected() {
        if (!selectedLibrary || !selected.length) return;

        await deleteItems({ libraryId: selectedLibrary.id, itemIds: selected.map(p => p.id) });
        setSelected([]);
        queryClient.invalidateQueries({ queryKey: ["items"] });
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
                <div>
                    <Button onClick={() => setOpenAddItems(true)}>
                        <IconPlus className="size-4 mr-0.5" />
                        Import items
                    </Button>
                    <ImportItemsDialog openDialog={openAddItems} onOpenChange={setOpenAddItems} />
                    <DeleteItemDialog open={deleteItemDialog} onOpenChange={setDeleteItemDialog} items={selected} onConfirm={deleteSelected} />
                </div>
                <div className="flex gap-2">
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={items.length === 0 || gridSize === 0} onClick={() => setGridSize(gridSize - 1)}>
                            <IconPlus className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={items.length === 0 || gridSize === gridSizes.length - 1} onClick={() => setGridSize(gridSize + 1)}>
                            <IconMinus className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={items.length === 0} onClick={() => setSquareThumb(!squareThumb)}>
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
                        <Button variant="outline" size="icon" disabled={selected.length === 0}>
                            <IconFolderPlus className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={selected.length === 0}>
                            <IconShare2 className="size-5" />
                        </Button>
                    </ButtonGroup>
                </div>
            </Toolbar>
            <div className={`w-full min-h-0 p-2 pt-14 ${isLoading || items.length > 0 ? "grid gap-1" : "h-full flex justify-center items-center"} ${gridSizes[gridSize]} absolute`}>
                {isLoading && <GridLoading />}
                {items.length > 0 ? items.map((p, i) => (
                    <ItemContextMenu
                        key={p.id}
                        selected={selected}
                        onMoveToLib={() => setMoveToLibDialog(true)}
                        onSetFavorite={setSelectedAsFavorites}
                        onDelete={() => setDeleteItemDialog(true)}
                    >
                        <GridItem
                            item={p}
                            square={squareThumb}
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
    square: boolean;
    onClick?: React.MouseEventHandler<HTMLElement>;
    onDoubleClick?: React.MouseEventHandler<HTMLElement>;
    onContextMenu?: React.MouseEventHandler<HTMLElement>;
}

const gridItemStyles = cva(
    "h-full flex justify-center items-center rounded-sm overflow-hidden aspect-square transition-[padding] duration-200 before:absolute before:inset-0 before:rounded-sm before:pointer-events-none before:transition-[border,box-shadow] before:z-1 before:border-transparent before:inset-ring-transparent",
    {
        variants: {
            square: {
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
                square: true,
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
            square: {
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
                square: false,
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

function GridItem({ item, selected, square, onClick, onDoubleClick, onContextMenu }: GridItemProps) {
    const [error, setError] = useState(false);
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();

    const horizontal = !square ? item.width > item.height : item.width < item.height;

    function setItemFavorite(e: React.MouseEvent<HTMLElement, MouseEvent>) {
        if (!selectedLibrary?.id) return;

        e.stopPropagation();
        setItemsFavorite({ libraryId: selectedLibrary.id, itemIds: [item.id], value: !item.is_favorite });
        queryClient.invalidateQueries({ queryKey: ["items"] });
    }

    return (
        <div className={cn(gridItemStyles({ square, selected }))}>
            <div className={cn(gridItemInnerStyles({ error, square, selected, horizontal }))} onClick={onClick} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
                {!error ? (
                    <img
                        src={convertFileSrc(selectedLibrary?.path + "/thumbnails/" + item.id + ".webp")}
                        className={cn("max-w-[unset]", horizontal ? "w-full" : "h-full")}
                        onError={() => setError(true)}
                    />
                ) : (
                    <>
                        <p className="text-2xl">{item.file_type.startsWith("image/") ? item.file_type !== "image/gif" ? "📸" : "👾" : "🎥"}</p>
                        <p className="text-xs text-muted-foreground font-medium">{(/^[\s\S]+(?=\.)|^[\s\S]+$/g.exec(item.original_name) ?? [])[0]}</p>
                    </>
                )}
                <button className={cn("size-4 flex absolute bottom-1 left-1 drop-shadow-favorite transition-opacity *:size-full", !item.is_favorite ? "opacity-0 group-hover:opacity-100" : "")} onClick={setItemFavorite}>
                    {!item.is_favorite ? <IconHeart /> : <IconHeartFilled />}
                </button>
            </div>
        </div>
    );
}