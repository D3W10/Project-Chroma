import { errorCodes, type AppError, type ErrorCode } from "@project-chroma/core";

export const Errors = {
    libraryNotFound: createAppErrorRes("library:not-found", "Library not found", "No library was found at the specified location."),
    libraryPathConflict: createAppErrorRes("library:path-conflict", "Library path already in use", "The selected path belongs to a library that has already been added."),
    missingSource: createAppErrorRes("item:missing-source", "Source item not found"),
    itemReadFail: createAppErrorRes("item:read-fail", "Unable to read item"),
    itemCopyFail: createAppErrorRes("item:copy-fail", "Unable to copy item"),
    itemTransferFail: createAppErrorRes("item:transfer-fail", "Unable to transfer items"),
    itemExportFail: createAppErrorRes("item:export-fail", "Unable to export items"),
    tagNotFound: createAppErrorRes("tag:not-found", "Tag not found", "The selected tag no longer exists."),
    tagInvalid: createAppErrorRes("tag:invalid", "Invalid tag", "Enter a valid tag name and color."),
    tagOperationFail: createAppErrorRes("tag:operation-fail", "Unable to update tags"),
    invalidIpcArguments: createAppErrorRes("ipc:invalid-arguments", "Invalid request"),
    binaryNotFound: createAppErrorRes("binary:not-found", "Required binary is unavailable"),
    mediaProcessingFailed: createAppErrorRes("media:processing-failed", "Unable to process media"),
    unknown: (cause?: unknown) =>
        buildAppError({
            code: "unknown",
            title: "Something went wrong",
            message: "An unexpected error occurred.",
            ...(cause === undefined ? {} : { details: { cause: serializeErrorCause(cause) } }),
        }),
} as const;

function buildAppError(args: AppError) {
    return {
        ...args,
        [Symbol.toPrimitive]() {
            const details = args.details
                ? "\n" +
                  Object.entries(args.details)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")
                : "";

            return `(${args.code}) ${args.title}: ${args.message}${details}`;
        },
    };
}

type AppErrorResProps = {
    title?: string;
    message?: string;
    error?: unknown;
    details?: { [key: string]: unknown };
};

function createAppErrorRes(code: ErrorCode, title: string, message?: string) {
    return ({ title: oTitle, message: oMessage, error, details }: AppErrorResProps = {}): AppError => {
        const detailsObj = { ...(error instanceof Error ? errorObjToDetails(error) : error === undefined ? {} : { cause: serializeErrorCause(error) }), ...details };

        return buildAppError({
            code,
            title: oTitle ?? title,
            ...(oMessage ? { message: oMessage } : message ? { message } : {}),
            details: detailsObj,
        });
    };
}

const errorObjToDetails = (error: Error) => {
    const cause = (error as Error & { cause?: unknown }).cause;

    return {
        name: error.name,
        message: error.message,
        ...(error.stack ? { stack: error.stack } : {}),
        ...(cause === undefined ? {} : { cause: serializeErrorCause(cause) }),
    };
};

function serializeErrorCause(cause: unknown): unknown {
    if (cause instanceof Error) return errorObjToDetails(cause);
    return cause;
}

export function isAppError(value: unknown): value is AppError {
    return !!(
        value &&
        typeof value === "object" &&
        "code" in value &&
        typeof value.code === "string" &&
        (errorCodes as readonly string[]).includes(value.code) &&
        "title" in value &&
        typeof value.title === "string" &&
        (!("message" in value) || typeof value.message === "string")
    );
}

export function toAppError(value: unknown): AppError {
    if (isAppError(value)) return value;
    if (value instanceof Error)
        return buildAppError({
            code: "unknown",
            title: value.name,
            message: value.message,
            details: errorObjToDetails(value),
        });

    return Errors.unknown(value);
}
