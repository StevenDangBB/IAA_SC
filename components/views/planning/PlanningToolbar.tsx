
import React, { useRef, useState } from 'react';
import { Icon } from '../../UI';

interface PlanningToolbarProps {
    standardName: string;
    coveragePercent: number;
    coverageCovered: number;
    coverageTotal: number;
    search: string;
    setSearch: (s: string) => void;
    onImport: (file: File) => void;
    onExportTemplate: () => void;
    onExportTxt: () => void;
    onSetSidebarOpen: (o: boolean) => void;
    hasStandard: boolean;
}

export const PlanningToolbar: React.FC<PlanningToolbarProps> = ({
    standardName, coveragePercent, coverageCovered, coverageTotal,
    search, setSearch, onImport, onExportTemplate, onExportTxt, onSetSidebarOpen, hasStandard
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Circle stats
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (coveragePercent / 100) * circumference;

    if (!hasStandard) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 m-4">
            <Icon name="Book" size={48} className="mb-4 opacity-20"/>
            <p className="font-bold text-slate-500">No Standard Selected</p>
            <button onClick={() => onSetSidebarOpen(true)} className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
                <Icon name="LayoutList" size={16}/> Select Standard
            </button>
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
            <div className="flex items-center gap-6">
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="transform -rotate-90 w-16 h-16">
                        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-slate-800" />
                        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-indigo-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-xs font-black text-slate-700 dark:text-white">{coveragePercent}%</span>
                </div>
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{standardName}</h3>
                    <p className="text-xs text-slate-500">
                        <span className="font-bold text-indigo-500">{coverageCovered}</span> of {coverageTotal} clauses mapped.
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64 group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Icon name="Search" size={16}/>
                    </div>
                    <input 
                        ref={searchInputRef}
                        className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-950 border border-indigo-100 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                        placeholder="Filter clauses..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button 
                            onClick={() => { setSearch(""); searchInputRef.current?.focus(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <Icon name="X" size={14} />
                        </button>
                    )}
                </div>
                
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => { if(e.target.files?.[0]) onImport(e.target.files[0]); e.target.value=''; }} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 transition-all hover:border-indigo-300 dark:hover:border-slate-600" title="Import Plan">
                    <Icon name="UploadCloud" size={18}/>
                </button>
                
                {/* Unified Export Button */}
                <div className="relative">
                    <button 
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="p-2.5 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 transition-all hover:border-indigo-300 dark:hover:border-slate-600 flex items-center gap-2"
                        title="Export Options"
                    >
                        <Icon name="Download" size={18}/>
                        <span className="text-xs font-bold hidden md:inline">Export</span>
                    </button>
                    
                    {showExportMenu && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)}></div>
                            <div className="absolute top-full right-0 mt-2 z-[60] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-3 py-2 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Select Export Format
                                </div>
                                <button 
                                    onClick={() => { onExportTemplate(); setShowExportMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
                                >
                                    <Icon name="Grid" size={16}/> JSON (Template)
                                </button>
                                <button 
                                    onClick={() => { onExportTxt(); setShowExportMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
                                >
                                    <Icon name="FileText" size={16}/> TXT (Scope Text)
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
