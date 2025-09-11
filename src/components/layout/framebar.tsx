import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronUpDown16Regular } from "@fluentui/react-icons";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getLibraries } from "@/lib/invoker";
import { notifyFromError, notifyWarning } from "@/lib/notifications";
import { useLibrary } from "@/lib/useLibrary";
import type { Library } from "@/lib/models";

export function Framebar() {
    const [open, setOpen] = useState(false);
    const [createLibraryOpen, setCreateLibraryOpen] = useState(false);
    const [libraries, setLibraries] = useState<Library[]>([]);
    const { selectedLibrary, setSelectedLibrary } = useLibrary();
    const location = useLocation();

    const { error, data } = useQuery({
        queryKey: ["libraries"],
        queryFn: getLibraries,
    });

    useEffect(() => {
        if (error)
            notifyFromError(error, "Failed to load libraries");
    }, [error]);

    useEffect(() => {
        setLibraries(data ?? []);
    }, [data]);

    const handleLibrarySelect = (libraryId: string) => {
        const newLibrary = libraries.find(lib => lib.id === libraryId);
        if (newLibrary && newLibrary.id !== selectedLibrary?.id)
            setSelectedLibrary(newLibrary);

        setOpen(false);
    };

    return (
        <div className="w-full h-12 flex items-center" data-tauri-drag-region>
            {!location.pathname.startsWith("/onboarding") && (
                <>
                    <div className="w-24"></div>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                role="combobox"
                                aria-expanded={open}
                                className="w-50 py-1.5 justify-between"
                            >
                                <div className={"h-full flex items-center gap-2 " + (!selectedLibrary ? "text-muted-foreground" : "")}>
                                    <div className="h-full flex justify-center items-center text-sm rounded-sm aspect-square" style={{ backgroundColor: selectedLibrary ? selectedLibrary.color : "var(--color-slate-200)" }}>
                                        {selectedLibrary ? selectedLibrary.icon : "📁"}
                                    </div>
                                    {selectedLibrary ? selectedLibrary.name : "Select library..."}
                                </div>
                                <ChevronUpDown16Regular className="opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-50 p-0">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        {libraries.map(lib => (
                                            <CommandItem key={lib.id} value={lib.id} onSelect={handleLibrarySelect}>
                                                <div className="size-6 flex justify-center items-center text-sm rounded-sm aspect-square" style={{ backgroundColor: lib.color }}>
                                                    {lib.icon}
                                                </div>
                                                {lib.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    <CommandSeparator />
                                    <CommandGroup>
                                        <CommandItem value="Create new library" onSelect={() => setCreateLibraryOpen(true)}>
                                            Create new library
                                        </CommandItem>
                                        <Dialog open={createLibraryOpen} onOpenChange={setCreateLibraryOpen}>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                                                    <DialogDescription>
                                                        This action cannot be undone. This will permanently delete your account
                                                        and remove your data from our servers.
                                                    </DialogDescription>
                                                </DialogHeader>
                                            </DialogContent>
                                        </Dialog>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </>
            )}
        </div>
    );
}