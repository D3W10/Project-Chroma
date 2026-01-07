import { clsx, type ClassValue } from "clsx";
import { cva as cvaOriginal } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import { IconAlertTriangle, IconCircleCheck, IconExclamationCircle, IconInfoCircle } from "@tabler/icons-react";
import { Spinner } from "@/components/Spinner";
import { useNotifications } from "@/lib/useNotifications";
import type { Easing } from "motion/react";
import type { Notification } from "@/lib/models";

type Success<T> = { data: T; error: null };
type Failure<E> = { data: null; error: E };
type Result<T, E = Error> = Success<T> | Failure<E>;

export const QUICK_EASE: Easing = [0.22, 1, 0.36, 1];

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const cva = cvaOriginal;

export async function tryCatch<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> {
    try {
        return { data: await fn(), error: null };
    } catch (err) {
        useNotifications.getState().pushNoti("Something went wrong", err instanceof Error ? err.message : typeof err === "string" ? err : undefined, "error");
        return { data: null, error: err as E };
    }
}

export function getNotiIcon(type: Notification["type"]) {
    const icons: Record<Notification["type"], React.ReactNode> = {
        info: <IconInfoCircle className="size-4.5 text-blue-500" />,
        success: <IconCircleCheck className="size-4.5 text-green-500" />,
        error: <IconExclamationCircle className="size-4.5 text-red-500" />,
        warning: <IconAlertTriangle className="size-4.5 text-yellow-500" />,
        promise: <Spinner className="size-4.5 p-0.5" />,
    };

    return icons[type];
}