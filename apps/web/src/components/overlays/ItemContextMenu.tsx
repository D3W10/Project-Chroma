import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@project-chroma/ui/context-menu";
export function ItemContextMenu<T extends Item>({ children, isAlbum = false, selected, setSelected }: ItemContextMenuProps<T>) {

    return (
        <ContextMenu>
            <ContextMenuTrigger className="contents">
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem
                    onClick={() =>
                        action.setItemsFavorite(
                            selected.map(p => p.id),
                            !isAllFavorite,
                        )
                    }
                >
                    {selected.length !== 0 && isAllFavorite ? (
                        <>
                            <IconHeartFilled />
                            Unfavorite
                        </>
                    ) : (
                        <>
                            <IconHeart />
                            Favorite
                        </>
                    )}
                    {selected.length > 1 && ` ${selected.length} items`}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
