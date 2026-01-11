
import React, { useMemo } from 'react';
import { Icon, FontSizeController } from './UI';
import { useUI } from '../contexts/UIContext';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { MODEL_META } from '../constants';

export const Header: React.FC = () => {
    const { 
        isSidebarOpen, setSidebarOpen, 
        toggleModal, fontSizeScale, setFontSizeScale, 
        isDarkMode, toggleDarkMode 
    } = useUI();
    
    const { standards, standardKey, privacySettings } = useAudit();
    const { apiKeys, activeKeyId } = useKeyPool();

    const currentKey = apiKeys.find(k => k.id === activeKeyId);
    
    // Calculate Model Badge State
    const modelBadge = useMemo(() => {
        if (!currentKey) {
            return { label: "NO KEY", style: "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700", dot: "bg-slate-400" };
        }

        if (currentKey.status === 'checking') {
            return { label: "SYNCING...", style: "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800", dot: "bg-yellow-400 animate-ping" };
        }

        if (currentKey.status === 'quota_exceeded') {
            return { label: "QUOTA LIMIT", style: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800", dot: "bg-orange-500" };
        }

        if (currentKey.status === 'invalid') {
            return { label: "KEY ERROR", style: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800", dot: "bg-red-500" };
        }

        // VALID STATE - Determine Model Style
        if (currentKey.activeModel && MODEL_META[currentKey.activeModel]) {
            const meta = MODEL_META[currentKey.activeModel];
            // Pro Tier (Purple)
            if (meta.tier >= 3) {
                return { 
                    label: meta.label, 
                    style: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 shadow-[0_0_10px_rgba(168,85,247,0.3)]", 
                    dot: "bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]" 
                };
            }
            // Flash Tier (Cyan/Blue)
            return { 
                label: meta.label, 
                style: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800 shadow-[0_0_10px_rgba(34,211,238,0.3)]", 
                dot: "bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.8)]" 
            };
        }

        // Default Valid (Emerald)
        return { 
            label: "ONLINE", 
            style: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.3)]", 
            dot: "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" 
        };

    }, [currentKey]);

    const isChecking = currentKey?.status === 'checking';
    const isPrivacyActive = useMemo(() => Object.values(privacySettings).some(val => val === true), [privacySettings]);

    const displayBadge = useMemo(() => {
        const currentStandardName = standards[standardKey]?.name || "";
        const match = currentStandardName.match(/\((.*?)\)/);
        return match ? match[1] : (currentStandardName.split(' ')[0] || 'ISO');
    }, [standardKey, standards]);

    const badgeColorClass = useMemo(() => {
        const text = displayBadge.toUpperCase();
        if (text.includes('EMS') || text.includes('14001')) return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50";
        if (text.includes('QMS') || text.includes('9001')) return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50";
        if (text.includes('ISMS') || text.includes('27001')) return "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50";
        return "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50";
    }, [displayBadge]);

    return (
        <header className="flex-shrink-0 px-4 md:px-6 py-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-[70] relative flex justify-between items-center h-16 transition-all duration-300">
            <div className="flex items-center h-full gap-3 md:gap-5">
                <div className="relative group cursor-pointer flex items-center justify-center transition-all duration-500 hover:opacity-100 active:scale-95" onClick={() => setSidebarOpen(!isSidebarOpen)} title="Toggle Sidebar">
                    <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center">
                        <div className="relative z-10">
                            {isSidebarOpen ? <div className="relative w-8 h-8"><div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-cyan-500 rounded-full animate-infinity-spin drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div><div className="absolute inset-2 border-2 border-transparent border-l-purple-500 border-r-pink-500 rounded-full animate-spin-reverse drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]"></div></div>
                                : <div className="hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(0,242,195,0.6)]"><Icon name="TDLogo" size={32} /></div> }
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <h1 className="hidden md:block text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">ISO Audit <span className="font-light text-slate-400">Pro</span></h1>
                    
                    {/* MOVED: MODEL STATUS BADGE */}
                    <button 
                        onClick={() => toggleModal('settings', true)} 
                        className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-all active:scale-95 group ${modelBadge.style}`}
                        title={isChecking ? "Verifying API Connection..." : "Click to Manage API Keys"}
                    >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${modelBadge.dot}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-wider leading-none mt-[1px]">
                            {modelBadge.label}
                        </span>
                    </button>

                    {/* STANDARD BADGE */}
                    <div className="flex items-center"><span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm uppercase tracking-wider backdrop-blur-sm transition-colors duration-300 ${badgeColorClass}`}>{displayBadge}</span></div>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
                {/* Privacy Shield Button */}
                <button 
                    onClick={() => toggleModal('privacy', true)} 
                    className={`p-2 rounded-xl transition-all active:scale-95 border ${isPrivacyActive ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 hover:bg-gray-100 border-transparent dark:hover:bg-slate-800'}`} 
                    title={isPrivacyActive ? "Privacy Shield Active" : "Configure Privacy Shield"}
                >
                    <Icon name="ShieldEye" size={20}/>
                </button>

                <div className="hidden lg:block"><FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir: 'increase' | 'decrease') => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} /></div>
                <button onClick={toggleDarkMode} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/></button>
                
                <button onClick={() => toggleModal('about', true)} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all" title="About & Release Notes"><Icon name="Info" size={18}/></button>
            </div>
        </header>
    );
};
