
import React, { useState, useMemo, useRef, memo, useCallback, useEffect } from 'react';
import { Icon, Modal } from '../UI';
import { useAudit } from '../../contexts/AuditContext';
import { Clause, AuditMember } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { useKeyPool } from '../../contexts/KeyPoolContext';
import { cleanAndParseJSON } from '../../utils';
import { TABS_CONFIG } from '../../constants';
import { generateAuditSchedule } from '../../services/geminiService';
import { ResourceConfigPanel } from './planning/ResourceConfigPanel';

// --- INTERNAL TYPES ---
interface PlanningRowProps {
    clause: Clause;
    level: number;
    processes: any[];
    onSmartToggle: (procId: string, clause: Clause) => void; 
}

interface PlanningViewProps {
    onExport?: (type: 'schedule', lang: 'en' | 'vi', format?: 'txt' | 'docx', extraData?: any) => void;
}

// --- TIME UTILITIES ---
const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const getDuration = (range: string) => {
    const parts = range.split('-');
    if (parts.length < 2) return 60; // Default 1h
    return timeToMinutes(parts[1].trim()) - timeToMinutes(parts[0].trim());
};

// --- INTERNAL COMPONENT: RESCHEDULE MODAL ---
const RescheduleModal = ({ 
    isOpen, 
    onClose, 
    targetItem, 
    availableDates, 
    onSave 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    targetItem: any, 
    availableDates: string[], 
    onSave: (date: string, start: string, end: string, autoBalance: boolean) => void 
}) => {
    const [date, setDate] = useState("");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [autoBalance, setAutoBalance] = useState(true);

    useEffect(() => {
        if (isOpen && targetItem) {
            setDate(targetItem.date || availableDates[0]);
            const parts = targetItem.timeSlot ? targetItem.timeSlot.split('-') : [];
            setStart(parts[0]?.trim() || "08:30");
            setEnd(parts[1]?.trim() || "09:30");
        }
    }, [isOpen, targetItem, availableDates]);

    // Auto update End time when Start changes (keeping duration)
    const handleStartChange = (newStart: string) => {
        const oldStartMins = timeToMinutes(start);
        const oldEndMins = timeToMinutes(end);
        const duration = oldEndMins - oldStartMins;
        
        setStart(newStart);
        if (duration > 0) {
            const newStartMins = timeToMinutes(newStart);
            setEnd(minutesToTime(newStartMins + duration));
        }
    };

    const handleSave = () => {
        if (start && end && date) {
            onSave(date, start, end, autoBalance);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title="Reschedule Activity" onClose={onClose}>
            <div className="space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800">
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block mb-1">Target Activity</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{targetItem?.activity}</p>
                    <div className="flex gap-2 mt-1">
                        <span className="text-[9px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-700/50 text-slate-500">{targetItem?.siteName}</span>
                        <span className="text-[9px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-700/50 text-slate-500">{targetItem?.processName}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Audit Date</label>
                        <select 
                            value={date} 
                            onChange={e => setDate(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                        >
                            {availableDates.map(d => (
                                <option key={d} value={d} className="text-slate-900 dark:text-white bg-white dark:bg-slate-950">{d}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Start Time</label>
                            <input 
                                type="time" 
                                value={start} 
                                onChange={e => handleStartChange(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 dark:[color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">End Time</label>
                            <input 
                                type="time" 
                                value={end} 
                                onChange={e => setEnd(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={autoBalance} 
                                onChange={e => setAutoBalance(e.target.checked)} 
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">Auto-Cascade Schedule</span>
                                <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70">Automatically shift overlapping tasks for this auditor down to avoid conflicts.</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        onClick={handleSave} 
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                    >
                        Confirm & Update Plan
                    </button>
                </div>
            </div>
        </Modal>
    );
};

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

// --- MEMOIZED MATRIX ROW COMPONENT ---
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
    
    // Deep check to prevent re-render unless matrix data actually changed for this row
    const hasChange = prev.processes.some((pp, idx) => {
        const np = next.processes[idx];
        return pp.matrixData !== np.matrixData;
    });
    
    return !hasChange; 
});


export const PlanningView: React.FC<PlanningViewProps> = ({ onExport }) => {
    // --- CONTEXT ---
    const { 
        standards, standardKey, processes, auditInfo,
        batchUpdateProcessClauses, toggleProcessClause,
        auditSites, setAuditSites, auditTeam, setAuditTeam, auditPlanConfig, setAuditPlanConfig,
        auditSchedule, setAuditSchedule, updateProcessCode, updateProcessSites
    } = useAudit();
    
    const { showToast, setSidebarOpen } = useUI();
    const { getActiveKey } = useKeyPool();
    
    // --- LOCAL STATE ---
    // Tab State
    const [activeTab, setActiveTab] = useState<'matrix' | 'resources'>('matrix');
    
    // Matrix View State
    const [search, setSearch] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    // Misc UI State
    const [exportLanguage, setExportLanguage] = useState<'en' | 'vi'>('en');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    // Assignments State
    const [reassignTarget, setReassignTarget] = useState<{ rowIndex: number, currentName: string } | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState<{ rowIndex: number, item: any } | null>(null);

    // AI Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState(0);
    const [genLogs, setGenLogs] = useState<string[]>([]);

    // Schedule Grid Configuration (CUSTOM MAPPING)
    const [agendaColumns, setAgendaColumns] = useState(['siteName', 'auditorName', 'timeSlot', 'processName', 'activity', 'clauseRefs']);
    const [customHeader, setCustomHeader] = useState<string>("");
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

    const COLUMN_LABELS: Record<string, string> = {
        timeSlot: "Time",
        siteName: "Site",
        auditorName: "Auditor",
        clauseRefs: "Clauses",
        activity: "Activity",
        processName: "Process / Auditee"
    };

    const currentStandard = standards[standardKey];
    const themeConfig = TABS_CONFIG.find(t => t.id === 'planning')!;
    const safeAuditDates = Array.isArray(auditPlanConfig.auditDates) ? auditPlanConfig.auditDates : [];

    // --- EFFECTS ---
    useEffect(() => {
        if (isGenerating && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [genLogs, isGenerating]);

    // --- HELPER METHODS ---
    const addLog = (msg: string) => setGenLogs(prev => [...prev, msg]);

    // --- DRAG & DROP HANDLERS ---
    const handleDragStart = (e: React.DragEvent, colId: string) => {
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(e.currentTarget as Element, 20, 20);
    };

    const handleDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === colId) return;
        
        const newCols = [...agendaColumns];
        const draggedIdx = newCols.indexOf(draggedColumn);
        const targetIdx = newCols.indexOf(colId);
        
        newCols.splice(draggedIdx, 1);
        newCols.splice(targetIdx, 0, draggedColumn);
        setAgendaColumns(newCols);
    };

    const handleDragEnd = () => setDraggedColumn(null);

    // --- DATA TRANSFORMATION FOR TABLE ---
    const getSortedSchedule = (daySchedule: any[]) => {
        return [...daySchedule].sort((a, b) => {
            for (const col of agendaColumns) {
                const valA = a[col] ?? "";
                const valB = b[col] ?? "";
                if (valA === valB) continue; 
                // Fix: Explicitly convert to String to avoid type errors if inferred as unknown/any
                return String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
            }
            return 0;
        });
    };

    const calculateRowSpans = (data: any[], columns: string[]) => {
        const rowSpans: Record<string, number> = {}; 
        
        for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
            for (let colIdx = 0; colIdx < columns.length; colIdx++) {
                const key = `${rowIdx}_${colIdx}`;
                if (rowSpans[key] === 0) continue; 
                rowSpans[key] = 1;
            }
        }

        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
            const colName = columns[colIdx];
            for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
                const key = `${rowIdx}_${colIdx}`;
                if (rowSpans[key] === 0) continue; 

                const currentVal = data[rowIdx][colName];
                
                for (let nextIdx = rowIdx + 1; nextIdx < data.length; nextIdx++) {
                    const nextVal = data[nextIdx][colName];
                    const nextKey = `${nextIdx}_${colIdx}`;
                    
                    let parentMatch = true;
                    // Strict hierarchy check: For 'auditorName' to span, 'siteName' must match if it comes before
                    if (colIdx > 0) {
                        for (let p = 0; p < colIdx; p++) {
                            if (data[rowIdx][columns[p]] !== data[nextIdx][columns[p]]) {
                                parentMatch = false;
                                break;
                            }
                        }
                    }

                    if (currentVal === nextVal && parentMatch) {
                        rowSpans[key]++;
                        rowSpans[nextKey] = 0; 
                    } else {
                        break; 
                    }
                }
            }
        }
        return rowSpans;
    };

    // --- SCHEDULE MODIFICATIONS ---
    
    // 1. Reassign Auditor
    const updateScheduleItem = (itemIndex: number, field: string, value: any) => {
        setAuditSchedule(prev => {
            const copy = [...prev];
            copy[itemIndex] = { ...copy[itemIndex], [field]: value };
            return copy;
        });
    };

    // 2. Reschedule Activity with Smart Cascade
    const handleSaveReschedule = (newDate: string, newStart: string, newEnd: string, autoBalance: boolean) => {
        if (!rescheduleTarget) return;
        
        const targetActivity = rescheduleTarget.item;
        
        // Find new Day Number based on array index
        const dayIndex = safeAuditDates.indexOf(newDate);
        const newDayNumber = dayIndex >= 0 ? dayIndex + 1 : 1; 

        setAuditSchedule(prev => {
            // Create a deep copy to manipulate
            let schedule = [...prev];
            const targetIndex = rescheduleTarget.rowIndex;
            
            // 1. Move target to new Date/Time
            const updatedItem = {
                ...schedule[targetIndex],
                date: newDate,
                day: newDayNumber,
                timeSlot: `${newStart} - ${newEnd}`
            };
            schedule[targetIndex] = updatedItem;

            // 2. If AutoBalance is ON, we need to ripple move conflicting items
            if (autoBalance) {
                const targetStartMins = timeToMinutes(newStart);
                const targetEndMins = timeToMinutes(newEnd);
                const auditor = updatedItem.auditorName;

                // Get items on the SAME DAY, SAME AUDITOR, excluding the one we just moved
                // Sort them by time to process sequentially
                const dayItems = schedule
                    .map((item, idx) => ({ ...item, originalIndex: idx }))
                    .filter(item => item.date === newDate && item.auditorName === auditor && item.originalIndex !== targetIndex)
                    .sort((a, b) => timeToMinutes(a.timeSlot.split('-')[0]) - timeToMinutes(b.timeSlot.split('-')[0]));

                let currentFloorMins = targetEndMins; // Anything starting before this needs to move

                for (let i = 0; i < dayItems.length; i++) {
                    const item = dayItems[i];
                    const [s, e] = item.timeSlot.split('-').map(t => t.trim());
                    const itemStartMins = timeToMinutes(s);
                    const itemEndMins = timeToMinutes(e);
                    const duration = itemEndMins - itemStartMins;

                    // If this item starts BEFORE the current floor (overlap), push it
                    // Or if it starts exactly at the same time as target start (total overlap)
                    if (itemStartMins < currentFloorMins && itemEndMins > targetStartMins) {
                        const newStartMins = currentFloorMins;
                        const newEndMins = newStartMins + duration;
                        
                        schedule[item.originalIndex] = {
                            ...schedule[item.originalIndex],
                            timeSlot: `${minutesToTime(newStartMins)} - ${minutesToTime(newEndMins)}`
                        };
                        
                        // Update floor for NEXT item in chain
                        currentFloorMins = newEndMins;
                    } else {
                        // If there's a gap, we might reset the floor to this item's end if it's later
                        // But strictly for cascade, we only care about pushing conflicts.
                        // If no conflict, we update floor to this item's end to ensure sequential
                        if (itemEndMins > currentFloorMins) {
                            currentFloorMins = itemEndMins;
                        }
                    }
                }
            }

            return schedule;
        });
        setRescheduleTarget(null);
        showToast("Schedule updated & re-balanced.");
    };

    // --- WORKLOAD CALCULATOR ---
    const calculateDailyWorkload = (day: number) => {
        const items = auditSchedule.filter(s => s.day === day);
        // Sum durations in minutes
        let totalMinutes = 0;
        // To avoid double counting separate auditors, we need to calculate per auditor then max?
        // Actually for "Daily Load" usually implies the timeline density. 
        // Let's calculate MAX auditor load for that day.
        
        const auditors = [...new Set(items.map(i => i.auditorName))];
        let maxMinutes = 0;

        auditors.forEach(auditor => {
            const auditorItems = items.filter(i => i.auditorName === auditor);
            const mins = auditorItems.reduce((acc, item) => {
                const [s, e] = item.timeSlot.split('-');
                return acc + (timeToMinutes(e) - timeToMinutes(s));
            }, 0);
            if (mins > maxMinutes) maxMinutes = mins;
        });

        return maxMinutes / 60; // Hours
    };

    // --- MATRIX LOGIC ---
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
        if (areAllCollapsed) setCollapsedGroups(new Set());
        else setCollapsedGroups(new Set(allGroupIds));
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

    // --- DATE & SCHEDULE LOGIC ---
    const handleUpdateDates = (newDates: string[]) => {
        setAuditPlanConfig({ ...auditPlanConfig, auditDates: newDates });
    };

    const handleRemoveDate = (date: string) => {
        const currentDates = Array.isArray(auditPlanConfig.auditDates) ? auditPlanConfig.auditDates : [];
        const newDates = currentDates.filter(d => d !== date);
        setAuditPlanConfig({ ...auditPlanConfig, auditDates: newDates });
    };

    const handleGenerateSchedule = async () => {
        const key = getActiveKey();
        if (!key) { showToast("API Key Required."); return; }
        
        if (auditTeam.length === 0) { 
            showToast("Please add at least one auditor."); 
            return; 
        }
        
        if (processes.length === 0) { showToast("No processes found to schedule."); return; }
        
        const safeDates = Array.isArray(auditPlanConfig.auditDates) ? auditPlanConfig.auditDates : [];
        if (safeDates.length === 0) { showToast("Please add at least one audit date."); return; }

        setIsGenerating(true);
        setGenProgress(5);
        setGenLogs(["Initializing Smart Planner...", "Validating resources and process map..."]);

        try {
            // Simulated steps for UI feedback
            setTimeout(() => { setGenProgress(20); addLog("Analyzing Auditor Competencies..."); }, 800);
            setTimeout(() => { setGenProgress(40); addLog(`Mapping ${processes.length} Processes to Sites...`); }, 2000);
            setTimeout(() => { setGenProgress(60); addLog("Optimizing time slots & balancing workload..."); }, 3500);
            setTimeout(() => { setGenProgress(80); addLog("Finalizing Agenda Structure..."); }, 5000);

            // SITE FALLBACK LOGIC: If sites list is empty, use Company info as the "Main Site"
            const effectiveSites = auditSites.length > 0 
                ? auditSites 
                : [{ 
                    id: 'default_main_site', 
                    name: auditInfo.company || 'Main Organization Site', 
                    address: auditInfo.address || '', 
                    isMain: true, 
                    scope: 'Whole Organization',
                    employeeCount: auditInfo.totalEmployees 
                  }];

            if (auditSites.length === 0) {
                addLog("Note: No specific sites added. Using Organization Context as single audit location.");
            }

            const resultJson = await generateAuditSchedule(
                effectiveSites,
                auditTeam,
                processes,
                auditPlanConfig,
                key.key,
                key.activeModel
            );
            
            const schedule = cleanAndParseJSON(resultJson);
            
            if (Array.isArray(schedule) && schedule.length > 0) {
                setGenProgress(100);
                addLog("Success! Rendering Schedule...");
                // Fix: Explicit void generic for Promise to satisfy TS strict checks
                await new Promise<void>(r => setTimeout(r, 800)); 
                setAuditSchedule(schedule);
                showToast("Schedule Generated Successfully!");
            } else {
                throw new Error("AI returned invalid schedule format. Try again.");
            }
        } catch (e: any) {
            console.error(e);
            addLog(`ERROR: ${e.message}`);
            showToast("Planning Failed: Check Logs.");
            await new Promise(r => setTimeout(r, 2000));
        } finally {
            setIsGenerating(false);
        }
    };

    // --- RENDER ---
    const handleSelectStandardFocus = () => {
        setSidebarOpen(true);
        setTimeout(() => {
            const el = document.getElementById('sidebar-standard-select');
            if (el) { el.focus(); try { (el as any).showPicker(); } catch (e) { el.click(); } }
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
            
            {/* Header / Stats / Tab Switcher */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 transition-colors duration-500 ease-fluid">
                <div className="flex items-center gap-6">
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="transform -rotate-90 w-16 h-16">
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-200 dark:text-slate-700" />
                            <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-orange-500 dark:text-orange-400 transition-all duration-1000 ease-out filter drop-shadow-sm" strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-sm font-black text-orange-600 dark:text-orange-400">{coverageStats.percent}%</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{currentStandard.name}</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setActiveTab('matrix')}
                                className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${activeTab === 'matrix' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                            >
                                1. Clause Matrix
                            </button>
                            <button 
                                onClick={() => setActiveTab('resources')}
                                className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${activeTab === 'resources' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                            >
                                2. Logistics & Schedule
                            </button>
                        </div>
                    </div>
                </div>
                
                {activeTab === 'matrix' && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <Icon name="Search" size={16}/>
                            </div>
                            <input 
                                ref={searchInputRef}
                                className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-950 border border-indigo-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                                placeholder="Filter clauses..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            {search && (
                                <button onClick={() => { setSearch(""); searchInputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 transition-colors">
                                    <Icon name="X" size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* CONTENT CONTAINER */}
            <div className={`flex-1 bg-white dark:bg-slate-900 rounded-2xl border ${themeConfig.borderClass.replace('border-', 'border-opacity-30 border-')} border-t-4 border-t-${themeConfig.borderClass.replace('border-', '')} dark:border-slate-800 overflow-hidden shadow-sm relative flex flex-col transition-colors duration-500 ease-fluid`}>
                
                {/* VIEW 1: MATRIX */}
                {activeTab === 'matrix' && (
                    processes.length === 0 ? (
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
                    )
                )}

                {/* VIEW 2: RESOURCES & SCHEDULE */}
                {activeTab === 'resources' && (
                    <div className="flex-1 flex overflow-hidden relative">
                        {/* LEFT: INPUTS (Extracted to Component) */}
                        <ResourceConfigPanel 
                            auditPlanConfig={auditPlanConfig}
                            setAuditPlanConfig={setAuditPlanConfig}
                            auditSites={auditSites}
                            setAuditSites={setAuditSites}
                            auditTeam={auditTeam}
                            setAuditTeam={setAuditTeam}
                            processes={processes}
                            updateProcessCode={updateProcessCode}
                            updateProcessSites={updateProcessSites}
                            handleGenerateSchedule={handleGenerateSchedule}
                            isGenerating={isGenerating}
                            genProgress={genProgress}
                            genLogs={genLogs}
                            logsEndRef={logsEndRef}
                            handleRemoveDate={handleRemoveDate}
                            safeAuditDates={safeAuditDates}
                            isCalendarOpen={isCalendarOpen}
                            setIsCalendarOpen={setIsCalendarOpen}
                            handleUpdateDates={handleUpdateDates}
                        />

                        {/* RIGHT: SCHEDULE TABLE & GENERATION OVERLAY */}
                        <div className="flex-1 bg-white dark:bg-slate-900 relative flex flex-col overflow-hidden">
                            {/* ... Content on the right side (AI logs, Table) ... */}
                            {isGenerating && (
                                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 rounded-2xl border border-white/20 dark:border-slate-800">
                                    <div className="w-full max-w-lg space-y-6">
                                        <div className="flex flex-col items-center">
                                            <div className="relative w-16 h-16 mb-4">
                                                <div className="absolute inset-0 border-4 border-orange-100 dark:border-slate-700 rounded-full"></div>
                                                <div className="absolute inset-0 border-t-4 border-orange-500 rounded-full animate-spin"></div>
                                                <Icon name="Session7_Compass" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500" size={24}/>
                                            </div>
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white animate-pulse">Designing Audit Plan...</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">{genProgress}% Complete</p>
                                        </div>

                                        <div className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300 ease-out" style={{ width: `${genProgress}%` }}></div>
                                        </div>

                                        <div className="w-full h-40 bg-black/5 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-slate-800 p-4 font-mono text-xs overflow-y-auto custom-scrollbar shadow-inner">
                                            {genLogs.map((log, idx) => (
                                                <div key={idx} className="mb-1 text-slate-600 dark:text-slate-400 flex gap-2">
                                                    <span className="text-orange-400 select-none">&gt;</span>
                                                    <span>{log}</span>
                                                </div>
                                            ))}
                                            <div ref={logsEndRef} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {auditSchedule.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <Icon name="Session7_Compass" size={48} className="mb-4 opacity-20"/>
                                        <p className="font-bold text-slate-500">No Schedule Generated</p>
                                        <p className="text-xs mt-2">Setup resources and click Generate.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8 pb-16">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <Icon name="Session7_Compass" className="text-orange-500"/> Audit Agenda
                                                </h3>
                                            </div>
                                            <span className="text-[10px] text-slate-400 italic">Drag column headers to sort & group data</span>
                                        </div>
                                        
                                        {[...new Set(auditSchedule.map(s => s.day))].sort().map(day => {
                                            const dayItems = auditSchedule.filter(s => s.day === day);
                                            const dateLabel = dayItems[0]?.date || `Day ${day}`;
                                            const daySchedule = getSortedSchedule(dayItems);
                                            const rowSpans = calculateRowSpans(daySchedule, agendaColumns);
                                            
                                            // --- WORKLOAD INDICATOR ---
                                            const workload = calculateDailyWorkload(day);
                                            const isOverloaded = workload > 8;

                                            return (
                                                <div key={day} className="mb-8">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <h4 className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-4 py-1.5 rounded-lg shadow-sm border border-orange-100 dark:border-orange-800/50">
                                                            Day {day}: {dateLabel}
                                                        </h4>
                                                        
                                                        {/* Visual Workload Bar */}
                                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700">
                                                            <div className="w-20 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all duration-500 ${isOverloaded ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${Math.min((workload/8)*100, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className={`text-[10px] font-mono font-bold ${isOverloaded ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                {workload.toFixed(1)}/8h {isOverloaded && '(Overload)'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                                                        <table className="w-full border-collapse text-left bg-white dark:bg-slate-900">
                                                            <thead>
                                                                <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 select-none">
                                                                    {agendaColumns.map(col => (
                                                                        <th 
                                                                            key={col} 
                                                                            className="p-3 font-bold border-r border-gray-100 dark:border-slate-800 cursor-move hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                                                            draggable
                                                                            onDragStart={(e) => handleDragStart(e, col)}
                                                                            onDragOver={(e) => handleDragOver(e, col)}
                                                                            onDragEnd={handleDragEnd}
                                                                        >
                                                                            <div className="flex items-center gap-1">
                                                                                <Icon name="Grid" size={10} className="opacity-50"/>
                                                                                {COLUMN_LABELS[col] || col}
                                                                            </div>
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="text-xs divide-y divide-gray-100 dark:divide-slate-800/50">
                                                                {daySchedule.map((item: any, idx: number) => (
                                                                    <tr key={idx} className="hover:bg-orange-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                                                        {agendaColumns.map((col, colIdx) => {
                                                                            const realIndex = auditSchedule.indexOf(item); 
                                                                            const span = rowSpans[`${idx}_${colIdx}`];
                                                                            if (span === 0) return null;

                                                                            return (
                                                                                <td key={col} rowSpan={span} className="p-3 border-r border-gray-100 dark:border-slate-800 align-top bg-white dark:bg-slate-900">
                                                                                    {col === 'timeSlot' && (
                                                                                        <div 
                                                                                            className="group/time cursor-pointer flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700" 
                                                                                            onClick={() => setRescheduleTarget({ rowIndex: realIndex, item })} 
                                                                                            title="Click to Reschedule Activity"
                                                                                        >
                                                                                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400 group-hover/time:text-orange-600 dark:group-hover/time:text-orange-400">{item.timeSlot}</span>
                                                                                            <Icon name="Calendar" size={12} className="opacity-0 group-hover/time:opacity-100 text-orange-400 transition-opacity"/>
                                                                                        </div>
                                                                                    )}
                                                                                    {col === 'siteName' && <span className="text-slate-500">{item.siteName}</span>}
                                                                                    {col === 'auditorName' && (
                                                                                        <div className="group/auditor cursor-pointer flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700" onClick={() => setReassignTarget({ rowIndex: realIndex, currentName: item.auditorName })} title="Click to reassign auditor">
                                                                                            <span className="font-medium text-slate-700 dark:text-slate-300 group-hover/auditor:text-indigo-600 dark:group-hover/auditor:text-indigo-400">{item.auditorName}</span>
                                                                                            {item.isRemote && <span className="text-[8px] bg-purple-100 text-purple-600 px-1 rounded">R</span>}
                                                                                            <Icon name="Users" size={12} className="opacity-0 group-hover/auditor:opacity-100 text-indigo-400 transition-opacity"/>
                                                                                        </div>
                                                                                    )}
                                                                                    {col === 'processName' && (
                                                                                        <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><Icon name="Session11_GridAdd" size={12}/> {item.processName || "General"}</div>
                                                                                    )}
                                                                                    {col === 'activity' && <div className="font-bold text-slate-800 dark:text-slate-200">{item.activity}</div>}
                                                                                    {col === 'clauseRefs' && (
                                                                                        item.clauseRefs && item.clauseRefs.length > 0 ? (
                                                                                            <div className="flex flex-wrap gap-1">{item.clauseRefs.map((c: string) => <span key={c} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-600 dark:text-slate-400">{c}</span>)}</div>
                                                                                        ) : <span className="text-slate-300 text-[10px]">-</span>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* EXPORT TOOLBAR */}
                            {auditSchedule.length > 0 && (
                                <div className="flex-none p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex justify-end gap-2 shadow-inner">
                                    <button onClick={() => onExport && onExport('schedule', exportLanguage, 'docx', { columns: agendaColumns, customHeader })} className="px-4 h-[40px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-lg whitespace-nowrap">
                                        <Icon name="Download" />
                                        <span className="hidden md:inline">Export</span>
                                        <div className="lang-pill-container ml-1">
                                            <span onClick={(e) => { e.stopPropagation(); setExportLanguage('en'); }} className={`lang-pill-btn ${exportLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                            <span onClick={(e) => { e.stopPropagation(); setExportLanguage('vi'); }} className={`lang-pill-btn ${exportLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Auditor Reassignment Modal - ENHANCED */}
            <Modal isOpen={!!reassignTarget} title="Select Auditor for this Activity" onClose={() => setReassignTarget(null)}>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <span className="text-xs text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider">Current Assignment</span>
                        <span className="font-black text-sm text-indigo-700 dark:text-indigo-200">{reassignTarget?.currentName}</span>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar border border-gray-100 dark:border-slate-800 rounded-xl shadow-inner bg-white dark:bg-slate-900">
                        {auditTeam.map(member => (
                            <div 
                                key={member.id}
                                className={`p-4 flex items-start gap-3 cursor-pointer transition-all border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/80 ${reassignTarget?.currentName === member.name ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                onClick={() => { if (reassignTarget) { updateScheduleItem(reassignTarget.rowIndex, 'auditorName', member.name); updateScheduleItem(reassignTarget.rowIndex, 'isRemote', member.isRemote); setReassignTarget(null); } }}
                            >
                                <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${reassignTarget?.currentName === member.name ? 'bg-emerald-500 shadow-sm' : 'border border-slate-300 dark:border-slate-600'}`}></div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate pr-2">{member.name}</div>
                                        <div className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{member.manDays} WD</div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1 items-center mb-1.5">
                                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">{member.role}</span>
                                        {member.competencyCodes && (
                                            <span className="text-[9px] bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1" title="Technical Competency Codes">
                                                <Icon name="Tag" size={8}/> {member.competencyCodes}
                                            </span>
                                        )}
                                        {member.isRemote && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">REMOTE</span>}
                                    </div>

                                    {member.availability && (
                                        <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800/50 italic flex items-start gap-1.5 leading-snug">
                                            <Icon name="Info" size={10} className="mt-0.5 shrink-0 opacity-70"/>
                                            {member.availability}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Reschedule Modal */}
            <RescheduleModal 
                isOpen={!!rescheduleTarget} 
                onClose={() => setRescheduleTarget(null)} 
                targetItem={rescheduleTarget?.item}
                availableDates={safeAuditDates}
                onSave={handleSaveReschedule}
            />
        </div>
    );
};
