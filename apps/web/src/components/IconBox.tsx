import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@project-chroma/utils";

const iconBoxVariants = cva(
    "flex text-secondary-foreground bg-secondary-foreground/8 border-foreground/8 inset-shadow-center [--tw-inset-shadow-color:var(--solid)]/50 drop-shadow-2xl drop-shadow-primary/15 ring ring-input transform-gpu *:size-full",
    {
        variants: {
            size: {
                md: "size-16 p-2.5 rounded-xl border-4",
                sm: "size-14 p-2.5 rounded-lg border-3",
                xs: "size-10 p-2 rounded-md border-2",
            },
        },
        defaultVariants: {
            size: "md",
        },
    },
);

export function IconBox({ className, size, ...props }: React.ComponentProps<"div"> & VariantProps<typeof iconBoxVariants>) {
    return <div className={cn(iconBoxVariants({ size, className }))} {...props} />;
}
