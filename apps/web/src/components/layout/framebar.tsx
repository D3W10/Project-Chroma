import { useEffect, useState } from "react";
import { IconClipboardList, IconMinus, IconSelector, IconSettings, IconSquares, IconX } from "@tabler/icons-react";
import { Button } from "@project-chroma/ui/button";
import { Spinner } from "@project-chroma/ui/spinner";
import { cn } from "@project-chroma/utils";
import { useExistingLibraryImport } from "@/lib/useExistingLibraryImport";
import { useNotifications } from "@/lib/useNotifications";
import type { Library } from "@project-chroma/contracts/gallery";

export function Framebar({ libraries }: { libraries: Library[] }) {
    return (
        <div className="w-full h-12 min-h-12 pl-26 pr-1.5 flex justify-between items-center app-drag-region">
            {!location.pathname.startsWith("/onboarding") && (
                <>
                    <div className="flex items-center">
                        {libraries.length > 0 && (
                            <Popover open={isLibraryPanelOpen} onOpenChange={setIsLibraryPanelOpen}>
                                <PopoverTrigger render={<Button variant="ghost" className="w-54 h-full min-w-0 pl-1.5 pr-2 py-1.5 flex items-center gap-2.5 group" />}>
                                    <IconColor color={selectedLibrary?.color}>{selectedLibrary?.icon}</IconColor>
                                    <span
                                        className={cn("flex-1 group-hover:text-foreground text-left truncate transition-colors", !isLibraryPanelOpen ? "text-secondary-foreground" : "text-foreground")}
                                    >
                                        {selectedLibrary ? selectedLibrary.name : "Select library..."}
                                    </span>
                                    <IconSelector className="text-muted-foreground" />
                                </PopoverTrigger>
                                <PopoverContent className="w-58 p-0.5 flex flex-col gap-0.5">
                                    {libraries.map(lib => (
                                        <Button key={lib.id} variant="ghost" className="px-3 justify-start gap-2.5" onClick={() => handleLibrarySelect(lib.id)}>
                                            <IconColor color={lib.color}>{lib.icon}</IconColor>
                                            <span className="truncate">{lib.name}</span>
                                        </Button>
                                    ))}
                                    <Separator />
                                    <Button variant="ghost" size="sm" className="justify-start" onClick={handleCreateLibrary}>
                                        Create new library
                                    </Button>
                                    <Button variant="ghost" size="sm" className="justify-start" onClick={handleAddLibrary}>
                                        Add existing library
                                    </Button>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1">
                            <Popover open={isOpen} onOpenChange={setIsOpen}>
                                <PopoverTrigger
                                    render={
                                        <Button variant="ghost" size="icon" className={cn("relative text-muted-foreground", peeking ? "w-auto px-3 flex gap-2" : "")}>
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
                                    }
                                />
                                <PopoverContent align="end" sideOffset={12} className="w-80 p-0">
                                    <NotificationCenter />
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                                <IconSettings className="size-5" />
                            </Button>
                        </div>
                        {window.chroma?.platform() !== "darwin" && (
                            <div className="flex items-center">
                                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => window.chroma?.windowAction("minimize")}>
                                    <IconMinus className="size-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => window.chroma?.windowAction("toggleMaximize")}>
                                    <IconSquares className="size-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => window.chroma?.windowAction("close")}>
                                    <IconX className="size-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}
            <CreateLibraryDialog open={openCreateLibrary} onOpenChange={setOpenCreateLibrary} />
        </div>
    );
}
