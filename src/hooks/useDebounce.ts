import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom debounce hook — replaces duplicated setTimeout/clearTimeout patterns
 * Used by UserSearch, CompareUsers, and any search input component
 */
export function useDebounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300
): T {
    const timer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => fn(...args), delay);
        },
        [fn, delay]
    ) as unknown as T;
}
