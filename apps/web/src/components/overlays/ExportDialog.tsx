import { useEffect, useState } from "react";
import { Button } from "@project-chroma/ui/button";
import { Checkbox } from "@project-chroma/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@project-chroma/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@project-chroma/ui/field";
import { Input } from "@project-chroma/ui/input";
import { DEFAULT_EXPORT_DATE_FORMAT } from "@project-chroma/contracts/config";
import { formatExportDate } from "@project-chroma/utils";
import { useAction } from "@/lib/useAction";
import { useNotifications } from "@/lib/useNotifications";
import { useSettings } from "@/lib/useSettings";
import type { Item } from "@project-chroma/contracts/gallery";

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
    items: Item[];
}

export function ExportDialog({ open, onOpenChange, items }: ExportDialogProps) {
    const { settings, updateSettings } = useSettings();
    const [exportPath, setExportPath] = useState("");
    const [exportLive, setExportLive] = useState(settings.exportOptions.livePhotos);
    const [exportEdits, setExportEdits] = useState(settings.exportOptions.edits);
    const [exportAdjustments, setExportAdjustments] = useState(settings.exportOptions.adjustments);
    const [nameByTakenDate, setNameByTakenDate] = useState(settings.exportOptions.nameByTakenDate ?? false);
    const [dateFormat, setDateFormat] = useState(settings.exportOptions.dateFormat ?? DEFAULT_EXPORT_DATE_FORMAT);
    const action = useAction();
    const { pushNoti } = useNotifications();
    let datePreview = "";
    let dateFormatError = "";
    if (nameByTakenDate) {
        try {
            datePreview = formatExportDate(items[0]?.takenDate ?? new Date(), dateFormat);
        } catch {
            dateFormatError = "Enter a valid date format, for example yyyy-MM-dd HH.mm.ss.";
        }
    }

    function closeDialog() {
        setExportPath("");
        onOpenChange(false);
    }

    async function handleExport() {
        if (dateFormatError) return;
        action.exportItems(exportPath, items.map(p => p.id), exportLive, exportEdits, exportAdjustments, nameByTakenDate, dateFormat);
        await updateSettings({
            exportOptions: {
                livePhotos: exportLive,
                edits: exportEdits,
                adjustments: exportAdjustments,
                nameByTakenDate,
                dateFormat: dateFormat.trim() || DEFAULT_EXPORT_DATE_FORMAT,
            },
        });
        closeDialog();
    }

    useEffect(() => {
        if (!open) return;
        let active = true;

        window.chroma?.openDialog({ directory: true }).then(result => {
            if (!active) return;
            if (!result.success) {
                pushNoti({ type: "error", title: result.error.title, description: result.error.message });
                onOpenChange(false);
                return;
            }

            const selectedPath = result.data?.[0];
            if (selectedPath) setExportPath(selectedPath);
            else onOpenChange(false);
        });

        return () => {
            active = false;
        };
    }, [open, onOpenChange, pushNoti]);

    return (
        <Dialog open={open && !!exportPath} onOpenChange={nextOpen => !nextOpen && closeDialog()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export items</DialogTitle>
                    <DialogDescription>Select how you want to export the selected items</DialogDescription>
                </DialogHeader>
                <FieldSet>
                    <FieldGroup className="gap-3">
                        <Field orientation="horizontal">
                            <Checkbox id="optionLivePhotos" checked={exportLive} onCheckedChange={e => setExportLive(!!e)} />
                            <FieldLabel htmlFor="optionLivePhotos">Export live videos</FieldLabel>
                        </Field>
                        <Field orientation="horizontal">
                            <Checkbox id="optionEdits" checked={exportEdits} onCheckedChange={e => setExportEdits(!!e)} />
                            <FieldLabel htmlFor="optionEdits">Export original unedited items</FieldLabel>
                        </Field>
                        <Field orientation="horizontal">
                            <Checkbox id="optionAdjustments" checked={exportAdjustments} onCheckedChange={e => setExportAdjustments(!!e)} />
                            <FieldLabel htmlFor="optionAdjustments">Export adjustments</FieldLabel>
                        </Field>
                        <hr />
                        <Field orientation="horizontal">
                            <Checkbox id="optionTakenDate" checked={nameByTakenDate} onCheckedChange={e => setNameByTakenDate(!!e)} />
                            <FieldLabel htmlFor="optionTakenDate">Name files by date taken</FieldLabel>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="exportDateFormat">Date format</FieldLabel>
                            <Input id="exportDateFormat" value={dateFormat} disabled={!nameByTakenDate} placeholder={DEFAULT_EXPORT_DATE_FORMAT} onChange={e => setDateFormat(e.target.value)} aria-invalid={!!dateFormatError} aria-describedby="exportDateFormatHelp" />
                            <FieldDescription id="exportDateFormatHelp">
                                {dateFormatError || (nameByTakenDate ? `Preview: ${datePreview}. Uses local time. Invalid filename characters become hyphens.` : "Use yyyy for year, MM for month, dd for day, HH for hours, mm for minutes, and ss for seconds.")}
                            </FieldDescription>
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                    <Button className="flex justify-center relative" disabled={items.length === 0 || !exportPath || !!dateFormatError} onClick={handleExport}>Export</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
