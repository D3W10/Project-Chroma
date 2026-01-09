import { create } from "zustand";
import { toast } from "sonner";
import type { Notification, NotificationType } from "./models";

interface NotificationStore {
    notifications: Notification[];
    isOpen: boolean;
    pushNoti: (title: string, description?: string, type?: NotificationType, options?: NotificationPromiseOptions) => string;
    updateNoti: (id: string, updates: Partial<Notification>) => void;
    progressNoti: (id: string, progress: number) => void;
    clearNoti: (id: string) => void;
    clearAll: () => void;
    setIsOpen: (open: boolean) => void;
    getPeekNotification: () => Notification | null;
}

interface NotificationPromiseOptions {
    promise?: Promise<unknown>;
    hasProgress?: boolean;
    peek?: string;
    success?: {
        title: string;
        description: string;
    };
    error?: {
        title: string;
        description: string;
    };
    onSuccess?: () => unknown;
    onError?: () => unknown;
}

export const useNotifications = create<NotificationStore>((set, get) => ({
    notifications: [],
    isOpen: false,

    pushNoti: (title: string, description?: string, type: NotificationType = "info", { promise, hasProgress = false, peek, success, error, onSuccess, onError }: NotificationPromiseOptions = {}) => {
        const id = self.crypto.randomUUID();
        const notification: Notification = {
            id,
            title,
            description,
            type,
            peek,
            timestamp: new Date(),
            hasProgress,
            progress: 0,
        };

        set(state => ({
            notifications: [notification, ...state.notifications],
        }));

        const { isOpen } = get();

        if (type === "info") {
            if (!isOpen) toast.info(title, description ? { description } : undefined);
            console.log("[INFO] " + title + " - " + description);
        } else if (type === "success") {
            if (!isOpen) toast.success(title, description ? { description } : undefined);
            console.log("[SUCC] " + title + " - " + description);
        } else if (type === "error") {
            if (!isOpen) toast.error(title, description ? { description } : undefined);
            console.log("[ERRO] " + title + " - " + description);
        } else if (type === "warning") {
            if (!isOpen) toast.warning(title, description ? { description } : undefined);
            console.log("[WARN] " + title + " - " + description);
        } else if (type === "promise") {
            console.log("[PROM] " + title + " - " + description);

            if (promise) {
                promise.then(() => {
                    const data = { title, description, ...success };
                    get().updateNoti(id, { type: "success", ...success });

                    const currentIsOpen = get().isOpen;
                    if (!currentIsOpen) toast.success(data.title, data.description ? { description: data.description } : undefined);
                    console.log("[SUCC] " + data.title + " - " + data.description);

                    onSuccess?.();
                }).catch(() => {
                    const data = { title, description, ...error };
                    get().updateNoti(id, { type: "error", ...error });

                    const currentIsOpen = get().isOpen;
                    if (!currentIsOpen) toast.error(data.title, data.description ? { description: data.description } : undefined);
                    console.log("[ERRO] " + data.title + " - " + data.description);

                    onError?.();
                });
            }
        }

        return id;
    },

    updateNoti: (id: string, updates: Partial<Notification>) => {
        set(state => ({
            notifications: state.notifications.map(notification =>
                notification.id === id ? { ...notification, ...updates } : notification,
            ),
        }));
    },

    progressNoti: (id: string, progress: number) => {
        set(state => ({
            notifications: state.notifications.map(notification =>
                notification.id === id ? { ...notification, progress } : notification,
            ),
        }));
    },

    clearNoti: (id: string) => {
        if (get().notifications.find(noti => noti.id === id)?.type === "promise") return;

        set(state => ({
            notifications: state.notifications.filter(noti => noti.id !== id),
        }));
    },

    clearAll: () => {
        set(state => ({
            notifications: state.notifications.filter(noti => noti.type === "promise"),
        }));
    },

    setIsOpen: (open: boolean) => {
        set({ isOpen: open });
    },

    getPeekNotification: () => {
        const { notifications } = get();
        return notifications.find(n => n.type === "promise") || null;
    },
}));