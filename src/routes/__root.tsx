import { useEffect } from "react";
import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Framebar } from "@/components/layout/framebar";
import { CreateLibraryDialog } from "@/components/overlays/CreateLibraryDialog";
import { getLibraries, getSelectedLibrary, getSettings, setSelectedLibrary as setSelectedLibraryOnConfig } from "@/lib/invoker";
import { appColors } from "@/lib/models";
import { useLibrary } from "@/lib/useLibrary";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useSettings } from "@/lib/useSettings";

export const Route = createRootRoute({
    component: RootComponent,
    beforeLoad: async ({ location }) => {
        const loadedSettings = await getSettings();
        if (!loadedSettings.data?.configured && !location.pathname.startsWith("/onboarding"))
            throw redirect({ to: "/onboarding" });

        const libraries = await getLibraries();
        if ((!libraries.data || libraries.data.length === 0) && loadedSettings.data?.configured && location.pathname !== "/onboarding/library")
            throw redirect({ to: "/onboarding/library" });

        return { libraries: libraries.data, settings: loadedSettings.data };
    },
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
    const context = Route.useRouteContext();
    const { settings, updateSettings } = useSettings();

    const { data: selectedLibraryId } = useQuerySafe({
        queryKey: ["selected-library"],
        queryFn: getSelectedLibrary,
    });

    useEffect(() => {
        if (context.settings)
            updateSettings(context.settings);
        if (context.libraries)
            setLibraries(context.libraries);
    }, []);

    useEffect(() => {
        if (!context.libraries) return;

        if (pendingLibraryId) {
            const pendingLibrary = context.libraries.find(l => l.id === pendingLibraryId);

            if (pendingLibrary) {
                setSelectedLibrary(pendingLibrary);
                setPendingLibraryId(null);
                setOpenCreateLibrary(false);
                return;
            }
        }

        setSelectedLibrary(context.libraries.find(l => l.id === selectedLibraryId) ?? null);
    }, [selectedLibraryId]);

    useEffect(() => {
        setSelectedLibraryOnConfig({ libraryId: selectedLibrary?.id ?? null });
    }, [selectedLibrary]);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", settings.theme);
        document.body.style.setProperty("--primary", `var(--color-stunning-${appColors[settings.accentColor]})`);
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