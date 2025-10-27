import { cva, type VariantProps } from "class-variance-authority";
import { animate } from "@/components/animated";
import { cn } from "@/lib/utils";

const iconBoxVariants = cva(
    "flex bg-primary/15 ring-2 ring-primary *:size-full *:drop-shadow-md *:drop-shadow-primary/50",
    {
        variants: {
            size: {
                normal: "size-18 p-4 rounded-lg",
                small: "size-10 p-2 rounded-md",
            },
        },
        defaultVariants: {
            size: "normal",
        },
    },
);

export function IconBox({ className, children, size }: React.ComponentProps<"div"> & VariantProps<typeof iconBoxVariants>) {
    return (
        <animate.div delay={0.15} className={cn(iconBoxVariants({ size, className }))}>
            {children}
        </animate.div>
    );
}