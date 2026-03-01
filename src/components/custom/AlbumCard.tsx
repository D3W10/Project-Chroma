import { AlbumCover } from "@/components/custom/AlbumCover";
import { useLibrary } from "@/lib/useLibrary";
import { cn, cva, getThumbPath } from "@/lib/utils";
import type { AlbumComp } from "@/lib/models";

interface AlbumCardProps {
    album: AlbumComp;
    selected: boolean;
    size?: "md" | "sm";
    onClick?: React.MouseEventHandler<HTMLElement>;
    onDoubleClick?: React.MouseEventHandler<HTMLElement>;
    onContextMenu?: React.MouseEventHandler<HTMLElement>;
}

const gridItemStyles = cva(
    "flex bg-background overflow-hidden transition-shadow",
    {
        variants: {
            selected: {
                true: "ring-2 ring-primary",
                false: "ring ring-border",
            },
            size: {
                md: "flex-col rounded-lg",
                sm: "w-60 items-center rounded-xl",
            },
        },
        defaultVariants: {
            selected: false,
            size: "md",
        },
    },
);

export function AlbumCard({ album, selected, size, onClick, onDoubleClick, onContextMenu }: AlbumCardProps) {
    const { selectedLibrary } = useLibrary();
    const small = size === "sm";

    return (
        <div className={gridItemStyles({ selected, size })} onClick={onClick} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            {!small && (
                <div className="grid grid-cols-5 grid-rows-2 grid-flow-col aspect-5/2 z-1">
                    {album.peek_thumbs.map((p, i) => (
                        <img src={getThumbPath(p, selectedLibrary?.path)} className="w-full aspect-square object-cover" key={i} />
                    ))}
                    {Array(10 - album.peek_thumbs.length).fill(null).map((_, i) => (
                        <div className="w-full aspect-square" style={{ backgroundColor: `color-mix(var(--color-background), var(--color-muted) ${100 - ((i + album.peek_thumbs.length) * 10)}%)` }} key={i + album.peek_thumbs.length}></div>
                    ))}
                </div>
            )}
            <div className={cn("flex items-center relative", !small ? "pl-4 pb-5" : "p-3 pr-3.5")}>
                <div className={cn("p-0.5 bg-background rounded-xl z-1", !small && "absolute")}>
                    <AlbumCover item={album} size={!small ? "xl" : "lg"} />
                </div>
            </div>
            <div className={cn("space-y-0-5", !small ? "px-4.5 py-4" : "")}>
                <h3 className="text-lg font-semibold">{album.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{album.size} {album.size === 1 ? "item" : "items"}</p>
            </div>
        </div>
    );
}