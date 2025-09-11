import { createFileRoute } from "@tanstack/react-router";
import { PhotoGallery } from "@/components/PhotoGallery";

export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <main className="flex flex-col flex-1">
            <div className="p-4 border-b">
                <h1 className="text-2xl font-semibold">Photo Gallery</h1>
            </div>
            <PhotoGallery />
        </main>
    );
}