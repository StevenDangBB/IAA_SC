
import { useEffect } from 'react';

/**
 * Enables navigating between form inputs using Arrow Keys and Enter.
 * 
 * Behaviors:
 * - Arrow Down / Enter: Focus Next
 * - Arrow Up: Focus Previous
 * - Ctrl + Arrow Right: Focus Next (Good for grids/matrix)
 * - Ctrl + Arrow Left: Focus Previous
 * 
 * Rules:
 * - Skips hidden/disabled inputs.
 * - Respects native behavior for <textarea> (unless Ctrl is held).
 * - Respects native behavior for <select> (unless Enter/Ctrl is used).
 */
export const useKeyboardNavigation = () => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
            if (!navKeys.includes(e.key)) return;

            // Get active element
            const target = document.activeElement as HTMLElement;
            if (!target) return;

            const tagName = target.tagName.toLowerCase();
            const isInput = tagName === 'input';
            const isTextArea = tagName === 'textarea';
            const isSelect = tagName === 'select';

            // Only act if we are currently focused on a data entry field
            if (!isInput && !isTextArea && !isSelect) return;

            // --- CONTEXT SAFETY CHECKS ---

            // 1. Textarea: Allow native cursor movement lines. Only navigate if Ctrl is held.
            // Exception: Enter on textarea usually adds new line, so keep native unless Ctrl+Enter (optional, strictly keeping native here)
            if (isTextArea && !e.ctrlKey) return; 

            // 2. Select: Arrow keys change value. Only navigate on Enter or Ctrl+Arrows.
            if (isSelect && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.ctrlKey) return;

            // 3. Input (Text): Left/Right moves cursor. Only navigate Left/Right if Ctrl is held.
            if (isInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.ctrlKey) return;

            // --- DIRECTION CALCULATION ---
            let direction = 0; // 0 = stay, 1 = next, -1 = prev

            if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && e.ctrlKey)) direction = 1;
            if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && e.ctrlKey)) direction = -1;
            
            // Enter usually goes Next. Shift+Enter goes Prev.
            if (e.key === 'Enter') {
                // If in textarea, Enter adds line (unless we wanted to submit, but here we prioritize text entry)
                // If we want Enter to navigate out of textarea, we need e.ctrlKey or similar logic.
                // For now, allow Enter to navigate Inputs/Selects.
                if (isTextArea) return; 
                direction = e.shiftKey ? -1 : 1;
            }

            if (direction !== 0) {
                e.preventDefault();

                // Find all navigation candidates
                // QuerySelector matches: inputs (text, number, etc), textareas, selects.
                // Excludes: hidden, disabled, file inputs (often quirky), checkboxes/radios (arrows change selection)
                const selector = 'input:not([type="hidden"]):not([type="file"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled])';
                
                const nodeList = document.querySelectorAll(selector);
                const elements = Array.from(nodeList) as HTMLElement[];

                // Filter only visually visible elements (avoids jumping to hidden sidebar inputs if closed)
                const visibleElements = elements.filter(el => el.offsetParent !== null);

                const currentIndex = visibleElements.indexOf(target);
                if (currentIndex === -1) return;

                const nextIndex = currentIndex + direction;

                if (nextIndex >= 0 && nextIndex < visibleElements.length) {
                    const nextElement = visibleElements[nextIndex];
                    nextElement.focus();

                    // UX Enhancement: Select text in inputs so user can type immediately to replace
                    if (nextElement.tagName.toLowerCase() === 'input') {
                        // Check type to avoid error on email/number in some browsers
                        const type = (nextElement as HTMLInputElement).type;
                        if (['text', 'search', 'url', 'tel', 'password'].includes(type)) {
                            try { (nextElement as HTMLInputElement).select(); } catch(err) {}
                        }
                    }
                    
                    // Ensure element is visible in view (scroll if needed)
                    nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
};
