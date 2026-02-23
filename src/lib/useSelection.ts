import { useState } from "react";

interface UseSelectionProps<T> {
    items: T[];
}

export function useSelection<T extends { id: string | number }>({ items }: UseSelectionProps<T>) {
    const [selected, setSelected] = useState<T[]>([]);
    const [lastIndex, setLastIndex] = useState(-1);

    function handleSelect(event: React.MouseEvent, index: number, item: T) {
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
        const action = () => {
            setSelected([]);
            setLastIndex(-1);
        };

        if (!e) {
            action();
            return;
        }

        const target = e.target as HTMLElement;
        const isBackground = e.currentTarget === e.target;
        const isButton = target instanceof HTMLButtonElement;
        const isInsideMenu = !!document.body.querySelector("[data-slot='context-menu-content']")?.contains(target);
        const isInsideDialog = !!document.body.querySelector("[data-slot='dialog-content']")?.contains(target);
        if (isBackground || (!isButton && !isInsideMenu && !isInsideDialog))
            action();
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