import { IconColor } from "@/components/IconColor";
import { useLibrary } from "@/lib/useLibrary";
import { getThumbPath } from "@/lib/utils";
import type { Album } from "@project-chroma/contracts/gallery";

export function AlbumCover({ item, size = "lg" }: { item: Album; size?: "sm" | "md" | "lg" | "xl" }) {
    const { selectedLibrary } = useLibrary();

    return item.selectedCover === 1 && item.coverPhoto ? (
        <img src={getThumbPath(item.coverPhoto, selectedLibrary?.path)} className="size-full object-cover" />
    ) : (
        <IconColor color={item.color!} size={size}>
            {item.icon}
        </IconColor>
    );
}
