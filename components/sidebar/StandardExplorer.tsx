
import React, { useState } from 'react';
import { Icon } from '../UI';
import { Standard, Clause } from '../../types';
import { copyToClipboard } from '../../utils';

interface StandardExplorerProps {
    standard: Standard | undefined;
    standardKey: string;
    selectedClauses: string[]; // Kept for highlighting active context if needed, but not modification
    setSelectedClauses: React.Dispatch<React.SetStateAction<string[]>>; // Kept for API compat, but unused for toggling
    onReferenceClause: (clause: Clause) => void;
    repairedIds: string[];
    onScrollTrigger?: () => void;
}

export const StandardExplorer: React.FC<StandardExplorerProps> = ({
    standard, standardKey, onReferenceClause, repairedIds, onScrollTrigger
}) => {
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [expandedClauses, setExpandedClauses] = useState<string[]>([]);
    const [copiedClauseId, setCopiedClauseId] = useState<string | null>(null);
    
    const toggleGroupExpand = (id: string) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleClauseExpand = (id: string) => setExpandedClauses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleSingleClauseCopy = (e: React.MouseEvent, c: Clause) => {
        e.stopPropagation();
        copyToClipboard(`[${c.code}] ${c.title}`);
        setCopiedClauseId(c.id);
        setTimeout(() => setCopiedClauseId(null), 1500);
    };

    // Helper to restore distinctive colors for groups
    const getGroupStyle = (id: string) => {
        const key = id.toUpperCase();
        if (key.includes('PLAN')) return 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400';
        if (key.includes('SUPPORT')) return 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400';
        if (key.includes('DO')) return 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400';
        if (key.includes('CHECK') || key.includes('ACT')) return 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
        if (key.includes('ANNEX')) return 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400';
        return 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/30 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300';
    };

    const renderClauseItem = (c: Clause, level: number = 0) => {
        const hasSubs = c.subClauses && c.subClauses.length > 0;
        const isExpanded = expandedClauses.includes(c.id);
        const isCopied = copiedClauseId === c.id;
        const isRepaired = repairedIds.includes(c.id);

        return (
            <div key={c.id} className={`flex flex-col transition-all duration-300 ${level > 0 ? 'ml-3 pl-3 border-l dark:border-slate-800' : ''}`}>
                <div 
                    className={`group flex items-start gap-2 p-1.5 rounded-lg transition-all duration-200 ease-soft cursor-pointer ${isRepaired ? 'bg-emerald-50/80 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30' : 'hover:bg-gray-100/80 dark:hover:bg-slate-800/50'}`}
                    onClick={() => hasSubs && toggleClauseExpand(c.id)}
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase shrink-0 px-1.5 py-0.5 rounded border ${level === 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' : 'bg-transparent border-transparent text-slate-400'}`}>
                                    {c.code}
                                </span>
                                <span className={`text-xs font-medium tracking-tight leading-tight ${level === 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {c.title}
                                </span>
                                {isRepaired && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded animate-pulse">FIX</span>}
                            </div>
                            
                            {/* Hover Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); onReferenceClause(c); }} className="p-1 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded" title="Read Content">
                                    <Icon name="BookOpen" size={12} />
                                </button>
                                <button
                                    onClick={(e) => handleSingleClauseCopy(e, c)}
                                    className={`p-1 ${isCopied ? 'text-emerald-500' : 'text-slate-400 hover:text-indigo-500'} hover:bg-gray-100 dark:hover:bg-slate-800 rounded`}
                                    title="Copy Title"
                                >
                                    <Icon name={isCopied ? "CheckThick" : "Copy"} size={12} />
                                </button>
                                {hasSubs && <Icon name="ChevronDown" size={10} className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}/>}
                            </div>
                        </div>
                        {level === 0 && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5 line-clamp-2">
                                {c.description}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Accordion Body */}
                {hasSubs && isExpanded && (
                    <div className="mt-0.5 flex flex-col animate-accordion-down overflow-hidden">
                        {c.subClauses!.map(sub => renderClauseItem(sub, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-950 w-full md:min-w-[390px]">
            <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Icon name="Book" size={12}/> Reference Explorer
                    </span>
                    <span className="text-[9px] text-slate-300 bg-slate-100 dark:bg-slate-800 dark:text-slate-600 px-1.5 py-0.5 rounded">
                        Read-Only
                    </span>
                </div>
            </div>
            
            <div 
                className="flex-1 overflow-y-auto custom-scrollbar p-3 scroll-smooth"
                onScroll={(e) => {
                    if (e.currentTarget.scrollTop > 30 && onScrollTrigger) onScrollTrigger();
                }}
            >
                <div className="flex flex-col gap-3 pb-12">
                    {!standard ? (
                        <div className="text-center text-slate-400 mt-20 italic text-xs uppercase tracking-widest opacity-50">Select a Standard</div>
                    ) : (
                        standard.groups.map(g => {
                            const isGroupExpanded = expandedGroups.includes(g.id);
                            const groupColorStyle = getGroupStyle(g.id);

                            return (
                                <div key={g.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-all duration-300">
                                    <div 
                                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors select-none ${groupColorStyle}`} 
                                        onClick={() => toggleGroupExpand(g.id)}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-lg bg-white/60 dark:bg-black/20 shadow-sm">
                                                <Icon name={g.icon} size={14}/>
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-wider opacity-90">{g.title}</h4>
                                        </div>
                                        <Icon name="ChevronDown" size={12} className={`transition-transform duration-300 opacity-60 ${isGroupExpanded ? 'rotate-180' : ''}`}/>
                                    </div>
                                    
                                    {isGroupExpanded && (
                                        <div className="p-2 space-y-1 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 animate-accordion-down">
                                             {g.clauses.map(c => renderClauseItem(c))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
