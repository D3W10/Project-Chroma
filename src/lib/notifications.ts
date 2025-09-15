import { toast } from "sonner";

export function notifyError(title: string, description?: string) {
    toast.error(title, description ? { description } : undefined);
}