import { open } from "@tauri-apps/plugin-dialog";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorCircle24Regular, ImageMultiple24Regular } from "@fluentui/react-icons";
import { animate } from "@/components/animated";
import { Sidebar } from "@/components/layout/sidebar";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { checkLibraryPath, removeLibrary, updateLibraryPath } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";

export const Route = createFileRoute("/_app")({
    component: RouteComponent,
});

function RouteComponent() {
    const { selectedLibrary } = useLibrary();

    const { data: libraryExists, error, isLoading } = useQuery({
        queryKey: ["library-path", selectedLibrary?.id],
        queryFn: () => checkLibraryPath(selectedLibrary!.id),
        enabled: !!selectedLibrary?.id,
        retry: false,
    });

    async function selectNewLocation() {
        const picked = await open({ directory: true });
        if (picked && typeof picked === "string" && selectedLibrary)
            updateLibraryPath(selectedLibrary.id, picked);
    }

    function createNewLibrary() {
    }

    return (
        <div className="flex justify-center items-center flex-1" key={selectedLibrary?.id}>
            {!!(selectedLibrary && !isLoading && libraryExists) && (
                <Sidebar />
            )}
            <div className={`h-full flex flex-col flex-1 bg-background ${selectedLibrary && !isLoading && libraryExists ? "rounded-tl-xl" : ""} ring-1 ring-input shadow-md overflow-hidden`}>
                {isLoading ? null : selectedLibrary && libraryExists ? (
                    <Outlet />
                ) : selectedLibrary ? (
                    <CenterLayout>
                        <animate.div delay={0.5} className="size-18 mb-4 p-4 bg-primary/15 rounded-lg ring-2 ring-primary">
                            <ErrorCircle24Regular className="size-full drop-shadow-md drop-shadow-primary/50" />
                        </animate.div>
                        <animate.h1 className="text-xl font-bold" delay={0.8}>Library not found</animate.h1>
                        <animate.div className="space-y-2" delay={1.1}>
                            <p>We couldn&apos;t find <span className="font-semibold">{selectedLibrary.name}</span> at the following location:</p>
                            <div className="w-full px-3 py-2 bg-secondary rounded-lg font-mono text-sm ring-1 ring-input overflow-x-auto">
                                {selectedLibrary.path}
                            </div>
                        </animate.div>
                        <animate.div className="w-full mt-2 flex justify-center gap-4" delay={1.4}>
                            <Button variant="outline" onClick={selectNewLocation}>Select new location</Button>
                            <Button variant="destructive" onClick={() => removeLibrary(selectedLibrary.id)}>Remove library</Button>
                        </animate.div>
                    </CenterLayout>
                ) : error ? (
                    <CenterLayout>
                        <animate.div delay={0.5} className="size-18 mb-4 p-4 bg-primary/15 rounded-lg ring-2 ring-primary">
                            <ErrorCircle24Regular className="size-full drop-shadow-md drop-shadow-primary/50" />
                        </animate.div>
                        <animate.h1 className="text-xl font-bold" delay={0.8}>Error accessing library</animate.h1>
                        <animate.p className="text-muted-foreground" delay={1.1}>There was an issue accessing this library on the filesystem. Please check if your operating system or any other application is blocking access to the folder.</animate.p>
                    </CenterLayout>
                ) : (
                    <CenterLayout>
                        <animate.div delay={0.5} className="size-18 mb-4 p-4 bg-primary/15 rounded-lg ring-2 ring-primary">
                            <ImageMultiple24Regular className="size-full drop-shadow-md drop-shadow-primary/50" />
                        </animate.div>
                        <animate.h1 className="text-xl font-bold" delay={0.8}>No library selected</animate.h1>
                        <animate.p delay={1.1} className="text-muted-foreground">Use the select on the top left to open an existing library or create a new one using the button below.</animate.p>
                        <animate.div className="w-full mt-2 flex justify-center" delay={1.4}>
                            <Button variant="outline" onClick={createNewLibrary}>Create new library</Button>
                        </animate.div>
                    </CenterLayout>
                )}
            </div>
        </div>
    );
}