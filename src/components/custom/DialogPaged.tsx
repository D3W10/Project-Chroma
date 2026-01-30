import { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { animate, slideVariants, type Direction } from "@/components/animated";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DialogPagedProps {
    pages: { [key: string]: { height: number; closeable?: boolean; node: React.ReactNode } };
    defaultPage: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPageSwitch?: () => void;
}

interface DialogPagedContextType {
    page: string;
    setPage: (page: string, back?: boolean) => void;
    close: () => void;
}

const DialogPagedContext = createContext<DialogPagedContextType | null>(null);

export function useDialogPaged() {
    const context = useContext(DialogPagedContext);
    if (!context)
        throw new Error("useDialogPaged must be used within a DialogPaged component");

    return context;
}

export function DialogPaged({ pages, defaultPage, open, onOpenChange, onPageSwitch }: DialogPagedProps) {
    const [dialogPage, setDialogPage] = useState(defaultPage);
    const [dialogMoving, setDialogMoving] = useState(true);
    const [dialogHeight, setDialogHeight] = useState(pages[defaultPage].height);
    const [dialogDirection, setDialogDirection] = useState<Direction>(1);

    function setPage(page: string, back: boolean = false) {
        setDialogDirection(!back ? 1 : -1);
        setDialogPage(page);
    }

    useEffect(() => {
        if (!open) {
            setDialogPage(defaultPage);
            setDialogMoving(true);
            return;
        }

        setDialogHeight(pages[dialogPage].height);
        onPageSwitch?.();
    }, [dialogPage, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("overflow-hidden", !dialogMoving ? "duration-350 delay-25" : "")} showCloseButton={pages[dialogPage].closeable ?? true} style={{ height: `${dialogHeight}px` }} onAnimationStart={() => !open && setDialogMoving(true)} onAnimationEnd={() => open && setTimeout(() => setDialogMoving(false), 100)}>
                <DialogPagedContext.Provider value={{ page: dialogPage, setPage, close: () => onOpenChange(false) }}>
                    <AnimatePresence initial={false} mode="popLayout" custom={dialogDirection}>
                        {Object.keys(pages).map(page => dialogPage === page && (
                            <animate.div
                                key={page}
                                variants={slideVariants}
                                custom={dialogDirection}
                                initial="initial"
                                animate="target"
                                exit="exit"
                                className="flex flex-col gap-6"
                            >
                                {pages[page as keyof typeof pages].node}
                            </animate.div>
                        ))}
                    </AnimatePresence>
                </DialogPagedContext.Provider>
            </DialogContent>
        </Dialog>
    );
}