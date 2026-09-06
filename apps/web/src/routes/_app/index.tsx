import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconArrowAutofitHeight, IconFilter2, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconMinus, IconPlus, IconSearch, IconShare2 } from "@tabler/icons-react";
import { Button } from "@project-chroma/ui/button";
import { ButtonGroup } from "@project-chroma/ui/button-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@project-chroma/ui/input-group";
import { cn, gridSizes, isResult } from "@project-chroma/utils";
import { animate } from "@/components/animated";
import { CenterLayout } from "@/components/layout/centerLayout";
import { IconBox } from "@/components/IconBox";
import { ItemGrid } from "@/components/ItemGrid";
import { Toolbar, ToolbarGroup } from "@/components/Toolbar";
import { EnableSearchDialog } from "@/components/overlays/EnableSearchDialog";
import { ExportDialog } from "@/components/overlays/ExportDialog";
import { ImportItemsDialog } from "@/components/overlays/ImportItemsDialog";
import { SelectAlbumDialog } from "@/components/overlays/SelectAlbumDialog";
import type { Item } from "@project-chroma/contracts/gallery";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useSelection } from "@/lib/useSelection";
import { useSettings } from "@/lib/useSettings";
import { queryKeys } from "@/lib/utils";
import { useViewer } from "@/lib/useViewer";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

function RouteComponent() {
    const [openAddItems, setOpenAddItems] = useState(false);
    const [addToAlbumDialog, setAddToAlbumDialog] = useState(false);
    const [exportDialog, setExportDialog] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchPromptOpen, setSearchPromptOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const gridParent = useRef<HTMLDivElement>(null);
    const action = useAction();
    const { selectedLibrary } = useLibrary();
    const { settings, updateSettings } = useSettings();
    const { viewingItem, setViewingItem } = useViewer();

    const { isFetching, data: items } = useQuerySafe({
        queryKey: queryKeys.items(selectedLibrary?.id ?? ""),
        queryFn: () => window.chroma!.items.get({ libraryId: selectedLibrary!.id ?? "" }),
        enabled: !!selectedLibrary?.id,
        placeholderData: [],
    });
    const searchQuery = searchInput.trim();
    const { data: searchData, isFetching: isSearching } = useQuerySafe({
        queryKey: queryKeys.itemSearchResults(selectedLibrary?.id ?? "", searchQuery),
        queryFn: () => window.chroma!.search.items({ libraryId: selectedLibrary?.id ?? "", query: searchQuery, limit: Infinity }),
        enabled: settings.searchEnabled && !!selectedLibrary?.id && !!searchQuery,
    });
    const { data: searchStatus } = useQuerySafe({
        queryKey: queryKeys.itemSearchStatus(selectedLibrary?.id ?? ""),
        queryFn: () => window.chroma!.search.getStatus({ libraryId: selectedLibrary?.id ?? "" }),
        enabled: settings.searchEnabled && !!selectedLibrary?.id,
        refetchInterval: query => {
            const rawData = query.state.data as unknown;
            const data = (isResult(rawData) ? (rawData.success ? rawData.data : undefined) : rawData) as { indexing?: boolean; pendingItems?: number } | undefined;
            if (data?.indexing) return 500;

            return 3000;
        },
    });
    const filteredItems = (() => {
        if (!searchQuery) return items;
        if (!settings.searchEnabled) return [];

        const matches = searchData ?? [];
        if (!matches.length) return [];

        const itemMap = new Map(items.map(item => [item.id, item]));
        const sortedItems: Item[] = [];
        for (const match of matches) {
            const current = itemMap.get(match.itemId);
            if (current) sortedItems.push(current);
        }

        return sortedItems;
    })();
    const { selected, setSelected, handleSelect, handleRightClick, unselectAll } = useSelection({ items: filteredItems });

    useEffect(() => {
        if (items.length === 0) {
            setSelected([]);
            return;
        }

        const itemMap = new Map(items.map(item => [item.id, item]));
        setSelected(prev => prev.map(p => itemMap.get(p.id)).filter((p): p is Item => !!p));
    }, [items, setSelected]);

    useEffect(() => {
        setSelected([]);
    }, [searchQuery]);

    return (
        <div
            className={cn("min-h-full relative overflow-y-auto scroll-hidden", filteredItems.length === 0 && "flex flex-col", (isFetching || viewingItem) && "overflow-y-hidden")}
            ref={gridParent}
            onClick={unselectAll}
        >
            <Toolbar shade="full">
                <ToolbarGroup>
                    <Button onClick={() => setOpenAddItems(true)}>
                        <IconPlus className="size-4 mr-0.5" data-icon="inline-start" />
                        Import items
                    </Button>
                    <ImportItemsDialog open={openAddItems} onOpenChange={setOpenAddItems} />
                    <SelectAlbumDialog
                        open={addToAlbumDialog}
                        onOpenChange={setAddToAlbumDialog}
                        onSuccess={a =>
                            action.addItemsToAlbum(
                                selected.map(p => p.id),
                                a,
                            )
                        }
                    />
                    <ExportDialog open={exportDialog} onOpenChange={setExportDialog} items={selected} />
                </ToolbarGroup>
                <ToolbarGroup>
                    <InputGroup
                        className="w-full"
                        onPointerDown={event => {
                            if (!selectedLibrary || settings.searchEnabled) return;
                            event.preventDefault();
                            setSearchPromptOpen(true);
                        }}
                    >
                        <InputGroupInput
                            ref={searchInputRef}
                            value={searchInput}
                            onChange={e => setSearchInput(e.currentTarget.value)}
                            onKeyDown={event => {
                                if (!selectedLibrary || settings.searchEnabled || (event.key !== "Enter" && event.key !== " ")) return;
                                event.preventDefault();
                                setSearchPromptOpen(true);
                            }}
                            readOnly={!settings.searchEnabled}
                            placeholder="Search photos and videos..."
                        />
                        <InputGroupAddon>
                            <IconSearch />
                        </InputGroupAddon>
                    </InputGroup>
                </ToolbarGroup>
                <ToolbarGroup>
                    <ButtonGroup>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={filteredItems.length === 0 || settings.libraryZoom === 0}
                            onClick={() => updateSettings({ libraryZoom: settings.libraryZoom - 1 })}
                        >
                            <IconPlus className="size-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={filteredItems.length === 0 || settings.libraryZoom === gridSizes.length - 1}
                            onClick={() => updateSettings({ libraryZoom: settings.libraryZoom + 1 })}
                        >
                            <IconMinus className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={filteredItems.length === 0} onClick={() => updateSettings({ libraryExpanded: !settings.libraryExpanded })}>
                            <IconArrowAutofitHeight className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={filteredItems.length === 0}>
                            <IconFilter2 className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={selected.length === 0}
                            onClick={() =>
                                action.setItemsFavorite(
                                    selected.map(p => p.id),
                                    !selected.every(p => p.isFavorite),
                                )
                            }
                        >
                            {selected.length !== 0 && selected.every(p => p.isFavorite) ? <IconHeartFilled className="size-5" /> : <IconHeart className="size-5" />}
                        </Button>
                        <Button variant="outline" size="icon" disabled={selected.length === 0} onClick={() => setAddToAlbumDialog(true)}>
                            <IconFolderPlus className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={selected.length === 0} onClick={() => setExportDialog(true)}>
                            <IconShare2 className="size-5" />
                        </Button>
                    </ButtonGroup>
                </ToolbarGroup>
            </Toolbar>
            <EnableSearchDialog
                open={searchPromptOpen}
                onOpenChange={setSearchPromptOpen}
                onEnabled={() => requestAnimationFrame(() => searchInputRef.current?.focus())}
            />
            {!!searchQuery && settings.searchEnabled && (searchStatus?.indexing || (searchStatus?.pendingItems ?? 0) > 0) && (
                <p className="px-4 pb-1 text-xs text-muted-foreground">{searchStatus?.pendingItems ?? 0} items remaining to be indexed. Results might be missing.</p>
            )}
            <ItemGrid
                items={filteredItems}
                isFetching={isFetching || isSearching}
                parent={gridParent}
                selected={selected}
                setSelected={setSelected}
                viewingItem={viewingItem}
                setViewingItem={setViewingItem}
                handleSelect={handleSelect}
                handleRightClick={handleRightClick}
                empty={items.length === 0 ? <GridEmpty onAdd={() => setOpenAddItems(true)} /> : <SearchEmpty query={searchQuery} />}
            />
        </div>
    );
}

function GridEmpty({ onAdd }: { onAdd: () => unknown }) {
    return (
        <CenterLayout>
            <IconBox className="mb-4">
                <IconInfoCircle />
            </IconBox>
            <animate.h1 className="text-xl font-bold" delay={0.15}>
                Empty library
            </animate.h1>
            <animate.p className="text-muted-foreground" delay={0.3}>
                Your library is currently empty, import some photos/videos and fill it with memories!
            </animate.p>
            <animate.div className="w-full mt-2 flex justify-center" delay={0.45}>
                <Button onClick={onAdd}>Import items</Button>
            </animate.div>
        </CenterLayout>
    );
}

function SearchEmpty({ query }: { query: string }) {
    return (
        <CenterLayout>
            <IconBox className="mb-4">
                <IconInfoCircle />
            </IconBox>
            <animate.h1 className="text-xl font-bold" delay={0.15}>
                No search results
            </animate.h1>
            <animate.p className="text-muted-foreground" delay={0.3}>
                No items matched the query &quot;{query}&quot;. Try using different terms or a shorter one.
            </animate.p>
        </CenterLayout>
    );
}
