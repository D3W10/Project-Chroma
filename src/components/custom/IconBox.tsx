import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconBoxVariants = cva(
    "flex bg-muted border-secondary inset-shadow-center drop-shadow-2xl drop-shadow-primary/15 ring ring-border/50 transform-gpu *:size-full",
    {
        variants: {
            size: {
                normal: "size-18 p-3.5 rounded-xl border-5",
                medium: "size-14 p-3 rounded-lg border-4",
                small: "size-10 p-2 rounded-md border-3",
            },
        },
        defaultVariants: {
            size: "normal",
        },
    },
);

export function IconBox({ className, size, ...props }: React.ComponentProps<"div"> & VariantProps<typeof iconBoxVariants>) {
    return (
        <div className={cn(iconBoxVariants({ size, className }))} {...props} />
    );
}