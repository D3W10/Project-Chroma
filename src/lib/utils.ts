import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { notifyError } from "./notifications";
import type { Easing } from "motion/react";

export const QUICK_EASE: Easing = [0.22, 1, 0.36, 1];

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function tryCatch<T>(fn: () => T): T {
    try {
        return fn();
    } catch (err) {
        notifyError("Something went wrong", err instanceof Error ? err.message : typeof err === "string" ? err : undefined);
        throw err;
    }
}