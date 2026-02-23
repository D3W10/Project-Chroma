import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconArrowAutofitHeight, IconChevronLeft, IconFilter2, IconFolderPlus, IconInfoCircle, IconMinus, IconPencil, IconPlus, IconShare2 } from "@tabler/icons-react";
import { motion, useScroll, useTransform } from "motion/react";
import { animate } from "@/components/animated";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { AlbumCard } from "@/components/custom/AlbumCard";
import { IconBox } from "@/components/custom/IconBox";
import { ItemGrid } from "@/components/custom/ItemGrid";
import { Toolbar, ToolbarGroup } from "@/components/custom/Toolbar";
import { AlbumContextMenu } from "@/components/overlays/AlbumContextMenu";
import { CreateAlbumDialog } from "@/components/overlays/CreateAlbumDialog";
import { getAlbumItems, getAlbums } from "@/lib/invoker";
import { gridSizes, type Album, type AlbumComp, type ItemAlbumRef } from "@/lib/models";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useSelection } from "@/lib/useSelection";
import { useSettings } from "@/lib/useSettings";
import { useStack } from "@/lib/useStack";
import { cn, getThumbPath, treatDataRefresh, type Result } from "@/lib/utils";

export const Route = createFileRoute("/_app/albums/{-$id}")({
    component: RouteComponent,
});

function RouteComponent() {
    const [albums, setAlbums] = useState<AlbumComp[]>([]);
    const [items, setItems] = useState<ItemAlbumRef[]>([]);
    const [openCreateAlbum, setOpenCreateAlbum] = useState(false);
    const { selectedLibrary } = useLibrary();
    const navigate = useNavigate();
    const { pushNoti } = useNotifications();
    const { id } = Route.useParams();
    const queryClient = useQueryClient();
    const gridParent = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll({ container: gridParent });
    const { selected: selectedAlbums, setSelected: setSelectedAlbums, handleSelect: handleSelectAlbumRef, handleRightClick: handleRightClickAlbum, unselectAll: unselectAllAlbums } = useSelection({ items: albums });
    const { selected: selectedItems, setSelected: setSelectedItems, handleSelect: handleSelectItemRef, handleRightClick: handleRightClickItem, unselectAll: unselectAllItems } = useSelection({ items });
    const { settings, updateSettings } = useSettings();
    const stack = useStack<string>();
    const bannerY = useTransform(scrollY, v => v * 0.3);

    const currentAlbum = useMemo(() => {
        if (!id) return;

        for (const [, data] of queryClient.getQueriesData<Result<Album[], string>>({ queryKey: [selectedLibrary?.id, "albums"] })) {
            if (!data?.data) continue;

            const found = data.data.find(a => a.id === id);

            if (found) return found;
        }

        return;
    }, [selectedLibrary?.id, id]);

    const { isPending: isPendingA, data: dataA } = useQuery({
        queryKey: [selectedLibrary?.id, "albums", id],
        queryFn: () => getAlbums({ libraryId: selectedLibrary?.id ?? "", parent: id }),
    });

    const { isPending: isPendingI, data: dataI } = useQuery({
        queryKey: [selectedLibrary?.id, "albums", id, "items"],
        queryFn: () => getAlbumItems({ libraryId: selectedLibrary?.id ?? "", albumId: id ?? "" }),
        enabled: !!id,
    });

    const handleSelectAlbum = (event: React.MouseEvent, index: number, item: AlbumComp) => {
        unselectAllItems();
        handleSelectAlbumRef(event, index, item);
    };

    const handleSelectItem = (event: React.MouseEvent, index: number, item: ItemAlbumRef) => {
        unselectAllAlbums();
        handleSelectItemRef(event, index, item);
    };

    function onCreateSuccess(album: Album) {
        queryClient.invalidateQueries({ queryKey: [selectedLibrary?.id, "albums", id] });
        pushNoti("Album created", "The album \"" + album.name + "\" was created successfully!", "success");
    }

    function onNavigate(album: Album) {
        stack.push(id ?? "");
        navigate({ to: "/albums/" + album.id });
    }

    function unselectAll(e: React.MouseEvent) {
        unselectAllAlbums(e);
        unselectAllItems(e);
    }

    useEffect(() => {
        treatDataRefresh(dataA?.data, setAlbums, selectedAlbums, setSelectedAlbums);
    }, [dataA]);

    useEffect(() => {
        treatDataRefresh(dataI?.data, setItems, selectedItems, setSelectedItems);
    }, [dataI]);

    return (
        <div className={cn("min-h-full relative overflow-y-auto scroll-hidden", albums.length <= 0 && "flex flex-col", isPendingA && "overflow-y-hidden")} ref={gridParent} onClick={unselectAll}>
            <Toolbar placement="full">
                <ToolbarGroup>
                    <Button onClick={() => setOpenCreateAlbum(true)}>
                        <IconFolderPlus className="size-4 mr-0.5" />
                        Create album
                    </Button>
                    {stack.length > 0 && (
                        <Button variant="outline" size="icon" onClick={() => navigate({ to: "/albums/" + stack.pop() })}>
                            <IconChevronLeft className="size-5" />
                        </Button>
                    )}
                    <CreateAlbumDialog currentAlbum={id} open={openCreateAlbum} onOpenChange={setOpenCreateAlbum} onSuccess={onCreateSuccess} />
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
                        <Button variant="outline" size="icon" disabled={selectedAlbums.length !== 1}>
                            <IconPencil className="size-5" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={selectedAlbums.length === 0}>
                            <IconShare2 className="size-5" />
                        </Button>
                    </ButtonGroup>
                </ToolbarGroup>
            </Toolbar>
            <div className="flex flex-col flex-1">
                {items.length > 0 && (
                    <motion.div className="w-full h-68 absolute top-0 left-0 mask-b-from-60% z-0" style={{ y: bannerY }}>
                        {currentAlbum?.selected_banner === 1 && currentAlbum?.banner_photo ? (
                            <img src={getThumbPath(currentAlbum.banner_photo, selectedLibrary?.path)} className="size-full object-cover" />
                        ) : (
                            <img src={getThumbPath(items[2].id, selectedLibrary?.path)} className="size-full object-cover" />
                        )}
                    </motion.div>
                )}
                {currentAlbum && (
                    <div className={cn("p-4 flex flex-col justify-end z-1", items.length > 0 ? "h-44" : "h-18")}>
                        <h1 className="text-4xl font-bold drop-shadow-md">{currentAlbum.name}</h1>
                        {currentAlbum.description && (
                            <p className="text-muted-foreground mb-2">{currentAlbum.description}</p>
                        )}
                    </div>
                )}
                {items.length === 0 ? (
                    <div className={cn("z-1", albums.length > 0 ? "px-4 pt-1 pb-4 grid gap-4 grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5" : "flex flex-col flex-1 absolute inset-0")}>
                        {isPendingA ? (
                            <GridLoading />
                        ) : albums.length > 0 ? (
                            albums.map((album, i) => (
                                <AlbumItem
                                    album={album}
                                    index={i}
                                    selectedAlbums={selectedAlbums}
                                    handleSelect={handleSelectAlbum}
                                    handleRightClick={handleRightClickAlbum}
                                    handleNavigate={onNavigate}
                                    key={album.id}
                                />
                            ))
                        ) : (
                            <GridEmpty id={id} onAdd={() => setOpenCreateAlbum(true)} onLibrary={() => navigate({ to: "/" })} />
                        )}
                    </div>
                ) : (albums.length > 0 && (
                    <div className="p-4 flex gap-4 overflow-x-auto z-1 scroll-hidden">
                        {albums.map((album, i) => (
                            <div key={album.id}>
                                <AlbumItem
                                    album={album}
                                    index={i}
                                    size="sm"
                                    selectedAlbums={selectedAlbums}
                                    handleSelect={handleSelectAlbum}
                                    handleRightClick={handleRightClickAlbum}
                                    handleNavigate={onNavigate}
                                />
                            </div>
                        ))}
                    </div>
                ))}
                {items.length > 0 && (
                    <div className="px-2 flex-1 min-h-0 z-1">
                        <ItemGrid
                            items={items}
                            isPending={isPendingI}
                            parent={gridParent}
                            isAlbum={true}
                            selected={selectedItems}
                            setSelected={setSelectedItems}
                            viewingItem={undefined}
                            setViewingItem={() => {}}
                            handleSelect={handleSelectItem}
                            handleRightClick={handleRightClickItem}
                            empty={<></>}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

interface AlbumItemProps {
    album: AlbumComp;
    index: number;
    size?: "md" | "sm";
    selectedAlbums: AlbumComp[];
    handleSelect: (event: React.MouseEvent, index: number, item: AlbumComp) => unknown;
    handleRightClick: (index: number, item: AlbumComp) => unknown;
    handleNavigate: (album: AlbumComp) => unknown;
}

function AlbumItem({ album, index, size, selectedAlbums, handleSelect, handleRightClick, handleNavigate }: AlbumItemProps) {
    return (
        <AlbumContextMenu
            selected={selectedAlbums}
            onEdit={() => {}}
            onDelete={() => {}}
        >
            <AlbumCard
                album={album}
                selected={!!selectedAlbums.find(s => s.id === album.id)}
                size={size}
                onClick={e => handleSelect(e, index, album)}
                onDoubleClick={() => handleNavigate(album)}
                onContextMenu={() => handleRightClick(index, album)}
            />
        </AlbumContextMenu>
    );
}

function GridLoading() {
    return Array(30).fill(null).map((_, i) => (
        <div key={i} className="w-full bg-foreground/5 rounded-sm aspect-5/4 animate-pulse delay-(--loading-delay)" style={{ "--loading-delay": `${i * 0.05}s` } as React.CSSProperties} />
    ));
}

function GridEmpty({ id, onAdd, onLibrary }: { id?: string; onAdd: () => unknown; onLibrary: () => unknown }) {
    return !id ? (
        <CenterLayout>
            <IconBox className="mb-4">
                <IconInfoCircle />
            </IconBox>
            <animate.h1 className="text-xl font-bold" delay={0.15}>No albums yet</animate.h1>
            <animate.p className="text-muted-foreground" delay={0.3}>Your library does not have any albums, create one and start grouping together precious moments!</animate.p>
            <animate.div className="w-full mt-2 flex justify-center" delay={0.45}>
                <Button onClick={onAdd}>Create album</Button>
            </animate.div>
        </CenterLayout>
    ) : (
        <CenterLayout>
            <IconBox className="mb-4">
                <IconInfoCircle />
            </IconBox>
            <animate.h1 className="text-xl font-bold" delay={0.15}>Empty album</animate.h1>
            <animate.p className="text-muted-foreground" delay={0.3}>This album does not have any photos or videos, time to fill it with memories!</animate.p>
            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.45}>
                <Button onClick={onLibrary}>Go to library</Button>
                <Button variant="outline" onClick={onAdd}>Create album</Button>
            </animate.div>
        </CenterLayout>
    );
}