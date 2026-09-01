import errorCodes from "./errorCodes.ts";

export { errorCodes };

export type ResultCore<T, E = AppError> = ResultAccepted<T> | ResultRejected<E>;
export type ResultAccepted<T> = { success: true; data: T; error: null };
export type ResultRejected<E = AppError> = { success: false; data: null; error: E };

export type AppError = {
    code: ErrorCode;
    title: string;
    message?: string;
    details?: { [key: string]: unknown };
};

export type ErrorCode = (typeof errorCodes)[number];
