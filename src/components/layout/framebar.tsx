import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { IconClipboardList, IconSelector, IconSettings } from "@tabler/icons-react";
import { toast } from "sonner";
import { IconColor } from "@/components/IconColor";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import type { Library, Notification } from "@/lib/models";

export function Framebar({ libraries }: { libraries: Library[] }) {
    const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
    const [peekNotification, setPeekNotification] = useState<Notification | null>(null);
    const { selectedLibrary, setSelectedLibrary, setOpenCreateLibrary } = useLibrary();
    const { notifications, isOpen, setIsOpen } = useNotifications();
    const location = useLocation();

    const peeking = peekNotification !== null && !!peekNotification.peek;

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
                            <Button variant="ghost" className="w-54 h-full min-w-0 px-2 py-1.5 flex items-center gap-2" role="combobox" aria-expanded={isLibraryPanelOpen}>
                                <IconColor color={selectedLibrary ? selectedLibrary.color : "var(--color-slate-500)"}>
                                    {selectedLibrary ? selectedLibrary.icon : "📁"}
                                </IconColor>
                                <span className="flex-1 text-left truncate transition-colors">{selectedLibrary ? selectedLibrary.name : "Select library..."}</span>
                                <IconSelector className="text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-58 p-0">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        {libraries.map(lib => (
                                            <CommandItem className="[&>svg]:hidden" key={lib.id} value={lib.id} onSelect={handleLibrarySelect}>
                                                <IconColor color={lib.color}>{lib.icon}</IconColor>
                                                <span className="truncate">{lib.name}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    <CommandSeparator />
                                    <CommandGroup>
                                        <CommandItem value="createLib" onSelect={handleCreateLibrary}>
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
                        <Button variant="ghost" size="icon" className={"text-muted-foreground " + (peeking ? "w-auto px-3 flex gap-2" : "")}>
                            {peekNotification ? (
                                <>
                                    <Spinner />
                                    {peekNotification.peek && <p className="text-sm">{peekNotification.peek}</p>}
                                </>
                            ) : (
                                <IconClipboardList className="size-5" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={12} className="w-80 p-0">
                        <NotificationCenter />
                    </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <IconSettings className="size-5" />
                </Button>
            </div>
        </div>
    );
}