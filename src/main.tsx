import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Dismiss12Regular } from "@fluentui/react-icons";
import { getNotiIcon } from "@/lib/utils";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const router = createRouter({
    routeTree,
    scrollRestoration: true,
    context: {
        selectedLibrary: null,
    },
});

const queryClient = new QueryClient();

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
                <Toaster
                    position="top-right"
                    duration={5000}
                    icons={{
                        info: getNotiIcon("info"),
                        success: getNotiIcon("success"),
                        warning: getNotiIcon("warning"),
                        error: getNotiIcon("error"),
                        close: <Dismiss12Regular />,
                    }}
                    gap={6}
                    offset={{ top: 54, right: 44 }}
                    closeButton
                    className="pointer-events-auto [--width:320px]!"
                />
                <RouterProvider router={router} />
            </QueryClientProvider>
        </StrictMode>,
    );
}