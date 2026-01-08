import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { createAlbum } from "@/lib/invoker";

interface CreateAlbumDialogProps {
    currentAlbum?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateAlbumDialog({ currentAlbum, open, onOpenChange }: CreateAlbumDialogProps) {
    const [albumName, setAlbumName] = useState("");
    const [albumColor, setAlbumColor] = useState("");
    const [albumEmoji, setAlbumEmoji] = useState("📁");
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();
    const { selectedLibrary } = useLibrary();
    const navigate = useNavigate();
    const { pushNoti } = useNotifications();

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
        if (!error) {
            navigate({ to: "/albums/" + data.id });
            queryClient.invalidateQueries({ queryKey: ["albums"] });
            pushNoti("Album created", "The album \"" + albumName + "\" was created successfully!", "success");
        }

        onOpenChange(false);
    }

    useEffect(() => {
        if (open) {
            setAlbumName("");
            setAlbumColor("");
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