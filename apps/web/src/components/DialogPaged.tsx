import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog, DialogContent } from "@project-chroma/ui/dialog";
import { slideVariants, type Direction } from "@/components/animated";
import { QUICK_EASE } from "@/lib/utils";

interface DialogPagedProps {
    pages: { [key: string]: { closeable?: boolean; node: React.ReactNode } };
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

interface PageTransition {
    direction: Direction;
    height?: number;
}

const DialogPagedContext = createContext<DialogPagedContextType | null>(null);

const pageVariants = {
    initial: ({ direction, height }: PageTransition) => ({
        ...slideVariants.initial(direction),
        height: height ?? "auto",
    }),
    target: {
        ...slideVariants.target,
        height: "auto",
    },
    exit: ({ direction }: PageTransition) => slideVariants.exit(direction),
};

export function useDialogPaged() {
    const context = useContext(DialogPagedContext);
    if (!context) throw new Error("useDialogPaged must be used within a DialogPaged component");

    return context;
}

export function DialogPaged({ pages, defaultPage, open, onOpenChange, onPageSwitch }: DialogPagedProps) {
    const [dialogPage, setDialogPage] = useState(defaultPage);
    const [dialogDirection, setDialogDirection] = useState<Direction>(1);
    const pageRef = useRef<HTMLDivElement>(null);
    const previousPageHeight = useRef<number | undefined>(undefined);

    const setPageRef = useCallback((page: HTMLDivElement | null) => {
        if (page) pageRef.current = page;
    }, []);

    function setPage(page: string, back: boolean = false) {
        previousPageHeight.current = pageRef.current?.offsetHeight;
        setDialogDirection(!back ? 1 : -1);
        setDialogPage(page);
    }

    useEffect(() => {
        if (!open) {
            setDialogPage(defaultPage);
            return;
        }

        onPageSwitch?.();
    }, [dialogPage, open]);

    const pageTransition: PageTransition = {
        direction: dialogDirection,
        height: previousPageHeight.current,
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden" showCloseButton={pages[dialogPage].closeable ?? true}>
                <DialogPagedContext.Provider value={{ page: dialogPage, setPage, close: () => onOpenChange(false) }}>
                    <AnimatePresence initial={false} mode="popLayout" custom={pageTransition}>
                        {Object.keys(pages).map(
                            page =>
                                dialogPage === page && (
                                    <motion.div
                                        ref={setPageRef}
                                        key={page}
                                        variants={pageVariants}
                                        custom={pageTransition}
                                        initial="initial"
                                        animate="target"
                                        exit="exit"
                                        transition={{ duration: 0.6, ease: QUICK_EASE, height: { duration: 0.5, ease: QUICK_EASE } }}
                                    >
                                        <div className="flex flex-col gap-6">{pages[page as keyof typeof pages].node}</div>
                                    </motion.div>
                                ),
                        )}
                    </AnimatePresence>
                </DialogPagedContext.Provider>
            </DialogContent>
        </Dialog>
    );
}
