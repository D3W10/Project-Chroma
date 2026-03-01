import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";
import { IconArrowsMaximize, IconArrowsMinimize, IconChevronLeft, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconLivePhoto, IconMinus, IconPlus, IconShare2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Toolbar, ToolbarGroup } from "@/components/custom/Toolbar";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { cn, getOriginalPath } from "@/lib/utils";
import type { Item } from "@/lib/models";

interface PhotoViewerProps {
    item?: Item;
    setItem: (item?: Item) => unknown;
}

export function PhotoViewer({ item, setItem }: PhotoViewerProps) {
    const [favorite, setFavorite] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const action = useAction();
    const { selectedLibrary } = useLibrary();

    if (!selectedLibrary) return null;

    async function setAsFavorite() {
        if (!item) return;
        await action.setItemsFavorite([item.id], !favorite);
        setFavorite(!favorite);
    }

    useEffect(() => {
        if (item)
            setFavorite(item.is_favorite);
    }, [item]);

    return (
        <div className={cn("flex flex-col sticky inset-0 z-50 transition-colors duration-200", !item ? "bg-transparent pointer-events-none" : "bg-background")}>
            <TransformWrapper centerOnInit>
                <Toolbar className={cn("absolute transition-opacity duration-200", !item ? "opacity-0" : "opacity-100")}>
                    <ToolbarGroup shade="left">
                        <ReturnButton setItem={setItem} />
                        {item?.live_video && (
                            <Button variant="outline" className="pl-2 pr-2.5 gap-x-2">
                                <IconLivePhoto className="size-5" />
                                <span className="uppercase">Live</span>
                            </Button>
                        )}
                    </ToolbarGroup>
                    <ToolbarGroup shade="right">
                        <ZoomControls />
                        <ButtonGroup>
                            <Button variant="outline" size="icon" onClick={setAsFavorite}>
                                {favorite ? <IconHeartFilled className="size-5" /> : <IconHeart className="size-5" />}
                            </Button>
                            <Button variant="outline" size="icon">
                                <IconFolderPlus className="size-5" />
                            </Button>
                            <Button variant="outline" size="icon">
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
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%", willChange: "transform" }} key={item?.id}>
                    {item && (
                        <motion.img
                            layoutId={`item-${item.id}`}
                            src={getOriginalPath(item, selectedLibrary?.path)}
                            className="max-w-full max-h-full object-contain shadow-2xl pointer-events-auto z-2"
                        />
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