import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { IconArrowsMaximize, IconArrowsMinimize, IconChevronLeft, IconFolderPlus, IconHeart, IconHeartFilled, IconInfoCircle, IconLivePhoto, IconShare2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Toolbar } from "@/components/custom/Toolbar";
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
        queryClient.invalidateQueries({ queryKey: ["items"] });
    }

    function closeViewer(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (e.target === e.currentTarget) onClose();
    }

    return (
        <div className="flex flex-col absolute inset-0 bg-background z-10" onDoubleClick={closeViewer}>
            <Toolbar className="absolute">
                <div>
                    <Button variant="outline" size="icon" onClick={onClose}>
                        <IconChevronLeft className="size-5" />
                    </Button>
                </div>
                <div className="flex gap-2">
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
                </div>
            </Toolbar>
            <TransformWrapper disablePadding wheel={{ activationKeys: ["Control", "Meta"] }} panning={{ wheelPanning: true }}>
                <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%" }}
                >
                    <motion.img
                        layoutId={`item-${item.id}`}
                        src={convertFileSrc(selectedLibrary.path + "/originals/" + item.id + "." + item.file_ext)}
                        className="max-w-full max-h-full object-contain shadow-2xl pointer-events-auto"
                    />
                </TransformComponent>
                <div className="absolute top-2 left-2">
                    <IconLivePhoto className="size-5" />
                </div>
            </TransformWrapper>
            {/* <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                <TransformWrapper panning={{ disabled: true }} wheel={{ disabled: true }}>
                    <TransformComponent
                        wrapperStyle={{ width: "100%", height: "100%", paddingTop: "3.25rem" }}
                        contentStyle={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}
                    >
                        <motion.img
                            layoutId={`item-${item.id}`}
                            src={convertFileSrc(selectedLibrary.path + "/originals/" + item.id + "." + item.file_ext)}
                            className="max-w-full max-h-full object-contain shadow-2xl pointer-events-auto"
                        />
                    </TransformComponent>
                </TransformWrapper>
            </div> */}
        </div>
    );
}
