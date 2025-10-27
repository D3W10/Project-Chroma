import { open } from "@tauri-apps/plugin-dialog";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorCircle24Regular, ImageMultiple24Regular } from "@fluentui/react-icons";
import { animate } from "@/components/animated";
import { Sidebar } from "@/components/layout/sidebar";
import { CenterLayout } from "@/components/layout/centerLayout";
import { Button } from "@/components/ui/button";
import { IconBox } from "@/components/custom/IconBox";
import { checkLibraryPath, removeLibrary, updateLibraryPath } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";

export const Route = createFileRoute("/_app")({
    component: RouteComponent,
});

function RouteComponent() {
    const { libraries, selectedLibrary, setOpenCreateLibrary, setPendingLibraryId } = useLibrary();
    const queryClient = useQueryClient();

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
        setOpenCreateLibrary(true);
    }

    async function handleRemoveLibrary() {
        if (selectedLibrary) {
            const idx = libraries.findIndex(lib => lib.id === selectedLibrary.id);
            const rest = libraries.filter(lib => lib.id !== selectedLibrary.id);

            await removeLibrary(selectedLibrary.id);

            setPendingLibraryId(rest.length >= idx + 1 ? rest[idx].id : (rest.length > 0 ? rest[idx - 1].id : null));
            queryClient.invalidateQueries({ queryKey: ["libraries"] });
        }
    }

    return (
        <div className="flex justify-center items-center flex-1">
            <Sidebar collapsed={!(selectedLibrary && !isLoading && libraryExists?.data)} />
            <div className={`h-full flex flex-col flex-1 bg-background ${selectedLibrary && !isLoading && libraryExists?.data ? "rounded-tl-xl" : ""} ring-1 ring-input shadow-md overflow-hidden transition-[border-radius] duration-200`}>
                {isLoading ? null : selectedLibrary && libraryExists?.data ? (
                    <Outlet key={selectedLibrary.id} />
                ) : selectedLibrary ? (
                    <CenterLayout key={selectedLibrary.id}>
                        <IconBox className="mb-4">
                            <ErrorCircle24Regular />
                        </IconBox>
                        <animate.h1 className="text-xl font-bold" delay={0.3}>Library not found</animate.h1>
                        <animate.div className="space-y-2" delay={0.45}>
                            <p>We couldn&apos;t find <span className="font-semibold">{selectedLibrary.name}</span> at the following location:</p>
                            <div className="w-full px-3 py-2 bg-secondary rounded-lg font-mono text-sm ring-1 ring-input select-text overflow-x-auto">
                                {selectedLibrary.path}
                            </div>
                        </animate.div>
                        <animate.div className="w-full mt-2 flex justify-center gap-4" delay={0.6}>
                            <Button variant="outline" onClick={selectNewLocation}>Select new location</Button>
                            <Button variant="destructive" onClick={handleRemoveLibrary}>Remove library</Button>
                        </animate.div>
                    </CenterLayout>
                ) : error ? (
                    <CenterLayout>
                        <IconBox className="mb-4">
                            <ErrorCircle24Regular />
                        </IconBox>
                        <animate.h1 className="text-xl font-bold" delay={0.3}>Error accessing library</animate.h1>
                        <animate.p className="text-muted-foreground" delay={0.45}>There was an issue accessing this library on the filesystem. Please check if your operating system or any other application is blocking access to the folder.</animate.p>
                    </CenterLayout>
                ) : (
                    <CenterLayout>
                        <IconBox className="mb-4">
                            <ImageMultiple24Regular />
                        </IconBox>
                        <animate.h1 className="text-xl font-bold" delay={0.3}>No library selected</animate.h1>
                        <animate.p delay={0.45} className="text-muted-foreground">Use the select on the top left to open an existing library or create a new one using the button below.</animate.p>
                        <animate.div className="w-full mt-2 flex justify-center" delay={0.6}>
                            <Button variant="outline" onClick={createNewLibrary}>Create new library</Button>
                        </animate.div>
                    </CenterLayout>
                )}
            </div>
        </div>
    );
}