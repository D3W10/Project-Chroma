import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";
import { IconArrowsMaximize, IconArrowsMinimize, IconChevronLeft, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconLivePhoto, IconMinus, IconPlus, IconShare2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Toolbar, ToolbarGroup } from "@/components/custom/Toolbar";
import { SelectAlbumDialog } from "@/components/overlays/SelectAlbumDialog";
import { ExportDialog } from "@/components/overlays/ExportDialog";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { cn, getOriginalPath, getThumbPath, QUICK_EASE } from "@/lib/utils";
import type { Item } from "@/lib/models";

interface PhotoViewerProps {
    item?: Item;
    setItem: (item?: Item) => unknown;
}

export function PhotoViewer({ item, setItem }: PhotoViewerProps) {
    const [loaded, setLoaded] = useState(false);
    const [favorite, setFavorite] = useState(false);
    const [addToAlbumDialog, setAddToAlbumDialog] = useState(false);
    const [exportDialog, setExportDialog] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const action = useAction();
    const { selectedLibrary } = useLibrary();

    async function setAsFavorite() {
        if (!item) return;
        await action.setItemsFavorite([item.id], !favorite);
        setFavorite(!favorite);
    }

    useEffect(() => {
        setLoaded(false);
        if (item)
            setFavorite(item.is_favorite);
    }, [item]);

    if (!selectedLibrary) return null;

    return (
        <div className={cn("flex flex-col absolute inset-0 z-50 transition-colors duration-200", !item ? "bg-transparent pointer-events-none" : "bg-background")}>
            <TransformWrapper centerOnInit disablePadding>
                <Toolbar shade="full" className={cn("absolute transition-opacity duration-200", !item ? "opacity-0" : "opacity-100")}>
                    <ToolbarGroup>
                        <ReturnButton setItem={setItem} />
                        {item?.live_video && (
                            <Button variant="outline">
                                <IconLivePhoto className="size-5" data-icon="inline-start" />
                                <span className="uppercase">Live</span>
                            </Button>
                        )}
                        {item && (
                            <>
                                <SelectAlbumDialog open={addToAlbumDialog} onOpenChange={setAddToAlbumDialog} onSuccess={a => action.addItemsToAlbum([item.id], a)} />
                                <ExportDialog open={exportDialog} onOpenChange={setExportDialog} items={[item]} />
                            </>
                        )}
                    </ToolbarGroup>
                    <ToolbarGroup>
                        <ZoomControls />
                        <ButtonGroup>
                            <Button variant="outline" size="icon" onClick={setAsFavorite}>
                                {favorite ? <IconHeartFilled className="size-5" /> : <IconHeart className="size-5" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setAddToAlbumDialog(true)}>
                                <IconFolderPlus className="size-5" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setExportDialog(true)}>
                                <IconShare2 className="size-5" />
                            </Button>
                        </ButtonGroup>
                        <ButtonGroup>
                            <Button variant="outline" size="icon">
                                <IconInfoCircle className="size-5" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setFullscreen(!fullscreen)}>
                                {!fullscreen ? <IconArrowsMaximize className="size-5" /> : <IconArrowsMinimize className="size-5" />}
                            </Button>
                        </ButtonGroup>
                    </ToolbarGroup>
                </Toolbar>
                <TransformComponent
                    key={item?.id}
                    contentClass="max-w-full max-h-full z-2"
                    wrapperStyle={{ width: "100%", height: "100%", containerType: "size", willChange: "transform" }}
                    contentStyle={{ width: `min(100cqw, 100cqh * (${item?.width}/${item?.height}))`, aspectRatio: `${item?.width}/${item?.height}` }}
                >
                    {item && (
                        <motion.div
                            className="size-full flex justify-center items-center *:size-full"
                            layoutId={`item-${item.id}`}
                            transition={{ duration: 0.6, ease: QUICK_EASE }}
                        >
                            <img src={getThumbPath(item.id, selectedLibrary?.path)} className={!loaded ? "block" : "hidden"} />
                            <img
                                src={getOriginalPath(item, selectedLibrary?.path)}
                                className={loaded ? "block" : "hidden"}
                                onLoad={() => setLoaded(true)}
                            />
                        </motion.div>
                    )}
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
}

function ReturnButton({ setItem }: Pick<PhotoViewerProps, "setItem">) {
    const { resetTransform } = useControls();

    function close() {
        resetTransform(0);
        setItem();
    }

    return (
        <Button variant="outline" size="icon" onClick={close}>
            <IconChevronLeft className="size-5" />
        </Button>
    );
}

function ZoomControls() {
    const { zoomIn, zoomOut } = useControls();

    return (
        <ButtonGroup>
            <Button variant="outline" size="icon" onClick={() => zoomIn()}>
                <IconPlus className="size-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => zoomOut()}>
                <IconMinus className="size-5" />
            </Button>
        </ButtonGroup>
    );
}