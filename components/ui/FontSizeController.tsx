
import React, { useState, useRef } from 'react';
import { Icon } from './Primitives';

export const FontSizeController = ({ fontSizeScale, adjustFontSize }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    // SNAPSHOT COORDINATES: Captured once when opened, never updated by re-renders.
    const [pinnedPosition, setPinnedPosition] = useState<{ top: number, right: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleToggle = (e: React.MouseEvent) => {
        // Stop propagation to prevent immediate closing if using global click listener
        e.stopPropagation();
        
        if (!isOpen && buttonRef.current) {
            // CAPTURE CURRENT VIEWPORT POSITION
            const rect = buttonRef.current.getBoundingClientRect();
            // Calculate fixed position relative to viewport
            // We align the right edge of the popup with the right edge of the button
            const rightEdge = window.innerWidth - rect.right;
            setPinnedPosition({
                top: rect.bottom + 8,
                right: rightEdge
            });
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    return (
        <>
            <button 
                ref={buttonRef}
                onClick={handleToggle} 
                className={`p-2 rounded-xl transition-all active:scale-95 ${isOpen ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Adjust Font Size"
            >
                <Icon name="TextSize" size={18}/>
            </button>
            
            {/* FIXED PORTAL-LIKE OVERLAY */}
            {isOpen && pinnedPosition && (
                <>
                    {/* Invisible Backdrop to handle click-outside */}
                    <div 
                        className="fixed inset-0 z-[99] cursor-default" 
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* THE STATIC CONTROL PANEL */}
                    <div 
                        className="fixed z-[100] flex items-center bg-white dark:bg-slate-900 rounded-full p-1.5 shadow-2xl border border-gray-200 dark:border-slate-700 animate-zoom-in-spring min-w-[140px] justify-between"
                        style={{
                            top: `${pinnedPosition.top}px`,
                            right: `${pinnedPosition.right}px`,
                            // Ensure it stays "glued" to screen glass coordinates
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing when clicking inside
                    >
                         <button onClick={() => adjustFontSize('decrease')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 transition-all duration-200 flex-shrink-0 active:scale-90"><Icon name="Minus" size={16}/></button>
                         <span className="text-sm font-black text-slate-800 dark:text-white select-none px-2 w-12 text-center">{(fontSizeScale * 100).toFixed(0)}%</span>
                         <button onClick={() => adjustFontSize('increase')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 transition-all duration-200 flex-shrink-0 active:scale-90"><Icon name="Plus" size={16}/></button>
                    </div>
                </>
            )}
        </>
    );
};
