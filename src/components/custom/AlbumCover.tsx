import { IconColor } from "@/components/custom/IconColor";
import { useLibrary } from "@/lib/useLibrary";
import { getThumbPath } from "@/lib/utils";
import type { Album } from "@/lib/models";

export function AlbumCover({ item, size = "lg" }: { item: Album; size?: "sm" | "md" | "lg" | "xl" }) {
    const { selectedLibrary } = useLibrary();

    return item.selected_cover === 1 && item.cover_photo ? (
        <img src={getThumbPath(item.cover_photo, selectedLibrary?.path)} className="size-full object-cover" />
    ) : (
        <IconColor color={item.color!} size={size}>{item.icon}</IconColor>
    );
}