import { cn } from "@/lib/utils";

export function CenterLayout({ children, className }: { children: React.ReactNode; className?: string; title?: string }) {
    return (
        <div className="flex flex-col justify-center items-center flex-1">
            <div className={cn("w-full max-w-md flex flex-col gap-4", className)}>
                {children}
            </div>
        </div>
    );
}