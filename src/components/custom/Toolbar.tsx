import { cn } from "@/lib/utils";

interface Props {
    children?: React.ReactNode;
    className?: string;
    shade?: "full" | "separate";
}

export function Toolbar({ children, className, shade = "full" }: Props) {
    return (
        <div className={cn("p-2 flex justify-between items-center gap-2 sticky top-0 left-0 right-0 group/toolbar z-10 [&>div:first-of-type]:justify-start [&>div:last-of-type]:justify-end", className)} data-shade={shade}>
            {children}
            <ToolbarShadeFull className="hidden group-data-[shade=full]/toolbar:block" />
        </div>
    );
}

interface GroupProps {
    children?: React.ReactNode;
    className?: string;
}

export function ToolbarGroup({ children, className }: GroupProps) {
    return (
        <div className={cn("flex justify-center gap-2 group-data-[shade=full]/toolbar:flex-1 relative group/toolbar-group", className)}>
            {children}
            <ToolbarShadeLeft />
            <ToolbarShadeRight />
        </div>
    );
}

interface ShadeProps {
    className?: string;
    shadowClass?: string;
    blurClass?: string;
}

function ToolbarShadeFull({ className, shadowClass, blurClass }: ShadeProps) {
    return (
        <>
            <span className={cn("absolute inset-0 -bottom-4 bg-background/70 mask-b-from-25% -z-20", shadowClass, className)} />
            <span className={cn("absolute inset-0 backdrop-blur-xs mask-b-from-25% -z-10", blurClass, className)} />
        </>
    );
}

function ToolbarShadeLeft() {
    return (
        <ToolbarShadeFull
            className="hidden group-data-[shade=separate]/toolbar:group-first-of-type/toolbar-group:block"
            shadowClass="-inset-2 -right-18 mask-r-from-[calc(100%-100px)]"
            blurClass="-inset-2 -right-14 mask-r-from-[calc(100%-100px)]"
        />
    );
}

function ToolbarShadeRight() {
    return (
        <ToolbarShadeFull
            className="hidden group-data-[shade=separate]/toolbar:group-last-of-type/toolbar-group:block"
            shadowClass="-inset-2 -left-18 mask-l-from-[calc(100%-100px)]"
            blurClass="-inset-2 -left-14 mask-l-from-[calc(100%-100px)]"
        />
    );
}