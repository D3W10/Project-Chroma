import { create } from "zustand";
import { toast } from "sonner";
import type { Notification, NotificationType } from "@project-chroma/contracts/gallery";
import type { Result } from "@project-chroma/utils";

interface NotificationStore {
    notifications: Notification[];
    isOpen: boolean;
    hasUnread: boolean;
    pushNoti: PushNotification;
    updateNoti: (id: string, updates: Partial<Notification>) => void;
    progressNoti: (id: string, progress: number) => void;
    clearNoti: (id: string) => void;
    clearAll: () => void;
    setIsOpen: (open: boolean) => void;
    setHasUnread: (hasUnread: boolean) => void;
    getPeekNotification: () => Notification | null;
}

type NotificationBaseOptions = {
    title: string;
    description?: string;
};

type PromiseNotificationFields<T, E = string> = {
    promise?: Promise<Result<T, E>>;
    hasProgress?: boolean;
    peek?: string;
    success?: (data: T) => {
        title: string;
        description: string;
    };
    error?: (error: E) => {
        title: string;
        description: string;
    };
    onSuccess?: (data: T) => unknown;
    onError?: (error: E) => unknown;
};

type NonPromiseNotificationFields = {
    promise?: never;
    hasProgress?: never;
    peek?: never;
    success?: never;
    error?: never;
    onSuccess?: never;
    onError?: never;
};

type NotificationOptionsByType<T, E = string> = {
    info: NotificationBaseOptions & { type: "info" } & NonPromiseNotificationFields;
    success: NotificationBaseOptions & { type: "success" } & NonPromiseNotificationFields;
    error: NotificationBaseOptions & { type: "error" } & NonPromiseNotificationFields;
    warning: NotificationBaseOptions & { type: "warning" } & NonPromiseNotificationFields;
    promise: NotificationBaseOptions & { type: "promise" } & PromiseNotificationFields<T, E>;
};

type NotificationOptions<T = any, E = string> = NotificationOptionsByType<T, E>[NotificationType];

interface PushNotification {
    (args: NotificationOptionsByType<any, string>["info"]): string;
    (args: NotificationOptionsByType<any, string>["success"]): string;
    (args: NotificationOptionsByType<any, string>["error"]): string;
    (args: NotificationOptionsByType<any, string>["warning"]): string;
    <T, E = string>(args: NotificationOptionsByType<T, E>["promise"]): string;
}

export const useNotifications = create<NotificationStore>((set, get) => ({
    notifications: [],
    isOpen: false,
    hasUnread: false,
    pushNoti: <T, E = string>({ title, description, type = "info", promise, hasProgress = false, peek, success, error, onSuccess, onError }: NotificationOptions<T, E>) => {
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

        const { isOpen, setHasUnread } = get();
        if (!isOpen) setHasUnread(true);

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
                let data = { title, description };

                const promiseFail = (e: E) => {
                    if (e) {
                        const override = error?.(e);
                        data = { ...data, ...override };
                        get().updateNoti(id, { type: "error", ...override });
                    }

                    const currentIsOpen = get().isOpen;
                    if (!currentIsOpen) toast.error(data.title, data.description ? { description: data.description } : undefined);
                    console.log("[ERRO] " + data.title + " - " + data.description);

                    onError?.(e);
                };

                promise
                    .then(e => {
                        if (!e.success) return promiseFail(e.error);
                        else {
                            const override = success?.(e.data);
                            data = { ...data, ...override };
                            get().updateNoti(id, { type: "success", ...override });

                            const currentIsOpen = get().isOpen;
                            if (!currentIsOpen) toast.success(data.title, data.description ? { description: data.description } : undefined);
                            console.log("[SUCC] " + data.title + " - " + data.description);

                            onSuccess?.(e.data);
                        }
                    })
                    .catch(promiseFail);
            }
        }

        return id;
    },
    updateNoti: (id, updates) => {
        set(state => ({
            notifications: state.notifications.map(notification => (notification.id === id ? { ...notification, ...updates } : notification)),
        }));
    },
    progressNoti: (id, progress) => {
        set(state => ({
            notifications: state.notifications.map(notification => (notification.id === id ? { ...notification, progress } : notification)),
        }));
    },
    clearNoti: id => {
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
    setIsOpen: open => {
        set({ isOpen: open, hasUnread: open ? false : undefined });
    },
    setHasUnread: hasUnread => {
        set({ hasUnread });
    },
    getPeekNotification: () => {
        const { notifications } = get();
        return notifications.find(n => n.type === "promise") || null;
    },
}));
