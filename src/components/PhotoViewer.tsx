import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { IconArrowsMaximize, IconArrowsMinimize, IconChevronLeft, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconLivePhoto, IconMinus, IconPlus, IconShare2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Toolbar, ToolbarGroup } from "@/components/custom/Toolbar";
import { setItemsFavorite } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import type { Item } from "@/lib/models";

interface PhotoViewerProps {
    item: Item;
    onClose: () => void;
}

export function PhotoViewer({ item, onClose }: PhotoViewerProps) {
    const [favorite, setFavorite] = useState(item.is_favorite);
    const [fullscreen, setFullscreen] = useState(false);
    const queryClient = useQueryClient();
    const { selectedLibrary } = useLibrary();

    if (!selectedLibrary) return null;

    async function setAsFavorite() {
        if (!selectedLibrary) return;

        await setItemsFavorite({ libraryId: selectedLibrary.id, itemIds: [item.id], value: !favorite });
        setFavorite(!favorite);
        queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "items"] });
    }

    function closeViewer(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (e.target === e.currentTarget) onClose();
    }

    return (
        <div className="flex flex-col sticky inset-0 bg-background z-10" onDoubleClick={closeViewer}>
            <TransformWrapper centerOnInit>
                {({ zoomIn, zoomOut }) => (
                    <>
                        <Toolbar className="absolute">
                            <ToolbarGroup placement="left">
                                <Button variant="outline" size="icon" onClick={onClose}>
                                    <IconChevronLeft className="size-5" />
                                </Button>
                                {item.live_video && (
                                    <Button variant="outline" className="pl-2 pr-2.5 gap-x-2">
                                        <IconLivePhoto className="size-5" />
                                        <span className="uppercase">Live</span>
                                    </Button>
                                )}
                            </ToolbarGroup>
                            <ToolbarGroup placement="right">
                                <ButtonGroup>
                                    <Button variant="outline" size="icon" onClick={() => zoomIn()}>
                                        <IconPlus className="size-5" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => zoomOut()}>
                                        <IconMinus className="size-5" />
                                    </Button>
                                </ButtonGroup>
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
                        <TransformComponent wrapperStyle={{ width: "100%", height: "100%", willChange: "transform" }}>
                            <motion.img
                                layoutId={`item-${item.id}`}
                                src={convertFileSrc(selectedLibrary.path + "/originals/" + item.id + "." + item.file_ext)}
                                className="max-w-full max-h-full object-contain shadow-2xl pointer-events-auto"
                            />
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
}