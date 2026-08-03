import errorCodes from "./errorCodes.ts";

export type AppError = {
    code: ErrorCode;
    title: string;
    message?: string;
    details?: { [key: string]: unknown };
};

export type ErrorCode = (typeof errorCodes)[number];

export const Errors = {
    libraryNotFound: createAppErrorRes("library:not-found", "Library not found", "No library was found at the specified location."),
    missingSource: createAppErrorRes("item:missing-source", "Source item not found"),
    itemReadFail: createAppErrorRes("item:read-fail", "Unable to read item"),
    itemCopyFail: createAppErrorRes("item:copy-fail", "Unable to copy item"),
    unknown: (cause?: unknown) =>
        buildAppError({
            code: "unknown",
            title: "Something went wrong",
            details: { cause },
        }),
} as const;

function buildAppError(args: AppError) {
    return {
        ...args,
        [Symbol.toPrimitive]() {
            return `${args.title}: ${args.message}`;
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
        const detailsObj = { ...(error instanceof Error ? errorObjToDetails(error) : {}), ...details };

        return buildAppError({
            code,
            title: oTitle ?? title,
            ...(oMessage ? { message: oMessage } : message ? { message } : {}),
            details: detailsObj,
        });
    };
}

const errorObjToDetails = (error: Error) => ({ cause: error.cause, stack: error.stack });

export function isAppError(value: unknown): value is AppError {
    return !!(
        value &&
        typeof value === "object" &&
        "code" in value &&
        typeof value.code === "string" &&
        (errorCodes as readonly string[]).includes(value.code) &&
        "message" in value &&
        typeof value.message === "string"
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
