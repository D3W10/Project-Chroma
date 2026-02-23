import { open } from "@tauri-apps/plugin-dialog";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCircleArrowUp, IconExclamationCircle, IconLayoutGrid } from "@tabler/icons-react";
import { animate } from "@/components/animated";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IconBox } from "@/components/custom/IconBox";
import { Sidebar } from "@/components/layout/sidebar";
import { CenterLayout } from "@/components/layout/centerLayout";
import { checkLibraryHealth, removeLibrary, updateLibraryPath, upgradeLibrary } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useMigration } from "@/lib/useMigration";
import { useNotifications } from "@/lib/useNotifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
    component: RouteComponent,
});

function RouteComponent() {
    const { libraries, selectedLibrary, setOpenCreateLibrary, setPendingLibraryId } = useLibrary();
    const { migrating, setMigrating } = useMigration();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    const { isPending, data: libraryExists } = useQuery({
        queryKey: [selectedLibrary?.id, "library-health"],
        queryFn: () => checkLibraryHealth({ libraryId: selectedLibrary?.id ?? "" }),
        enabled: !!selectedLibrary?.id,
        retry: false,
    });

    const successLoaded = Boolean(!isPending && libraryExists?.data);

    async function selectNewLocation() {
        const picked = await open({ directory: true });
        if (picked && typeof picked === "string" && selectedLibrary)
            updateLibraryPath({ libraryId: selectedLibrary.id, newPath: picked });
    }

    async function handleUpgradeLibrary() {
        if (selectedLibrary) {
            setMigrating(true);
            pushNoti("Upgrading library", "The library " + selectedLibrary.name + " is being upgraded to the latest version.", "promise", {
                promise: upgradeLibrary({ libraryId: selectedLibrary.id }),
                peek: "Upgrading library",
                success: () => ({
                    title: "Library upgraded",
                    description: "The library \"" + selectedLibrary.name + "\" was successfully upgraded.",
                }),
                error: () => ({
                    title: "Library upgrade failed",
                    description: "The library \"" + selectedLibrary.name + "\" could not be upgraded due to an internal error.",
                }),
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "library-health"] });
                    setMigrating(false);
                },
                onError: () => setMigrating(false),
            });
        }
    }

    async function handleRemoveLibrary() {
        if (selectedLibrary) {
            const idx = libraries.findIndex(lib => lib.id === selectedLibrary.id);
            const rest = libraries.filter(lib => lib.id !== selectedLibrary.id);

            await removeLibrary({ libraryId: selectedLibrary.id });

            setPendingLibraryId(rest.length >= idx + 1 ? rest[idx].id : (rest.length > 0 ? rest[idx - 1].id : null));
            queryClient.invalidateQueries({ queryKey: ["libraries"] });
        }
    }

    return (
        <div className="min-h-0 flex justify-center items-center flex-1">
            <Sidebar collapsed={!successLoaded} />
            <div className={cn("h-full flex flex-col flex-1 bg-background ring-1 ring-input shadow-md overflow-hidden transition-[border-radius] duration-200 *:overscroll-none", successLoaded ? "rounded-tl-xl" : "")}>
                {successLoaded && selectedLibrary ? (
                    <Outlet key={selectedLibrary.id} />
                ) : selectedLibrary ? (
                    libraryExists?.error === "notfound" ? (
                        <CenterLayout key={selectedLibrary.id}>
                            <IconBox className="mb-4">
                                <IconExclamationCircle />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.15}>Library not found</animate.h1>
                            <animate.div className="space-y-2" delay={0.3}>
                                <p className="text-muted-foreground">We couldn&apos;t find <span className="font-semibold">{selectedLibrary.name}</span> at the following location:</p>
                                <div className="w-full mt-2 px-3 py-2 text-secondary-foreground bg-foreground/5 rounded-lg font-mono text-sm ring-1 ring-input select-text overflow-x-auto">
                                    {selectedLibrary.path}
                                </div>
                            </animate.div>
                            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.45}>
                                <Button variant="outline" onClick={selectNewLocation}>Select new location</Button>
                                <Button variant="destructive" onClick={handleRemoveLibrary}>Remove library</Button>
                            </animate.div>
                        </CenterLayout>
                    ) : libraryExists?.error === "outdated" ? (
                        <CenterLayout key={selectedLibrary.id}>
                            <IconBox className="mb-4">
                                <IconCircleArrowUp />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.15}>Library outdated</animate.h1>
                            <animate.div className="text-muted-foreground space-y-2" delay={0.3}>
                                <p>This library has been created using an older version of Project Chroma, you need to upgrade it first before using it.</p>
                                <p>Note that older versions of the app will not be able to open this library again!</p>
                            </animate.div>
                            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.45}>
                                <Button disabled={migrating} onClick={handleUpgradeLibrary}>
                                    <span className={migrating ? "opacity-0" : ""}>Upgrade library</span>
                                    <Spinner className={cn("absolute", !migrating ? "opacity-0" : "opacity-100")} />
                                </Button>
                            </animate.div>
                        </CenterLayout>
                    ) : libraryExists?.error === "recent" ? (
                        <CenterLayout key={selectedLibrary.id}>
                            <IconBox className="mb-4">
                                <IconExclamationCircle />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.15}>Incompatible library</animate.h1>
                            <animate.p className="text-muted-foreground" delay={0.3}>This library has been created using a more recent version of Project Chroma. You need to update the app to the latest version before using it.</animate.p>
                            <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.45}>
                                <Button variant="destructive" onClick={handleRemoveLibrary}>Remove library</Button>
                            </animate.div>
                        </CenterLayout>
                    ) : (
                        <CenterLayout>
                            <IconBox className="mb-4">
                                <IconExclamationCircle />
                            </IconBox>
                            <animate.h1 className="text-xl font-bold" delay={0.15}>Error accessing library</animate.h1>
                            <animate.p className="text-muted-foreground" delay={0.3}>There was an issue accessing this library on the filesystem. Please check if your operating system or any other application is blocking access to the folder.</animate.p>
                        </CenterLayout>
                    )
                ) : (
                    <CenterLayout>
                        <IconBox className="mb-4">
                            <IconLayoutGrid />
                        </IconBox>
                        <animate.h1 className="text-xl font-bold" delay={0.15}>No library selected</animate.h1>
                        <animate.p delay={0.3} className="text-muted-foreground">Use the select on the top left to open an existing library or create a new one using the button below.</animate.p>
                        <animate.div className="w-full mt-2 flex justify-center" delay={0.45}>
                            <Button variant="outline" onClick={() => setOpenCreateLibrary(true)}>Create new library</Button>
                        </animate.div>
                    </CenterLayout>
                )}
            </div>
        </div>
    );
}