import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@project-chroma/utils";

const buttonVariants = cva(
    "group/button isolate inline-flex shrink-0 relative items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all shadow-lg shadow-transparent inset-shadow-center inset-shadow-white overflow-hidden outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-b before:from-transparent before:from-10% before:to-60% after:absolute after:rounded-md after:inset-px after:inset-ring-2 after:inset-ring-transparent after:opacity-75 hover:after:opacity-100 after:transition-opacity aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-primary/20 before:from-white/20 after:inset-ring-input/30 dark:after:inset-ring-input",
                outline: "border-border hover:bg-muted hover:text-foreground aria-expanded:text-foreground dark:border-input dark:hover:bg-input/50",
                secondary:
                    "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
                ghost: "hover:bg-secondary-foreground/10 hover:text-foreground aria-expanded:bg-secondary-foreground/10 aria-expanded:text-foreground",
                destructive: "bg-destructive text-primary-foreground shadow-destructive/20 before:from-white/20 after:inset-ring-input/30 dark:after:inset-ring-input",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
                xs: "h-7 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
                sm: "h-8 gap-1 rounded-lg px-2.5 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
                lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
                icon: "size-9",
                "icon-xs": "size-7 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
                "icon-lg": "size-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
    return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
