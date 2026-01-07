
import React, { useRef, useState, useEffect } from 'react';
import { Icon } from './UI';
import { TABS_CONFIG } from '../constants';

interface TabNavigationProps {
    layoutMode: string;
    setLayoutMode: (mode: any) => void;
    isSidebarOpen: boolean;
    sidebarWidth: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = React.memo(({ 
    layoutMode, 
    setLayoutMode, 
    isSidebarOpen,
    sidebarWidth 
}) => {
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const tabsContainerRef = useRef<HTMLDivElement>(null); 
    const [tabStyle, setTabStyle] = useState({ left: 0, width: 0, opacity: 0, color: '' });

    useEffect(() => {
        const updateTabIndicator = () => {
            const activeIndex = TABS_CONFIG.findIndex(t => t.id === layoutMode);
            const activeEl = tabsRef.current[activeIndex];
            if (activeEl) {
                setTabStyle({
                    left: activeEl.offsetLeft,
                    width: activeEl.offsetWidth,
                    opacity: 1,
                    color: TABS_CONFIG[activeIndex].colorClass
                });
            }
        };

        updateTabIndicator();
        window.addEventListener('resize', updateTabIndicator);
        const timer = setTimeout(updateTabIndicator, 300); 

        return () => {
            window.removeEventListener('resize', updateTabIndicator);
            clearTimeout(timer);
        };
    }, [layoutMode, isSidebarOpen, sidebarWidth]);

    return (
        <div className="flex gap-2 w-full">
            {/* TABS CONTAINER */}
            <div ref={tabsContainerRef} className="relative flex-1 flex justify-between bg-gray-100 dark:bg-slate-950 p-1 rounded-xl dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                <div 
                    className={`absolute top-1 bottom-1 shadow-sm rounded-lg transition-all duration-500 ease-fluid z-0 ${tabStyle.color}`} 
                    style={{ left: tabStyle.left, width: tabStyle.width, opacity: tabStyle.opacity }} 
                />
                {TABS_CONFIG.map((tab, idx) => (
                    <button 
                        key={tab.id} 
                        ref={el => { tabsRef.current[idx] = el; }} 
                        onClick={() => setLayoutMode(tab.id)} 
                        className={`flex-1 relative z-10 flex items-center justify-center gap-2 px-1 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors duration-300 ${layoutMode === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        <Icon name={tab.icon} size={16}/> 
                        <span className={`${isSidebarOpen ? 'hidden xl:inline' : 'hidden md:inline'}`}>{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
});
