import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { cn } from "@project-chroma/utils";

export const Route = createFileRoute("/onboarding")({
    component: RouteComponent,
});

function RouteComponent() {
    const location = useLocation();

    return (
        <div className={cn("size-full flex flex-col justify-center items-center flex-1 transition duration-300", location.pathname !== "/onboarding" && "bg-background ring-1 ring-input shadow-md")}>
            <Outlet />
        </div>
    );
}
