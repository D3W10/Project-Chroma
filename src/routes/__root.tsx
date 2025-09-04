import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Framebar } from "@/components/layout/framebar";

export const Route = createRootRoute({
    component: () => (
        <>
            <Framebar />
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
});