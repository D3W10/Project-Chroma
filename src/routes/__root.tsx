import { useEffect } from "react";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useQuery } from "@tanstack/react-query";
import { Framebar } from "@/components/layout/framebar";
import { CreateLibraryDialog } from "@/components/overlays/CreateLibraryDialog";
import { getLibraries, getSelectedLibrary, setSelectedLibrary as setSelectedLibraryOnConfig } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import type { Library } from "@/lib/models";

export const Route = createRootRouteWithContext<{
    selectedLibrary: Library | null;
}>()({
    component: RootComponent,
});

function RootComponent() {
    const {
        libraries,
        setLibraries,
        selectedLibrary,
        setSelectedLibrary,
        openCreateLibrary,
        setOpenCreateLibrary,
        pendingLibraryId,
        setPendingLibraryId,
        dialogOpen,
    } = useLibrary();

    const { data } = useQuery({
        queryKey: ["libraries"],
        queryFn: getLibraries,
    });

    const { data: dataSel } = useQuery({
        queryKey: ["selected-library"],
        queryFn: getSelectedLibrary,
    });

    useEffect(() => {
        setLibraries(data?.data ?? []);
    }, [data]);

    useEffect(() => {
        if (!data) return;

        if (pendingLibraryId) {
            const pendingLibrary = data?.data?.find(e => e.id === pendingLibraryId);

            if (pendingLibrary) {
                setSelectedLibrary(pendingLibrary);
                setPendingLibraryId(null);
                setOpenCreateLibrary(false);
                return;
            }
        }

        setSelectedLibrary(data?.data?.find(e => e.id === dataSel?.data) ?? null);
    }, [data, dataSel]);

    useEffect(() => {
        setSelectedLibraryOnConfig({ libraryId: selectedLibrary?.id ?? null });
    }, [selectedLibrary]);

    return (
        <>
            <Framebar libraries={libraries} />
            {dialogOpen && (
                <div className="w-full h-12 fixed top-0 left-0 right-0 z-100" data-tauri-drag-region></div>
            )}
            <Outlet />
            <TanStackRouterDevtools />
            <CreateLibraryDialog open={openCreateLibrary} onOpenChange={setOpenCreateLibrary} />
        </>
    );
}