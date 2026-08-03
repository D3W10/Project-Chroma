import { useState } from "react";
import { useNotifications } from "@/lib/useNotifications";
import type { LibraryMetadataPath } from "@project-chroma/contracts/gallery";

export function useExistingLibraryImport() {
    const [isAddLibraryOpen, setIsAddLibraryOpen] = useState(false);
    const [libraryToAdd, setLibraryToAdd] = useState<LibraryMetadataPath>();
    const { pushNoti } = useNotifications();

    async function selectExistingLibrary() {
        try {
            const selected = (
                await window.chroma?.openDialog({
                    directory: true,
                    multiple: false,
                })
            )?.data;

            if (selected && window.chroma) {
                const path = typeof selected === "string" ? selected : selected[0];
                const { data } = await window.chroma.library.getInfoFromPath({ path });

                if (data) {
                    setLibraryToAdd({ ...data, path });
                    setIsAddLibraryOpen(true);
                } else {
                    pushNoti({
                        title: "Invalid folder",
                        description: "The selected folder does not contain a valid library",
                        type: "error",
                    });
                }
            }
        } catch (err) {
            console.error(err);
            pushNoti({
                title: "System failure",
                description: "Unable to open the system file open dialog",
                type: "error",
            });
        }
    }

    return {
        isAddLibraryOpen,
        setIsAddLibraryOpen,
        libraryToAdd,
        selectExistingLibrary,
    };
}
