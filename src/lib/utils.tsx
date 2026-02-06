import { clsx, type ClassValue } from "clsx";
import { cva as cvaOriginal } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import { IconAlertTriangle, IconCircleCheck, IconExclamationCircle, IconInfoCircle } from "@tabler/icons-react";
import { Spinner } from "@/components/ui/spinner";
import type { Easing } from "motion/react";
import type { Notification } from "@/lib/models";

type Success<T> = { data: T; error: null };
type Failure<E> = { data: null; error: E };
type Result<T, E = string> = Success<T> | Failure<E>;

export const QUICK_EASE: Easing = [0.22, 1, 0.36, 1];

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const cva = cvaOriginal;

export async function tryCatch<T, E = string>(fn: () => Promise<T>): Promise<Result<T, E>> {
    try {
        return { data: await fn(), error: null };
    } catch (err) {
        return { data: null, error: err as E };
    }
}

export function unwrapResult<T, E = string>(result: Promise<Result<T, E>>): Promise<T> {
    return new Promise((resolve, reject) => result.then(e => {
        if (e.data)
            resolve(e.data);
        else
            reject(e.error);
    }));
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

export function isValidColor(color: string) {
    document.head.style.color = color;
    const isValid = document.head.style.color;
    document.head.removeAttribute("style");

    return !!isValid;
}

export const pathToName = (p: string) => p.split("/").pop() || "";
export const pathToStem = (p: string) => /([^/\\]+?)(?:\.[^.]*$|$)/g.exec(p)?.[1] || "";