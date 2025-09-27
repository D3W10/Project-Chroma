import { useState, type CSSProperties } from "react";
import { useLocation } from "@tanstack/react-router";
import { ChevronUpDown16Regular } from "@fluentui/react-icons";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLibrary } from "@/lib/useLibrary";
import type { Library } from "@/lib/models";

export function Framebar({ libraries }: { libraries: Library[] }) {
    const [open, setOpen] = useState(false);
    const [createLibraryOpen, setCreateLibraryOpen] = useState(false);
    const { selectedLibrary, setSelectedLibrary } = useLibrary();
    const location = useLocation();

    const handleLibrarySelect = (libraryId: string) => {
        const newLibrary = libraries.find(lib => lib.id === libraryId);
        if (newLibrary && newLibrary.id !== selectedLibrary?.id)
            setSelectedLibrary(newLibrary);

        setOpen(false);
    };

    return (
        <div className="w-full h-12 flex items-center" data-tauri-drag-region>
            {libraries.length > 0 && !location.pathname.startsWith("/onboarding") && (
                <>
                    <div className="w-26"></div>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="w-50 py-1.5 justify-between" role="combobox" aria-expanded={open}>
                                <div className={"h-full flex items-center gap-2 " + (!selectedLibrary ? "text-muted-foreground" : "")}>
                                    <div className="size-6 flex justify-center items-center ring-2 rounded-sm aspect-square" style={{ backgroundColor: `color-mix(in oklch, ${selectedLibrary ? selectedLibrary.color : "var(--color-slate-200)"}, transparent 60%)`, "--tw-ring-color": `color-mix(in oklch, ${selectedLibrary ? selectedLibrary.color : "var(--color-slate-200)"}, transparent 40%)` } as CSSProperties}>
                                        <span className="text-sm drop-shadow-sm">{selectedLibrary ? selectedLibrary.icon : "📁"}</span>
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
                                                <div className="size-6 flex justify-center items-center ring-2 rounded-sm aspect-square" style={{ backgroundColor: `color-mix(in oklch, ${lib.color}, transparent 60%)`, "--tw-ring-color": `color-mix(in oklch, ${lib.color}, transparent 40%)` } as CSSProperties}>
                                                    <span className="text-sm drop-shadow-sm">{lib.icon}</span>
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