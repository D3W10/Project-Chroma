import { cn } from "@project-chroma/utils";

export function OnboardingLayout({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("w-md min-h-138 flex flex-col justify-between items-center gap-8 [view-transition-name:onboarding-content]", className)}>{children}</div>;
}
