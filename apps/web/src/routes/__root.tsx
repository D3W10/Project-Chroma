import { useEffect } from "react";
import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Framebar } from "@/components/layout/framebar";
import { appColors } from "@/lib/models";
import { useLibrary } from "@/lib/useLibrary";
import { useQuerySafe } from "@/lib/useQuerySafe";
import { useSettings } from "@/lib/useSettings";

export const Route = createRootRoute({
    component: RootComponent,
    beforeLoad: async ({ location }) => {
        if (!window.chroma) return {};

        const loadedSettings = await window.chroma.config.get("settings");
        if (!loadedSettings.data?.configured && !location.pathname.startsWith("/onboarding"))
            throw redirect({ to: "/onboarding" });

        const libraries = await window.chroma.config.get("libraries");
        if (
            (!libraries.data || libraries.data.length === 0) &&
            loadedSettings.data?.configured &&
            location.pathname !== "/onboarding/library"
        )
            throw redirect({ to: "/onboarding/library" });

        return { libraries: libraries.data, settings: loadedSettings.data };
    },
});

function RootComponent() {
    const { libraries, setLibraries, selectedLibrary, selectLibraryById } = useLibrary();
    const context = Route.useRouteContext();
    const { settings, updateSettings } = useSettings();

    const { data: selectedLibraryId } = useQuerySafe({
        queryKey: ["selected-library"],
        queryFn: () => window.chroma?.config.get("selected_library"),
        placeholderData: null,
    });

    useEffect(() => {
        if (context.settings) updateSettings(context.settings);
        if (context.libraries) setLibraries(context.libraries);
    }, []);

    useEffect(() => {
        if (!context.libraries) return;
        selectLibraryById(selectedLibraryId);
    }, [selectedLibraryId]);

    useEffect(() => {
        window.chroma?.config.set("selected_library", selectedLibrary?.id ?? null);
    }, [selectedLibrary]);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", settings.theme);
        document.body.style.setProperty(
            "--primary",
            `var(--color-stunning-${appColors[settings.accentColor]})`,
        );
    }, [settings]);

    return (
        <>
            <Framebar libraries={libraries} />
            <Outlet />
            <TanStackRouterDevtools />
        </>
    );
}
