import { useQuery, type DefinedUseQueryResult, type QueryFunction, type QueryKey, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { unwrapResult, type Result } from "./utils";

export type UseQuerySafeOptions<
    T,
    TError = Error,
    TQueryKey extends QueryKey = QueryKey,
> = Omit<
    UseQueryOptions<Result<T, TError>, TError, T, TQueryKey>,
    "queryFn" | "placeholderData"
> & {
    queryFn: QueryFunction<Result<T, TError>, TQueryKey>;
    placeholderData?: T;
};

export function useQuerySafe<T, TError = Error, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<T, TError, TQueryKey> & { placeholderData: T },
): DefinedUseQueryResult<T, TError>;

export function useQuerySafe<T, TError = Error, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<T, TError, TQueryKey>,
): UseQueryResult<T, TError>;

export function useQuerySafe<T, TError = Error, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<T, TError, TQueryKey>,
): UseQueryResult<T, TError> | DefinedUseQueryResult<T, TError> {
    const { queryFn, placeholderData, ...rest } = options;
    return useQuery({
        ...rest,
        placeholderData,
        queryFn: context => unwrapResult(queryFn(context) as Promise<Result<T, TError>>),
    } as UseQueryOptions<T, TError, T, TQueryKey>) as UseQueryResult<T, TError>;
}