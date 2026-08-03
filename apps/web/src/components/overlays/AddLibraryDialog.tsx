import { useState } from "react";
import { Button } from "@project-chroma/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@project-chroma/ui/dialog";
import { Spinner } from "@project-chroma/ui/spinner";
import { IconColor } from "@/components/IconColor";
import { useAction } from "@/lib/useAction";
import type { LibraryMetadataPath } from "@project-chroma/contracts/gallery";

interface AddLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    library?: LibraryMetadataPath;
    onAdded?: () => void;
}

export function AddLibraryDialog({ library, open, onOpenChange, onAdded }: AddLibraryDialogProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const { addLibrary } = useAction();

    async function handleAdd() {
        if (!library) return;

        setIsProcessing(true);

        addLibrary(library.name, library.path, () => {
            onOpenChange(false);
            onAdded?.();
            setIsProcessing(false);
        }, () => setIsProcessing(false));
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add existing library</DialogTitle>
                    <DialogDescription>The following library will be imported to Project Chroma</DialogDescription>
                </DialogHeader>
                {library && (
                    <div className="w-full p-4 flex items-center gap-4 bg-muted/40 rounded-xl ring-1 ring-input">
                        <IconColor color={library.color} size="lg">
                            {library.icon}
                        </IconColor>
                        <div className="space-y-0.5">
                            <h3 className="font-semibold">{library.name}</h3>
                            <p className="text-2xs text-muted-foreground">
                                {library.count} {library.count === 1 ? "item" : "items"}
                            </p>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button className="flex justify-center relative" onClick={handleAdd} disabled={!library || isProcessing}>
                        <span className={isProcessing ? "opacity-0" : ""}>Add Library</span>
                        <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
