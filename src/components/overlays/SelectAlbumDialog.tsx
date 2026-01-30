import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlbumCover } from "@/components/custom/AlbumCover";
import { getAlbums } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useStack } from "@/lib/useStack";
import { cn } from "@/lib/utils";
import type { Album } from "@/lib/models";

interface SelectAlbumDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (album: Album) => void;
}

export function SelectAlbumDialog({ open, onOpenChange, onSuccess }: SelectAlbumDialogProps) {
    const [currentAlbum, setCurrentAlbum] = useState<Album | undefined>();
    const [selected, setSelected] = useState<Album | undefined>();
    const navStack = useStack<Album | undefined>();
    const { selectedLibrary } = useLibrary();

    const { isPending, data: albums } = useQuery({
        queryKey: [selectedLibrary?.id, "albums", currentAlbum],
        queryFn: () => getAlbums({ libraryId: selectedLibrary?.id ?? "", parent: currentAlbum?.id }),
    });

    const hasAlbums = !isPending && albums?.data && albums.data.length > 0;

    function navigateToAlbum(album: Album) {
        navStack.push(currentAlbum);
        setCurrentAlbum(album);
    }

    function navigateBack() {
        const popped = navStack.pop();
        setCurrentAlbum(popped);
        setSelected(popped);
    }

    function handleSelect() {
        if (!selected) return;
        onOpenChange(false);
        onSuccess?.(selected);
    }

    useEffect(() => {
        if (open) {
            setCurrentAlbum(undefined);
            setSelected(undefined);
            navStack.clear();
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select album</DialogTitle>
                    <DialogDescription>Select the album to add the items to</DialogDescription>
                </DialogHeader>
                <div className="h-64 flex flex-col bg-muted/40 rounded-xl ring-1 ring-input overflow-y-auto">
                    {currentAlbum && (
                        <Button variant="ghost" className="w-full h-8 flex justify-start px-3 border-b border-input/30 rounded-t-xl rounded-b-none" onClick={navigateBack}>
                            <IconChevronLeft className="size-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Go back</p>
                        </Button>
                    )}
                    {isPending && Array(3).fill(null).map((_, i) => (
                        <div key={i} className="w-full h-14 bg-foreground/5 border-b border-input/30 animate-pulse delay-(--loading-delay)" style={{ "--loading-delay": `${i * 0.2}s` } as React.CSSProperties}></div>
                    ))}
                    {hasAlbums ? albums.data.map(p => (
                        <Button key={p.id} variant="ghost" className={cn("w-full h-fit p-3 flex justify-between items-center border-0 border-b border-input/30 rounded-none first:rounded-t-xl transition-shadow", (!currentAlbum && albums.data.length > 4 || currentAlbum && albums.data.length > 3) && "last:rounded-b-xl", selected && p.id === selected.id && "inset-ring-2 inset-ring-primary")} onClick={() => setSelected(p)} onDoubleClick={() => navigateToAlbum(p)}>
                            <div className="flex items-center gap-3">
                                <AlbumCover item={p} size="md" />
                                <p className="text-secondary-foreground font-medium">{p.name}</p>
                            </div>
                            <IconChevronRight className="size-4.5 mr-1 text-muted-foreground" />
                        </Button>
                    )) : (
                        <p className="size-full flex items-center justify-center text-muted-foreground font-medium">No albums in here</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button disabled={!selected} onClick={handleSelect}>Add items</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}