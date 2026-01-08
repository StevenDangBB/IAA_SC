
import React, { useState, useMemo, useRef, memo } from 'react';
import { Icon } from '../UI';
import { useAudit } from '../../contexts/AuditContext';
import { Clause } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { cleanFileName, copyToClipboard } from '../../utils';

// --- INTERNAL TYPES ---
interface PlanningRowProps {
    clause: Clause;
    level: number;
    processes: any[];
    isExpanded: boolean;
    onToggleDescription: (id: string) => void;
    onCopyCitation: (text: string) => void;
    onTogglePlan: (procId: string, clauseId: string) => void;
    checkIsPlanned: (procId: string, clauseId: string) => boolean;
}

// --- MEMOIZED ROW COMPONENT ---
const PlanningRow = memo(({ 
    clause, level, processes, isExpanded, onToggleDescription, onCopyCitation, onTogglePlan, checkIsPlanned 
}: PlanningRowProps) => {
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
            <td className="p-2 border-r border-gray-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/30 z-10 align-top">
                <div className={`flex flex-col gap-1 ${level > 0 ? 'ml-4 border-l-2 border-gray-200 dark:border-slate-800 pl-2' : ''}`}>
                    <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${level === 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>
                            {clause.code}
                        </span>
                        <span className={`text-xs truncate ${level === 0 ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                            {clause.title}
                        </span>
                    </div>
                    
                    {level === 0 && (
                        <div className="relative group/desc pr-4">
                            <div 
                                onClick={() => onToggleDescription(clause.id)}
                                className={`text-[10px] text-slate-500 dark:text-slate-400 mt-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-serif italic text-left whitespace-pre-wrap leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}
                                title="Click to toggle full text"
                            >
                                {clause.description}
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onCopyCitation(clause.description); }}
                                className="absolute top-0 right-0 opacity-0 group-hover/desc:opacity-100 transition-opacity p-1 text-slate-400 hover:text-indigo-600 bg-white/80 dark:bg-slate-900/80 rounded"
                                title="Copy Citation"
                            >
                                <Icon name="Copy" size={12}/>
                            </button>
                        </div>
                    )}
                </div>
            </td>
            {processes.map(p => {
                const active = checkIsPlanned(p.id, clause.id);
                return (
                    <td key={`${p.id}_${clause.id}`} className="p-1 text-center border-r border-gray-50 dark:border-slate-800/50 last:border-0 relative align-middle">
                        <div className="flex justify-center">
                            <button
                                onClick={() => onTogglePlan(p.id, clause.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                    active 
                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 transform scale-105' 
                                        : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-300'
                                }`}
                                title={active ? "Planned" : "Click to Plan"}
                            >
                                {active && <Icon name="CheckThick" size={14}/>}
                            </button>
                        </div>
                    </td>
                );
            })}
        </tr>
    );
}, (prev, next) => {
    // Custom comparison for performance: Only re-render if expanded state changes OR planning state changes
    if (prev.isExpanded !== next.isExpanded) return false;
    if (prev.processes.length !== next.processes.length) return false;
    
    // Deep check if planning state changed for this specific clause across processes
    // This is expensive but cheaper than re-rendering the DOM
    const prevPlanned = prev.processes.map(p => prev.checkIsPlanned(p.id, prev.clause.id));
    const nextPlanned = next.processes.map(p => next.checkIsPlanned(p.id, next.clause.id));
    
    return JSON.stringify(prevPlanned) === JSON.stringify(nextPlanned);
});


export const PlanningView = () => {
    const { 
        standards, standardKey, processes, 
        addProcess, batchUpdateProcessClauses, toggleProcessClause
    } = useAudit();
    
    const { showToast, setSidebarOpen } = useUI();
    const [search, setSearch] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Collapsible States
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
    
    // UI State for Export Menu
    const [showExportMenu, setShowExportMenu] = useState(false);

    const currentStandard = standards[standardKey];

    // Helper: Restore distinctive colors for groups
    const getGroupStyle = (id: string) => {
        const key = id.toUpperCase();
        if (key.includes('PLAN')) return 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
        if (key.includes('SUPPORT')) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
        if (key.includes('DO')) return 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
        if (key.includes('CHECK') || key.includes('ACT')) return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        if (key.includes('ANNEX')) return 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
        return 'bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-700';
    };

    // Flatten logic that preserves hierarchy level
    const getGroupClauses = useMemo(() => (clauses: Clause[]) => {
        const flat: { clause: Clause, level: number }[] = [];
        const traverse = (list: Clause[], level: number) => {
            list.forEach(c => {
                flat.push({ clause: c, level });
                if(c.subClauses) traverse(c.subClauses, level + 1);
            });
        };
        traverse(clauses, 0);
        return flat;
    }, []); // Stable reference

    // Optimized Planner Check
    const checkIsPlanned = React.useCallback((processId: string, clauseId: string) => {
        const proc = processes.find(p => p.id === processId);
        return proc ? !!proc.matrixData[clauseId] : false;
    }, [processes]);

    const handleToggle = React.useCallback((processId: string, clauseId: string) => {
        toggleProcessClause(processId, clauseId);
    }, [toggleProcessClause]);

    const handleGroupToggle = (e: React.MouseEvent, processId: string, clausesInGroup: Clause[]) => {
        e.stopPropagation();
        const flatIds: string[] = [];
        const traverse = (list: Clause[]) => list.forEach(c => {
            flatIds.push(c.id);
            if(c.subClauses) traverse(c.subClauses);
        });
        traverse(clausesInGroup);

        const proc = processes.find(p => p.id === processId);
        if (!proc) return;

        const allSelected = flatIds.every(cid => !!proc.matrixData[cid]);
        
        if (allSelected) {
            flatIds.forEach(cid => {
                if (proc.matrixData[cid]) toggleProcessClause(processId, cid);
            });
        } else {
            const toAdd = flatIds.filter(cid => !proc.matrixData[cid]);
            batchUpdateProcessClauses([{ processId, clauses: toAdd }]);
        }
    };

    const toggleGroupCollapse = (groupId: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const toggleDescriptionExpand = React.useCallback((clauseId: string) => {
        setExpandedDescriptions(prev => {
            const next = new Set(prev);
            if (next.has(clauseId)) next.delete(clauseId);
            else next.add(clauseId);
            return next;
        });
    }, []);

    const handleCopyDescription = React.useCallback((text: string) => {
        copyToClipboard(text);
        showToast("Citation copied!");
    }, [showToast]);

    // --- Toggle All Logic ---
    const areAllCollapsed = useMemo(() => {
        if (!currentStandard) return false;
        return currentStandard.groups.every(g => collapsedGroups.has(g.id));
    }, [currentStandard, collapsedGroups]);

    const handleToggleAll = () => {
        if (!currentStandard) return;
        const allGroupIds = currentStandard.groups.map(g => g.id);
        
        if (areAllCollapsed) {
            setCollapsedGroups(new Set());
        } else {
            setCollapsedGroups(new Set(allGroupIds));
        }
    };

    // Coverage Stats Logic
    const coverageStats = useMemo(() => {
        if (!currentStandard) return { percent: 0, covered: 0, total: 0 };
        let total = 0;
        const traverse = (list: Clause[]) => list.forEach(c => { total++; if(c.subClauses) traverse(c.subClauses); });
        currentStandard.groups.forEach(g => traverse(g.clauses));
        
        if (total === 0) return { percent: 0, covered: 0, total: 0 };

        const coveredSet = new Set<string>();
        processes.forEach(p => {
            Object.keys(p.matrixData).forEach(cid => coveredSet.add(cid));
        });
        
        return {
            percent: Math.round((coveredSet.size / total) * 100),
            covered: coveredSet.size,
            total: total
        };
    }, [currentStandard, processes]);

    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (coverageStats.percent / 100) * circumference;

    // Filter Logic
    const filteredGroups = useMemo(() => {
        if (!currentStandard) return [];
        if (!search) return currentStandard.groups;

        const term = search.toLowerCase();
        return currentStandard.groups.map(g => {
            const matchingClauses = g.clauses.filter(c => {
                const matchSelf = c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term);
                const matchSub = c.subClauses?.some(s => s.code.toLowerCase().includes(term) || s.title.toLowerCase().includes(term));
                return matchSelf || matchSub;
            });
            return matchingClauses.length > 0 ? { ...g, clauses: matchingClauses } : null;
        }).filter(g => g !== null) as typeof currentStandard.groups;
    }, [currentStandard, search]);


    // --- Export/Import Handlers ---
    const handleExportTemplate = () => {
        if (processes.length === 0) { showToast("No processes to export."); return; }
        const templateData = processes.map(p => ({ name: p.name, clauses: Object.keys(p.matrixData) }));
        const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${cleanFileName(currentStandard.name)}_Plan.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("JSON Template exported.");
        setShowExportMenu(false);
    };

    const handleExportTxt = () => {
        if (processes.length === 0) { showToast("No data to export."); return; }
        
        const codeMap: Record<string, string> = {};
        const traverse = (list: Clause[]) => list.forEach(c => {
            codeMap[c.id] = c.code;
            if(c.subClauses) traverse(c.subClauses);
        });
        currentStandard?.groups.forEach(g => traverse(g.clauses));

        let output = "";
        processes.forEach(p => {
            const clauses = Object.keys(p.matrixData)
                .map(id => codeMap[id] || id) 
                .sort((a,b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            
            if (clauses.length > 0) {
                output += `Process: ${p.name}\n`;
                output += `List chosen clause: [${clauses.join(', ')}]\n\n`;
            }
        });

        const blob = new Blob([output], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${cleanFileName(currentStandard.name)}_Scope.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("TXT Scope exported.");
        setShowExportMenu(false);
    };

    const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const content = ev.target?.result as string;
                const templateData = JSON.parse(content);
                if (!Array.isArray(templateData)) throw new Error("Invalid format");
                
                templateData.forEach((item: any) => {
                    if (item.name) addProcess(item.name); 
                });
                showToast(`Imported ${templateData.length} processes structure.`);
            } catch (err) { showToast("Import failed."); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    if (!currentStandard) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 m-4">
            <Icon name="Book" size={48} className="mb-4 opacity-20"/>
            <p className="font-bold text-slate-500">No Standard Selected</p>
            <button onClick={() => setSidebarOpen(true)} className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
                <Icon name="LayoutList" size={16}/> Select Standard
            </button>
        </div>
    );

    return (
        <div className="h-full flex flex-col animate-fade-in-up gap-4 relative">
            
            {/* Header / Stats */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="transform -rotate-90 w-16 h-16">
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-slate-800" />
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-indigo-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-xs font-black text-slate-700 dark:text-white">{coverageStats.percent}%</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{currentStandard.name}</h3>
                        <p className="text-xs text-slate-500">
                            <span className="font-bold text-indigo-500">{coverageStats.covered}</span> of {coverageStats.total} clauses mapped.
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
                    
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportTemplate} />
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
                                {/* Z-INDEX INCREASED TO [60] TO OVERLAP STICKY TABLE HEADERS */}
                                <div className="absolute top-full right-0 mt-2 z-[60] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Select Export Format
                                    </div>
                                    <button 
                                        onClick={handleExportTemplate}
                                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
                                    >
                                        <Icon name="Grid" size={16}/> JSON (Template)
                                    </button>
                                    <button 
                                        onClick={handleExportTxt}
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

            {/* MATRIX CONTAINER */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm relative flex flex-col">
                {processes.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <p className="mb-4">No processes defined.</p>
                        <div className="p-4 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500">
                            Create processes in the sidebar to begin planning.
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-slate-950 sticky top-0 z-30 shadow-sm">
                                <tr>
                                    {/* HEADER CELL - CLICKABLE TOGGLE */}
                                    <th 
                                        className="p-3 border-b border-r border-gray-200 dark:border-slate-800 sticky left-0 bg-gray-50 dark:bg-slate-950 z-40 min-w-[300px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group select-none"
                                        onClick={handleToggleAll}
                                        title={areAllCollapsed ? "Click to Expand All" : "Click to Collapse All"}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                Clause Reference
                                            </span>
                                        </div>
                                    </th>
                                    {processes.map(p => (
                                        <th key={p.id} className="p-3 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800 min-w-[120px] text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="truncate max-w-[100px]" title={p.name}>{p.name}</span>
                                                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-md shadow-indigo-500/30">
                                                    {Object.keys(p.matrixData).length}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                                {filteredGroups.map(group => {
                                    const isCollapsed = collapsedGroups.has(group.id);
                                    const groupStyle = getGroupStyle(group.id);
                                    const groupFlatList = getGroupClauses(group.clauses);

                                    return (
                                        <React.Fragment key={group.id}>
                                            {/* GROUP HEADER ROW */}
                                            <tr className={`sticky z-20 hover:brightness-95 transition-all ${groupStyle}`}>
                                                <td 
                                                    className="p-2 border-r border-black/5 dark:border-white/5 font-black text-xs uppercase tracking-widest sticky left-0 z-20 bg-inherit shadow-sm cursor-pointer"
                                                    onClick={() => toggleGroupCollapse(group.id)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Icon name={group.icon} size={14} className="opacity-70"/>
                                                            {group.title}
                                                        </div>
                                                        <Icon name="ChevronDown" size={14} className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}/>
                                                    </div>
                                                </td>
                                                {processes.map(p => {
                                                    // Determine check state for this process in this group
                                                    const flatIds: string[] = [];
                                                    const traverse = (list: Clause[]) => list.forEach(c => { flatIds.push(c.id); if(c.subClauses) traverse(c.subClauses); });
                                                    traverse(group.clauses);
                                                    const proc = processes.find(proc => proc.id === p.id);
                                                    const allSelected = proc ? flatIds.every(cid => !!proc.matrixData[cid]) : false;

                                                    return (
                                                        <td key={`group_action_${p.id}_${group.id}`} className="p-2 text-center bg-inherit">
                                                            {!isCollapsed && (
                                                                <button 
                                                                    onClick={(e) => handleGroupToggle(e, p.id, group.clauses)}
                                                                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
                                                                    title={allSelected ? "Deselect Group" : "Select Entire Group"}
                                                                >
                                                                    <Icon name={allSelected ? "CheckSquare" : "Square"} size={16} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* CLAUSE ROWS */}
                                            {!isCollapsed && groupFlatList.map(({ clause, level }) => (
                                                <PlanningRow 
                                                    key={clause.id}
                                                    clause={clause}
                                                    level={level}
                                                    processes={processes}
                                                    isExpanded={expandedDescriptions.has(clause.id)}
                                                    onToggleDescription={toggleDescriptionExpand}
                                                    onCopyCitation={handleCopyDescription}
                                                    onTogglePlan={handleToggle}
                                                    checkIsPlanned={checkIsPlanned}
                                                />
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
