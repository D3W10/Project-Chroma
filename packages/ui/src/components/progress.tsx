import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@project-chroma/utils";

type ProgressProps = Omit<ProgressPrimitive.Root.Props, "value"> & {
    indeterminate?: boolean;
    value?: ProgressPrimitive.Root.Props["value"];
};

function Progress({ className, children, indeterminate = false, value = null, ...props }: ProgressProps) {
    return (
        <ProgressPrimitive.Root value={indeterminate ? null : value} data-slot="progress" className={cn("flex flex-wrap gap-3", className)} {...props}>
            {children}
            <ProgressTrack>
                <ProgressIndicator />
            </ProgressTrack>
        </ProgressPrimitive.Root>
    );
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
    return <ProgressPrimitive.Track className={cn("relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted", className)} data-slot="progress-track" {...props} />;
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
    return (
        <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className={cn("h-full bg-primary transition-all data-indeterminate:absolute data-indeterminate:w-1/3 data-indeterminate:animate-[progress-indeterminate_1.2s_ease-in-out_infinite] motion-reduce:data-indeterminate:animate-pulse", className)}
            {...props}
        />
    );
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
    return <ProgressPrimitive.Label className={cn("text-sm font-medium", className)} data-slot="progress-label" {...props} />;
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
    return <ProgressPrimitive.Value className={cn("ml-auto text-sm text-muted-foreground tabular-nums", className)} data-slot="progress-value" {...props} />;
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
