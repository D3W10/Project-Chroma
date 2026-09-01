import type { Net, Protocol, Session } from "electron";

export function configureContentSecurityPolicy(defaultSession: Session, { isDev }: { isDev: boolean }): void {
    const connectSources = ["'self'"];
    if (isDev) {
        connectSources.push("http://localhost:5173", "ws://localhost:5173", "http://127.0.0.1:5173", "ws://127.0.0.1:5173");
    }

    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: chroma-file:",
        "media-src 'self' chroma-file:",
        "font-src 'self' data:",
        `connect-src ${connectSources.join(" ")}`,
        "object-src 'none'",
        "worker-src blob:",
        "base-uri 'self'",
        "frame-ancestors 'none'",
    ].join("; ");

    defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": [csp],
            },
        });
    });
}

export function registerChromaFileProtocol(protocol: Protocol, net: Net): void {
    protocol.handle("chroma-file", request => {
        const url = new URL(request.url);
        const encodedPath = url.hostname || url.pathname.replace(/^\//, "");
        return net.fetch(`file://${decodeURIComponent(encodedPath)}`);
    });
}
