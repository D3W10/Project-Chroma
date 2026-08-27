import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@project-chroma/ui/button";
import { ButtonGroup } from "@project-chroma/ui/button-group";
import { AlbumCard } from "@/components/AlbumCard";
import { Toolbar, ToolbarGroup } from "@/components/Toolbar";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useStack } from "@/lib/useStack";

export const Route = createFileRoute("/_app/albums/{-$id}")({
    component: RouteComponent,
});

function RouteComponent() {
    const [openCreateAlbum, setOpenCreateAlbum] = useState(false);
    const { selectedLibrary } = useLibrary();
    const navigate = useNavigate();
    const { pushNoti } = useNotifications();
    const { id } = Route.useParams();
    const queryClient = useQueryClient();
    const { isFetching: isFetchingAlbums, data: albums } = useQuerySafe({
        queryKey: [selectedLibrary?.id, "albums", id],
        queryFn: () => window.chroma!.albums.get({ libraryId: selectedLibrary?.id ?? "", parent: id }),
        placeholderData: [],
    });
    const { isFetching: isFetchingItems, data: items } = useQuerySafe({
        queryKey: [selectedLibrary?.id, "albums", id, "items"],
        queryFn: () => window.chroma!.albums.getItems({ libraryId: selectedLibrary?.id ?? "", albumId: id ?? "" }),
        placeholderData: [],
        enabled: !!id,
    });
    const { settings, updateSettings } = useSettings();
    const tree = useStack<string>();
    function onNavigate(album: Album) {
        tree.push(id ?? "");
        navigate({ to: "/albums/" + album.id });
    }
    return (
        <div className={cn("min-h-full relative overflow-y-auto scroll-hidden", albums.length <= 0 && "flex flex-col", isFetchingAlbums && "overflow-y-hidden")} ref={gridParent} onClick={unselectAll}>
            <Toolbar shade="full">
                <ToolbarGroup>
                    <Button onClick={() => setOpenCreateAlbum(true)}>
                        <IconFolderPlus className="size-4 mr-0.5" data-icon="inline-start" />
                        Create album
                    </Button>
                    {tree.length > 0 && (
                        <Button variant="outline" size="icon" onClick={() => navigate({ to: "/albums/" + tree.stack.pop() })}>
                            <IconChevronLeft className="size-5" />
                        </Button>
                    )}
                    <CreateAlbumDialog currentAlbum={id} open={openCreateAlbum} onOpenChange={setOpenCreateAlbum} onSuccess={onCreateSuccess} />
                </ToolbarGroup>
    );
}
function GridEmpty({ id, onAdd, onLibrary }: { id?: string; onAdd: () => unknown; onLibrary: () => unknown }) {
    return !id ? (
        <CenterLayout>
            <IconBox className="mb-4">
                <IconInfoCircle />
            </IconBox>
            <animate.h1 className="text-xl font-bold" delay={0.15}>
                No albums yet
            </animate.h1>
            <animate.p className="text-muted-foreground" delay={0.3}>
                Your library does not have any albums, create one and start grouping together precious moments!
            </animate.p>
            <animate.div className="w-full mt-2 flex justify-center" delay={0.45}>
                <Button onClick={onAdd}>Create album</Button>
            </animate.div>
        </CenterLayout>
    ) : (
        <CenterLayout>
            <IconBox className="mb-4">
                <IconInfoCircle />
            </IconBox>
            <animate.h1 className="text-xl font-bold" delay={0.15}>
                Empty album
            </animate.h1>
            <animate.p className="text-muted-foreground" delay={0.3}>
                This album does not have any photos or videos, time to fill it with memories!
            </animate.p>
            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.45}>
                <Button onClick={onLibrary}>Go to library</Button>
                <Button variant="secondary" onClick={onAdd}>
                    Create album
                </Button>
            </animate.div>
        </CenterLayout>
    );
}
