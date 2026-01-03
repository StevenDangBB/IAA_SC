
import React from 'react';
import { Icon, FontSizeController } from './UI';

interface HeaderProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (v: boolean) => void;
    displayBadge: string;
    badgeColorClass: string;
    setIsCmdPaletteOpen: (v: boolean) => void;
    fontSizeScale: number;
    setFontSizeScale: React.Dispatch<React.SetStateAction<number>>;
    isDarkMode: boolean;
    setIsDarkMode: (v: boolean) => void;
    isSystemHealthy: boolean;
    onOpenSettings: () => void;
    onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    isSidebarOpen, setIsSidebarOpen, displayBadge, badgeColorClass,
    setIsCmdPaletteOpen, fontSizeScale, setFontSizeScale,
    isDarkMode, setIsDarkMode, isSystemHealthy,
    onOpenSettings, onOpenAbout
}) => {
    return (
        <header className="flex-shrink-0 px-4 md:px-6 py-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-[70] relative flex justify-between items-center h-16 transition-all duration-300">
            <div className="flex items-center h-full gap-3 md:gap-5">
                <div className="relative group cursor-pointer flex items-center justify-center transition-all duration-500 hover:opacity-100 active:scale-95" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="Toggle Sidebar">
                    <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center">
                        <div className="relative z-10">
                            {isSidebarOpen ? <div className="relative w-8 h-8"><div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-cyan-500 rounded-full animate-infinity-spin drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div><div className="absolute inset-2 border-2 border-transparent border-l-purple-500 border-r-pink-500 rounded-full animate-spin-reverse drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]"></div></div>
                                : <div className="hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(0,242,195,0.6)]"><Icon name="TDLogo" size={32} /></div> }
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <h1 className="hidden md:block text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">ISO Audit <span className="font-light text-slate-400">Pro</span></h1>
                    <div className="flex items-center"><span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm uppercase tracking-wider backdrop-blur-sm transition-colors duration-300 ${badgeColorClass}`}>{displayBadge}</span></div>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
                <button onClick={() => setIsCmdPaletteOpen(true)} className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95" title="Command Palette (Ctrl+K)">
                    <Icon name="Session6_Zap" size={20}/>
                </button>
                <div className="hidden lg:block"><FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir: 'increase' | 'decrease') => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} /></div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/></button>
                <button onClick={onOpenSettings} className="group relative w-8 h-8 flex items-center justify-center transition-all" title="Connection Status">
                    <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${isSystemHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <div className={`relative w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 ${isSystemHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                </button>
                <button onClick={onOpenAbout} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all" title="About & Release Notes"><Icon name="Info" size={18}/></button>
            </div>
        </header>
    );
};
