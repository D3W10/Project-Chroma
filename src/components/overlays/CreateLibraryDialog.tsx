import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { useQueryClient } from "@tanstack/react-query";
import emojiRegex from "emoji-regex";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { createLibrary } from "@/lib/invoker";
import { cn } from "@/lib/utils";

interface CreateLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateLibraryDialog({ open, onOpenChange }: CreateLibraryDialogProps) {
    const [newLibraryName, setNewLibraryName] = useState("");
    const [newLibraryColor, setNewLibraryColor] = useState(-1);
    const [newLibraryEmoji, setNewLibraryEmoji] = useState("");
    const [newLibraryCustomEmoji, setNewLibraryCustomEmoji] = useState("");
    const [newLibraryLocation, setNewLibraryLocation] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();
    const { setPendingLibraryId } = useLibrary();
    const { pushNoti } = useNotifications();

    function validateEmoji(e: React.ChangeEvent<HTMLInputElement>) {
        const inputValue = e.target.value;

        if (inputValue === "") {
            setNewLibraryCustomEmoji("");
            return;
        }

        const regex = emojiRegex();
        const emojis = inputValue.match(regex) ?? [];

        if (emojis.length > 0)
            setNewLibraryCustomEmoji(emojis[0] || "");
        else
            setNewLibraryCustomEmoji("");
    }

    async function selectLocation() {
        try {
            const selected = await save({
                defaultPath: newLibraryName,
                canCreateDirectories: true,
            });

            if (selected) {
                const dir = /^[\s\S]+\//g.exec(selected)?.[0] ?? "";

                if (dir)
                    setNewLibraryLocation(dir);
            }
        } catch (err) {
            console.error(err);
            pushNoti("Import error", "Failed to open the system file dialog", "error");
        }
    }

    async function handleCreateLibrary() {
        setIsProcessing(true);

        const { data, error } = await createLibrary({
            name: newLibraryName,
            icon: newLibraryEmoji !== "" ? newLibraryEmoji : newLibraryCustomEmoji,
            color: window.getComputedStyle(document.getElementById("libraryColor")!.children[newLibraryColor]).backgroundColor,
            path: newLibraryLocation + newLibraryName,
        });
        if (!error) {
            setPendingLibraryId(data.id);
            queryClient.invalidateQueries({ queryKey: ["libraries"] });
            pushNoti("Library created", "The library \"" + newLibraryName + "\" was created successfully!", "success");
        } else
            onOpenChange(false);
    }

    useEffect(() => {
        if (open) {
            setNewLibraryName("");
            setNewLibraryColor(-1);
            setNewLibraryEmoji("");
            setNewLibraryCustomEmoji("");
            setNewLibraryLocation("");
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
                            <Input id="libraryName" type="text" placeholder="External Drive" disabled={isProcessing} maxLength={25} value={newLibraryName} onChange={e => setNewLibraryName(e.currentTarget.value)} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="libraryColor">Color</FieldLabel>
                            <div id="libraryColor" className="flex gap-2">
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-red-500 border-2 border-red-500 hover:opacity-80 cursor-pointer", newLibraryColor === 0 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(0)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-orange-500 border-2 border-orange-500 hover:opacity-80 cursor-pointer", newLibraryColor === 1 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(1)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-yellow-500 border-2 border-yellow-500 hover:opacity-80 cursor-pointer", newLibraryColor === 2 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(2)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-lime-500 border-2 border-lime-500 hover:opacity-80 cursor-pointer", newLibraryColor === 3 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(3)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-emerald-500 border-2 border-emerald-500 hover:opacity-80 cursor-pointer", newLibraryColor === 4 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(4)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-sky-500 border-2 border-sky-500 hover:opacity-80 cursor-pointer", newLibraryColor === 5 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(5)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-blue-500 border-2 border-blue-500 hover:opacity-80 cursor-pointer", newLibraryColor === 6 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(6)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-violet-500 border-2 border-violet-500 hover:opacity-80 cursor-pointer", newLibraryColor === 7 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(7)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-fuchsia-500 border-2 border-fuchsia-500 hover:opacity-80 cursor-pointer", newLibraryColor === 8 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(8)} />
                                <Button variant="link" className={cn("h-6 flex-1 rounded-md bg-pink-500 border-2 border-pink-500 hover:opacity-80 cursor-pointer", newLibraryColor === 9 ? "inset-ring-2 inset-ring-background" : "")} disabled={isProcessing} onClick={() => setNewLibraryColor(9)} />
                            </div>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="libraryEmoji">Emoji</FieldLabel>
                            <div id="libraryEmoji" className="flex justify-between">
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newLibraryEmoji === "📷" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewLibraryEmoji("📷")}>📷</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newLibraryEmoji === "🎨" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewLibraryEmoji("🎨")}>🎨</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newLibraryEmoji === "⛰️" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewLibraryEmoji("⛰️")}>⛰️</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newLibraryEmoji === "🏖️" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewLibraryEmoji("🏖️")}>🏖️</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newLibraryEmoji === "⭐" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewLibraryEmoji("⭐")}>⭐</Button>
                                <Button variant="outline" size="icon" className={cn("size-14 text-2xl", newLibraryEmoji === "💎" ? "ring-2 ring-primary" : "")} disabled={isProcessing} onClick={() => setNewLibraryEmoji("💎")}>💎</Button>
                                <Input type="text" value={newLibraryCustomEmoji} className="size-14 p-1 text-2xl! text-center placeholder:opacity-20 focus-visible:placeholder:opacity-0" placeholder="📁" maxLength={4} disabled={isProcessing} onFocus={() => setNewLibraryEmoji("")} onChange={validateEmoji} />
                            </div>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="libraryLocation">Location</FieldLabel>
                            <div id="libraryLocation" className="flex gap-2">
                                <Button variant="outline" disabled={isProcessing} onClick={selectLocation}>Select Location</Button>
                                <div className="px-3 py-2 flex-1 rounded-md font-mono text-sm ring-1 ring-input select-text overflow-x-auto">
                                    {newLibraryLocation}
                                </div>
                            </div>
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" disabled={isProcessing} onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="w-30 flex justify-center relative" onClick={handleCreateLibrary} disabled={!newLibraryName.trim() || newLibraryColor < 0 || (!newLibraryEmoji && !newLibraryCustomEmoji.trim()) || !newLibraryLocation || isProcessing}>
                        <span className={isProcessing ? "opacity-0" : ""}>Create Library</span>
                        <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}