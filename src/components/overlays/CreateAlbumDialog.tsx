import { useEffect, useState } from "react";
import colors from "tailwindcss/colors";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ColorPicker } from "@/components/custom/ColorPicker";
import { EmojiPicker } from "@/components/custom/EmojiPicker";
import { useLibrary } from "@/lib/useLibrary";
import { createAlbum } from "@/lib/invoker";
import type { Album } from "@/lib/models";

interface CreateAlbumDialogProps {
    currentAlbum?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (album: Album) => void;
}

export function CreateAlbumDialog({ currentAlbum, open, onOpenChange, onSuccess }: CreateAlbumDialogProps) {
    const [albumName, setAlbumName] = useState("");
    const [albumColor, setAlbumColor] = useState(colors.slate[500]);
    const [albumEmoji, setAlbumEmoji] = useState("📁");
    const [isProcessing, setIsProcessing] = useState(false);
    const { selectedLibrary } = useLibrary();

    async function handleCreateAlbum() {
        setIsProcessing(true);

        if (!selectedLibrary) return;

        const { data, error } = await createAlbum({
            libraryId: selectedLibrary.id,
            name: albumName,
            description: "",
            parent: currentAlbum,
            color: albumColor,
            icon: albumEmoji,
        });
        if (!error)
            onSuccess?.(data);

        onOpenChange(false);
    }

    useEffect(() => {
        if (open) {
            setAlbumName("");
            setAlbumColor(colors.slate[500]);
            setAlbumEmoji("📁");
            setIsProcessing(false);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create new album</DialogTitle>
                    <DialogDescription>An album groups together multiple items for better organization. You can also create albums inside other albums as if they were folders</DialogDescription>
                </DialogHeader>
                <FieldSet>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="albumName">Name</FieldLabel>
                            <Input id="albumName" type="text" placeholder="Summer Trip" disabled={isProcessing} maxLength={35} value={albumName} onChange={e => setAlbumName(e.currentTarget.value)} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="albumColor">Color</FieldLabel>
                            <ColorPicker id="albumColor" disabled={isProcessing} color={albumColor} onColorSelect={setAlbumColor} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="albumEmoji">Emoji</FieldLabel>
                            <EmojiPicker id="albumEmoji" disabled={isProcessing} emoji={albumEmoji} onEmojiSelect={setAlbumEmoji} options={["📁", "⛺", "🌸", "✈️", "🌈", "🏞️"]} />
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="w-30 flex justify-center relative" onClick={handleCreateAlbum} disabled={!albumName.trim() || !albumColor.trim() || !albumEmoji.trim() || isProcessing}>
                        <span className={isProcessing ? "opacity-0" : ""}>Create Album</span>
                        <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}