
import React, { useState, useMemo, useCallback } from 'react';
import { Icon } from '../UI';
import { useAudit } from '../../contexts/AuditContext';
import { Clause } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { cleanFileName, copyToClipboard } from '../../utils';
import { PlanningRow } from './planning/PlanningRow';
import { PlanningToolbar } from './planning/PlanningToolbar';

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
const getGroupClauses = (clauses: Clause[]) => {
    const flat: { clause: Clause, level: number }[] = [];
    const traverse = (list: Clause[], level: number) => {
        list.forEach(c => {
            flat.push({ clause: c, level });
            if(c.subClauses) traverse(c.subClauses, level + 1);
        });
    };
    traverse(clauses, 0);
    return flat;
};

// --- HELPER: Get all descendant IDs (Duplicated for consistency, ideally utils) ---
const getFlatClauseIds = (clause: Clause): string[] => {
    let ids = [clause.id];
    if (clause.subClauses) {
        clause.subClauses.forEach(sub => {
            ids = [...ids, ...getFlatClauseIds(sub)];
        });
    }
    return ids;
};

export const PlanningView = () => {
    const { 
        standards, standardKey, processes, 
        addProcess, batchUpdateProcessClauses, toggleProcessClause
    } = useAudit();
    
    const { showToast, setSidebarOpen } = useUI();
    const [search, setSearch] = useState("");

    // Collapsible States
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
    
    const currentStandard = standards[standardKey];

    // --- SMART TOGGLE HANDLER ---
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

    const toggleDescriptionExpand = useCallback((clauseId: string) => {
        setExpandedDescriptions(prev => {
            const next = new Set(prev);
            if (next.has(clauseId)) next.delete(clauseId);
            else next.add(clauseId);
            return next;
        });
    }, []);

    const handleCopyDescription = useCallback((text: string) => {
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
    };

    const handleImportTemplate = (file: File) => {
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
    };

    // Render logic moved to Toolbar component where possible
    
    return (
        <div className="h-full flex flex-col animate-fade-in-up gap-4 relative">
            <PlanningToolbar 
                standardName={currentStandard?.name || "Unknown"}
                coveragePercent={coverageStats.percent}
                coverageCovered={coverageStats.covered}
                coverageTotal={coverageStats.total}
                search={search}
                setSearch={setSearch}
                onImport={handleImportTemplate}
                onExportTemplate={handleExportTemplate}
                onExportTxt={handleExportTxt}
                onSetSidebarOpen={setSidebarOpen}
                hasStandard={!!currentStandard}
            />

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
                                    const groupFlatList = useMemo(() => getGroupClauses(group.clauses), [group.clauses]);

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
                                                    isExpanded={expandedDescriptions.has(clause.id)}
                                                    onToggleDescription={toggleDescriptionExpand}
                                                    onCopyCitation={handleCopyDescription}
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
        </div>
    );
};
