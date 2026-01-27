import { IconArchive, IconEyeOff, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconShare2, IconTrash } from "@tabler/icons-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { ReactNode } from "react";
import type { Item } from "@/lib/models";

interface ItemContextMenuProps {
    children: ReactNode;
    selected: Item[];
    onMoveToLib: () => void;
    onAddToAlbum: () => void;
    onSetFavorite: () => void;
    onDelete: () => void;
}

export function ItemContextMenu({ children, selected, onMoveToLib, onAddToAlbum, onSetFavorite, onDelete }: ItemContextMenuProps) {
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
                <ContextMenuItem onClick={onMoveToLib}>
                    <IconArchive className="size-4.5" />
                    Move to another library
                </ContextMenuItem>
                <ContextMenuItem onClick={onAddToAlbum}>
                    <IconFolderPlus className="size-4.5" />
                    Add to Album
                </ContextMenuItem>
                <ContextMenuItem onClick={onSetFavorite}>
                    {selected.length !== 0 && selected.every(p => p.is_favorite) ? (
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
                <ContextMenuItem onClick={onDelete} data-variant="destructive">
                    <IconTrash className="size-4.5" />
                    Delete
                    {selected.length > 1 && ` ${selected.length} items`}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}