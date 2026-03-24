import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { enableItemSearch } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useSettings } from "@/lib/useSettings";
import { unwrapResult } from "@/lib/utils";

interface EnableSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
}

export function EnableSearchDialog({ open, onOpenChange }: EnableSearchDialogProps) {
    const [searchSetupActive, setSearchSetupActive] = useState(false);
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();
    const { settings, updateSettings } = useSettings();

    async function confirmAction() {
        onOpenChange(false);

        if (searchSetupActive || !selectedLibrary?.id || settings.searchEnabled)
            return;

        setSearchSetupActive(true);

        const setupPromise = unwrapResult(enableItemSearch({ libraryId: selectedLibrary.id }));
        pushNoti("Preparing search", "Downloading the search model from the internet.", "promise", {
            promise: setupPromise,
            peek: "Preparing search",
            success: () => ({
                title: "Search was enabled",
                description: "Your library is now being indexed in the background and results will appear once ready.",
            }),
            error: () => ({
                title: "Search setup failed",
                description: "Unable to initialize local search. Try again later!",
            }),
            onSuccess: () => {
                setSearchSetupActive(false);
                updateSettings({ searchEnabled: true });
                queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "item-search-status"] });
            },
        });
    }

    useEffect(() => {
        if (open && searchSetupActive)
            onOpenChange(false);
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enable search</DialogTitle>
                    <div className="mt-1 space-y-2">
                        <p className="text-secondary-foreground">In order to use search, Project Chroma needs to download a small model in order to identify items and objects in your photos.</p>
                        <p className="text-secondary-foreground">This model is about 1 GB long and runs locally so your photos and videos don&apos;t leave your device.</p>
                    </div>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Not now</Button>
                    <Button onClick={confirmAction} disabled={searchSetupActive}>Enable search</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}