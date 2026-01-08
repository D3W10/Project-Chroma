import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ColorPicker } from "@/components/custom/ColorPicker";
import { EmojiPicker } from "@/components/custom/EmojiPicker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { createLibrary } from "@/lib/invoker";

interface CreateLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateLibraryDialog({ open, onOpenChange }: CreateLibraryDialogProps) {
    const [libraryName, setLibraryName] = useState("");
    const [libraryColor, setLibraryColor] = useState("");
    const [libraryEmoji, setLibraryEmoji] = useState("");
    const [libraryLocation, setLibraryLocation] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();
    const { setPendingLibraryId } = useLibrary();
    const { pushNoti } = useNotifications();

    async function selectLocation() {
        try {
            const selected = await save({
                defaultPath: libraryName,
                canCreateDirectories: true,
            });

            if (selected) {
                const dir = /^[\s\S]+\//g.exec(selected)?.[0] ?? "";

                if (dir)
                    setLibraryLocation(dir);
            }
        } catch (err) {
            console.error(err);
            pushNoti("Import error", "Failed to open the system file dialog", "error");
        }
    }

    async function handleCreateLibrary() {
        setIsProcessing(true);

        const { data, error } = await createLibrary({
            name: libraryName,
            icon: libraryEmoji,
            color: libraryColor,
            path: libraryLocation + libraryName,
        });
        if (!error) {
            setPendingLibraryId(data.id);
            queryClient.invalidateQueries({ queryKey: ["libraries"] });
            pushNoti("Library created", "The library \"" + libraryName + "\" was created successfully!", "success");
        } else
            onOpenChange(false);
    }

    useEffect(() => {
        if (open) {
            setLibraryName("");
            setLibraryColor("");
            setLibraryEmoji("");
            setLibraryLocation("");
            setIsProcessing(false);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create new library</DialogTitle>
                    <DialogDescription>A library is where you store all your photos, videos and albums. You may create multiple libraries if you want to store items on different locations</DialogDescription>
                </DialogHeader>
                <FieldSet>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="libraryName">Name</FieldLabel>
                            <Input id="libraryName" type="text" placeholder="External Drive" disabled={isProcessing} maxLength={25} value={libraryName} onChange={e => setLibraryName(e.currentTarget.value)} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="libraryColor">Color</FieldLabel>
                            <ColorPicker id="libraryColor" disabled={isProcessing} color={libraryColor} onColorSelect={setLibraryColor} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="libraryEmoji">Emoji</FieldLabel>
                            <EmojiPicker id="libraryEmoji" disabled={isProcessing} emoji={libraryEmoji} onEmojiSelect={setLibraryEmoji} options={["📷", "🎨", "⛰️", "🏖️", "⭐", "💎"]} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="libraryLocation">Location</FieldLabel>
                            <div id="libraryLocation" className="flex gap-2">
                                <Button variant="outline" disabled={isProcessing} onClick={selectLocation}>Select Location</Button>
                                <div className="px-3 py-2 flex-1 rounded-md text-secondary-foreground text-sm font-mono ring-1 ring-input select-text overflow-x-auto">
                                    {libraryLocation}
                                </div>
                            </div>
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="w-30 flex justify-center relative" onClick={handleCreateLibrary} disabled={!libraryName.trim() || !libraryColor.trim() || !libraryEmoji.trim() || !libraryLocation || isProcessing}>
                        <span className={isProcessing ? "opacity-0" : ""}>Create Library</span>
                        <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}