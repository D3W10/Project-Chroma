import { useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "@tanstack/react-router";
import { ChevronUpDown16Regular, Settings24Regular, TextBulletListSquare24Regular } from "@fluentui/react-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/custom/Spinner";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { NotificationCenter } from "@/components/custom/NotificationCenter";
import type { Library, Notification } from "@/lib/models";

export function Framebar({ libraries }: { libraries: Library[] }) {
    const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
    const [peekNotification, setPeekNotification] = useState<Notification | null>(null);
    const { selectedLibrary, setSelectedLibrary, setOpenCreateLibrary } = useLibrary();
    const { notifications, isOpen, setIsOpen } = useNotifications();
    const location = useLocation();

    const handleLibrarySelect = (libraryId: string) => {
        const newLibrary = libraries.find(lib => lib.id === libraryId);
        if (newLibrary && newLibrary.id !== selectedLibrary?.id)
            setSelectedLibrary(newLibrary);

        setIsLibraryPanelOpen(false);
    };

    function handleCreateLibrary() {
        setIsLibraryPanelOpen(false);
        setOpenCreateLibrary(true);
    }

    useEffect(() => {
        setPeekNotification(notifications.find(n => n.type === "promise") || null);
    }, [notifications]);

    useEffect(() => {
        toast.dismiss();
    }, [isOpen]);

    return (
        <div className="w-full h-12 min-h-12 pl-26 pr-1.5 flex justify-between items-center" data-tauri-drag-region>
            <div className="flex items-center">
                {libraries.length > 0 && !location.pathname.startsWith("/onboarding") && (
                    <Popover open={isLibraryPanelOpen} onOpenChange={setIsLibraryPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="w-50 py-1.5 justify-between" role="combobox" aria-expanded={isLibraryPanelOpen}>
                                <div className={"h-full flex items-center gap-2 " + (!selectedLibrary ? "text-muted-foreground" : "")}>
                                    <div className="size-6 flex justify-center items-center bg-(--lib-color)/50 ring-2 ring-(--lib-color) rounded-sm aspect-square" style={{ "--lib-color": `var(--color-${selectedLibrary ? selectedLibrary.color : "slate-500"})` } as CSSProperties}>
                                        <span className="text-sm drop-shadow-sm">{selectedLibrary ? selectedLibrary.icon : "📁"}</span>
                                    </div>
                                    {selectedLibrary ? selectedLibrary.name : "Select library..."}
                                </div>
                                <ChevronUpDown16Regular className="text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-50 p-0">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        {libraries.map(lib => (
                                            <CommandItem key={lib.id} value={lib.id} onSelect={handleLibrarySelect}>
                                                <div className="size-6 flex justify-center items-center bg-(--lib-color)/50 ring-2 ring-(--lib-color) rounded-sm aspect-square" style={{ "--lib-color": `var(--color-${lib.color})` } as CSSProperties}>
                                                    <span className="text-sm drop-shadow-sm">{lib.icon}</span>
                                                </div>
                                                {lib.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    <CommandSeparator />
                                    <CommandGroup>
                                        <CommandItem value="Create new library" onSelect={handleCreateLibrary}>
                                            Create new library
                                        </CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
            <div className="flex items-center gap-1">
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className={`text-muted-foreground ${peekNotification ? "w-auto px-3" : ""}`}>
                            {peekNotification ? (
                                <>
                                    <Spinner />
                                    {peekNotification.peek && <p className="text-sm">{peekNotification.peek}</p>}
                                </>
                            ) : (
                                <TextBulletListSquare24Regular className="size-5" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={12} className="w-80 p-0">
                        <NotificationCenter />
                    </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Settings24Regular className="size-5" />
                </Button>
            </div>
        </div>
    );
}