import { cn } from "@/lib/utils";

interface Props {
    children?: React.ReactNode;
    className?: string;
}

export function Toolbar({ children, className }: Props) {
    return (
        <div className={cn("p-2 flex justify-between items-center sticky top-0 left-0 right-0 z-10 before:absolute before:inset-0 before:backdrop-blur-xs before:mask-b-from-25% before:-z-10 after:absolute after:inset-0 after:-bottom-4 after:bg-background/70 after:mask-b-from-20% after:-z-20", className)}>
            {children}
        </div>
    );
}