import {
    useQuery,
    type DefinedUseQueryResult,
    type QueryFunction,
    type QueryKey,
    type UseQueryOptions,
    type UseQueryResult,
} from "@tanstack/react-query";
import { unwrapResult } from "@/lib/utils";
import type { Result } from "@project-chroma/contracts/ipc";

export type UseQuerySafeOptions<T, TError = string, TQueryKey extends QueryKey = QueryKey> = Omit<
    UseQueryOptions<Result<T, TError>, TError, T, TQueryKey>,
    "queryFn" | "placeholderData"
> & {
    queryFn: QueryFunction<Result<T, TError> | undefined, TQueryKey>;
    placeholderData?: T;
};

export function useQuerySafe<T, TError = string, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<T, TError, TQueryKey> & { placeholderData: T },
): DefinedUseQueryResult<T, TError>;

export function useQuerySafe<T, TError = string, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<T, TError, TQueryKey>,
): UseQueryResult<T, TError>;

export function useQuerySafe<T, TError = string, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<T, TError, TQueryKey>,
): UseQueryResult<T, TError> | DefinedUseQueryResult<T, TError> {
    const { queryFn, placeholderData, ...rest } = options;
    return useQuery({
        ...rest,
        placeholderData,
        queryFn: async context => {
            const result = await queryFn(context);
            if (result === undefined) return placeholderData as T;
            return unwrapResult(result);
        },
    } as UseQueryOptions<T, TError, T, TQueryKey>) as UseQueryResult<T, TError>;
}
