import { motion } from "motion/react";
import { QUICK_EASE } from "@/lib/utils";

interface AnimatedComponentProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

function createAnimatedComponent(element: keyof typeof motion) {
    const Component = motion[element] as React.ComponentType<Record<string, unknown>>;

    function AnimatedComponent({ children, className, delay, ...props }: AnimatedComponentProps) {
        return (
            <Component
                className={className}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: QUICK_EASE, delay: delay ?? 0.5 }}
                {...props}
            >
                {children}
            </Component>
        );
    }

    return AnimatedComponent;
}

export const animate = {
    div: createAnimatedComponent("div"),
    h1: createAnimatedComponent("h1"),
    p: createAnimatedComponent("p"),
};