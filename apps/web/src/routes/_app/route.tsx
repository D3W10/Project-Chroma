import { useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/_app")({
    component: RouteComponent,
});

function RouteComponent() {
        isLoading: isLoadingLibrary,
    useEffect(() => {
        if (!isLoadingLibrary) {
            setShowLibraryProgress(false);
            return;
        }

        const timeout = window.setTimeout(() => setShowLibraryProgress(true), 1000);
        return () => window.clearTimeout(timeout);
    }, [isLoadingLibrary]);
        <div className="min-h-0 flex justify-center items-center relative flex-1">
            {showLibraryProgress && <Progress indeterminate className="absolute top-0 left-0 right-0 z-10" />}
            <Sidebar collapsed={!successLoaded} />
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
            </div>
        </div>
    );
}
