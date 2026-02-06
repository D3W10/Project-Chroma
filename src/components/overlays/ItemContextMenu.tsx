import { IconArchive, IconCircleMinus, IconEyeOff, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconShare2, IconTrash } from "@tabler/icons-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useAction } from "@/lib/useAction";
import type { ReactNode } from "react";
import type { Item } from "@/lib/models";

interface ItemContextMenuProps {
    children: ReactNode;
    selected: Item[];
    isAlbum?: boolean;
    onMoveToLib?: () => unknown;
    onAddToAlbum?: () => unknown;
    onDelete?: () => unknown;
}

export function ItemContextMenu({ children, selected, isAlbum = false, onMoveToLib, onAddToAlbum, onDelete }: ItemContextMenuProps) {
    const action = useAction();

    const isAllFavorite = selected.every(p => p.is_favorite);

    return (
        <ContextMenu>
            <ContextMenuTrigger className="contents">
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>
                    <IconInfoCircle className="size-4.5" />
                    Info
                </ContextMenuItem>
                <ContextMenuSeparator />
                {!isAlbum && (
                    <ContextMenuItem onClick={onMoveToLib}>
                        <IconArchive className="size-4.5" />
                        Move to another library
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={onAddToAlbum}>
                    <IconFolderPlus className="size-4.5" />
                    Add to Album
                </ContextMenuItem>
                <ContextMenuItem onClick={() => action.setItemsFavorite(selected.map(p => p.id), !isAllFavorite)}>
                    {selected.length !== 0 && isAllFavorite ? (
                        <>
                            <IconHeartFilled className="size-4.5" />
                            Unfavorite
                        </>
                    ) : (
                        <>
                            <IconHeart className="size-4.5" />
                            Favorite
                        </>
                    )}
                    {selected.length > 1 && ` ${selected.length} items`}
                </ContextMenuItem>
                <ContextMenuItem>
                    <IconShare2 className="size-4.5" />
                    Export
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                    <IconEyeOff className="size-4.5" />
                    Hide
                    {selected.length > 1 && ` ${selected.length} items`}
                </ContextMenuItem>
                {isAlbum && (
                    <ContextMenuItem onClick={onDelete} data-variant="destructive">
                        <IconCircleMinus className="size-4.5" />
                        Remove
                        {selected.length > 1 ? ` ${selected.length} items ` : " from Album"}
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={onDelete} data-variant="destructive">
                    <IconTrash className="size-4.5" />
                    Delete
                    {selected.length > 1 && ` ${selected.length} items`}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}