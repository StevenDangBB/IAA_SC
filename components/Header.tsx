
import React, { useMemo } from 'react';
import { Icon, FontSizeController } from './UI';
import { useUI } from '../contexts/UIContext';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';

export const Header: React.FC = () => {
    const { 
        isSidebarOpen, setSidebarOpen, 
        toggleModal, fontSizeScale, setFontSizeScale, 
        isDarkMode, toggleDarkMode 
    } = useUI();
    
    const { standards, standardKey, privacySettings } = useAudit();
    const { getActiveKey, apiKeys } = useKeyPool(); // Added apiKeys to dependency check if needed

    const activeKeyProfile = getActiveKey();

    const isPrivacyActive = useMemo(() => Object.values(privacySettings).some(val => val === true), [privacySettings]);

    // --- AI BADGE LOGIC ---
    const aiStatusConfig = useMemo(() => {
        if (!activeKeyProfile) return { 
            text: "AI OFFLINE", 
            color: "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700",
            dot: "bg-slate-400",
            icon: "WifiOff"
        };

        const modelRaw = activeKeyProfile.activeModel || "Unknown";
        let modelDisplay = "GEMINI";
        
        if (modelRaw.includes("2.0-flash")) modelDisplay = "FLASH 2.0";
        else if (modelRaw.includes("1.5-flash")) modelDisplay = "FLASH 1.5";
        else if (modelRaw.includes("3-pro")) modelDisplay = "PRO 3.0";
        else if (modelRaw.includes("1.5-pro")) modelDisplay = "PRO 1.5";

        if (activeKeyProfile.status === 'valid') return {
            text: modelDisplay,
            color: "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 ring-1 ring-cyan-500/20",
            dot: "bg-emerald-500 animate-pulse",
            icon: "Sparkle"
        };
        
        if (activeKeyProfile.status === 'quota_exceeded') return {
            text: "QUOTA LIMIT",
            color: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
            dot: "bg-orange-500",
            icon: "AlertCircle"
        };

        return {
            text: "KEY ERROR",
            color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
            dot: "bg-red-500",
            icon: "X"
        };
    }, [activeKeyProfile]);

    const displayBadge = useMemo(() => {
        const currentStandardName = standards[standardKey]?.name || "";
        const match = currentStandardName.match(/\((.*?)\)/);
        return match ? match[1] : (currentStandardName.split(' ')[0] || 'ISO');
    }, [standardKey, standards]);

    const badgeColorClass = useMemo(() => {
        const text = displayBadge.toUpperCase();
        if (text.includes('EMS') || text.includes('14001')) return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
        if (text.includes('QMS') || text.includes('9001')) return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
        if (text.includes('ISMS') || text.includes('27001')) return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
        return "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800";
    }, [displayBadge]);

    return (
        <header className="flex-shrink-0 px-4 md:px-6 py-0 border-b border-white/50 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl shadow-glass z-[70] relative flex justify-between items-center h-16 transition-all duration-300">
            {/* Left: Brand & Sidebar Toggle */}
            <div className="flex items-center h-full gap-4 md:gap-6">
                <div 
                    className="relative group cursor-pointer flex items-center justify-center active:scale-95 transition-transform" 
                    onClick={() => setSidebarOpen(!isSidebarOpen)} 
                    title="Toggle Sidebar"
                >
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        {isSidebarOpen ? (
                            <div className="relative w-8 h-8">
                                <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-cyan-500 rounded-full animate-infinity-spin drop-shadow-md"></div>
                                <div className="absolute inset-2 border-2 border-transparent border-l-purple-500 border-r-pink-500 rounded-full animate-spin-reverse drop-shadow-sm"></div>
                            </div>
                        ) : (
                            <div className="transform group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                                <Icon name="TDLogo" size={32} />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <h1 className="hidden md:block text-lg font-extrabold tracking-tight text-slate-800 dark:text-white leading-none">
                        ISO Audit <span className="font-light text-slate-400">Pro</span>
                    </h1>

                    {/* --- NEW AI STATUS BADGE --- */}
                    <div 
                        onClick={() => toggleModal('settings', true)}
                        className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-300 ${aiStatusConfig.color}`}
                        title={`AI Engine Status: ${activeKeyProfile?.status || 'Offline'} (Click to Config)`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${aiStatusConfig.dot}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">{aiStatusConfig.text}</span>
                        {aiStatusConfig.icon === 'Sparkle' && <Icon name="Sparkle" size={10} className="animate-pulse-slow"/>}
                    </div>
                    
                    {/* Standard Badge */}
                    <div className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm uppercase tracking-wider transition-colors duration-300 ${badgeColorClass}`}>
                        {displayBadge}
                    </div>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => toggleModal('privacy', true)} 
                    className={`p-2 rounded-xl transition-all active:scale-95 border ${isPrivacyActive ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border-transparent dark:hover:bg-slate-800'}`} 
                    title={isPrivacyActive ? "Privacy Shield Active" : "Configure Privacy Shield"}
                >
                    <Icon name="ShieldEye" size={18}/>
                </button>

                <div className="hidden lg:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                <div className="hidden lg:block">
                    <FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir: 'increase' | 'decrease') => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} />
                </div>
                
                <button 
                    onClick={toggleDarkMode} 
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                    <Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/>
                </button>
                
                <button 
                    onClick={() => toggleModal('settings', true)} 
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all active:scale-95" 
                    title="Settings"
                >
                    <Icon name="Settings" size={18}/>
                </button>
                
                <button 
                    onClick={() => toggleModal('about', true)} 
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all active:scale-95" 
                    title="About & Release Notes"
                >
                    <Icon name="Info" size={18}/>
                </button>
            </div>
        </header>
    );
};
