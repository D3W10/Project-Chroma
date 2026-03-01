import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Tag } from "@/lib/models";

interface DeleteTagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
    tag?: Tag;
    onConfirm: () => unknown;
}

export function DeleteTagDialog({ open, onOpenChange, tag, onConfirm }: DeleteTagDialogProps) {
    function confirmAction() {
        onOpenChange(false);
        onConfirm();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete tag</DialogTitle>
                    <DialogDescription>Are you sure you want to delete {tag ? "the" : "this"} tag{tag && ` "${tag.name}"`}? Any items with it will <span className="text-secondary-foreground font-bold">not</span> be removed.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>No</Button>
                    <Button onClick={confirmAction}>Yes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}