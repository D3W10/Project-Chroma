import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import emojiRegex from "emoji-regex";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { createAlbum } from "@/lib/invoker";
import { cn } from "@/lib/utils";

interface CreateAlbumDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateAlbumDialog({ open, onOpenChange }: CreateAlbumDialogProps) {
    const [newAlbumName, setNewAlbumName] = useState("");
    const [newAlbumColor, setNewAlbumColor] = useState(-1);
    const [newAlbumEmoji, setNewAlbumEmoji] = useState("📁");
    const [newAlbumCustomEmoji, setNewAlbumCustomEmoji] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();
    const { selectedLibrary } = useLibrary();
    const navigate = useNavigate();
    const { pushNoti } = useNotifications();

    function validateEmoji(e: React.ChangeEvent<HTMLInputElement>) {
        const inputValue = e.target.value;

        if (inputValue === "") {
            setNewAlbumCustomEmoji("");
            return;
        }

        const regex = emojiRegex();
        const emojis = inputValue.match(regex) ?? [];

        if (emojis.length > 0)
            setNewAlbumCustomEmoji(emojis[0] || "");
        else
            setNewAlbumCustomEmoji("");
    }

    async function handleCreateAlbum() {
        setIsProcessing(true);

        if (!selectedLibrary) return;

        const { data, error } = await createAlbum({
            libraryId: selectedLibrary.id,
            name: newAlbumName,
            description: "",
            parent: undefined,
            color: window.getComputedStyle(document.getElementById("albumColor")!.children[newAlbumColor]).backgroundColor,
            icon: newAlbumEmoji !== "" ? newAlbumEmoji : newAlbumCustomEmoji,
        });
        if (!error) {
            navigate({ to: "/albums/" + data.id });
            queryClient.invalidateQueries({ queryKey: ["albums"] });
            pushNoti("Album created", "The album \"" + newAlbumName + "\" was created successfully!", "success");
        } else
            onOpenChange(false);
    }

    useEffect(() => {
        if (open) {
            setNewAlbumName("");
            setNewAlbumColor(-1);
            setNewAlbumEmoji("📁");
            setNewAlbumCustomEmoji("");
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
                            <Input id="albumName" type="text" placeholder="Summer Trip" disabled={isProcessing} maxLength={35} value={newAlbumName} onChange={e => setNewAlbumName(e.currentTarget.value)} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="albumColor">Color</FieldLabel>
                            <div id="albumColor" className="flex gap-2">
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-red-500 border-2 border-red-500 hover:opacity-80 cursor-pointer", newAlbumColor === 0 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(0)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-orange-500 border-2 border-orange-500 hover:opacity-80 cursor-pointer", newAlbumColor === 1 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(1)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-yellow-500 border-2 border-yellow-500 hover:opacity-80 cursor-pointer", newAlbumColor === 2 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(2)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-lime-500 border-2 border-lime-500 hover:opacity-80 cursor-pointer", newAlbumColor === 3 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(3)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-emerald-500 border-2 border-emerald-500 hover:opacity-80 cursor-pointer", newAlbumColor === 4 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(4)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-sky-500 border-2 border-sky-500 hover:opacity-80 cursor-pointer", newAlbumColor === 5 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(5)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-blue-500 border-2 border-blue-500 hover:opacity-80 cursor-pointer", newAlbumColor === 6 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(6)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-violet-500 border-2 border-violet-500 hover:opacity-80 cursor-pointer", newAlbumColor === 7 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(7)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-fuchsia-500 border-2 border-fuchsia-500 hover:opacity-80 cursor-pointer", newAlbumColor === 8 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(8)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-pink-500 border-2 border-pink-500 hover:opacity-80 cursor-pointer", newAlbumColor === 9 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewAlbumColor(9)} />
                            </div>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="albumEmoji">Emoji</FieldLabel>
                            <div id="albumEmoji" className="flex justify-between">
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newAlbumEmoji === "📁" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewAlbumEmoji("📁")}>📁</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newAlbumEmoji === "⛺" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewAlbumEmoji("⛺")}>⛺</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newAlbumEmoji === "🌸" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewAlbumEmoji("🌸")}>🌸</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newAlbumEmoji === "✈️" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewAlbumEmoji("✈️")}>✈️</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newAlbumEmoji === "🌈" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewAlbumEmoji("🌈")}>🌈</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newAlbumEmoji === "🏞️" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewAlbumEmoji("🏞️")}>🏞️</Button>
                                <Input type="text" value={newAlbumCustomEmoji} className="size-14 p-1 text-2xl! text-center placeholder:opacity-20 focus-visible:placeholder:opacity-0" placeholder="📁" maxLength={4} disabled={isProcessing} onFocus={() => setNewAlbumEmoji("")} onChange={validateEmoji} />
                            </div>
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="w-30 flex justify-center relative" onClick={handleCreateAlbum} disabled={!newAlbumName.trim() || newAlbumColor < 0 || (!newAlbumEmoji && !newAlbumCustomEmoji.trim()) || isProcessing}>
                        <span className={isProcessing ? "opacity-0" : ""}>Create Album</span>
                        <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}