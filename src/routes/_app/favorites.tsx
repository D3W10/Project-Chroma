import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/favorites")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="flex flex-col flex-1">
            <div className="p-4 border-b">
                <h1 className="text-2xl font-semibold">Favorites</h1>
            </div>
        </div>
    );
}