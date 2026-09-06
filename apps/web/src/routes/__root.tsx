import { useEffect } from "react";
import { createRootRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { appColors } from "@project-chroma/utils";
import { Framebar } from "@/components/layout/framebar";
import { useLibrary } from "@/lib/useLibrary";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useSettings } from "@/lib/useSettings";
import { useUpdates } from "@/lib/useUpdates";

export const Route = createRootRoute({
    component: RootComponent,
    beforeLoad: async ({ location }) => {
        if (!window.chroma) return {};

        const loadedSettings = await window.chroma.config.get("settings");
        if (!loadedSettings.data?.configured && !location.pathname.startsWith("/onboarding")) {
            throw redirect({ to: "/onboarding" });
        }

        const libraries = await window.chroma.config.get("libraries");
        if ((!libraries.data || libraries.data.length === 0) && loadedSettings.data?.configured && location.pathname !== "/onboarding/library") {
            throw redirect({ to: "/onboarding/library" });
        }

        return { libraries: libraries.data, settings: loadedSettings.data };
    },
});

function RootComponent() {
    useUpdates();
    const { libraries, setLibraries, selectedLibrary, selectLibraryById } = useLibrary();
    const location = useLocation();
    const navigate = useNavigate();
    const context = Route.useRouteContext();
    const { settings, updateSettings } = useSettings();

    const { data: selectedLibraryId, isFetched: hasLoadedSelectedLibrary } = useQuerySafe({
        queryKey: ["selected-library"],
        queryFn: () => window.chroma?.config.get("selected_library"),
        placeholderData: null,
    });

    useEffect(() => {
        if (context.settings) updateSettings(context.settings);
        if (context.libraries) setLibraries(context.libraries);
    }, []);

    useEffect(() => {
        if (!context.libraries || !hasLoadedSelectedLibrary) return;
        selectLibraryById(selectedLibraryId);
    }, [hasLoadedSelectedLibrary, selectedLibraryId]);

    useEffect(() => {
        if (!hasLoadedSelectedLibrary) return;
        window.chroma?.config.set({ selected_library: selectedLibrary?.id ?? null });
    }, [hasLoadedSelectedLibrary, selectedLibrary]);

    useEffect(() => {
        if (!settings.configured || libraries.length > 0 || location.pathname === "/onboarding/library") return;
        navigate({ to: "/onboarding/library" });
    }, [libraries.length, location.pathname, navigate, settings.configured]);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", settings.theme);
        document.body.style.setProperty("--color-primary", `var(${appColors.find(c => c.name === settings.accentColor)?.color})`);
    }, [settings]);

    return (
        <>
            <Framebar libraries={libraries} />
            <Outlet />
            <TanStackRouterDevtools />
        </>
    );
}
