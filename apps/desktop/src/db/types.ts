export type DbRow = Record<string, unknown>;

export function boolToInt(value: boolean) {
    return value ? 1 : 0;
}
