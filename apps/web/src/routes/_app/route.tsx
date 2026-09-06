import { useEffect, useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { IconCircleArrowUp, IconExclamationCircle, IconLayoutGrid } from "@tabler/icons-react";
import { Button } from "@project-chroma/ui/button";
import { Progress } from "@project-chroma/ui/progress";
import { Spinner } from "@project-chroma/ui/spinner";
import { cn, isAppError } from "@project-chroma/utils";
import { animate } from "@/components/animated";
import { IconBox } from "@/components/IconBox";
import { PathBox } from "@/components/PathBox";
import { PhotoViewer } from "@/components/PhotoViewer";
import { Sidebar } from "@/components/layout/sidebar";
import { CenterLayout } from "@/components/layout/centerLayout";
import { CreateLibraryDialog } from "@/components/overlays/CreateLibraryDialog";
import { useAction } from "@/lib/useAction";
import { useLibrary } from "@/lib/useLibrary";
import { useMigration } from "@/lib/useMigration";
import { useNotifications } from "@/lib/useNotifications";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useViewer } from "@/lib/useViewer";
import { queryKeys } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
    component: RouteComponent,
});

function RouteComponent() {
    const [openCreateLibrary, setOpenCreateLibrary] = useState(false);
    const [showLibraryProgress, setShowLibraryProgress] = useState(false);
    const action = useAction();
    const { selectedLibrary } = useLibrary();
    const { migrating, migrationId, startMigration, endMigration } = useMigration();
    const { pushNoti } = useNotifications();
    const {
        isLoading: isLoadingLibrary,
        data: libraryHealth,
        error: libraryError,
    } = useQuerySafe({
        queryKey: queryKeys.libraryHealth(selectedLibrary?.id ?? ""),
        queryFn: () => window.chroma!.library.checkHealth({ libraryId: selectedLibrary!.id }),
        enabled: !!selectedLibrary?.id,
        retry: false,
    });
    const queryClient = useQueryClient();
    const { viewingItem, setViewingItem } = useViewer();

    const successLoaded = libraryHealth === "healthy";
    const isMigratingThisLibrary = !!(migrating && selectedLibrary && migrationId === selectedLibrary.id);

    useEffect(() => {
        if (!isLoadingLibrary) {
            setShowLibraryProgress(false);
            return;
        }

        const timeout = window.setTimeout(() => setShowLibraryProgress(true), 1000);
        return () => window.clearTimeout(timeout);
    }, [isLoadingLibrary]);

    async function selectNewLocation() {
        if (!window.chroma) return;

        const picked = (await window.chroma.openDialog({ directory: true })).data;
        if (picked && selectedLibrary) {
            const result = await window.chroma.library.updatePath({
                libraryId: selectedLibrary.id,
                newPath: Array.isArray(picked) ? picked[0] : picked,
            });
            if (!result.success) {
                const pathConflict = isAppError(result.error) && result.error.code === "library:path-conflict";
                pushNoti({
                    title: pathConflict ? "Library path already in use" : "Unable to update library path",
                    description: pathConflict ? "Choose a location outside the path of an existing library." : "An error occurred while updating the library path.",
                    type: "error",
                });
            }
        }
    }

    async function handleUpgradeLibrary() {
        if (selectedLibrary) {
            const targetLib = selectedLibrary;

            if (migrating && migrationId === targetLib.id) return;
            if (migrating && migrationId !== targetLib.id) {
                pushNoti({
                    title: "Ongoing upgrade",
                    description: "Another library is currently being upgraded, please wait until the upgrade is complete before attempting to upgrade " + targetLib.name + ".",
                    type: "error",
                });
                return;
            }

            startMigration(targetLib.id);
            pushNoti({
                title: "Upgrading library",
                description: "The library " + targetLib.name + " is being upgraded to the latest version.",
                type: "promise",
                promise: window.chroma!.library.upgrade({
                    libraryId: targetLib.id,
                }),
                peek: "Upgrading library",
                success: () => ({
                    title: "Library upgraded",
                    description: 'The library "' + targetLib.name + '" was successfully upgraded.',
                }),
                error: () => ({
                    title: "Library upgrade failed",
                    description: 'The library "' + targetLib.name + '" could not be upgraded due to an internal error.',
                }),
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.libraryHealth(targetLib.id),
                    });
                    endMigration();
                },
                onError: () => endMigration(),
            });
        }
    }

    return (
        <div className="min-h-0 flex justify-center items-center relative flex-1">
            {showLibraryProgress && <Progress indeterminate className="absolute top-0 left-0 right-0 z-10" />}
            <Sidebar collapsed={!successLoaded} />
            <div
                className={cn(
                    "h-full flex flex-col flex-1 relative bg-background ring-1 ring-input shadow-md overflow-hidden transition-[border-radius] duration-200 *:overscroll-none",
                    successLoaded ? "rounded-tl-xl" : "",
                )}
            >
                {successLoaded && selectedLibrary ? (
                    <Outlet key={selectedLibrary.id} />
                ) : selectedLibrary ? (
                    libraryError?.code === "library:not-found" ? (
                        <CenterLayout key={selectedLibrary.id}>
                            <IconBox className="mb-4">
                                <IconExclamationCircle />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.1}>
                                Library not found
                            </animate.h1>
                            <animate.div className="space-y-2" delay={0.2}>
                                <p className="text-secondary-foreground">
                                    We couldn&apos;t find <span className="font-semibold">{selectedLibrary.name}</span> at the following location:
                                </p>
                                <PathBox>{selectedLibrary.path}</PathBox>
                            </animate.div>
                            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.3}>
                                <Button variant="secondary" onClick={selectNewLocation}>
                                    Select new location
                                </Button>
                                <Button variant="destructive" onClick={() => action.removeLibrary(selectedLibrary.id)}>
                                    Remove library
                                </Button>
                            </animate.div>
                        </CenterLayout>
                    ) : libraryHealth === "outdated" ? (
                        <CenterLayout key={selectedLibrary.id}>
                            <IconBox className="mb-4">
                                <IconCircleArrowUp />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.1}>
                                Library outdated
                            </animate.h1>
                            <animate.div className="text-secondary-foreground space-y-2" delay={0.2}>
                                <p>This library has been created using an older version of Project Chroma, you need to upgrade it first before using.</p>
                                <p>Note that older versions of the app will not be able to open this library again!</p>
                            </animate.div>
                            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.3}>
                                <Button disabled={isMigratingThisLibrary} onClick={handleUpgradeLibrary}>
                                    <span className={isMigratingThisLibrary ? "opacity-0" : ""}>Upgrade library</span>
                                    <Spinner className={cn("absolute", !isMigratingThisLibrary ? "opacity-0" : "opacity-100")} />
                                </Button>
                            </animate.div>
                        </CenterLayout>
                    ) : libraryHealth === "recent" ? (
                        <CenterLayout key={selectedLibrary.id}>
                            <IconBox className="mb-4">
                                <IconExclamationCircle />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.1}>
                                Incompatible library
                            </animate.h1>
                            <animate.p className="text-secondary-foreground" delay={0.2}>
                                This library has been created using a more recent version of Project Chroma. You need to update the app to the latest version before using it.
                            </animate.p>
                            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.3}>
                                <Button variant="destructive" onClick={() => action.removeLibrary(selectedLibrary.id)}>
                                    Remove library
                                </Button>
                            </animate.div>
                        </CenterLayout>
                    ) : (
                        <CenterLayout>
                            <IconBox className="mb-4">
                                <IconExclamationCircle />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.1}>
                                Error accessing library
                            </animate.h1>
                            <animate.p className="text-secondary-foreground" delay={0.2}>
                                There was an issue accessing this library on the filesystem. Please check if your operating system or any other application is blocking access to the folder.
                            </animate.p>
                        </CenterLayout>
                    )
                ) : (
                    <CenterLayout>
                        <IconBox className="mb-4">
                            <IconLayoutGrid />
                        </IconBox>
                        <animate.h1 className="text-xl font-bold" delay={0.1}>
                            No library selected
                        </animate.h1>
                        <animate.p delay={0.2} className="text-secondary-foreground">
                            Use the select on the top left to open an existing library or create a new one using the button below.
                        </animate.p>
                        <animate.div className="w-full mt-2 flex justify-center" delay={0.3}>
                            <Button variant="secondary" onClick={() => setOpenCreateLibrary(true)}>
                                Create new library
                            </Button>
                        </animate.div>
                    </CenterLayout>
                )}
                <CreateLibraryDialog open={openCreateLibrary} onOpenChange={setOpenCreateLibrary} />
                <PhotoViewer item={viewingItem} setItem={setViewingItem} />
            </div>
        </div>
    );
}
