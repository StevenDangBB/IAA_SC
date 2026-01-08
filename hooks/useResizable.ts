
import { useState, useEffect, useRef, useCallback } from 'react';

export const useResizable = (initialWidth: number, minWidth: number, maxWidth: number, onResizeEnd?: (width: number) => void) => {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const widthRef = useRef(initialWidth); // Keep track without re-renders during drag

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    useEffect(() => {
        // Sync local state if parent prop changes and we aren't resizing
        if (!isResizing) {
            setWidth(initialWidth);
            widthRef.current = initialWidth;
        }
    }, [initialWidth, isResizing]);

    useEffect(() => {
        const resize = (e: MouseEvent) => {
            if (isResizing && sidebarRef.current) {
                const newWidth = Math.max(minWidth, Math.min(e.clientX, maxWidth));
                widthRef.current = newWidth; // Update ref
                sidebarRef.current.style.width = `${newWidth}px`; // Direct DOM update
            }
        };

        const onMouseUp = () => {
            if (isResizing) {
                stopResizing();
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Finalize state
                setWidth(widthRef.current);
                if (onResizeEnd) onResizeEnd(widthRef.current);
            }
        };

        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', onMouseUp);
            // Safety cleanup
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, minWidth, maxWidth, stopResizing, onResizeEnd]);

    return { width, isResizing, sidebarRef, startResizing };
};
