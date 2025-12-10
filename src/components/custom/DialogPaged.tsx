import { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { animate } from "../animated";

interface DialogPagedProps {
    pages: { [key: string]: { height: number; node: React.ReactNode } };
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

type Direction = "forward" | "backward";

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
    const [dialogDirection, setDialogDirection] = useState<Direction>("forward");

    function setPage(page: string, back: boolean = false) {
        setDialogDirection(!back ? "forward" : "backward");
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
            <DialogContent className={"overflow-hidden " + (!dialogMoving ? "duration-350 delay-25" : "")} style={{ height: `${dialogHeight}px` }} onAnimationStart={() => !open && setDialogMoving(true)} onAnimationEnd={() => open && setTimeout(() => setDialogMoving(false), 100)}>
                <DialogPagedContext.Provider value={{ page: dialogPage, setPage, close: () => onOpenChange(false) }}>
                    <AnimatePresence initial={false} custom={dialogDirection}>
                        {Object.keys(pages).map(page => dialogPage === page && (
                            <animate.div
                                key={page}
                                variants={{
                                    initial: (direction: Direction) => ({
                                        x: direction === "forward" ? 300 : -300,
                                        opacity: 0,
                                    }),
                                    target: {
                                        x: 0,
                                        opacity: 1,
                                    },
                                    exit: (direction: Direction) => ({
                                        x: direction === "forward" ? -300 : 300,
                                        opacity: 0,
                                    }),
                                }}
                                custom={dialogDirection}
                                initial="initial"
                                animate="target"
                                exit="exit"
                                className="flex flex-col gap-4 col-1 row-1"
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