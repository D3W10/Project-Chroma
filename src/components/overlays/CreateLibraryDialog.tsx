import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useLibraryCreate, LibraryCreate } from "@/components/custom/LibraryCreate";

interface CreateLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateLibraryDialog({ open, onOpenChange }: CreateLibraryDialogProps) {
    const libCreate = useLibraryCreate();

    useEffect(() => {
        if (open)
            libCreate.reset();
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create new library</DialogTitle>
                    <DialogDescription>A library is where you store all your photos, videos and albums. You may create multiple libraries if you want to store items on different locations</DialogDescription>
                </DialogHeader>
                <LibraryCreate state={libCreate} />
                <div className="flex justify-end gap-2">
                    <Button variant="outline" disabled={libCreate.isProcessing} onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="w-30 flex justify-center relative" disabled={!libCreate.isValid || libCreate.isProcessing} onClick={() => libCreate.create(() => onOpenChange(false))}>
                        <span className={libCreate.isProcessing ? "opacity-0" : ""}>Create Library</span>
                        <Spinner className={`absolute ${!libCreate.isProcessing ? "opacity-0" : "opacity-100"}`} />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}