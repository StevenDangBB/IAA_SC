
import React, { useState, useMemo, useRef, memo, useCallback } from 'react';
import { Icon } from '../UI';
import { useAudit } from '../../contexts/AuditContext';
import { Clause } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { cleanFileName } from '../../utils';
import { TABS_CONFIG } from '../../constants';

// --- INTERNAL TYPES ---
interface PlanningRowProps {
    clause: Clause;
    level: number;
    processes: any[];
    onSmartToggle: (procId: string, clause: Clause) => void; 
}

// --- HELPER: Get all descendant IDs ---
const getFlatClauseIds = (clause: Clause): string[] => {
    let ids = [clause.id];
    if (clause.subClauses) {
        clause.subClauses.forEach(sub => {
            ids = [...ids, ...getFlatClauseIds(sub)];
        });
    }
    return ids;
};

// --- MEMOIZED ROW COMPONENT ---
const PlanningRow = memo(({ 
    clause, level, processes, onSmartToggle 
}: PlanningRowProps) => {
    
    const selfAndDescendants = useMemo(() => getFlatClauseIds(clause), [clause]);
    const isParent = clause.subClauses && clause.subClauses.length > 0;

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group duration-300 ease-fluid">
            <td className="p-2 border-r border-gray-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/30 z-10 align-top transition-colors duration-300 ease-fluid">
                <div className={`flex flex-col gap-1 ${level > 0 ? 'ml-4 border-l-2 border-gray-200 dark:border-slate-800 pl-2' : ''}`}>
                    <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${level === 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700' : 'text-slate-400'}`}>
                            {clause.code}
                        </span>
                        <span className={`text-xs truncate ${level === 0 ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                            {clause.title}
                        </span>
                    </div>
                </div>
            </td>
            {processes.map(p => {
                let status: 'all' | 'some' | 'none' = 'none';
                
                if (isParent) {
                    const activeCount = selfAndDescendants.reduce((acc, id) => acc + (p.matrixData[id] ? 1 : 0), 0);
                    if (activeCount === selfAndDescendants.length) status = 'all';
                    else if (activeCount > 0) status = 'some';
                } else {
                    status = p.matrixData[clause.id] ? 'all' : 'none';
                }

                return (
                    <td key={`${p.id}_${clause.id}`} className="p-1 text-center border-r border-gray-50 dark:border-slate-800/50 last:border-0 relative align-middle">
                        <div className="flex justify-center">
                            <button
                                onClick={() => onSmartToggle(p.id, clause)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ease-spring ${
                                    status === 'all' 
                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 transform scale-105' 
                                        : status === 'some'
                                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500 border border-orange-200 dark:border-orange-800'
                                            : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-300'
                                }`}
                                title={status === 'all' ? "Fully Planned" : status === 'some' ? "Partially Planned (Click to Fill)" : "Click to Plan"}
                            >
                                {status === 'all' && (isParent ? <Icon name="CheckCircle2" size={14}/> : <Icon name="CheckThick" size={14}/>)}
                                {status === 'some' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>}
                            </button>
                        </div>
                    </td>
                );
            })}
        </tr>
    );
}, (prev, next) => {
    if (prev.processes.length !== next.processes.length) return false;
    
    const hasChange = prev.processes.some((pp, idx) => {
        const np = next.processes[idx];
        return pp.matrixData !== np.matrixData;
    });
    
    return !hasChange; 
});


export const PlanningView = () => {
    const { 
        standards, standardKey, processes, 
        addProcess, batchUpdateProcessClauses, toggleProcessClause
    } = useAudit();
    
    const { showToast, setSidebarOpen } = useUI();
    const [search, setSearch] = useState("");
    const [exportLang, setExportLang] = useState<'en' | 'vi'>('en');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    const currentStandard = standards[standardKey];
    
    // --- COLOR THEME SYNC ---
    const themeConfig = TABS_CONFIG.find(t => t.id === 'planning')!;

    const getPDCAStyle = (groupId: string) => {
        const key = groupId.toUpperCase();
        if (key.includes('PLAN')) return 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-l-4 border-orange-500';
        if (key.includes('SUPPORT')) return 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-l-4 border-blue-500';
        if (key.includes('DO')) return 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-l-4 border-cyan-500';
        if (key.includes('CHECK') || key.includes('ACT')) return 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-l-4 border-emerald-500';
        if (key.includes('ANNEX')) return 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-l-4 border-purple-500';
        return `${themeConfig.bgSoft} border-l-4 ${themeConfig.borderClass} ${themeConfig.textClass}`;
    };

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
    }, []); 

    const handleSmartToggle = useCallback((processId: string, clause: Clause) => {
        const proc = processes.find(p => p.id === processId);
        if (!proc) return;

        const allIds = getFlatClauseIds(clause);
        const isGroup = allIds.length > 1;

        if (!isGroup) {
            toggleProcessClause(processId, clause.id);
        } else {
            const activeCount = allIds.reduce((acc, id) => acc + (proc.matrixData[id] ? 1 : 0), 0);
            const isFullyActive = activeCount === allIds.length;

            if (isFullyActive) {
                allIds.forEach(id => {
                    if (proc.matrixData[id]) toggleProcessClause(processId, id);
                });
            } else {
                const toAdd = allIds.filter(id => !proc.matrixData[id]);
                if (toAdd.length > 0) {
                    batchUpdateProcessClauses([{ processId, clauses: toAdd }]);
                }
            }
        }
    }, [processes, toggleProcessClause, batchUpdateProcessClauses]);

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
        if (exportLang === 'vi') output += `NGÀY XUẤT: ${new Date().toLocaleDateString('vi-VN')}\nTIÊU CHUẨN: ${currentStandard.name}\n====================\n\n`;
        else output += `EXPORT DATE: ${new Date().toLocaleDateString()}\nSTANDARD: ${currentStandard.name}\n====================\n\n`;

        processes.forEach(p => {
            const clauses = Object.keys(p.matrixData)
                .map(id => codeMap[id] || id) 
                .sort((a,b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            
            if (clauses.length > 0) {
                output += `${exportLang === 'vi' ? 'QUY TRÌNH' : 'PROCESS'}: ${p.name}\n`;
                output += `${exportLang === 'vi' ? 'ĐIỀU KHOẢN' : 'SCOPE'}: [${clauses.join(', ')}]\n\n`;
            }
        });

        const blob = new Blob([output], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${cleanFileName(currentStandard.name)}_Scope_${exportLang}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`TXT Scope exported (${exportLang.toUpperCase()}).`);
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

    const handleSelectStandardFocus = () => {
        setSidebarOpen(true);
        setTimeout(() => {
            const el = document.getElementById('sidebar-standard-select');
            if (el) {
                el.focus();
                try {
                    if ('showPicker' in el) {
                        (el as any).showPicker();
                    } else {
                        el.click(); 
                    }
                } catch (e) {}
            }
        }, 300);
    };

    if (!currentStandard) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 m-4 animate-fade-in-up">
            <Icon name="Book" size={48} className="mb-4 opacity-20"/>
            <p className="font-bold text-slate-500">No Standard Selected</p>
            <button onClick={handleSelectStandardFocus} className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
                <Icon name="LayoutList" size={16}/> Select Standard
            </button>
        </div>
    );

    return (
        <div className="h-full flex flex-col animate-fade-in-up gap-4 relative">
            
            {/* Header / Stats */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 transition-colors duration-500 ease-fluid">
                <div className="flex items-center gap-6">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="transform -rotate-90 w-16 h-16">
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-slate-800" />
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${themeConfig.textClass.replace('text-', 'text-opacity-80 ')} transition-all duration-1000 ease-out`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-xs font-black text-slate-700 dark:text-white">{coverageStats.percent}%</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{currentStandard.name}</h3>
                        <p className="text-xs text-slate-500">
                            <span className={`font-bold ${themeConfig.textClass}`}>{coverageStats.covered}</span> of {coverageStats.total} clauses mapped.
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
                    
                    <button 
                        onClick={handleExportTemplate}
                        className="p-2.5 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 transition-all hover:border-indigo-300 dark:hover:border-slate-600 flex items-center gap-2"
                        title="Export Template (JSON)"
                    >
                        <Icon name="Grid" size={18}/>
                        <span className="text-xs font-bold hidden md:inline">Template</span>
                    </button>
                </div>
            </div>

            {/* MATRIX CONTAINER - THEMED BORDER TOP */}
            <div className={`flex-1 bg-white dark:bg-slate-900 rounded-2xl border ${themeConfig.borderClass.replace('border-', 'border-opacity-30 border-')} border-t-4 border-t-${themeConfig.borderClass.replace('border-', '')} dark:border-slate-800 overflow-hidden shadow-sm relative flex flex-col transition-colors duration-500 ease-fluid`}>
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
                            <thead className={`${themeConfig.bgSoft.replace('50', '50/80')} dark:bg-slate-950 sticky top-0 z-30 shadow-sm backdrop-blur-sm transition-colors duration-500 ease-fluid`}>
                                <tr>
                                    <th 
                                        className={`p-3 border-b border-r border-gray-200 dark:border-slate-800 sticky left-0 z-40 min-w-[300px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group select-none ${themeConfig.bgSoft}`}
                                        onClick={handleToggleAll}
                                        title={areAllCollapsed ? "Click to Expand All" : "Click to Collapse All"}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${themeConfig.textClass}`}>
                                                Clause Reference
                                            </span>
                                        </div>
                                    </th>
                                    {processes.map(p => (
                                        <th key={p.id} className={`p-3 text-[10px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-slate-800 min-w-[120px] text-center ${themeConfig.textClass}`}>
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="truncate max-w-[100px]" title={p.name}>{p.name}</span>
                                                <span className="text-[10px] font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full shadow-sm">
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
                                    const groupStyle = getPDCAStyle(group.id); 
                                    const groupFlatList = getGroupClauses(group.clauses);

                                    return (
                                        <React.Fragment key={group.id}>
                                            <tr className={`sticky z-20 hover:brightness-95 transition-all duration-500 ease-fluid ${groupStyle}`}>
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

                                            {!isCollapsed && groupFlatList.map(({ clause, level }) => (
                                                <PlanningRow 
                                                    key={clause.id}
                                                    clause={clause}
                                                    level={level}
                                                    processes={processes}
                                                    onSmartToggle={handleSmartToggle}
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
            
            <div className="flex-shrink-0 flex flex-row items-center md:justify-end gap-2 md:gap-3 w-full pt-2">
                <div className="flex-1"></div>
                <button 
                    onClick={handleExportTxt} 
                    disabled={processes.length === 0} 
                    className="flex-none md:w-auto px-3 md:px-4 h-[52px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50 whitespace-nowrap dark:shadow-md"
                >
                    <Icon name="FileText" />
                    <span className="hidden md:inline">Export</span>
                    <div className="lang-pill-container">
                        <span onClick={(e) => { e.stopPropagation(); setExportLang('en'); }} className={`lang-pill-btn ${exportLang === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                        <span onClick={(e) => { e.stopPropagation(); setExportLang('vi'); }} className={`lang-pill-btn ${exportLang === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
