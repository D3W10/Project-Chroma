import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "motion/react";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { ItemContextMenu } from "@/components/overlays/ItemContextMenu";
import { gridSizes, gridSizesNum, type Item } from "@/lib/models";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { useSettings } from "@/lib/useSettings";
import { cn, pathToStem } from "@/lib/utils";

interface ItemGridProps {
    items: Item[];
    isPending: boolean;
    selected: Item[];
    parent: React.RefObject<HTMLElement | null>;
    viewingItem?: Item;
    setViewingItem: (item?: Item) => unknown;
    handleSelect: (event: React.MouseEvent<HTMLElement, MouseEvent>, index: number, item: Item) => unknown;
    handleRightClick: (index: number, item: Item) => unknown;
    onAddToAlbum: () => unknown;
    onDelete: () => unknown;
    empty: React.ReactNode;
}

export function ItemGrid({ items, isPending, selected, parent, viewingItem, setViewingItem, handleSelect, handleRightClick, onAddToAlbum, onDelete, empty }: ItemGridProps) {
    const [lastViewingItem, setLastViewingItem] = useState(viewingItem);
    const { settings } = useSettings();
    const columns = gridSizesNum[settings.libraryZoom];

    const virtualizer = useVirtualizer({
        count: Math.ceil(items.length / columns),
        getScrollElement: () => parent.current,
        estimateSize: () => 160,
        overscan: 18,
        gap: 4,
        measureElement: e => e.parentElement?.children[0].getBoundingClientRect().height ?? 160,
    });

    useEffect(() => {
        if (viewingItem)
            setLastViewingItem(viewingItem);
    }, [viewingItem]);

    return (
        <div
            className={cn("w-full relative py-2", !isPending && items.length === 0 && "flex justify-center items-center flex-1")}
            style={{
                height: items.length > 0 ? virtualizer.getTotalSize() + 16 : undefined,
            }}
        >
            {isPending && (
                Array(6).fill(null).map((_, i) => (
                    <div key={i} className={cn("w-full mb-1 last:mb-0 grid px-2 gap-1", gridSizes[settings.libraryZoom])}>
                        {Array(gridSizesNum[settings.libraryZoom]).fill(null).map((_, j) => (
                            <div key={j} className="size-full bg-muted rounded-sm aspect-square animate-pulse delay-(--loading-delay)" style={{ "--loading-delay": `${(i + j) * 0.2}s` } as React.CSSProperties} />
                        ))}
                    </div>
                ))
            )}
            {!isPending && items.length === 0 && empty}
            {items.length > 0 && virtualizer.getVirtualItems().map(row => {
                const rowStart = row.index * columns;
                const rowItems = items.slice(rowStart, rowStart + columns);

                return (
                    <div
                        key={row.key}
                        ref={virtualizer.measureElement}
                        data-index={row.index}
                        className={cn("w-full grid absolute top-0 left-0 px-2 gap-1 has-[*_div[data-viewing='true']]:z-1", gridSizes[settings.libraryZoom])}
                        style={{
                            transform: `translateY(${row.start}px)`,
                        }}
                    >
                        {rowItems.map((item, i) => {
                            const actualIndex = rowStart + i;
                            return (
                                <ItemContextMenu
                                    key={item.id}
                                    selected={selected}
                                    onMoveToLib={() => {}}
                                    onAddToAlbum={onAddToAlbum}
                                    onDelete={onDelete}
                                >
                                    <GridItem
                                        item={item}
                                        expanded={settings.libraryExpanded}
                                        selected={!!selected.find(s => s.id === item.id)}
                                        viewingItem={viewingItem}
                                        lastViewingItem={lastViewingItem}
                                        onClick={e => handleSelect(e, actualIndex, item)}
                                        onDoubleClick={() => setViewingItem(item)}
                                        onContextMenu={() => handleRightClick(actualIndex, item)}
                                    />
                                </ItemContextMenu>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

interface GridItemProps {
    item: Item;
    selected: boolean;
    expanded: boolean;
    viewingItem?: Item;
    lastViewingItem?: Item;
    onClick?: React.MouseEventHandler<HTMLElement>;
    onDoubleClick?: React.MouseEventHandler<HTMLElement>;
    onContextMenu?: React.MouseEventHandler<HTMLElement>;
}

function GridItem({ item, selected, expanded, viewingItem, lastViewingItem, onClick, onDoubleClick, onContextMenu }: GridItemProps) {
    const [error, setError] = useState(false);
    const { selectedLibrary } = useLibrary();
    const action = useAction();

    const type = item.file_type.startsWith("image/") ? item.file_type !== "image/gif" ? "photo" : "gif" : "video";

    function setItemFavorite(e: React.MouseEvent<HTMLElement, MouseEvent>) {
        e.stopPropagation();
        action.setItemsFavorite([item.id], !item.is_favorite);
    }

    const isHorizontal = item.width > item.height;
    const stem = pathToStem(item.original_name);

    return (
        <div className={cn("size-full flex justify-center items-center rounded-sm aspect-square transition-[padding] duration-200", expanded ? "relative" : "p-2")} data-viewing={lastViewingItem?.id === item.id}>
            <motion.div
                layout
                className={cn(
                    "size-full relative flex justify-center items-center rounded-sm transition-[box-shadow,aspect-ratio] group",
                    !isHorizontal ? "w-auto" : "h-auto",
                    selected && !expanded && "ring-3 ring-primary ring-offset-3 ring-offset-background",
                )}
                style={{
                    aspectRatio: !expanded && !error ? `${item.width}/${item.height}` : "1/1",
                }}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
            >
                {!error ? (
                    viewingItem?.id !== item.id ? (
                        <motion.img
                            layout
                            layoutId={`item-${item.id}`}
                            src={convertFileSrc(selectedLibrary?.path + "/thumbnails/" + item.id + ".webp")}
                            className={cn("size-full object-cover pointer-events-none", !expanded || selected ? "rounded-sm" : "rounded-xs", selected && "z-1")}
                            loading="lazy"
                            onError={() => setError(true)}
                        />
                    ) : undefined
                ) : (
                    <div className={cn("size-full p-2 flex flex-col justify-center items-center gap-1 text-center bg-muted pointer-events-none", !expanded || selected ? "rounded-sm" : "rounded-xs")}>
                        <p className="text-2xl">{type === "photo" ? "📸" : type === "gif" ? "👾" : "🎥"}</p>
                        <p className="w-full text-xs text-muted-foreground font-medium">{stem.slice(0, 15) + (stem.length > 15 ? "..." : "")}</p>
                    </div>
                )}
                <div className={cn("absolute inset-0 rounded-sm pointer-events-none transition-[border,box-shadow] z-1", selected && expanded ? "border-3 border-primary inset-ring-2 inset-ring-background" : "inset-ring-transparent")} />
                <button
                    className={cn(
                        "flex absolute text-white drop-shadow-favorite transform-gpu transition-opacity z-1 *:transition-opacity",
                        !item.is_favorite ? "opacity-0 group-hover:opacity-100" : "",
                        !expanded ? "bottom-1 left-1" : "bottom-1.5 left-1.5",
                        !viewingItem ? "*:delay-500" : "*:opacity-0",
                    )}
                    onClick={setItemFavorite}
                >
                    {!item.is_favorite ? <IconHeart className="size-3.5" /> : <IconHeartFilled className="size-3.5" />}
                </button>
                {type === "video" && (
                    <div className={cn("px-1 py-0.5 absolute bottom-0 right-0 bg-black/50 rounded-tl-sm backdrop-blur-md text-[10px] text-white font-medium pointer-events-none z-1", !expanded || selected ? "rounded-br-sm" : "rounded-br-xs")}>
                        {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, "0")}
                    </div>
                )}
            </motion.div>
        </div>
    );
}