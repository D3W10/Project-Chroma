import {
    useMutation,
    type MutationFunction,
    type UseMutationOptions,
    type UseMutationResult,
} from "@tanstack/react-query";
import { unwrapResult } from "@/lib/utils";
import type { Result } from "@project-chroma/contracts/ipc";

export type UseMutationSafeOptions<
    T,
    TError = string,
    TVariables = void,
    TContext = unknown,
> = Omit<UseMutationOptions<T, TError, TVariables, TContext>, "mutationFn"> & {
    mutationFn: MutationFunction<Result<T, TError> | undefined, TVariables>;
};

export function useMutationSafe<T, TError = string, TVariables = void, TContext = unknown>(
    options: UseMutationSafeOptions<T, TError, TVariables, TContext>,
): UseMutationResult<T, TError, TVariables, TContext> {
    const { mutationFn, ...rest } = options;
    return useMutation({
        ...rest,
        mutationFn: async (variables, context) => {
            const result = await mutationFn(variables, context);
            if (result === undefined) return undefined as T;
            return unwrapResult(result);
        },
    } as UseMutationOptions<T, TError, TVariables, TContext>) as UseMutationResult<
        T,
        TError,
        TVariables,
        TContext
    >;
}
