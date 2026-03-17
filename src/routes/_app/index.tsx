import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconArrowAutofitHeight, IconFilter2, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconMinus, IconPlus, IconShare2 } from "@tabler/icons-react";
import { animate } from "@/components/animated";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { IconBox } from "@/components/custom/IconBox";
import { ItemGrid } from "@/components/custom/ItemGrid";
import { Toolbar, ToolbarGroup } from "@/components/custom/Toolbar";
import { ExportDialog } from "@/components/overlays/ExportDialog";
import { ImportItemsDialog } from "@/components/overlays/ImportItemsDialog";
import { SelectAlbumDialog } from "@/components/overlays/SelectAlbumDialog";
import { getItems } from "@/lib/invoker";
import { gridSizes, type Item } from "@/lib/models";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useSelection } from "@/lib/useSelection";
import { useSettings } from "@/lib/useSettings";
import { useViewer } from "@/lib/useViewer";
import { cn, treatDataRefresh } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

function RouteComponent() {
    const [openAddItems, setOpenAddItems] = useState(false);
    const [addToAlbumDialog, setAddToAlbumDialog] = useState(false);
    const [exportDialog, setExportDialog] = useState(false);
    const gridParent = useRef<HTMLDivElement>(null);
    const action = useAction();
    const { selectedLibrary } = useLibrary();
    const { isFetching, data: items } = useQuerySafe({
        queryKey: [selectedLibrary?.id, "items"],
        queryFn: () => getItems({ libraryId: selectedLibrary?.id ?? "" }),
        placeholderData: [],
        enabled: !!selectedLibrary?.id,
    });
    const { selected, setSelected, handleSelect, handleRightClick, unselectAll } = useSelection({ items: filteredItems });
    const { settings, updateSettings } = useSettings();
    const { viewingItem, setViewingItem } = useViewer();

    const { isPending, data } = useQuery({
        queryKey: [selectedLibrary?.id, "items"],
        queryFn: () => getItems({ libraryId: selectedLibrary?.id ?? "" }),
    });

    useEffect(() => {
        treatDataRefresh(data?.data, setItems, selected, setSelected);
    }, [data]);

    return (
        <div className={cn("min-h-full relative overflow-y-auto scroll-hidden", items.length === 0 && "flex flex-col", (isFetching || viewingItem) && "overflow-y-hidden")} ref={gridParent} onClick={unselectAll}>
            <Toolbar shade="full">
                <ToolbarGroup>
                    <Button onClick={() => setOpenAddItems(true)}>
                        <IconPlus className="size-4 mr-0.5" />
                        Import items
                    </Button>
                    <ImportItemsDialog openDialog={openAddItems} onOpenChange={setOpenAddItems} />
                    <SelectAlbumDialog open={addToAlbumDialog} onOpenChange={setAddToAlbumDialog} onSuccess={a => action.addItemsToAlbum(selected.map(p => p.id), a)} />
                    <ExportDialog open={exportDialog} onOpenChange={setExportDialog} items={selected} />
                </ToolbarGroup>
                <ToolbarGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={items.length === 0 || settings.libraryZoom === 0} onClick={() => updateSettings({ libraryZoom: settings.libraryZoom - 1 })}>
                            <IconPlus className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={items.length === 0 || settings.libraryZoom === gridSizes.length - 1} onClick={() => updateSettings({ libraryZoom: settings.libraryZoom + 1 })}>
                            <IconMinus className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={items.length === 0} onClick={() => updateSettings({ libraryExpanded: !settings.libraryExpanded })}>
                            <IconArrowAutofitHeight className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={items.length === 0}>
                            <IconFilter2 className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={selected.length === 0} onClick={() => action.setItemsFavorite(selected.map(p => p.id), !selected.every(p => p.is_favorite))}>
                            {selected.length !== 0 && selected.every(p => p.is_favorite) ? <IconHeartFilled className="size-5" /> : <IconHeart className="size-5" />}
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
            <ItemGrid
                items={items}
                isFetching={isFetching}
                parent={gridParent}
                selected={selected}
                setSelected={setSelected}
                viewingItem={viewingItem}
                setViewingItem={setViewingItem}
                handleSelect={handleSelect}
                handleRightClick={handleRightClick}
                empty={<GridEmpty onAdd={() => setOpenAddItems(true)} />}
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
            <animate.h1 className="text-xl font-bold" delay={0.15}>Empty library</animate.h1>
            <animate.p className="text-muted-foreground" delay={0.3}>Your library is currently empty, import some photos/videos and fill it with memories!</animate.p>
            <animate.div className="w-full mt-2 flex justify-center" delay={0.45}>
                <Button onClick={onAdd}>Import items</Button>
            </animate.div>
        </CenterLayout>
    );
}