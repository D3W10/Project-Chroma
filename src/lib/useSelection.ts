import { useState } from "react";

interface UseSelectionProps<T> {
    items: T[];
}

export function useSelection<T extends { id: string | number }>({ items }: UseSelectionProps<T>) {
    const [selected, setSelected] = useState<T[]>([]);
    const [lastIndex, setLastIndex] = useState(-1);

    function handleSelect(event: React.MouseEvent<HTMLElement, MouseEvent>, index: number, item: T) {
        event.stopPropagation();

        const isShift = event.shiftKey;
        const isCtrlOrCmd = event.metaKey || event.ctrlKey;

        if (isShift && lastIndex !== -1) {
            const [start, end] = [lastIndex, index].sort((a, b) => a - b);
            const rangeIds = items.slice(start, end + 1);
            setSelected(rangeIds);
        } else if (isCtrlOrCmd) {
            setSelected(prev => prev.some(p => p.id === item.id) ? prev.filter(p => p.id !== item.id) : [...prev, item]);
            setLastIndex(index);
        } else {
            setSelected([item]);
            setLastIndex(index);
        }
    }

    function handleRightClick(index: number, item: T) {
        if (selected.some(s => s.id === item.id)) return;

        setSelected([item]);
        setLastIndex(index);
    }

    function unselectAll(e?: React.MouseEvent) {
        const contextMenu = document.body.querySelector("[data-slot='context-menu-content']");
        const dialog = document.body.querySelector("[data-slot='dialog-content']");

        if (!e || e.currentTarget === e.target || (e.target instanceof HTMLElement && e.target.tagName !== "BUTTON" && !contextMenu?.contains(e.target) && !dialog?.contains(e.target))) {
            setSelected([]);
            setLastIndex(-1);
        }
    }

    return {
        selected,
        setSelected,
        lastIndex,
        setLastIndex,
        handleSelect,
        handleRightClick,
        unselectAll,
    };
}