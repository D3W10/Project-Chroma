import { useEffect } from "react";
import type { UpdateState } from "@project-chroma/contracts/ipc";
import { useNotifications } from "./useNotifications";

const notified = new Set<string>();

export function useUpdates() {
    useEffect(() => {
        const updates = window.chroma?.updates;
        if (!updates) return;
        let active = true;
        let receivedEvent = false;

        function notify(state: UpdateState) {
            if (!active) return;
            const { pushNoti } = useNotifications.getState();
            if (state.status === "available" || state.status === "downloading") {
                const key = "available";
                if (notified.has(key)) return;
                notified.add(key);
                pushNoti({
                    type: "info",
                    title: "Update available",
                    description: "Project Chroma is downloading an update. It will install after you close the app.",
                });
            } else if (state.status === "downloaded") {
                const key = `downloaded:${state.downloadedVersion}`;
                if (notified.has(key)) return;
                notified.add(key);
                pushNoti({
                    type: "success",
                    title: "Update ready",
                    description: `Project Chroma ${state.downloadedVersion} will install when you close the app.`,
                });
            } else if (state.status === "error") {
                const key = `error:${state.message}`;
                if (notified.has(key)) return;
                notified.add(key);
                pushNoti({ type: "error", title: "Update failed", description: state.message });
            }
        }

        const unsubscribe = updates.onState(state => {
            receivedEvent = true;
            notify(state);
        });
        void updates.getState().then(result => {
            if (!receivedEvent && result.success && result.data) notify(result.data);
        }).catch(() => {});

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);
}
