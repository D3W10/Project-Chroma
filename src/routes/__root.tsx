import { useEffect } from "react";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useQuery } from "@tanstack/react-query";
import { Framebar } from "@/components/layout/framebar";
import { CreateLibraryDialog } from "@/components/overlays/CreateLibraryDialog";
import { getLibraries, getSelectedLibrary, getSettings, setSelectedLibrary as setSelectedLibraryOnConfig } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useSettings } from "@/lib/useSettings";
import type { Library } from "@/lib/models";

export const Route = createRootRouteWithContext<{
    selectedLibrary: Library | null;
}>()({
    component: RootComponent,
    beforeLoad: async () => ({ settings: await getSettings() }),
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
    } = useLibrary();
    const { settings } = Route.useRouteContext();
    const { updateSettings } = useSettings();

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

    useEffect(() => {
        if (settings.data) {
            updateSettings(settings.data);
            document.documentElement.setAttribute("data-theme", settings.data.theme);
        }
    }, [settings]);

    return (
        <>
            <Framebar libraries={libraries} />
            <Outlet />
            <TanStackRouterDevtools />
            <CreateLibraryDialog open={openCreateLibrary} onOpenChange={setOpenCreateLibrary} />
        </>
    );
}