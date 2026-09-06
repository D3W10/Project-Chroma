import { describe, expect, it } from "vitest";
import { formatExportDate } from "./export.ts";

describe("export date filenames", () => {
    const takenDate = new Date(2026, 8, 5, 14, 7, 9);

    it.each([undefined, "", "   "])("uses the default format for %s", dateFormat => {
        expect(formatExportDate(takenDate, dateFormat)).toBe("2026-09-05 14.07.09");
    });

    it("supports custom formats and quoted literals", () => {
        expect(formatExportDate(takenDate.toISOString(), "'Photo' dd-MM-yyyy HHmmss")).toBe("Photo 05-09-2026 140709");
    });

    it("keeps formatted dates safe for filenames", () => {
        expect(formatExportDate(takenDate, "yyyy/MM/dd HH:mm:ss")).toBe("2026-09-05 14-07-09");
        expect(() => formatExportDate(takenDate, "'.'")).toThrow();
    });

    it("rejects invalid formats and dates", () => {
        expect(() => formatExportDate(takenDate, "invalid")).toThrow();
        expect(() => formatExportDate("not a date")).toThrow();
    });
});
