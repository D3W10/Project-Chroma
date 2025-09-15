import { useEffect, useState } from "react";
import { createRootRouteWithContext, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useQuery } from "@tanstack/react-query";
import { Framebar } from "@/components/layout/framebar";
import { getLibraries } from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import type { Library } from "@/lib/models";

export const Route = createRootRouteWithContext<{
    selectedLibrary: Library | null;
}>()({
    component: RootComponent,
});

function RootComponent() {
    const [libraries, setLibraries] = useState<Library[]>([]);
    const { setSelectedLibrary } = useLibrary();
    const navigate = useNavigate();

    const { data } = useQuery({
        queryKey: ["libraries"],
        queryFn: getLibraries,
    });

    useEffect(() => {
        setLibraries(data ?? []);
    }, [data]);

    return (
        <>
            <Framebar libraries={libraries} />
            <Outlet />
            <TanStackRouterDevtools />
        </>
    );
}