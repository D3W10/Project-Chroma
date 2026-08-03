import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const router = createRouter({
    routeTree,
    scrollRestoration: true,
    context: {
        selectedLibrary: null,
    },
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnReconnect: false,
            staleTime: 15000,
            gcTime: 1000 * 60 * 30,
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <Toaster position="top-right" duration={5000} gap={6} offset={{ top: 54, right: 44 }} closeButton />
                <RouterProvider router={router} />
            </QueryClientProvider>
        </StrictMode>,
    );
}
