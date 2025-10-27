import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CheckmarkCircle24Regular, ErrorCircle24Regular, Info24Regular, Warning24Regular } from "@fluentui/react-icons";
import { Spinner } from "@/components/custom/Spinner";
import { useNotifications } from "./useNotifications";
import type { Easing } from "motion/react";
import type { Notification } from "./models";

type Success<T> = { data: T; error: null };
type Failure<E> = { data: null; error: E };
type Result<T, E = Error> = Success<T> | Failure<E>;

export const QUICK_EASE: Easing = [0.22, 1, 0.36, 1];

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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
        info: <Info24Regular className="size-5 text-blue-500" />,
        success: <CheckmarkCircle24Regular className="size-5 text-green-500" />,
        error: <ErrorCircle24Regular className="size-5 text-red-500" />,
        warning: <Warning24Regular className="size-5 text-yellow-500" />,
        promise: <Spinner className="size-5 p-0.5" />,
    };

    return icons[type];
}