
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
    const { getActiveKey } = useKeyPool(); 

    const activeKeyProfile = getActiveKey();

    const isPrivacyActive = useMemo(() => Object.values(privacySettings).some(val => val === true), [privacySettings]);

    // --- SHARED STYLES ---
    const badgeBaseClass = "flex items-center justify-center gap-2 px-3 h-7 rounded-full border shadow-sm backdrop-blur-md transition-all duration-300";
    const textBaseClass = "text-[10px] font-black uppercase tracking-widest leading-none pt-px";

    // --- HELPER: GET MODEL NAME ---
    const activeModelName = useMemo(() => {
        if (!activeKeyProfile) return "OFFLINE";
        
        // Robust Fallback: If model is missing on key profile, assume 3.0 Pro (Standard)
        const rawModel = activeKeyProfile.activeModel || "gemini-3-pro-preview";
        const m = rawModel.toLowerCase();
        
        // --- SERIES 3 ---
        if (m.includes("gemini-3")) {
            if (m.includes("flash")) return "3.0 FLASH";
            return "3.0 PRO";
        }

        // --- SERIES 2.0 ---
        if (m.includes("gemini-2.0") || m.includes("gemini-2")) {
            if (m.includes("lite")) return "2.0 LITE";
            if (m.includes("flash")) return "2.0 FLASH";
            if (m.includes("pro")) return "2.0 PRO";
            if (m.includes("exp")) return "2.0 EXP";
        }

        // --- SERIES 1.5 ---
        if (m.includes("gemini-1.5")) {
            if (m.includes("flash")) return "1.5 FLASH";
            if (m.includes("pro")) return "1.5 PRO";
        }
        
        // --- GENERIC FALLBACKS ---
        if (m.includes("flash")) return "FLASH AI";
        if (m.includes("pro")) return "PRO AI";
        if (m.includes("ultra")) return "ULTRA AI";
        
        return "GEMINI AI";
    }, [activeKeyProfile]);

    // --- AI STATUS CONFIG ---
    const aiStatusConfig = useMemo(() => {
        if (!activeKeyProfile) return { 
            status: "offline",
            dotColor: "bg-slate-300 dark:bg-slate-600",
            borderColor: "border-slate-200 dark:border-slate-700 text-slate-500",
            tooltip: "AI Offline: No API Key Configured"
        };

        if (activeKeyProfile.status === 'valid') return {
            status: "online",
            dotColor: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse",
            borderColor: "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400",
            tooltip: `AI Ready: ${activeKeyProfile.activeModel || 'Default Model'}`
        };
        
        if (activeKeyProfile.status === 'quota_exceeded') return {
            status: "warning",
            dotColor: "bg-orange-500",
            borderColor: "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
            tooltip: "Quota Exceeded: Switching to backup model..."
        };

        return {
            status: "error",
            dotColor: "bg-red-500",
            borderColor: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
            tooltip: "Connection Error: Check API Key"
        };
    }, [activeKeyProfile]);

    // --- PRIVACY BADGE STYLE ---
    const privacyBadgeStyle = useMemo(() => {
        if (isPrivacyActive) {
            return "bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 shadow-[0_0_8px_rgba(16,185,129,0.1)]";
        }
        return "bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-80";
    }, [isPrivacyActive]);

    // --- STANDARD BADGE CONFIG ---
    const displayBadge = useMemo(() => {
        const currentStandardName = standards[standardKey]?.name || "";
        const match = currentStandardName.match(/\((.*?)\)/);
        return match ? match[1] : (currentStandardName.split(' ')[0] || 'ISO');
    }, [standardKey, standards]);

    const badgeColorClass = useMemo(() => {
        const text = displayBadge.toUpperCase();
        if (text.includes('EMS') || text.includes('14001')) return "bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50";
        if (text.includes('QMS') || text.includes('9001')) return "bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50";
        if (text.includes('ISMS') || text.includes('27001')) return "bg-purple-50/50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50";
        return "bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
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
                        ISO AUDITING TOOL <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-1.5 py-0.5 rounded text-xs align-middle ml-1 tracking-wider shadow-sm font-black border border-white/20 dark:border-slate-800/50">PRO</span>
                    </h1>

                    {/* --- UNIFIED BADGES --- */}
                    <div className="hidden lg:flex items-center gap-2">
                        {/* 1. Model Badge (READ ONLY) */}
                        <div 
                            className={`${badgeBaseClass} ${aiStatusConfig.borderColor} cursor-default select-none`}
                            title={aiStatusConfig.tooltip}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${aiStatusConfig.dotColor}`}></div>
                            <span className={textBaseClass}>{activeModelName}</span>
                        </div>

                        {/* 2. Privacy Shield Badge (ICON ONLY) */}
                        <div 
                            className={`${badgeBaseClass} ${privacyBadgeStyle}`}
                            title={isPrivacyActive ? "Privacy Shield: Active (Data Redacted)" : "Privacy Shield: Inactive"}
                        >
                            <Icon name="ShieldEye" size={14} className={isPrivacyActive ? "animate-pulse" : ""} />
                        </div>
                        
                        {/* 3. Standard Badge */}
                        <div className={`${badgeBaseClass} ${badgeColorClass}`}>
                            <Icon name="Book" size={12} className="opacity-70"/>
                            <span className={textBaseClass}>{displayBadge}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
                {/* Settings / Config Button (Gear Icon) */}
                <button 
                    onClick={() => toggleModal('settings', true)} 
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95" 
                    title="Settings & Configuration"
                >
                    <Icon name="Settings" size={18}/>
                </button>

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
