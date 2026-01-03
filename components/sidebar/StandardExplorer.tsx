
import React, { useState, useRef } from 'react';
import { Icon, IconInput } from '../UI';
import { Standard, Clause, Group } from '../../types';
import { useDebounce, copyToClipboard } from '../../utils';

interface StandardExplorerProps {
    standard: Standard | undefined;
    standardKey: string;
    selectedClauses: string[];
    setSelectedClauses: React.Dispatch<React.SetStateAction<string[]>>;
    onReferenceClause: (clause: Clause) => void;
    repairedIds: string[];
    onScrollTrigger?: () => void;
}

export const StandardExplorer: React.FC<StandardExplorerProps> = ({
    standard, standardKey, selectedClauses, setSelectedClauses, onReferenceClause, repairedIds, onScrollTrigger
}) => {
    const [searchQueryRaw, setSearchQueryRaw] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [expandedClauses, setExpandedClauses] = useState<string[]>([]);
    const [copiedClauseId, setCopiedClauseId] = useState<string | null>(null);
    
    const searchQuery = useDebounce(searchQueryRaw, 300);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const toggleGroupExpand = (id: string) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleClauseExpand = (id: string) => setExpandedClauses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const allGroupIds = standard?.groups.map(g => g.id) || [];
    const areAllGroupsExpanded = allGroupIds.length > 0 && expandedGroups.length === allGroupIds.length;

    const toggleExpandAll = () => {
        if (areAllGroupsExpanded) {
            setExpandedGroups([]);
        } else {
            setExpandedGroups(allGroupIds);
        }
    };

    const handleCopySelectedClauses = () => {
        if (!standard) return;
        const findClause = (id: string, list: Clause[]): Clause | undefined => {
            for (let c of list) { 
                if (c.id === id) return c; 
                if (c.subClauses) { 
                    const f = findClause(id, c.subClauses); 
                    if (f) return f; 
                } 
            }
        };
        const allClauses = standard.groups.flatMap(g => g.clauses);
        const selectedData = selectedClauses
            .map(id => findClause(id, allClauses))
            .filter((c): c is Clause => !!c)
            .map(c => `[${c.code}] ${c.title}`)
            .join('\n');
        copyToClipboard(selectedData);
    };

    const handleSingleClauseCopy = (e: React.MouseEvent, c: Clause) => {
        e.stopPropagation();
        copyToClipboard(`[${c.code}] ${c.title}`);
        setCopiedClauseId(c.id);
        setTimeout(() => setCopiedClauseId(null), 1500);
    };

    const toggleClauseSelection = (clause: Clause) => {
        const getAllIds = (c: Clause): string[] => {
            let ids = [c.id];
            if (c.subClauses) c.subClauses.forEach(sub => ids.push(...getAllIds(sub)));
            return ids;
        };
        const targetIds = getAllIds(clause);
        const allSelected = targetIds.every(id => selectedClauses.includes(id));
        setSelectedClauses(prev => allSelected ? prev.filter(id => !targetIds.includes(id)) : Array.from(new Set([...prev, ...targetIds])));
    };

    const toggleGroupSelection = (group: Group) => {
        const getAllIds = (list: Clause[]): string[] => {
            let ids: string[] = [];
            list.forEach(c => {
                ids.push(c.id);
                if (c.subClauses) ids.push(...getAllIds(c.subClauses));
            });
            return ids;
        };
        const groupIds = getAllIds(group.clauses);
        const allSelected = groupIds.every(id => selectedClauses.includes(id));
        
        if (allSelected) {
            setSelectedClauses(prev => prev.filter(id => !groupIds.includes(id)));
        } else {
            setSelectedClauses(prev => [...new Set([...prev, ...groupIds])]);
        }
    };

    const renderClauseItem = (c: Clause, level: number = 0) => {
        const hasSubs = c.subClauses && c.subClauses.length > 0;
        const isExpanded = expandedClauses.includes(c.id) || !!searchQuery;
        const isSelected = selectedClauses.includes(c.id);
        const getChildSelectionStatus = (item: Clause): { all: boolean, some: boolean } => {
            if (!item.subClauses) return { all: selectedClauses.includes(item.id), some: selectedClauses.includes(item.id) };
            const subRes = item.subClauses.map(getChildSelectionStatus);
            const all = selectedClauses.includes(item.id) && subRes.every(r => r.all);
            const some = selectedClauses.includes(item.id) || subRes.some(r => r.some);
            return { all, some };
        };
        const selection = getChildSelectionStatus(c);
        const isCopied = copiedClauseId === c.id;
        const isRepaired = repairedIds.includes(c.id);

        return (
            <div key={c.id} className={`flex flex-col transition-all duration-300 ${level > 0 ? 'ml-4 border-l-2 dark:border-slate-800' : ''}`}>
                <div className={`group flex items-start gap-3 p-2 rounded-xl transition-all duration-200 ease-soft cursor-pointer ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-900/30 translate-x-1' : isRepaired ? 'bg-emerald-50/80 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30' : 'hover:bg-gray-100/50 dark:hover:bg-slate-800/50 hover:translate-x-1 hover:shadow-sm'}`}>
                    <button onClick={(e) => { e.stopPropagation(); toggleClauseSelection(c); }} className={`mt-1 flex-shrink-0 transition-colors duration-200 ${selection.some ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-gray-300 dark:text-slate-600 hover:text-gray-400'}`}>
                        {selection.all ? <Icon name="CheckSquare" size={16}/> : selection.some ? <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center"><div className="w-2.5 h-0.5 bg-white"></div></div> : <Icon name="Square" size={16}/>}
                    </button>
                    <div 
                        className="flex-1 min-w-0" 
                        onClick={() => hasSubs ? toggleClauseExpand(c.id) : toggleClauseSelection(c)}
                    >
                        <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase shrink-0 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded">{c.code}</span>
                                <span className="text-sm text-slate-900 dark:text-slate-100 font-medium tracking-tight leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.title}</span>
                                {isRepaired && <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md animate-pulse">UPDATED</span>}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onReferenceClause(c); }} className="p-1 transition-all transform duration-300 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:scale-110" title="Reference original text">
                                    <Icon name="BookOpen" size={14} />
                                </button>
                                <button
                                    onClick={(e) => handleSingleClauseCopy(e, c)}
                                    className={`p-1 transition-all transform duration-300 ${isCopied ? 'text-emerald-500 scale-125 opacity-100' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110'}`}
                                    title={isCopied ? "Copied!" : "Copy Clause"}
                                >
                                    <Icon name={isCopied ? "CheckThick" : "Copy"} size={isCopied ? 20 : 14} />
                                </button>
                                {hasSubs && <Icon name="ChevronDown" size={12} className={`text-gray-400 mt-0.5 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}/>}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-1.5 leading-relaxed block w-full whitespace-normal border-t border-gray-100 dark:border-slate-800 pt-1">
                            {c.description}
                        </div>
                    </div>
                </div>
                {/* Smooth Accordion Animation using Grid */}
                <div className={`grid transition-all duration-300 ease-in-out ${hasSubs && isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        {hasSubs && <div className="mt-1 flex flex-col">{c.subClauses!.map(sub => renderClauseItem(sub, level + 1))}</div>}
                    </div>
                </div>
            </div>
        );
    };

    const getGroupColorClass = (title: string) => {
        const t = title.toUpperCase();
        if (t.includes('PLAN')) return 'bg-blue-600 dark:bg-blue-500 shadow-blue-500/20';
        if (t.includes('SUPPORT')) return 'bg-purple-600 dark:bg-purple-500 shadow-purple-500/20';
        if (t.includes('DO')) return 'bg-orange-600 dark:bg-orange-500 shadow-orange-500/20';
        if (t.includes('CHECK') || t.includes('ACT')) return 'bg-emerald-600 dark:bg-emerald-500 shadow-emerald-500/20';
        if (t.includes('ANNEX')) return 'bg-rose-600 dark:bg-rose-500 shadow-rose-500/20';
        return 'bg-slate-800 dark:bg-slate-700';
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/40 dark:bg-slate-950/40 w-full md:min-w-[390px]">
            <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center gap-1 bg-gray-100 dark:bg-slate-950 rounded-xl px-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                        <span className="text-blue-700 dark:text-blue-400 font-bold pl-1"><Icon name="Search" size={14}/></span>
                        <input className="w-full bg-transparent py-2 px-1 text-xs font-medium outline-none text-slate-800 dark:text-slate-200 placeholder-gray-400" placeholder="Search clauses..." value={searchQueryRaw} onChange={e => setSearchQueryRaw(e.target.value)}/>
                        
                        <button 
                            onClick={toggleExpandAll} 
                            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title={areAllGroupsExpanded ? "Collapse All Groups" : "Expand All Groups"}
                        >
                            <Icon name={areAllGroupsExpanded ? "CollapsePanel" : "ExpandPanel"} size={14}/>
                        </button>
                    </div>

                    {selectedClauses.length > 0 && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-right-5 duration-300">
                            <button onClick={handleCopySelectedClauses} className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 transition-colors relative shadow-sm border border-indigo-100 dark:border-indigo-900/30 hover:scale-105" title="Copy Selected Clauses">
                                <Icon name="Copy" size={16} />
                            </button>
                            <button onClick={() => setSelectedClauses([])} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors relative shadow-sm border border-red-100 dark:border-red-900/30 hover:scale-105" title="Clear All">
                                <Icon name="Trash2" size={16} />
                                <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-bounce">{selectedClauses.length}</div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto custom-scrollbar p-3 scroll-smooth"
                onScroll={(e) => {
                    const target = e.currentTarget;
                    if (target.scrollTop > 30 && onScrollTrigger) {
                        onScrollTrigger();
                    }
                }}
            >
                <div className="flex flex-col gap-4 pb-12">
                    {!standard ? (
                        <div className="text-center text-gray-400 mt-20 italic text-xs uppercase tracking-widest opacity-50">Select a Standard</div>
                    ) : (
                        standard.groups.map(g => {
                            const isGroupExpanded = expandedGroups.includes(g.id) || !!searchQuery;
                            const matchesSearch = (c: Clause): boolean => {
                                const term = searchQuery.toLowerCase();
                                return c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term) || (c.subClauses ? c.subClauses.some(matchesSearch) : false);
                            };
                            const filteredClauses = searchQuery ? g.clauses.filter(matchesSearch) : g.clauses;
                            if (filteredClauses.length === 0) return null;

                            return (
                                <div key={g.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-transparent dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleGroupExpand(g.id)}>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleGroupSelection(g); }}
                                                className={`p-2 rounded-xl shadow-lg text-white ${getGroupColorClass(g.title)} hover:scale-110 active:scale-95 transition-transform duration-300`}
                                                title="Click to Select/Deselect All in Group"
                                            >
                                                <Icon name={g.icon} size={14}/>
                                            </button>
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{g.title}</h4>
                                        </div>
                                        <Icon name="ChevronDown" size={12} className={`text-slate-400 transition-transform duration-300 ${isGroupExpanded ? 'rotate-180' : ''}`}/>
                                    </div>
                                    <div className={`grid transition-all duration-300 ease-in-out ${isGroupExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden bg-white dark:bg-slate-900">
                                             <div className="p-2 space-y-1">{filteredClauses.map(c => renderClauseItem(c))}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
