import { motion, type HTMLMotionProps } from "motion/react";
import { QUICK_EASE } from "@/lib/utils";

type AnimatedComponentProps<Tag extends keyof HTMLElementTagNameMap> = Omit<HTMLMotionProps<Tag>, "initial" | "animate" | "transition"> & {
    delay?: number;
    initial?: HTMLMotionProps<Tag>["initial"];
    animate?: HTMLMotionProps<Tag>["animate"];
    transition?: HTMLMotionProps<Tag>["transition"];
};

function createAnimatedComponent<Tag extends keyof HTMLElementTagNameMap>(element: Tag) {
    const Component = motion[element] as React.ComponentType<HTMLMotionProps<Tag>>;

    function AnimatedComponent({
        children,
        className,
        delay,
        initial,
        animate,
        transition,
        ...props
    }: AnimatedComponentProps<Tag>) {
        const defaultTransition = { duration: 0.6, ease: QUICK_EASE, delay: delay ?? 0 };
        const mergedTransition = transition
            ? { ...defaultTransition, ...transition, delay: delay ?? transition.delay ?? defaultTransition.delay }
            : defaultTransition;

        return (
            <Component
                className={className}
                initial={initial ?? { opacity: 0, y: 8 }}
                animate={animate ?? { opacity: 1, y: 0 }}
                transition={mergedTransition}
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