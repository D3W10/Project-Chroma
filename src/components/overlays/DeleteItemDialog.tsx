import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DeleteItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: unknown[];
    onConfirm: () => unknown;
}

export function DeleteItemDialog({ open, onOpenChange, items, onConfirm }: DeleteItemDialogProps) {
    function confirmAction() {
        onOpenChange(false);
        onConfirm();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-110">
                <DialogHeader>
                    <DialogTitle>Delete items</DialogTitle>
                    <DialogDescription>Are you sure you want to delete {items.length == 1 ? "this item" : `${items.length} items`}? You cannot recover them after deletion!</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>No</Button>
                    <Button onClick={confirmAction}>Yes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}