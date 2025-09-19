import { useEffect, useState } from "react";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useQuery } from "@tanstack/react-query";
import { Framebar } from "@/components/layout/framebar";
import { getLibraries, getSelectedLibrary, setSelectedLibrary } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import type { Library } from "@/lib/models";

export const Route = createRootRouteWithContext<{
    selectedLibrary: Library | null;
}>()({
    component: RootComponent,
});

function RootComponent() {
    const [libraries, setLibraries] = useState<Library[]>([]);
    const { selectedLibrary, setSelectedLibrary: setLib } = useLibrary();

    const { data } = useQuery({
        queryKey: ["libraries"],
        queryFn: getLibraries,
    });

    const { data: dataSel } = useQuery({
        queryKey: ["selected-library"],
        queryFn: getSelectedLibrary,
    });

    useEffect(() => {
        setLibraries(data ?? []);
    }, [data]);

    useEffect(() => {
        if (!data) return;

        setLib(data.find(e => e.id === dataSel) ?? null);
    }, [data, dataSel]);

    useEffect(() => {
        setSelectedLibrary(selectedLibrary?.id ?? null);
    }, [selectedLibrary]);

    return (
        <>
            <Framebar libraries={libraries} />
            <Outlet />
            <TanStackRouterDevtools />
        </>
    );
}