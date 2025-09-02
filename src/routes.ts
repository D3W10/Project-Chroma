import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
    layout("layouts/sidebar.tsx", [
        index("routes/home.tsx"),
        route("albums", "routes/albums.tsx"),
    ]),
    route("onboarding", "routes/onboarding.tsx"),
] satisfies RouteConfig;