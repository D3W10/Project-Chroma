import { useEffect, useRef, useState } from "react";
import { IconAlertTriangle, IconTag, IconTagMinus, IconTagPlus } from "@tabler/icons-react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";
import { CreateTagDialog } from "@/components/overlays/CreateTagDialog";
import { DeleteTagDialog } from "@/components/overlays/DeleteTagDialog";
import { getItemTags, getTags } from "@/lib/invoker";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { useQuerySafe } from "@/lib/useQuerySafe";
import type { Item, Tag } from "@/lib/models";

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
    const [tagIds, setTagIds] = useState<string[]>([]);
    const action = useAction();
    const { selectedLibrary } = useLibrary();
    const inputBoxRef = useRef<HTMLInputElement>(null);

    const { isFetching, data: tags, error: tagsError } = useQuerySafe({
        queryKey: [selectedLibrary?.id, "tags"],
        queryFn: () => getTags({ libraryId: selectedLibrary?.id ?? "" }),
        placeholderData: [],
    });

    const { data: itemTags } = useQuerySafe({
        queryKey: [selectedLibrary?.id, "items", items.length > 0 ? items[0].id : "", "tags"],
        queryFn: () => getItemTags({ libraryId: selectedLibrary?.id ?? "", itemId: items.length > 0 ? items[0].id : "" }),
        enabled: items.length === 1,
        placeholderData: [],
    });

    function onItemClick(tag: Tag) {
        setIntervenedTag(tag);

        if (commandPages.length === 0)
            toggleTag(tag.id, tagIds.includes(tag.id));
        else if (commandPages[0] === "edit")
            setCreateTagDialog(true);
        else if (commandPages[0] === "delete")
            setDeleteTagDialog(true);
    }

    function toggleTag(tagId: string, checked: boolean) {
        if (!checked)
            action.addTagsToItems({ libraryId: selectedLibrary?.id ?? "", itemIds: items.map(p => p.id), tagIds: [tagId] });
        else
            action.removeTagsFromItems({ libraryId: selectedLibrary?.id ?? "", itemIds: items.map(p => p.id), tagIds: [tagId] });
    }

    function onTagDelete() {
        if (!intervenedTag) return;
        action.deleteTags([intervenedTag.id]);
        resetCommand();
    }

    function resetCommand() {
        setCommandSearch("");
        setTimeout(() => inputBoxRef.current?.focus(), 50);
    }

    useEffect(() => {
        setTagIds(itemTags.map(p => p.id));
    }, [itemTags]);

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
                    if (e.key === "Escape" || (e.key === "Backspace" && !commandSearch)) {
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
                            <CommandItem onSelect={() => setCreateTagDialog(true)}>
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
                        ) : tags.map(t => (
                            <CommandItem key={t.name} className="h-8 py-1" data-checked={!commandPages.length && tagIds.includes(t.id)} onSelect={() => onItemClick(t)}>
                                <div className="size-3 m-0.5 rounded-full" style={{ backgroundColor: t.color }} />
                                <span className="flex-1">{t.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
}