import { isAppError, toAppError, type AppError } from "./errors.ts";

export type Result<T, E = AppError> = ResultAccepted<T> | ResultRejected<E>;
export type ResultAccepted<T> = { success: true; data: T; error: null };
export type ResultRejected<E = AppError> = { success: false; data: null; error: E };

function rejectResult<E = AppError>(error: E): Result<never, E> {
    console.log("[ERRO]", error);
    if (isAppError(error)) {
        return { success: false, data: null, error };
    }

    return { success: false, data: null, error: error as E };
}

export const Result = {
    accept<T = undefined>(data?: T): Result<T, never> {
        return { success: true, data: data as T, error: null };
    },
    reject: rejectResult,
} as const;

export function isResult(value: unknown): value is Result<unknown, unknown> {
    return !!(value && typeof value === "object" && "success" in value && "data" in value && "error" in value);
}

export function toResult<T, E = AppError>(value: Result<T, E> | T): Result<T, E> {
    return isResult(value) ? value : Result.accept(value);
}

export async function safeBound<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
        return fn();
    } catch (err) {
        return Result.reject(toAppError(err));
    }
}
