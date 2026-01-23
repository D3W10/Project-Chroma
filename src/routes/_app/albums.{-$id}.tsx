import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronLeft, IconFolderPlus, IconGridDots, IconInfoCircle, IconLayoutGrid, IconListDetails, IconPencil } from "@tabler/icons-react";
import { animate } from "@/components/animated";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { IconBox } from "@/components/custom/IconBox";
import { IconColor } from "@/components/custom/IconColor";
import { AlbumContextMenu } from "@/components/overlays/AlbumContextMenu";
import { CreateAlbumDialog } from "@/components/overlays/CreateAlbumDialog";
import { getAlbums } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useSelection } from "@/lib/useSelection";
import { cva } from "@/lib/utils";
import type { Album } from "@/lib/models";

type Layout = "card" | "grid" | "list";

export const Route = createFileRoute("/_app/albums/{-$id}")({
    component: RouteComponent,
});

const gridStyles = cva(
    "w-full min-h-0 p-4 pt-16 absolute",
    {
        variants: {
            layout: {
                card: "grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4",
                grid: "grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4",
                list: "gap-3",
            },
            grid: {
                true: "grid",
                false: "h-full flex justify-center items-center",
            },
        },
        defaultVariants: {
            layout: "card",
            grid: true,
        },
    },
);

function RouteComponent() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [viewmode, setViewmode] = useState<Layout>("card");
    const [openCreateAlbum, setOpenCreateAlbum] = useState(false);
    const { selectedLibrary } = useLibrary();
    const navigate = useNavigate();
    const { pushNoti } = useNotifications();
    const { id } = Route.useParams();
    const queryClient = useQueryClient();
    const { selected, setSelected, handleSelect, handleRightClick, unselectAll } = useSelection({ items: albums });

    const { isPending, data } = useQuery({
        queryKey: ["albums", selectedLibrary?.id, id],
        queryFn: () => getAlbums({ libraryId: selectedLibrary?.id ?? "", parent: id }),
    });

    function onCreateSuccess(album: Album) {
        queryClient.invalidateQueries({ queryKey: ["albums", selectedLibrary?.id, id] });
        pushNoti("Album created", "The album \"" + album.name + "\" was created successfully!", "success");
    }

    useEffect(() => {
        const allAlbums = data?.data ?? [];
        const newSelected: Album[] = [];

        setAlbums(allAlbums);

        selected.forEach(s => {
            const newPic = allAlbums.find(p => p.id === s.id);
            if (newPic)
                newSelected.push(newPic);
        });

        setSelected(newSelected);
    }, [data]);

    return (
        <div className="h-screen flex flex-col flex-1 relative overflow-y-auto" onClick={unselectAll}>
            <div className="p-2 flex justify-between items-center sticky top-0 left-0 right-0 z-10 before:absolute before:inset-0 before:backdrop-blur-xs before:mask-b-from-25% before:-z-10 after:absolute after:inset-0 after:-bottom-4 after:bg-background/70 after:mask-b-from-20% after:-z-20">
                <div className="flex gap-2">
                    <Button onClick={() => setOpenCreateAlbum(true)}>
                        <IconFolderPlus className="size-4 mr-0.5" />
                        Create album
                    </Button>
                    {id && (
                        <Button variant="outline" size="icon">
                            <IconChevronLeft className="size-5" />
                        </Button>
                    )}
                    <CreateAlbumDialog currentAlbum={id} open={openCreateAlbum} onOpenChange={setOpenCreateAlbum} onSuccess={onCreateSuccess} />
                </div>
                <div className="flex gap-2">
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={selected.length !== 1}>
                            <IconPencil className="size-5" />
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button variant={viewmode === "card" ? "default" : "outline"} size="icon" onClick={() => setViewmode("card")}>
                            <IconLayoutGrid className="size-5" />
                        </Button>
                        <Button variant={viewmode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewmode("grid")}>
                            <IconGridDots className="size-5" />
                        </Button>
                        <Button variant={viewmode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewmode("list")}>
                            <IconListDetails className="size-5" />
                        </Button>
                    </ButtonGroup>
                </div>
            </div>
            <div className={gridStyles({ layout: viewmode, grid: isPending || albums.length > 0 })}>
                {isPending && <GridLoading />}
                {albums.length > 0 ? albums.map((p, i) => (
                    <AlbumContextMenu
                        key={p.id}
                        selected={selected}
                        onEdit={() => {}}
                        onDelete={() => {}}
                    >
                        <GridItem
                            item={p}
                            selected={!!selected.find(s => s.id === p.id)}
                            viewmode={viewmode}
                            onClick={e => handleSelect(e, i, p)}
                            onDoubleClick={() => navigate({ to: `/albums/${p.id}` })}
                            onContextMenu={() => handleRightClick(i, p)}
                        />
                    </AlbumContextMenu>
                )) : <GridEmpty id={id} onAdd={() => setOpenCreateAlbum(true)} />}
            </div>
        </div>
    );
}

function GridLoading() {
    return Array(30).fill(null).map((_, i) => (
        <div key={i} className="w-full bg-foreground/5 rounded-sm aspect-5/4 animate-pulse delay-(--loading-delay)" style={{ "--loading-delay": `${i * 0.05}s` } as React.CSSProperties} />
    ));
}

function GridEmpty({ id, onAdd }: { id?: string; onAdd: () => unknown }) {
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
        </CenterLayout>
    );
}

interface GridItemProps {
    item: Album;
    selected: boolean;
    viewmode: Layout;
    onClick?: React.MouseEventHandler<HTMLElement>;
    onDoubleClick?: React.MouseEventHandler<HTMLElement>;
    onContextMenu?: React.MouseEventHandler<HTMLElement>;
}

const gridItemStyles = cva(
    "flex overflow-hidden transition-shadow",
    {
        variants: {
            layout: {
                card: "flex-col rounded-lg",
                grid: "px-4 pt-5 pb-3 flex-col items-center gap-4 rounded-lg",
                list: "p-3 items-center gap-4 rounded-[18px]",
            },
            selected: {
                true: "ring-2 ring-primary",
                false: "ring ring-border",
            },
        },
        defaultVariants: {
            layout: "card",
            selected: false,
        },
    },
);

function GridItem({ item, selected, viewmode, onClick, onDoubleClick, onContextMenu }: GridItemProps) {
    return (
        <div className={gridItemStyles({ layout: viewmode, selected })} onClick={onClick} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            {viewmode === "card" ? (
                <>
                    <div className="grid grid-cols-5 grid-rows-2 grid-flow-col">
                        <div className="w-full bg-red-100 aspect-square"></div>
                        <div className="w-full bg-red-200 aspect-square"></div>
                        <div className="w-full bg-red-300 aspect-square"></div>
                        <div className="w-full bg-red-400 aspect-square"></div>
                        <div className="w-full bg-red-500 aspect-square"></div>
                        <div className="w-full bg-red-600 aspect-square"></div>
                        <div className="w-full bg-red-700 aspect-square"></div>
                        <div className="w-full bg-red-800 aspect-square"></div>
                        <div className="w-full bg-red-900 aspect-square"></div>
                        <div className="w-full bg-red-950 aspect-square"></div>
                    </div>
                    <div className="pl-4 pb-5 flex items-center relative">
                        <div className="p-0.5 absolute bg-background rounded-xl z-1">
                            <GridItemCover item={item} size="xl" />
                        </div>
                    </div>
                    <div className="px-4.5 py-4">
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        {item.description}
                    </div>
                </>
            ) : viewmode === "grid" ? (
                <>
                    <GridItemCover item={item} size="xl" />
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                </>
            ) : (
                <>
                    <GridItemCover item={item} />
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                </>
            )}
        </div>
    );
}

function GridItemCover({ item, size = "lg" }: { item: Album; size?: "default" | "lg" | "xl" }) {
    return item.selected_cover === 0 ? (
        <IconColor color={item.color!} size={size}>{item.icon}</IconColor>
    ) : (
        <div></div>
    );
}