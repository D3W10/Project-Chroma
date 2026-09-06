import { useActionState, useState } from "react";
import colors from "tailwindcss/colors";
import { Button } from "@project-chroma/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@project-chroma/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@project-chroma/ui/field";
import { Input } from "@project-chroma/ui/input";
import { Spinner } from "@project-chroma/ui/spinner";
import { cn, Errors, toAppError, type AppError } from "@project-chroma/utils";
import { ColorPicker } from "@/components/ColorPicker";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import type { Tag } from "@project-chroma/contracts/gallery";

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
                <CreateTagDialogBody key={`${rest.currentData?.id ?? "new"}:${open}`} {...rest} />
            </DialogContent>
        </Dialog>
    );
}

function CreateTagDialogBody({ onOpenChange, currentData, onSuccess }: Omit<CreateTagDialogProps, "open">) {
    const [tagName, setTagName] = useState(() => currentData?.name ?? "");
    const [tagColor, setTagColor] = useState(() => currentData?.color ?? colors.slate[500]);
    const action = useAction();
    const { selectedLibrary } = useLibrary();

    const [error, submit, isProcessing] = useActionState<AppError | undefined, FormData>(async () => {
        try {
            if (!selectedLibrary) return Errors.libraryNotFound();

            if (!currentData) await action.createTag(tagName, tagColor);
            else await action.updateTag(currentData.id, { name: tagName, color: tagColor });
        } catch (error) {
            return toAppError(error);
        }

        onSuccess?.();
        onOpenChange(false);
        return undefined;
    }, undefined);

    return (
        <form action={submit}>
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
            {error && <p className="mt-3 text-sm text-destructive">{error.message ?? error.title}</p>}
            <DialogFooter>
                <Button type="button" variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button type="submit" className={cn("flex justify-center relative", !currentData ? "w-24" : "w-22")} disabled={!tagName.trim() || !tagColor.trim() || isProcessing}>
                    <span className={isProcessing ? "opacity-0" : ""}>{!currentData ? "Create tag" : "Edit tag"}</span>
                    <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                </Button>
            </DialogFooter>
        </form>
    );
}
