import { useState } from "react";
import colors from "tailwindcss/colors";
import { Button } from "@project-chroma/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@project-chroma/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@project-chroma/ui/field";
import { Input } from "@project-chroma/ui/input";
import { Spinner } from "@project-chroma/ui/spinner";
import { ColorPicker } from "@/components/ColorPicker";
import { EmojiPicker } from "@/components/EmojiPicker";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import type { Album } from "@project-chroma/contracts/gallery";

interface CreateAlbumDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
    currentAlbum?: string;
    onSuccess?: (album: Album) => unknown;
}

export function CreateAlbumDialog(props: CreateAlbumDialogProps) {
    const { open, ...rest } = props;

    return (
        <Dialog open={open} onOpenChange={rest.onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create new album</DialogTitle>
                    <DialogDescription>An album groups together multiple items for better organization. You can also create albums inside other albums as if they were folders</DialogDescription>
                </DialogHeader>
                <CreateAlbumDialogBody {...rest} />
            </DialogContent>
        </Dialog>
    );
}

function CreateAlbumDialogBody({ currentAlbum, onOpenChange, onSuccess }: Omit<CreateAlbumDialogProps, "open">) {
    const [albumName, setAlbumName] = useState("");
    const [albumColor, setAlbumColor] = useState(colors.slate[500]);
    const [albumEmoji, setAlbumEmoji] = useState("📁");
    const [isProcessing, setIsProcessing] = useState(false);
    const action = useAction();
    const { selectedLibrary } = useLibrary();

    async function handleCreateAlbum() {
        setIsProcessing(true);

        try {
            if (!selectedLibrary) return;

            const data = await action.createAlbum({
                name: albumName,
                description: "",
                parent: currentAlbum,
                selectedCover: 0,
                selectedBanner: 0,
                icon: albumEmoji,
                color: albumColor,
                createdAt: new Date().toISOString(),
            });
            if (data) onSuccess?.(data);
        } finally {
            setIsProcessing(false);
        }

        onOpenChange(false);
    }

    return (
        <>
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
            <DialogFooter>
                <Button variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button className="w-30 flex justify-center relative" onClick={handleCreateAlbum} disabled={!albumName.trim() || !albumColor.trim() || !albumEmoji.trim() || isProcessing}>
                    <span className={isProcessing ? "opacity-0" : ""}>Create Album</span>
                    <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                </Button>
            </DialogFooter>
        </>
    );
}
