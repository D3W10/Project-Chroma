import { isAppError, toAppError } from "./errors.ts";
import type { AppError, ResultCore } from "@project-chroma/core";

export type Result<T, E = AppError> = ResultCore<T, E>;

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
