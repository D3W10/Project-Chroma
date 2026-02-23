import { useState, type ReactNode } from "react";
import { IconArchive, IconCircleMinus, IconEyeOff, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconShare2, IconTrash } from "@tabler/icons-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DeleteItemDialog } from "@/components/overlays/DeleteItemDialog";
import { SelectAlbumDialog } from "@/components/overlays/SelectAlbumDialog";
import { TransferItemsDialog } from "@/components/overlays/TransferItemsDialog";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import type { Item } from "@/lib/models";

interface ItemContextMenuProps<T extends Item> {
    children: ReactNode;
    isAlbum?: boolean;
    selected: T[];
    setSelected: (selected: T[]) => unknown;
}

export function ItemContextMenu<T extends Item>({ children, isAlbum = false, selected, setSelected }: ItemContextMenuProps<T>) {
    const [addToAlbumDialog, setAddToAlbumDialog] = useState(false);
    const [transferItemDialog, setTransferItemDialog] = useState(false);
    const [deleteItemDialog, setDeleteItemDialog] = useState(false);
    const action = useAction();
    const { libraries } = useLibrary();

    const isAllFavorite = selected.every(p => p.is_favorite);

    async function handleDelete() {
        await action.deleteItems(selected.map(p => p.id));
        setSelected([]);
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger className="contents">
                {children}
                <SelectAlbumDialog open={addToAlbumDialog} onOpenChange={setAddToAlbumDialog} onSuccess={a => action.addItemsToAlbum(selected.map(p => p.id), a)} />
                <TransferItemsDialog open={transferItemDialog} onOpenChange={setTransferItemDialog} selected={selected} />
                <DeleteItemDialog open={deleteItemDialog} onOpenChange={setDeleteItemDialog} items={selected} onConfirm={handleDelete} />
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>
                    <IconInfoCircle className="size-4.5" />
                    Info
                </ContextMenuItem>
                <ContextMenuSeparator />
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
                <ContextMenuItem onClick={() => setAddToAlbumDialog(true)}>
                    <IconFolderPlus className="size-4.5" />
                    Add to Album
                </ContextMenuItem>
                {!isAlbum && libraries.length > 1 && (
                    <ContextMenuItem onClick={() => setTransferItemDialog(true)}>
                        <IconArchive className="size-4.5" />
                        Transfer to another library
                    </ContextMenuItem>
                )}
                <ContextMenuItem>
                    <IconShare2 className="size-4.5" />
                    Export
                </ContextMenuItem>
                <ContextMenuSeparator />
                {!isAlbum && (
                    <ContextMenuItem>
                        <IconEyeOff className="size-4.5" />
                        Hide
                        {selected.length > 1 && ` ${selected.length} items`}
                    </ContextMenuItem>
                )}
                {isAlbum && (
                    <ContextMenuItem data-variant="destructive">
                        <IconCircleMinus className="size-4.5" />
                        Remove
                        {selected.length > 1 ? ` ${selected.length} items ` : " from Album"}
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={() => setDeleteItemDialog(true)} data-variant="destructive">
                    <IconTrash className="size-4.5" />
                    Delete
                    {selected.length > 1 && ` ${selected.length} items`}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}