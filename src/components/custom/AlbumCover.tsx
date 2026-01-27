import { IconColor } from "./IconColor";
import type { Album } from "@/lib/models";

export function AlbumCover({ item, size = "lg" }: { item: Album; size?: "sm" | "md" | "lg" | "xl" }) {
    return item.selected_cover === 0 ? (
        <IconColor color={item.color!} size={size}>{item.icon}</IconColor>
    ) : (
        <div></div>
    );
}