import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
    component: AppLayoutComponent,
});

function AppLayoutComponent() {
    return (
        <Outlet />
    );
}