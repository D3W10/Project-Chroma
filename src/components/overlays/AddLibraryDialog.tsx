import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { IconColor } from "@/components/custom/IconColor";
import { addLibrary } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import type { LibraryDetailsPath } from "@/lib/models";

interface AddLibraryDialogProps {
    library?: LibraryDetailsPath;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddLibraryDialog({ library, open, onOpenChange }: AddLibraryDialogProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const { setPendingLibraryId } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    async function handleAdd() {
        if (!library) return;

        setIsProcessing(true);

        const { data } = await addLibrary({ path: library.path });
        if (data) {
            setPendingLibraryId(data.id);
            queryClient.invalidateQueries({ queryKey: ["libraries"] });
            pushNoti("Library added", "The library \"" + library.name + "\" was added successfully!", "success");
            onOpenChange(false);
        } else
            pushNoti("Add error", "Failed to add the existing library", "error");

        setIsProcessing(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add existing library</DialogTitle>
                    <DialogDescription>The following library will be imported to Project Chroma</DialogDescription>
                </DialogHeader>
                {library && (
                    <div className="w-full p-3 flex items-center gap-3.5 bg-muted/40 rounded-xl ring-1 ring-input">
                        <IconColor color={library.color} size="lg">
                            {library.icon}
                        </IconColor>
                        <div className="space-y-0.5">
                            <h3 className="font-semibold">{library.name}</h3>
                            <p className="text-xs text-muted-foreground">{library.count} {library.count === 1 ? "item" : "items"}</p>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="flex justify-center relative" onClick={handleAdd} disabled={!library || isProcessing}>
                        <span className={isProcessing ? "opacity-0" : ""}>Add Library</span>
                        <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}