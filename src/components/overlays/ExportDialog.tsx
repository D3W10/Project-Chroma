import { useEffect, useRef, useState } from "react";
import { open as openSystem } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { useAction } from "@/lib/useAction";
import { useSettings } from "@/lib/useSettings";
import type { Item } from "@/lib/models";

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
    items: Item[];
}

export function ExportDialog({ open, onOpenChange, items }: ExportDialogProps) {
    const { settings, updateSettings } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [exportLive, setExportLive] = useState(settings.exportOptions.livePhotos);
    const [exportEdits, setExportEdits] = useState(settings.exportOptions.edits);
    const [exportAdjustments, setExportAdjustments] = useState(settings.exportOptions.adjustments);
    const exportPath = useRef("");
    const action = useAction();

    async function handleExport() {
        action.exportItems(exportPath.current, items.map(p => p.id), exportLive, exportEdits, exportAdjustments);
        updateSettings({ exportOptions: {
            livePhotos: exportLive,
            edits: exportEdits,
            adjustments: exportAdjustments,
        } });
        setIsOpen(false);
    }

    useEffect(() => {
        if (open) {
            openSystem({
                directory: true,
                multiple: false,
            }).then(selected => {
                if (selected) {
                    exportPath.current = selected;
                    setIsOpen(true);
                }
            });
        }
    }, [open]);

    useEffect(() => {
        if (!isOpen)
            onOpenChange(false);
    }, [isOpen]);

    useEffect(() => {
        if (open)
            exportPath.current = "";
    }, [open]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                    </FieldGroup>
                </FieldSet>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button className="flex justify-center relative" onClick={handleExport}>Export</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}