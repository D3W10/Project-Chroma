import { IconPencil, IconTrash } from "@tabler/icons-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { ReactNode } from "react";
import type { Album } from "@/lib/models";

interface AlbumContextMenuProps {
    children: ReactNode;
    selected: Album[];
    onEdit: () => void;
    onDelete: () => void;
}

export function AlbumContextMenu({ children, selected, onEdit, onDelete }: AlbumContextMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="contents">
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem disabled={selected.length !== 1} onClick={onEdit}>
                    <IconPencil className="size-4.5" />
                    Edit
                </ContextMenuItem>
                <ContextMenuItem onClick={onDelete} data-variant="destructive">
                    <IconTrash className="size-4.5" />
                    Delete
                    {selected.length > 1 && ` ${selected.length} albums`}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}