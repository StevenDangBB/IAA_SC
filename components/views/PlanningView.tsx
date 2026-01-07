
import React, { useState, useMemo } from 'react';
import { Icon, SparkleLoader } from '../UI';
import { useAudit } from '../../contexts/AuditContext';
import { useKeyPool } from '../../contexts/KeyPoolContext';
import { Clause } from '../../types';
import { generateAuditPlan } from '../../services/geminiService';
import { useUI } from '../../contexts/UIContext';

export const PlanningView = () => {
    const { 
        standards, standardKey, setStandardKey, processes, 
        addProcess, batchUpdateProcessClauses, toggleProcessClause, auditInfo,
        activeProcessId, setActiveProcessId
    } = useAudit();
    
    const { showToast, setSidebarOpen } = useUI();
    const { getActiveKey } = useKeyPool();

    const [isPlanning, setIsPlanning] = useState(false);
    const [search, setSearch] = useState("");

    const currentStandard = standards[standardKey];

    // Flatten all clauses
    const flatClauses = useMemo(() => {
        if (!currentStandard) return [];
        const all: Clause[] = [];
        const traverse = (list: Clause[]) => {
            list.forEach(c => {
                all.push(c);
                if(c.subClauses) traverse(c.subClauses);
            });
        };
        currentStandard.groups.forEach(g => traverse(g.clauses));
        return all;
    }, [currentStandard]);

    // Check if a clause is planned for a specific process
    const isPlanned = (processId: string, clauseId: string) => {
        const proc = processes.find(p => p.id === processId);
        return proc ? !!proc.matrixData[clauseId] : false;
    };

    const handleToggle = (processId: string, clauseId: string) => {
        const proc = processes.find(p => p.id === processId);
        if (!proc) return;
        // Use the new dedicated toggle function which handles removal
        toggleProcessClause(processId, clauseId);
    };

    const handleAutoPlan = async () => {
        const apiKey = getActiveKey()?.key;
        if (!apiKey) {
            alert("Please add a valid API Key in Settings first.");
            return;
        }

        setIsPlanning(true);
        try {
            const plan = await generateAuditPlan(
                currentStandard?.name || "ISO Standard",
                auditInfo.company,
                processes.map(p => ({ id: p.id, name: p.name })),
                apiKey
            );

            // 1. Create New Processes
            plan.newProcesses.forEach(np => {
                addProcess(np.name);
            });

            // 2. Update Existing
            if (plan.updates.length > 0) {
                batchUpdateProcessClauses(plan.updates);
            }
            
            showToast(`AI Suggested ${plan.newProcesses.length} new processes and mapped clauses.`);
        } catch (e) {
            console.error(e);
            showToast("AI Planning Failed");
        } finally {
            setIsPlanning(false);
        }
    };

    // Calculate Coverage Stats
    const coverageStats = useMemo(() => {
        const totalClauses = flatClauses.length;
        if (totalClauses === 0) return { percent: 0, covered: 0, total: 0 };

        const coveredSet = new Set<string>();
        processes.forEach(p => {
            Object.keys(p.matrixData).forEach(cid => coveredSet.add(cid));
        });
        
        return {
            percent: Math.round((coveredSet.size / totalClauses) * 100),
            covered: coveredSet.size,
            total: totalClauses
        };
    }, [flatClauses, processes]);

    // Donut Chart SVG
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (coverageStats.percent / 100) * circumference;

    // Filter Logic
    const filteredClauses = flatClauses.filter(c => {
        if (!search) return true;
        return c.code.toLowerCase().includes(search.toLowerCase()) || 
               c.title.toLowerCase().includes(search.toLowerCase());
    });

    if (!currentStandard) return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50/30 dark:bg-slate-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 m-4">
            <Icon name="Book" size={48} className="mb-4 opacity-20"/>
            <p className="font-bold text-slate-500">No Standard Selected</p>
            <p className="text-xs mt-1">Please select an ISO Standard to begin planning.</p>
            <button onClick={() => setSidebarOpen(true)} className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all active:scale-95 text-xs font-bold flex items-center gap-2">
                <Icon name="LayoutList" size={16}/> Open Sidebar
            </button>
        </div>
    );

    return (
        <div className="h-full flex flex-col animate-fade-in-up gap-4 relative">
            
            {/* Header / Stats */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    {/* CHART */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="transform -rotate-90 w-16 h-16">
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-slate-800" />
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-indigo-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-xs font-black text-slate-700 dark:text-white">{coverageStats.percent}%</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{currentStandard.name}</h3>
                        </div>
                        <p className="text-xs text-slate-500">
                            <span className="font-bold text-indigo-500">{coverageStats.covered}</span> of {coverageStats.total} clauses mapped across <span className="font-bold text-slate-700 dark:text-slate-300">{processes.length} Processes</span>.
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="Search" size={14}/></div>
                        <input 
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 text-xs outline-none focus:border-orange-500"
                            placeholder="Filter clauses..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleAutoPlan}
                        disabled={isPlanning}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        {isPlanning ? <SparkleLoader/> : <Icon name="Wand2" size={16}/>}
                        <span className="hidden sm:inline">{isPlanning ? "Thinking..." : "AI Auto-Plan"}</span>
                    </button>
                </div>
            </div>

            {/* MATRIX CONTAINER */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm relative flex flex-col">
                {processes.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <p className="mb-4">No processes defined.</p>
                        <button onClick={handleAutoPlan} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                            <Icon name="Wand2"/> Generate Default Processes with AI
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-slate-950 sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-r border-gray-200 dark:border-slate-800 sticky left-0 bg-gray-50 dark:bg-slate-950 z-30 min-w-[250px]">
                                        Clause Reference
                                    </th>
                                    {processes.map(p => (
                                        <th key={p.id} className="p-3 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800 min-w-[120px] text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="truncate max-w-[100px]" title={p.name}>{p.name}</span>
                                                <span className="text-[9px] text-slate-400 font-normal">{Object.keys(p.matrixData).length} Clauses</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                                {filteredClauses.map(clause => (
                                    <tr key={clause.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-3 border-r border-gray-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/30 z-10">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] mr-2 text-slate-500">{clause.code}</span>
                                                    {clause.title}
                                                </span>
                                                <span className="text-[10px] text-slate-400 truncate mt-1">{clause.description}</span>
                                            </div>
                                        </td>
                                        {processes.map(p => {
                                            const active = isPlanned(p.id, clause.id);
                                            return (
                                                <td key={`${p.id}_${clause.id}`} className="p-2 text-center border-r border-gray-50 dark:border-slate-800/50 last:border-0 relative">
                                                    <button
                                                        onClick={() => handleToggle(p.id, clause.id)}
                                                        className={`w-full h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                            active 
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800' 
                                                                : 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-300 hover:text-slate-400'
                                                        }`}
                                                        title={active ? "Click to remove mapping" : "Click to Map Clause"}
                                                    >
                                                        {active ? <Icon name="CheckThick" size={14} className="drop-shadow-sm"/> : <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800"></div>}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
