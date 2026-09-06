import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@project-chroma/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@project-chroma/ui/dialog";
import { unwrapResult } from "@/lib/utils";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useSettings } from "@/lib/useSettings";
import { queryKeys } from "@/lib/utils";

interface EnableSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => unknown;
    onEnabled?: () => unknown;
}

export function EnableSearchDialog({ open, onOpenChange, onEnabled }: EnableSearchDialogProps) {
    const [searchSetupActive, setSearchSetupActive] = useState(false);
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();
    const { settings, updateSettings } = useSettings();

    function confirmAction() {
        onOpenChange(false);

        if (searchSetupActive || !selectedLibrary?.id || settings.searchEnabled) return;

        const libraryId = selectedLibrary.id;
        setSearchSetupActive(true);

        const setupPromise = unwrapResult(window.chroma!.search.enable({ libraryId }));
        pushNoti({ title: "Preparing search", description: "Downloading the search model from the internet.", type: "promise",
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
                void updateSettings({ searchEnabled: true });
                void queryClient.invalidateQueries({ queryKey: queryKeys.itemSearchStatus(libraryId) });
                onEnabled?.();
            },
            onError: () => setSearchSetupActive(false),
        });
    }

    useEffect(() => {
        if (open && searchSetupActive) onOpenChange(false);
    }, [onOpenChange, open, searchSetupActive]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enable search</DialogTitle>
                    <div className="mt-1 space-y-2">
                        <p className="text-secondary-foreground">In order to use search, Project Chroma needs to download a small model in order to identify items and objects in your photos.</p>
                        <p className="text-secondary-foreground">This model is about 160 MB and runs locally so your photos and videos don&apos;t leave your device.</p>
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
