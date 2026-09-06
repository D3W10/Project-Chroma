export function AppMockup() {
    return (
        <div className="w-full flex flex-col bg-slate-100 dark:bg-page rounded-sm ring ring-input overflow-hidden aspect-video">
            <div className="h-6 px-2 py-1.5 flex items-center gap-4">
                <div className="flex gap-0.75">
                    <div className="size-1.5 bg-red-500 rounded-full"></div>
                    <div className="size-1.5 bg-yellow-500 rounded-full"></div>
                    <div className="size-1.5 bg-green-500 rounded-full"></div>
                </div>
                <div className="w-12 h-full bg-background ring ring-input rounded-xs"></div>
            </div>
            <div className="flex flex-1">
                <div className="w-12 p-1.5 flex flex-col gap-1.5">
                    <div className="w-full h-7 bg-background rounded-xs ring-1 ring-input/75 shadow-md shadow-primary/10"></div>
                    <div className="w-full h-7 bg-background rounded-xs ring-1 ring-input/75 shadow-md shadow-primary/10"></div>
                    <div className="w-full h-7 bg-background rounded-xs ring-1 ring-input/75 shadow-md shadow-primary/10"></div>
                </div>
                <div className="flex-1 bg-background rounded-tl-sm ring-1 ring-input">
                    <div className="h-6 p-1 flex justify-between">
                        <div className="w-13 h-full bg-primary rounded-xs"></div>
                        <div className="flex justify-end gap-1">
                            <div className="h-full bg-muted/25 rounded-xs ring-1 ring-input/75 aspect-square"></div>
                            <div className="h-full bg-muted/25 rounded-xs ring-1 ring-input/75 aspect-square"></div>
                            <div className="h-full bg-muted/25 rounded-xs ring-1 ring-input/75 aspect-square"></div>
                        </div>
                    </div>
                    <div className="p-1 pt-0.5 grid grid-cols-7 gap-1 flex-1">
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                        <div className="h-full bg-muted/50 rounded-xs aspect-square"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
