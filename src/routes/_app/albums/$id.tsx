import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/albums/$id")({
    component: RouteComponent,
});

function RouteComponent() {
    const { id } = Route.useParams();

    return <div>{id}</div>;
}