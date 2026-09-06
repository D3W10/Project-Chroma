import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";
import { IconAlertTriangle, IconTag, IconTagMinus, IconTagPlus } from "@tabler/icons-react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@project-chroma/ui/command";
import { Spinner } from "@project-chroma/ui/spinner";
import { isAppError } from "@project-chroma/utils";
import { CreateTagDialog } from "@/components/overlays/CreateTagDialog";
import { DeleteTagDialog } from "@/components/overlays/DeleteTagDialog";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { queryKeys } from "@/lib/utils";
import type { Item, Tag } from "@project-chroma/contracts/gallery";

interface TagManagementPaletteProps<T extends Item> {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
    items: T[];
}

export function TagManagementPalette<T extends Item>({ items, open, onOpenChange }: TagManagementPaletteProps<T>) {
    const [commandSearch, setCommandSearch] = useState("");
    const [commandPages, setCommandPages] = useState<string[]>([]);
    const [intervenedTag, setIntervenedTag] = useState<Tag>();
    const [createTagDialog, setCreateTagDialog] = useState(false);
    const [deleteTagDialog, setDeleteTagDialog] = useState(false);
    const action = useAction();
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const inputBoxRef = useRef<HTMLInputElement>(null);
    const itemIds = items.map(item => item.id);

    const { isFetching, data: tags, error: tagsError } = useQuerySafe({
        queryKey: queryKeys.tags(selectedLibrary?.id ?? ""),
        queryFn: () => window.chroma!.tags.get({ libraryId: selectedLibrary?.id ?? "" }),
        enabled: open && !!selectedLibrary,
        placeholderData: [],
    });

    const { data: itemTags } = useQuerySafe({
        queryKey: queryKeys.itemTags(selectedLibrary?.id, itemIds),
        queryFn: () => window.chroma!.tags.getItems({ libraryId: selectedLibrary?.id ?? "", itemIds }),
        enabled: open && !!selectedLibrary && itemIds.length > 0,
        placeholderData: [],
    });
    const [optimisticItemTags, setOptimisticItemTag] = useOptimistic(itemTags, (current, update: { tag: Tag; assigned: boolean }) => {
        if (!update.assigned) return current.filter(tag => tag.id !== update.tag.id);
        return [...current.filter(tag => tag.id !== update.tag.id), { ...update.tag, itemCount: itemIds.length }];
    });
    const itemTagCounts = new Map(optimisticItemTags.map(tag => [tag.id, tag.itemCount]));

    function notifyTagError(error: unknown) {
        pushNoti({
            type: "error",
            title: isAppError(error) ? error.title : "Unable to update tags",
            description: isAppError(error) ? error.message : "The selected items could not be updated.",
        });
    }

    function onItemClick(tag: Tag) {
        setIntervenedTag(tag);

        if (commandPages.length === 0)
            toggleTag(tag);
        else if (commandPages[0] === "edit")
            setCreateTagDialog(true);
        else if (commandPages[0] === "delete")
            setDeleteTagDialog(true);
    }

    function toggleTag(tag: Tag) {
        const assigned = itemIds.length > 0 && itemTagCounts.get(tag.id) === itemIds.length;
        startTransition(async () => {
            setOptimisticItemTag({ tag, assigned: !assigned });
            try {
                await action.setTagsOnItems(itemIds, [tag.id], !assigned);
            } catch (error) {
                notifyTagError(error);
            }
        });
    }

    async function onTagDelete() {
        if (!intervenedTag) return;
        try {
            await action.deleteTags([intervenedTag.id]);
            resetCommand();
        } catch (error) {
            notifyTagError(error);
        }
    }

    function resetCommand() {
        setCommandSearch("");
        setTimeout(() => inputBoxRef.current?.focus(), 50);
    }

    useEffect(() => {
        if (open) {
            setCommandSearch("");
            setCommandPages([]);
        }
    }, [open]);

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CreateTagDialog open={createTagDialog} onOpenChange={setCreateTagDialog} currentData={intervenedTag} onSuccess={resetCommand} />
            <DeleteTagDialog open={deleteTagDialog} onOpenChange={setDeleteTagDialog} tag={intervenedTag} onConfirm={onTagDelete} />
            <Command
                onKeyDown={e => {
                    if (commandPages.length > 0 && (e.key === "Escape" || (e.key === "Backspace" && !commandSearch))) {
                        e.preventDefault();
                        setCommandPages(p => p.slice(0, -1));
                        setIntervenedTag(undefined);
                    }
                }}
            >
                <CommandInput placeholder={"Type a tag" + (commandPages.length ? " to " + commandPages[0] : "") + " or search..."} value={commandSearch} onValueChange={setCommandSearch} ref={inputBoxRef} />
                <CommandList>
                    <CommandEmpty>No tags were found</CommandEmpty>
                    {!commandPages.length && (
                        <CommandGroup heading="Operations">
                            <CommandItem onSelect={() => { setIntervenedTag(undefined); setCreateTagDialog(true); }}>
                                <IconTagPlus />
                                <span>Create new tag...</span>
                            </CommandItem>
                            <CommandItem onSelect={() => setCommandPages(["edit"])}>
                                <IconTag />
                                <span>Edit tag...</span>
                            </CommandItem>
                            <CommandItem onSelect={() => setCommandPages(["delete"])}>
                                <IconTagMinus />
                                <span>Delete tag...</span>
                            </CommandItem>
                        </CommandGroup>
                    )}
                    <CommandGroup heading="Tags">
                        {isFetching ? (
                            <CommandItem disabled>
                                <Spinner />
                                <span>Loading tags</span>
                            </CommandItem>
                        ) : tagsError ? (
                            <CommandItem disabled>
                                <IconAlertTriangle />
                                <span>Unable to load tags</span>
                            </CommandItem>
                        ) : tags.map(tag => {
                            const assignedCount = itemTagCounts.get(tag.id) ?? 0;
                            return (
                                <CommandItem key={tag.id} className="h-8 py-1" data-checked={!commandPages.length && itemIds.length > 0 && assignedCount === itemIds.length} onSelect={() => onItemClick(tag)}>
                                    <div className="size-3 m-0.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                    <span className="flex-1">{tag.name}</span>
                                    {!commandPages.length && assignedCount > 0 && assignedCount < itemIds.length && <span className="text-xs text-muted-foreground">{assignedCount}/{itemIds.length}</span>}
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
}
