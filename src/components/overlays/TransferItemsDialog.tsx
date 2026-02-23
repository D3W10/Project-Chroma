import { useEffect, useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { IconColor } from "@/components/custom/IconColor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { checkLibraryHealth } from "@/lib/invoker";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { cn } from "@/lib/utils";
import type { Item, Library } from "@/lib/models";

interface TransferItemsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selected: Item[];
}

const healthMapper: Record<string, string> = {
    notfound: "The library directory was not found",
    outdated: "This library is outdated and must be upgraded first",
    recent: "This library is too recent, you need to update the app",
    default: "An error occurred and this library could not be opened",
};

export function TransferItemsDialog({ open, onOpenChange, selected }: TransferItemsDialogProps) {
    const [targetLibrary, setTargetLibrary] = useState<Library>();
    const [libraryChecking, setLibraryChecking] = useState(false);
    const [libraryHealth, setLibraryHealth] = useState("");
    const [moveItems, setMoveItems] = useState(false);
    const action = useAction();
    const { selectedLibrary, libraries } = useLibrary();

    function handleMove() {
        if (!targetLibrary) return;
        action.transferItems(targetLibrary, selected.map(p => p.id), moveItems);
        onOpenChange(false);
    }

    useEffect(() => {
        (async () => {
            if (!targetLibrary) return;
            setLibraryHealth("");
            setLibraryChecking(true);

            const { error } = await checkLibraryHealth({ libraryId: targetLibrary.id });
            setLibraryHealth(error ?? "");
            setLibraryChecking(false);
        })();
    }, [targetLibrary]);

    useEffect(() => {
        if (!open) {
            setTargetLibrary(undefined);
            setMoveItems(false);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer items to another library</DialogTitle>
                    <DialogDescription>Select the destination library for the selected items. Make sure the library is accessible and up-to-date.</DialogDescription>
                </DialogHeader>
                <div>
                    <div className="mb-2 flex items-center">
                        <div className="px-6 py-4 flex flex-col justify-center items-center flex-1 gap-5">
                            <IconColor color={selectedLibrary?.color} size="2xl">{selectedLibrary?.icon}</IconColor>
                            <h3 className="pb-2 truncate text-lg font-semibold">{selectedLibrary?.name}</h3>
                        </div>
                        <IconArrowRight className="size-10 text-muted-foreground" />
                        <div className="px-8 py-4 flex flex-col justify-center items-center flex-1 gap-5">
                            <AnimatePresence initial={false} mode="wait">
                                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.2, ease: "easeOut" }} key={targetLibrary?.id}>
                                    <IconColor color={targetLibrary?.color} size="2xl">{targetLibrary?.icon}</IconColor>
                                </motion.div>
                            </AnimatePresence>
                            <Select value={targetLibrary?.id} onValueChange={v => setTargetLibrary(libraries.find(p => p.id === v))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select library" />
                                </SelectTrigger>
                                <SelectContent>
                                    {libraries
                                        .filter(p => p.id !== selectedLibrary?.id)
                                        .map((p, i) => (
                                            <SelectItem key={i} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className={cn("w-full text-secondary-foreground bg-foreground/5 rounded-lg font-mono text-xs ring-input select-text overflow-x-auto transition-all", libraryHealth !== "" ? "h-8.75 mb-4 px-3 py-2.5 ring-1" : "h-0")}>
                        {libraryHealth ? (healthMapper[libraryHealth] ?? healthMapper.default) : ""}
                    </div>
                    <FieldSet>
                        <FieldGroup className="gap-3">
                            <Field orientation="horizontal">
                                <Checkbox id="optionMoveItems" checked={moveItems} onCheckedChange={checked => setMoveItems(checked === true)} />
                                <FieldLabel htmlFor="optionMoveItems">Remove the original items after transfer</FieldLabel>
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="w-26" disabled={!targetLibrary || !!libraryHealth || selected.length === 0} onClick={handleMove}>
                        {!libraryChecking
                            ? (!moveItems ? "Copy" : "Move") + " items"
                            : <Spinner />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}