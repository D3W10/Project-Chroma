import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Add24Filled, AutoFitHeight24Regular, Subtract24Filled } from "@fluentui/react-icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getPhotos, addPhoto } from "@/lib/invoker";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { useLibrary } from "@/lib/useLibrary";
import type { Photo } from "@/lib/models";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

const gridSizes = ["grid-cols-3", "grid-cols-5", "grid-cols-7", "grid-cols-9"];

function RouteComponent() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [gridSize, setGridSize] = useState(2);
    const [squareThumb, setSquareThumb] = useState(false);
    const { selectedLibrary } = useLibrary();
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ["photos"],
        queryFn: () => getPhotos(selectedLibrary?.id ?? ""),
    });

    async function addPhotos() {
        try {
            const selected = await open({
                multiple: true,
                filters: [
                    {
                        name: "Images",
                        extensions: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"],
                    },
                    {
                        name: "Videos",
                        extensions: ["mp4", "mov", "avi"],
                    },
                ],
            });

            if (selected && selectedLibrary) {
                for (const file of selected)
                    addPhoto(selectedLibrary.id, file);

                queryClient.invalidateQueries({ queryKey: ["photos"] });
                notifySuccess("Import success", selected.length + " photos were added successfully!");
            }
        } catch (err) {
            console.error(err);
            notifyError("Import error", "Failed to open the system file dialog");
        }
    }

    useEffect(() => {
        setPhotos(data?.data ?? []);
    }, [data]);

    return (
        <div className="h-screen flex flex-col flex-1 relative overflow-y-auto">
            <div className="p-2 flex justify-between items-center sticky top-0 left-0 right-0 z-10 before:absolute before:inset-0 before:backdrop-blur-xs before:mask-b-from-25% before:-z-10 after:absolute after:inset-0 after:bg-background/70 after:mask-b-from-40% after:-z-20">
                <div>
                    <Button onClick={addPhotos}>
                        <Add24Filled className="size-4 mr-0.5" />
                        Add photos
                    </Button>
                </div>
                <div className="flex gap-2">
                    <div className="p-1 flex items-center gap-1 rounded-md ring ring-input shadow-xs backdrop-blur-xs *:size-7 *:rounded-sm">
                        <Button variant="ghost" size="icon" disabled={gridSize === 0} onClick={() => setGridSize(gridSize - 1)}>
                            <Add24Filled className="size-5" />
                        </Button>
                        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4/5" />
                        <Button variant="ghost" size="icon" disabled={gridSize === gridSizes.length - 1} onClick={() => setGridSize(gridSize + 1)}>
                            <Subtract24Filled className="size-5" />
                        </Button>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setSquareThumb(!squareThumb)}>
                        <AutoFitHeight24Regular className="size-5" />
                    </Button>
                </div>
            </div>
            <div className={`min-h-0 p-2 pt-14 grid ${gridSizes[gridSize]} gap-1 absolute`}>
                {photos.map((t, i) => (
                    <PhotoItem photo={t} square={squareThumb} key={i} />
                ))}
            </div>
        </div>
    );
}

function PhotoItem({ photo, square }: { photo: Photo; square: boolean }) {
    const { selectedLibrary } = useLibrary();

    return (
        <div className={`${!square ? "p-2" : ""} flex justify-center items-center overflow-hidden aspect-square`}>
            <img src={convertFileSrc(selectedLibrary?.path + "/thumbnails/" + photo.id + ".webp")} className={`${!square && photo.width > photo.height ? "w-full" : "h-full"} rounded-sm`} />
        </div>
    );
}