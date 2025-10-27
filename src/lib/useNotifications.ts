import { create } from "zustand";
import { toast } from "sonner";
import type { Notification, NotificationType } from "./models";

interface NotificationStore {
    notifications: Notification[];
    isOpen: boolean;
    pushNoti: (title: string, description?: string, type?: NotificationType, options?: NotificationPromiseOptions) => void;
    updateNoti: (id: string, updates: Partial<Notification>) => void;
    clearNoti: (id: string) => void;
    clearAll: () => void;
    setIsOpen: (open: boolean) => void;
    getPeekNotification: () => Notification | null;
}

interface NotificationPromiseOptions {
    promise?: Promise<unknown>;
    progress?: number;
    peek?: string;
    success?: {
        title: string;
        description: string;
    };
    error?: {
        title: string;
        description: string;
    };
}

export const useNotifications = create<NotificationStore>((set, get) => ({
    notifications: [],
    isOpen: false,

    pushNoti: (title: string, description?: string, type: NotificationType = "info", { promise, progress, peek, success, error }: NotificationPromiseOptions = {}) => {
        const id = self.crypto.randomUUID();
        const notification: Notification = {
            id,
            title,
            description,
            type,
            peek,
            timestamp: new Date(),
            progress,
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
                }).catch(() => {
                    const data = { title, description, ...error };
                    get().updateNoti(id, { type: "error", ...error });

                    const currentIsOpen = get().isOpen;
                    if (!currentIsOpen) toast.error(data.title, data.description ? { description: data.description } : undefined);
                    console.log("[ERRO] " + data.title + " - " + data.description);
                });
            }
        }
    },

    updateNoti: (id: string, updates: Partial<Notification>) => {
        set(state => ({
            notifications: state.notifications.map(notification =>
                notification.id === id ? { ...notification, ...updates } : notification,
            ),
        }));
    },

    clearNoti: (id: string) => {
        set(state => ({
            notifications: state.notifications.filter(noti => noti.id !== id),
        }));
    },

    clearAll: () => {
        set({ notifications: [] });
    },

    setIsOpen: (open: boolean) => {
        set({ isOpen: open });
    },

    getPeekNotification: () => {
        const { notifications } = get();
        return notifications.find(n => n.type === "promise") || null;
    },
}));