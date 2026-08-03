import {
    useMutation,
    type UseMutationOptions,
    type UseMutationResult,
} from "@tanstack/react-query";
import { unwrapResult } from "@/lib/utils";
import type { Result } from "@project-chroma/utils";

type MaybePromise<T> = Promise<T> | T;
type SafeMutationResult<TData = unknown, TError = unknown> = Result<TData, TError> | undefined;
type MutationResult<TData = unknown, TError = unknown> = MaybePromise<SafeMutationResult<TData, TError>>;
type MutationResultData<TMutationFn extends (...args: any[]) => unknown> = Awaited<ReturnType<TMutationFn>> extends Result<infer TData, unknown> | undefined ? TData : never;
type MutationResultError<TMutationFn extends (...args: any[]) => unknown> = Awaited<ReturnType<TMutationFn>> extends Result<unknown, infer TError> | undefined ? TError : never;
type MutationVariables<TMutationFn extends (...args: any[]) => unknown> = Parameters<TMutationFn> extends [infer TVariables, ...unknown[]] ? TVariables : void;

export type UseMutationSafeOptions<
    TMutationFn extends (...args: any[]) => MutationResult,
    TContext = unknown,
> = Omit<UseMutationOptions<MutationResultData<TMutationFn>, MutationResultError<TMutationFn>, MutationVariables<TMutationFn>, TContext>, "mutationFn"> & {
    mutationFn: TMutationFn;
    preserveResult?: boolean;
};

export function useMutationSafe<TMutationFn extends (...args: any[]) => MutationResult, TContext = unknown>(
    options: UseMutationSafeOptions<TMutationFn, TContext>,
): UseMutationResult<MutationResultData<TMutationFn>, MutationResultError<TMutationFn>, MutationVariables<TMutationFn>, TContext> {
    const { mutationFn, preserveResult, ...rest } = options;

    if (preserveResult) {
        const { onSuccess, onError, onSettled, ...mutationOptions } = rest;
        const mutation = useMutation({
            ...mutationOptions,
            mutationFn: async (variables, context) => await mutationFn(variables, context),
            onSuccess: (result, variables, onMutateResult, context) => {
                if (result?.success) onSuccess?.(result.data as MutationResultData<TMutationFn>, variables, onMutateResult, context);
                else if (result?.success === false) onError?.(result.error as MutationResultError<TMutationFn>, variables, onMutateResult, context);
            },
            onSettled: (result, _error, variables, onMutateResult, context) => {
                const data = result?.success ? (result.data as MutationResultData<TMutationFn>) : undefined;
                const error = result?.success === false ? (result.error as MutationResultError<TMutationFn>) : null;
                onSettled?.(data, error, variables, onMutateResult, context);
            },
        } as UseMutationOptions<SafeMutationResult, MutationResultError<TMutationFn>, MutationVariables<TMutationFn>, TContext>);

        const result = mutation.data;
        const data = result?.success ? result.data : undefined;
        const error = result?.success === false ? result.error : null;

        return {
            ...mutation,
            data,
            error,
            isError: result?.success === false,
            isSuccess: result?.success === true,
            status: result ? "success" : mutation.status,
        } as UseMutationResult<MutationResultData<TMutationFn>, MutationResultError<TMutationFn>, MutationVariables<TMutationFn>, TContext>;
    }

    return useMutation({
        ...rest,
        mutationFn: async (variables, context) => {
            const result = await mutationFn(variables, context);
            if (result === undefined) return undefined as MutationResultData<TMutationFn>;
            return unwrapResult(result);
        },
    } as UseMutationOptions<MutationResultData<TMutationFn>, MutationResultError<TMutationFn>, MutationVariables<TMutationFn>, TContext>) as UseMutationResult<
        MutationResultData<TMutationFn>,
        MutationResultError<TMutationFn>,
        MutationVariables<TMutationFn>,
        TContext
    >;
}
