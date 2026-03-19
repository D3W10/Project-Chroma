import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { type as osType } from "@tauri-apps/plugin-os";
import { useLocation } from "@tanstack/react-router";
import { IconClipboardList, IconMinus, IconSelector, IconSettings, IconSquares, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { IconColor } from "@/components/custom/IconColor";
import { AddLibraryDialog } from "@/components/overlays/AddLibraryDialog";
import { CreateLibraryDialog } from "@/components/overlays/CreateLibraryDialog";
import { getLibraryInfoFromPath } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { cn } from "@/lib/utils";
import type { Library, LibraryDetailsPath } from "@/lib/models";

export function Framebar({ libraries }: { libraries: Library[] }) {
    const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
    const [openCreateLibrary, setOpenCreateLibrary] = useState(false);
    const [openAddLibrary, setOpenAddLibrary] = useState(false);
    const [libraryToAdd, setLibraryToAdd] = useState<LibraryDetailsPath>();
    const { selectedLibrary, selectLibraryById } = useLibrary();
    const { notifications, isOpen, hasUnread, pushNoti, setIsOpen } = useNotifications();
    const location = useLocation();

    const peekNotification = notifications.find(n => n.type === "promise") ?? null;
    const peeking = peekNotification !== null && !!peekNotification.peek;

    const handleLibrarySelect = (libraryId: string) => {
        selectLibraryById(libraryId);
        setIsLibraryPanelOpen(false);
    };

    function handleCreateLibrary() {
        setIsLibraryPanelOpen(false);
        setOpenCreateLibrary(true);
    }

    async function handleAddLibrary() {
        setIsLibraryPanelOpen(false);

        try {
            const selected = await open({
                directory: true,
                multiple: false,
            });

            if (selected) {
                const { data } = await getLibraryInfoFromPath({ path: selected });

                if (data) {
                    setLibraryToAdd({ ...data, path: selected });
                    setOpenAddLibrary(true);
                } else
                    pushNoti("Invalid folder", "The selected folder does not contain a valid library", "error");
            }
        } catch (err) {
            console.error(err);
            pushNoti("System failure", "Unable to open the system file open dialog", "error");
        }
    }

    useEffect(() => {
        toast.dismiss();
    }, [isOpen]);

    return (
        <div className="w-full h-12 min-h-12 pl-26 pr-1.5 flex justify-between items-center" data-tauri-drag-region>
            {!location.pathname.startsWith("/onboarding") && (
                <>
                    <div className="flex items-center">
                        {libraries.length > 0 && (
                            <Popover open={isLibraryPanelOpen} onOpenChange={setIsLibraryPanelOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="w-54 h-full min-w-0 px-2 py-1.5 flex items-center gap-2 group" role="combobox" aria-expanded={isLibraryPanelOpen}>
                                        <IconColor color={selectedLibrary?.color}>{selectedLibrary?.icon}</IconColor>
                                        <span className={cn("flex-1 group-hover:text-foreground text-left truncate transition-colors", !isLibraryPanelOpen ? "text-secondary-foreground" : "text-foreground")}>{selectedLibrary ? selectedLibrary.name : "Select library..."}</span>
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
                                                <CommandItem value="addLib" onSelect={handleAddLibrary}>
                                                    Add existing library
                                                </CommandItem>
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Popover open={isOpen} onOpenChange={setIsOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className={"relative text-muted-foreground " + (peeking ? "w-auto px-3 flex gap-2" : "")}>
                                        {peekNotification ? (
                                            <>
                                                <Spinner />
                                                {peekNotification.peek && <p className="text-sm">{peekNotification.peek}</p>}
                                            </>
                                        ) : (
                                            <>
                                                <IconClipboardList className="size-5" />
                                                {hasUnread && <div className="size-1 absolute bottom-2 right-2.5 bg-primary ring-2 ring-background rounded-full" />}
                                            </>
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
                        {osType() !== "macos" && (
                            <div className="flex items-center">
                                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => getCurrentWindow().minimize()}>
                                    <IconMinus className="size-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => getCurrentWindow().toggleMaximize()}>
                                    <IconSquares className="size-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => getCurrentWindow().close()}>
                                    <IconX className="size-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}
            <CreateLibraryDialog open={openCreateLibrary} onOpenChange={setOpenCreateLibrary} />
            <AddLibraryDialog library={libraryToAdd} open={openAddLibrary} onOpenChange={setOpenAddLibrary} />
        </div>
    );
}