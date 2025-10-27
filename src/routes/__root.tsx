import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import emojiRegex from "emoji-regex";
import { Framebar } from "@/components/layout/framebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/custom/Spinner";
import { createLibrary, getLibraries, getSelectedLibrary, setSelectedLibrary as setSelectedLibraryOnConfig } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import type { Library } from "@/lib/models";

export const Route = createRootRouteWithContext<{
    selectedLibrary: Library | null;
}>()({
    component: RootComponent,
});

const libColors = ["red-500", "orange-500", "yellow-500", "lime-500", "emerald-500", "sky-500", "blue-500", "violet-500", "fuchsia-500", "pink-500"];
const libEmojis = ["📷", "🎨", "⛰️", "🏖️", "⭐", "💎"];

function RootComponent() {
    const [newLibraryName, setNewLibraryName] = useState("");
    const [newLibraryColor, setNewLibraryColor] = useState(-1);
    const [newLibraryEmoji, setNewLibraryEmoji] = useState(-1);
    const [newLibraryCustomEmoji, setNewLibraryCustomEmoji] = useState("");
    const [newLibraryLocation, setNewLibraryLocation] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const { libraries, setLibraries, selectedLibrary, setSelectedLibrary, openCreateLibrary, setOpenCreateLibrary, pendingLibraryId, setPendingLibraryId } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ["libraries"],
        queryFn: getLibraries,
    });

    const { data: dataSel } = useQuery({
        queryKey: ["selected-library"],
        queryFn: getSelectedLibrary,
    });

    function validateEmoji(e: React.ChangeEvent<HTMLInputElement>) {
        const inputValue = e.target.value;

        setNewLibraryEmoji(6);
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

        const { data, error } = await createLibrary(newLibraryName, newLibraryEmoji !== 6 ? libEmojis[newLibraryEmoji] : newLibraryCustomEmoji, libColors[newLibraryColor], newLibraryLocation + newLibraryName);
        if (!error) {
            setPendingLibraryId(data.id);
            queryClient.invalidateQueries({ queryKey: ["libraries"] });
            pushNoti("Library created", "The library " + newLibraryName + " was created successfully!", "success");
        } else
            setOpenCreateLibrary(false);
    }

    useEffect(() => {
        setLibraries(data?.data ?? []);
    }, [data]);

    useEffect(() => {
        if (!data) return;

        if (pendingLibraryId) {
            const pendingLibrary = data?.data?.find(e => e.id === pendingLibraryId);

            if (pendingLibrary) {
                setSelectedLibrary(pendingLibrary);
                setPendingLibraryId(null);
                setOpenCreateLibrary(false);
                return;
            }
        }

        setSelectedLibrary(data?.data?.find(e => e.id === dataSel?.data) ?? null);
    }, [data, dataSel]);

    useEffect(() => {
        setSelectedLibraryOnConfig(selectedLibrary?.id ?? null);
    }, [selectedLibrary]);

    useEffect(() => {
        if (openCreateLibrary) {
            setNewLibraryName("");
            setNewLibraryColor(-1);
            setNewLibraryEmoji(-1);
            setNewLibraryCustomEmoji("");
            setNewLibraryLocation("");
            setIsProcessing(false);
        }
    }, [openCreateLibrary]);

    return (
        <>
            <Framebar libraries={libraries} />
            <Outlet />
            <TanStackRouterDevtools />
            <Dialog open={openCreateLibrary} onOpenChange={setOpenCreateLibrary}>
                <DialogContent showCloseButton={false} onInteractOutside={e => isProcessing && e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Create new library</DialogTitle>
                        <DialogDescription>A library is where you store all your photos and albums. You may create multiple libraries if you want to store photos on different locations</DialogDescription>
                    </DialogHeader>
                    <FieldSet>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="name">Name</FieldLabel>
                                <Input id="name" type="text" placeholder="External Drive" disabled={isProcessing} value={newLibraryName} onChange={e => setNewLibraryName(e.currentTarget.value)} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="color">Color</FieldLabel>
                                <div id="color" className="flex gap-2">
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-red-500 border-2 border-red-500 hover:opacity-80 ${newLibraryColor === 0 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(0)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-orange-500 border-2 border-orange-500 hover:opacity-80 ${newLibraryColor === 1 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(1)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-yellow-500 border-2 border-yellow-500 hover:opacity-80 ${newLibraryColor === 2 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(2)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-lime-500 border-2 border-lime-500 hover:opacity-80 ${newLibraryColor === 3 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(3)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-emerald-500 border-2 border-emerald-500 hover:opacity-80 ${newLibraryColor === 4 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(4)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-sky-500 border-2 border-sky-500 hover:opacity-80 ${newLibraryColor === 5 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(5)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-blue-500 border-2 border-blue-500 hover:opacity-80 ${newLibraryColor === 6 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(6)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-violet-500 border-2 border-violet-500 hover:opacity-80 ${newLibraryColor === 7 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(7)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-fuchsia-500 border-2 border-fuchsia-500 hover:opacity-80 ${newLibraryColor === 8 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(8)} />
                                    <Button variant="link" className={`h-6 flex-1 rounded-md bg-pink-500 border-2 border-pink-500 hover:opacity-80 ${newLibraryColor === 9 ? "inset-ring-2 inset-ring-background" : ""} cursor-pointer`} disabled={isProcessing} onClick={() => setNewLibraryColor(9)} />
                                </div>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="emoji">Emoji</FieldLabel>
                                <div id="emoji" className="flex justify-between">
                                    <Button variant="outline" size="icon" className={`size-14 text-2xl ${newLibraryEmoji === 0 ? "ring-2 ring-primary" : ""}`} disabled={isProcessing} onClick={() => setNewLibraryEmoji(0)}>📷</Button>
                                    <Button variant="outline" size="icon" className={`size-14 text-2xl ${newLibraryEmoji === 1 ? "ring-2 ring-primary" : ""}`} disabled={isProcessing} onClick={() => setNewLibraryEmoji(1)}>🎨</Button>
                                    <Button variant="outline" size="icon" className={`size-14 text-2xl ${newLibraryEmoji === 2 ? "ring-2 ring-primary" : ""}`} disabled={isProcessing} onClick={() => setNewLibraryEmoji(2)}>⛰️</Button>
                                    <Button variant="outline" size="icon" className={`size-14 text-2xl ${newLibraryEmoji === 3 ? "ring-2 ring-primary" : ""}`} disabled={isProcessing} onClick={() => setNewLibraryEmoji(3)}>🏖️</Button>
                                    <Button variant="outline" size="icon" className={`size-14 text-2xl ${newLibraryEmoji === 4 ? "ring-2 ring-primary" : ""}`} disabled={isProcessing} onClick={() => setNewLibraryEmoji(4)}>⭐</Button>
                                    <Button variant="outline" size="icon" className={`size-14 text-2xl ${newLibraryEmoji === 5 ? "ring-2 ring-primary" : ""}`} disabled={isProcessing} onClick={() => setNewLibraryEmoji(5)}>💎</Button>
                                    <Input type="text" value={newLibraryCustomEmoji} className="size-14 p-1 text-2xl! text-center placeholder:opacity-20 focus-visible:placeholder:opacity-0" placeholder="📁" maxLength={4} disabled={isProcessing} onFocus={() => setNewLibraryEmoji(6)} onChange={validateEmoji} />
                                </div>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="location">Location</FieldLabel>
                                <div id="location" className="flex gap-2">
                                    <Button variant="outline" disabled={isProcessing} onClick={selectLocation}>Select Location</Button>
                                    <div className="px-3 py-2 flex-1 rounded-md font-mono text-sm ring-1 ring-input select-text overflow-x-auto">
                                        {newLibraryLocation}
                                    </div>
                                </div>
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" disabled={isProcessing} onClick={() => setOpenCreateLibrary(false)}>Cancel</Button>
                        <Button className="w-30 flex justify-center relative" onClick={handleCreateLibrary} disabled={!newLibraryName.trim() || newLibraryColor < 0 || newLibraryEmoji < 0 || (newLibraryEmoji === 6 && !newLibraryCustomEmoji.trim()) || !newLibraryLocation || isProcessing}>
                            <span className={isProcessing ? "opacity-0" : ""}>Create Library</span>
                            <Spinner className={`absolute ${!isProcessing ? "opacity-0" : "opacity-100"}`} />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}