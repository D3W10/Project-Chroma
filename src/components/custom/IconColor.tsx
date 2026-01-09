import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

const iconColorVariants = cva(
    "flex justify-center items-center bg-(--lib-color)/30 ring-(--lib-color) aspect-square *:drop-shadow-sm",
    {
        variants: {
            size: {
                default: "size-6 text-sm rounded-sm ring-2",
                lg: "size-10 text-lg rounded-md ring-3",
                xl: "size-12 text-xl rounded-lg ring-3",
            },
        },
        defaultVariants: {
            size: "default",
        },
    },
);

export function IconColor({ className, size, children, color, ...props }: React.ComponentProps<"div"> & VariantProps<typeof iconColorVariants> & { color?: string }) {
    return (
        <div className={cn(iconColorVariants({ size, className }))} {...props} style={{ "--lib-color": color ?? "#000" } as CSSProperties}>
            <span>{children}</span>
        </div>
    );
}