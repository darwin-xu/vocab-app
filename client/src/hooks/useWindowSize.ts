import { useState, useEffect } from 'react';

// Custom hook to track window size
export function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
    });

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        function handleResize() {
            // Debounce resize events to improve performance
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                setWindowSize({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }, 150); // 150ms debounce delay
        }

        window.addEventListener('resize', handleResize);
        handleResize(); // Call handler right away so state gets updated with initial window size

        return () => {
            window.removeEventListener('resize', handleResize);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    return windowSize;
}
