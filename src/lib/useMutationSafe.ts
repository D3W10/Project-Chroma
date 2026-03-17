import { useMutation, type MutationFunction, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { unwrapResult, type Result } from "./utils";

export type UseMutationSafeOptions<
    T,
    TError = Error,
    TVariables = void,
    TContext = unknown,
> = Omit<
    UseMutationOptions<Result<T, unknown>, TError, TVariables, TContext>,
    "mutationFn"
> & {
    mutationFn: MutationFunction<Result<T, unknown>, TVariables>;
};

export function useMutationSafe<
    T,
    TError = Error,
    TVariables = void,
    TContext = unknown,
>(
    options: UseMutationSafeOptions<T, TError, TVariables, TContext>,
): UseMutationResult<T, TError, TVariables, TContext> {
    const { mutationFn, ...rest } = options;
    return useMutation({
        ...rest,
        mutationFn: (variables, context) => unwrapResult(mutationFn(variables, context) as Promise<Result<T, unknown>>),
    } as UseMutationOptions<T, TError, TVariables, TContext>) as UseMutationResult<T, TError, TVariables, TContext>;
}