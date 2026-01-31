import { cn } from "@/lib/utils";

interface Props {
    children?: React.ReactNode;
    className?: string;
    placement?: "full";
}

export function Toolbar({ children, className, placement }: Props) {
    return (
        <div className={cn("p-2 flex justify-between items-center sticky top-0 left-0 right-0 z-10", className)}>
            {children}
            {placement === "full" && <ToolbarShadeFull />}
        </div>
    );
}

interface GroupProps {
    children?: React.ReactNode;
    className?: string;
    placement?: "left" | "right";
}

export function ToolbarGroup({ children, className, placement }: GroupProps) {
    return (
        <div className={cn("flex gap-2 relative", className)}>
            {children}
            {placement === "left" && <ToolbarShadeLeft />}
            {placement === "right" && <ToolbarShadeRight />}
        </div>
    );
}

interface ShadeProps {
    shadowClass?: string;
    blurClass?: string;
}

export function ToolbarShadeFull({ shadowClass, blurClass }: ShadeProps) {
    return (
        <>
            <div className={cn("absolute inset-0 -bottom-4 bg-background/70 mask-b-from-25% -z-20", shadowClass)} />
            <div className={cn("absolute inset-0 backdrop-blur-xs mask-b-from-25% -z-10", blurClass)} />
        </>
    );
}

export function ToolbarShadeLeft() {
    return (
        <ToolbarShadeFull
            shadowClass="-inset-2 -right-18 mask-r-from-[calc(100%-100px)]"
            blurClass="-inset-2 -right-14 mask-r-from-[calc(100%-100px)]"
        />
    );
}

export function ToolbarShadeRight() {
    return (
        <ToolbarShadeFull
            shadowClass="-inset-2 -left-18 mask-l-from-[calc(100%-100px)]"
            blurClass="-inset-2 -left-14 mask-l-from-[calc(100%-100px)]"
        />
    );
}