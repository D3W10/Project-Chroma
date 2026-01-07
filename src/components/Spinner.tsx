import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";

export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    return (
        <IconLoader2 className={cn("size-4 animate-spin", className)} {...props} />
    );
}