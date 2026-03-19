import { useState } from "react";
import colors from "tailwindcss/colors";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ColorPicker } from "@/components/custom/ColorPicker";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/models";

interface CreateTagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
    currentData?: Tag;
    onSuccess?: () => unknown;
}

export function CreateTagDialog(props: CreateTagDialogProps) {
    const { open, ...rest } = props;

    return (
        <Dialog open={open} onOpenChange={rest.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{!rest.currentData ? "Create new tag" : "Edit tag"}</DialogTitle>
                    <DialogDescription>A tag allows you to add labels to items to better organize and categorize items. Multiple items can have multiple tags.</DialogDescription>
                </DialogHeader>
                <CreateTagDialogBody {...rest} />
            </DialogContent>
        </Dialog>
    );
}

function CreateTagDialogBody({ onOpenChange, currentData, onSuccess }: Omit<CreateTagDialogProps, "open">) {
    const [tagName, setTagName] = useState(() => currentData?.name ?? "");
    const [tagColor, setTagColor] = useState(() => currentData?.color ?? colors.slate[500]);
    const [isProcessing, setIsProcessing] = useState(false);
    const action = useAction();
    const { selectedLibrary } = useLibrary();

    async function handleCreateAlbum() {
        setIsProcessing(true);

        try {
            if (!selectedLibrary) return;

            if (!currentData)
                await action.createTag(tagName, tagColor);
            else
                await action.updateTag(currentData.id, { name: tagName, color: tagColor });
        } finally {
            setIsProcessing(false);
        }

        onSuccess?.();
        onOpenChange(false);
    }

    return (
        <>
            <FieldSet>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="tagName">Name</FieldLabel>
                        <Input id="tagName" type="text" placeholder="Organized" disabled={isProcessing} maxLength={20} value={tagName} onChange={e => setTagName(e.currentTarget.value)} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="tagColor">Color</FieldLabel>
                        <ColorPicker id="tagColor" disabled={isProcessing} color={tagColor} onColorSelect={setTagColor} />
                    </Field>
                </FieldGroup>
            </FieldSet>
            <DialogFooter>
                <Button variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button className={cn("flex justify-center relative", !currentData ? "w-24" : "w-22")} onClick={handleCreateAlbum} disabled={!tagName.trim() || !tagColor.trim() || isProcessing}>
                    <span className={isProcessing ? "opacity-0" : ""}>{!currentData ? "Create tag" : "Edit tag"}</span>
                    <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                </Button>
            </DialogFooter>
        </>
    );
}