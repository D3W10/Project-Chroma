import { format } from "date-fns";
import { DEFAULT_EXPORT_DATE_FORMAT } from "@project-chroma/contracts/config";

export function formatExportDate(takenDate: string | Date, dateFormat?: string): string {
    const name = format(new Date(takenDate), dateFormat?.trim() || DEFAULT_EXPORT_DATE_FORMAT)
        .replace(/[<>:"/\\|?*\p{Cc}]/gu, "-")
        .replace(/[. ]+$/, "")
        .trim();

    if (!name) throw new Error("The date format must produce a filename.");
    return name;
}
