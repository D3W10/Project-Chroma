import { createFileRoute } from "@tanstack/react-router";
import { AlbumsPage } from "@/components/AlbumsPage";

export const Route = createFileRoute("/_app/albums")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <main className="flex flex-col flex-1">
            <div className="p-4 border-b">
                <h1 className="text-2xl font-semibold">Albums</h1>
            </div>
            <AlbumsPage />
        </main>
    );
}