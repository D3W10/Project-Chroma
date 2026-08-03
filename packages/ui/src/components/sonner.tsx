import { toast as sonnerToast, Toaster as Sonner, type ToasterProps } from "sonner";
import { IconCircleCheck, IconInfoCircle, IconAlertTriangle, IconX, IconAlertSquareRounded } from "@tabler/icons-react";
import { Button } from "./button";
import { Spinner } from "./spinner";
import type { Notification } from "@project-chroma/contracts/gallery";

export const notiIcons: Record<Notification["type"], React.ReactNode> = {
    info: <IconInfoCircle className="size-4.5 text-blue-500" />,
    success: <IconCircleCheck className="size-4.5 text-green-500" />,
    warning: <IconAlertTriangle className="size-4.5 text-yellow-500" />,
    error: <IconAlertSquareRounded className="size-4.5 text-red-500" />,
    promise: <Spinner className="size-4.5" />,
} as const;

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            icons={{
                ...notiIcons,
                close: <IconX />,
            }}
            {...props}
        />
    );
};

interface ToastProps {
    title: string;
    description?: string | undefined;
}

interface ToastPropsFull extends ToastProps {
    id: string | number;
    type?: "info" | "success" | "warning" | "error";
}

const toast = {
    info: (toast: ToastProps) => sonnerToast.custom(id => <Toast id={id} title={toast.title} description={toast.description} type="info" />),
    success: (toast: ToastProps) => sonnerToast.custom(id => <Toast id={id} title={toast.title} description={toast.description} type="success" />),
    warning: (toast: ToastProps) => sonnerToast.custom(id => <Toast id={id} title={toast.title} description={toast.description} type="warning" />),
    error: (toast: ToastProps) => sonnerToast.custom(id => <Toast id={id} title={toast.title} description={toast.description} type="error" />),
};

function Toast(props: ToastPropsFull) {
    const { id, title, description, type = "info" } = props;

    return (
        <div className="w-80 p-3 flex gap-2.5 bg-popover rounded-lg shadow-lg ring ring-input group">
            {notiIcons[type]}
            <div className="-mt-0.5 flex flex-col gap-1 flex-1">
                <h4 className="flex-1 text-sm font-medium">{title}</h4>
                <p className="text-xs text-secondary-foreground line-clamp-5">{description}</p>
            </div>
            <Button
                variant="ghost"
                size="icon-2xs"
                className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 z-1"
                onClick={() => sonnerToast.dismiss(id)}
            >
                <IconX />
            </Button>
        </div>
    );
}

export { Toaster, toast };
