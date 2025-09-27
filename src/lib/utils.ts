import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { notifyError } from "./notifications";
import type { Easing } from "motion/react";

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
        notifyError("Something went wrong", err instanceof Error ? err.message : typeof err === "string" ? err : undefined);
        return { data: null, error: err as E };
    }
}