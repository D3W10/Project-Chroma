import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@project-chroma/utils";

const pathBoxVariants = cva("flex items-center bg-secondary font-mono whitespace-nowrap rounded-lg ring-1 ring-input select-text overflow-x-auto no-scrollbar", {
    variants: {
        size: {
            md: "h-9 px-3 text-sm",
            sm: "h-8 px-2.5 text-xs",
        },
        hasChildren: {
            true: "text-secondary-foreground",
            false: "text-muted-foreground",
        },
    },
    defaultVariants: {
        size: "md",
        hasChildren: false,
    },
});

export function PathBox({ children, className, size, ...props }: React.ComponentProps<"div"> & VariantProps<typeof pathBoxVariants>) {
    return (
        <div className={cn(pathBoxVariants({ size, hasChildren: !!children, className }))} {...props}>
            {children || "No location"}
        </div>
    );
}
