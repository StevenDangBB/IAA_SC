
import React, { memo, useMemo } from 'react';
import { Icon } from '../../UI';
import { Clause } from '../../../types';

interface PlanningRowProps {
    clause: Clause;
    level: number;
    processes: any[];
    isExpanded: boolean;
    onToggleDescription: (id: string) => void;
    onCopyCitation: (text: string) => void;
    onSmartToggle: (procId: string, clause: Clause) => void;
}

const getFlatClauseIds = (clause: Clause): string[] => {
    let ids = [clause.id];
    if (clause.subClauses) {
        clause.subClauses.forEach(sub => {
            ids = [...ids, ...getFlatClauseIds(sub)];
        });
    }
    return ids;
};

export const PlanningRow = memo(({ 
    clause, level, processes, isExpanded, onToggleDescription, onCopyCitation, onSmartToggle 
}: PlanningRowProps) => {
    
    const selfAndDescendants = useMemo(() => getFlatClauseIds(clause), [clause]);
    const isParent = clause.subClauses && clause.subClauses.length > 0;

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
            <td className="p-2 border-r border-gray-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/30 z-10 align-top">
                <div className={`flex flex-col gap-1 ${level > 0 ? 'ml-4 border-l-2 border-gray-200 dark:border-slate-800 pl-2' : ''}`}>
                    <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${level === 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' : 'text-slate-400'}`}>
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
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
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
    if (prev.isExpanded !== next.isExpanded) return false;
    if (prev.processes.length !== next.processes.length) return false;
    
    // Deep check if matrixData changed for relevant IDs
    const hasChange = prev.processes.some((pp, idx) => {
        const np = next.processes[idx];
        return pp.matrixData !== np.matrixData;
    });
    
    return !hasChange; 
});
