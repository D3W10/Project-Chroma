import { useState } from "react";

export function useStack<T>(initialState: T[] = []) {
    const [stack, setStack] = useState<T[]>(initialState);

    function push(item: T) {
        setStack(prev => [...prev, item]);
    }

    function pop() {
        const item = stack[stack.length - 1];

        setStack(prev => {
            if (prev.length === 0) return prev;
            return prev.slice(0, -1);
        });

        return item;
    }

    function clear() {
        setStack([]);
    }

    return {
        stack,
        push,
        pop,
        clear,
        length: stack.length,
        peek: stack.length > 0 ? stack[stack.length - 1] : undefined,
    };
}