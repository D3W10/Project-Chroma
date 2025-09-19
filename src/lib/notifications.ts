import { toast } from "sonner";

export function notifySuccess(title: string, description?: string) {
    toast.success(title, description ? { description } : undefined);
}

export function notifyError(title: string, description?: string) {
    toast.error(title, description ? { description } : undefined);
}