import { useEffect } from "react";
import { createRootRouteWithContext, Outlet, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Framebar } from "@/components/layout/framebar";
import { CreateLibraryDialog } from "@/components/overlays/CreateLibraryDialog";
import { getLibraries, getSelectedLibrary, getSettings, setSelectedLibrary as setSelectedLibraryOnConfig } from "@/lib/invoker";
import { appColors, type Library } from "@/lib/models";
import { useLibrary } from "@/lib/useLibrary";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useSettings } from "@/lib/useSettings";

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
    const location = useLocation();
    const navigate = Route.useNavigate();
    const { settings: loadedSettings } = Route.useRouteContext();
    const { settings, updateSettings } = useSettings();

    const { isFetching, data } = useQuerySafe({
        queryKey: ["libraries"],
        queryFn: getLibraries,
        placeholderData: [],
    });

    const { data: selectedLibraryId } = useQuerySafe({
        queryKey: ["selected-library"],
        queryFn: getSelectedLibrary,
    });

    useEffect(() => {
        if (isFetching) return;
        setLibraries(data);

        if (data.length === 0 && location.pathname !== "/onboarding/library")
            navigate({ to: "/onboarding/library" });
    }, [isFetching]);

    useEffect(() => {
        if (!data) return;

        if (pendingLibraryId) {
            const pendingLibrary = data.find(e => e.id === pendingLibraryId);

            if (pendingLibrary) {
                setSelectedLibrary(pendingLibrary);
                setPendingLibraryId(null);
                setOpenCreateLibrary(false);
                return;
            }
        }

        setSelectedLibrary(data.find(e => e.id === selectedLibraryId) ?? null);
    }, [data, selectedLibraryId]);

    useEffect(() => {
        setSelectedLibraryOnConfig({ libraryId: selectedLibrary?.id ?? null });
    }, [selectedLibrary]);

    useEffect(() => {
        if (loadedSettings.data)
            updateSettings(loadedSettings.data);
    }, [loadedSettings]);

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