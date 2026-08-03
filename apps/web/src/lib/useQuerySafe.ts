import {
    useQuery,
    type DefinedUseQueryResult,
    type PlaceholderDataFunction,
    type QueryFunction,
    type QueryKey,
    type UseQueryOptions,
    type UseQueryResult,
} from "@tanstack/react-query";
import { unwrapResult } from "@/lib/utils";
import { Result } from "@project-chroma/utils";

type SafeQueryResult<TData = unknown, TError = unknown> = Result<TData, TError> | undefined;
type QueryResultData<TQueryFn extends (...args: any[]) => unknown> = Awaited<ReturnType<TQueryFn>> extends Result<infer TData, unknown> | undefined ? TData : never;
type QueryResultError<TQueryFn extends (...args: any[]) => unknown> = Awaited<ReturnType<TQueryFn>> extends Result<unknown, infer TError> | undefined ? TError : never;
type QueryResultPlaceholder<TQueryFn extends (...args: any[]) => unknown, TQueryKey extends QueryKey> =
    | QueryResultData<TQueryFn>
    | PlaceholderDataFunction<QueryResultData<TQueryFn>, QueryResultError<TQueryFn>, QueryResultData<TQueryFn>, TQueryKey>;

export type UseQuerySafeOptions<
    TQueryFn extends QueryFunction<SafeQueryResult, TQueryKey>,
    TData = QueryResultData<TQueryFn>,
    TQueryKey extends QueryKey = QueryKey,
> = Omit<
    UseQueryOptions<QueryResultData<TQueryFn>, QueryResultError<TQueryFn>, TData, TQueryKey>,
    "queryFn" | "placeholderData"
> & {
    queryFn: TQueryFn;
    placeholderData?: QueryResultPlaceholder<TQueryFn, TQueryKey>;
    preserveResult?: boolean;
};

export function useQuerySafe<TQueryFn extends QueryFunction<SafeQueryResult, TQueryKey>, TData = QueryResultData<TQueryFn>, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<TQueryFn, TData, TQueryKey> & { placeholderData: QueryResultData<TQueryFn> },
): DefinedUseQueryResult<TData, QueryResultError<TQueryFn>>;

export function useQuerySafe<TQueryFn extends QueryFunction<SafeQueryResult, TQueryKey>, TData = QueryResultData<TQueryFn>, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<TQueryFn, TData, TQueryKey>,
): UseQueryResult<TData, QueryResultError<TQueryFn>>;

export function useQuerySafe<TQueryFn extends QueryFunction<SafeQueryResult, TQueryKey>, TData = QueryResultData<TQueryFn>, TQueryKey extends QueryKey = QueryKey>(
    options: UseQuerySafeOptions<TQueryFn, TData, TQueryKey>,
): UseQueryResult<TData, QueryResultError<TQueryFn>> | DefinedUseQueryResult<TData, QueryResultError<TQueryFn>> {
    const { queryFn, placeholderData, preserveResult, ...rest } = options;

    if (preserveResult !== false) {
        const resultPlaceholder: PlaceholderDataFunction<SafeQueryResult, QueryResultError<TQueryFn>, SafeQueryResult, TQueryKey> | undefined =
            placeholderData === undefined
                ? undefined
                : (previousResult, previousQuery) => {
                      if (typeof placeholderData !== "function") return Result.accept(placeholderData);
                      if (!previousResult?.success) return undefined;

                      const resolvePlaceholder = placeholderData as PlaceholderDataFunction<QueryResultData<TQueryFn>, QueryResultError<TQueryFn>, QueryResultData<TQueryFn>, TQueryKey>;
                      return Result.accept(resolvePlaceholder(previousResult.data as QueryResultData<TQueryFn>, previousQuery as never));
                  };

        const query = useQuery({
            ...rest,
            placeholderData: resultPlaceholder,
            queryFn: async context => await queryFn(context),
        } as UseQueryOptions<SafeQueryResult, QueryResultError<TQueryFn>, SafeQueryResult, TQueryKey>);

        const result = query.data;
        const data = result?.success ? result.data : undefined;
        const error = result?.success === false ? result.error : null;
        const isAppError = result?.success === false;

        return {
            ...query,
            data,
            error,
            failureReason: isAppError ? error : query.failureReason,
            isFetching: query.isFetching && (!result || query.isPlaceholderData),
            isError: isAppError || query.isError,
            isSuccess: result?.success === true,
            status: isAppError ? "error" : result ? "success" : query.status,
        } as UseQueryResult<TData, QueryResultError<TQueryFn>>;
    }

    return useQuery({
        ...rest,
        placeholderData,
        queryFn: async context => {
            const result = await queryFn(context);
            if (result === undefined && typeof placeholderData !== "function") return placeholderData as QueryResultData<TQueryFn>;
            if (result === undefined) return undefined as QueryResultData<TQueryFn>;
            return unwrapResult(result);
        },
    } as UseQueryOptions<QueryResultData<TQueryFn>, QueryResultError<TQueryFn>, TData, TQueryKey>) as UseQueryResult<TData, QueryResultError<TQueryFn>>;
}
