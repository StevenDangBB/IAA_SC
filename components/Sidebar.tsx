
import React, { useState } from 'react';
import { Icon } from './UI';
import { STANDARDS_DATA } from '../constants';
import { AuditInfoForm } from './sidebar/AuditInfoForm';
import { IntegrityModal } from './modals/IntegrityModal';
import { useResizable } from '../hooks/useResizable';

// Contexts & Hooks
import { useAudit } from '../contexts/AuditContext';
import { useUI } from '../contexts/UIContext';
import { useStandardHealth } from '../hooks/useStandardHealth';
import { useKnowledgeManager } from '../hooks/useKnowledgeManager';
import { useStandardRepair } from '../hooks/useStandardRepair';

interface SidebarProps {
    isOpen: boolean;
    width: number;
    setWidth: (w: number) => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ isOpen, width, setWidth }) => {
    const [isMissionExpanded, setIsMissionExpanded] = useState(true);
    
    // Resizable Hook
    const { isResizing, sidebarRef, startResizing } = useResizable(width, 300, 800, setWidth);
    
    // Feature Hooks
    const { handleKnowledgeUpload } = useKnowledgeManager();
    const { handleAutoRepair, isRepairing, repairStats } = useStandardRepair();

    // Consume Context
    const { 
        standards, standardKey, setStandardKey, resetStandard, auditInfo, knowledgeBase, processes
    } = useAudit();

    const { modals, toggleModal } = useUI();

    const health = useStandardHealth(standards, standardKey, knowledgeBase);

    const standardOptions = (() => {
        const rawOptions = Object.keys(standards).map(k => ({ value: k, label: standards[k].name }));
        return [...rawOptions, {value: "ADD_NEW", label: "+ Add New Standard..."}];
    })();

    // --- PROGRESS LOGIC ---
    const totalFields = 5; // Standard, Type, Company, Auditor, Process
    const infoCompletion = (() => {
        let score = 0;
        if (standardKey && standardKey !== "ADD_NEW") score++;
        if (auditInfo.type) score++;
        if (auditInfo.company) score++;
        if (auditInfo.auditor) score++;
        if (processes.length > 0) score++;
        return score;
    })();
    
    const progressPercent = (infoCompletion / totalFields) * 100;
    const isStandardMissing = !standardKey || standardKey === "ADD_NEW";
    const isProcessMissing = processes.length === 0;

    // Dynamic Styles based on completion
    // Red/Orange if critical fields (Standard or Process) are missing
    const progressColor = (isStandardMissing || isProcessMissing) ? 'bg-orange-500' : 'bg-emerald-500';
    const badgeBg = (isStandardMissing || isProcessMissing) 
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    
    let badgeText = `Completed: ${infoCompletion} / ${totalFields}`;
    if (isStandardMissing) badgeText = "Standard Required";
    else if (isProcessMissing) badgeText = "Process Required";

    return (
        <div 
            ref={sidebarRef}
            className={`${isOpen ? 'border-r' : 'w-0 border-0 overflow-hidden'} flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xl z-50 relative shrink-0 ${isResizing ? 'transition-none' : 'transition-[width] duration-300 ease-soft'} h-full`} 
            style={{ width: isOpen ? (window.innerWidth < 768 ? '100%' : width) : 0 }}
        >
             {isOpen && <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-50 group resize-handle hidden md:block" onMouseDown={(e) => { e.preventDefault(); startResizing(); }} />}
            
            <div className={`flex-1 bg-white dark:bg-slate-900 w-full md:min-w-[390px] flex flex-col transition-all duration-400 ease-soft overflow-hidden`}>
                <div 
                    className="flex-shrink-0 flex flex-col gap-3 p-6 cursor-pointer group select-none hover:bg-gray-50 dark:hover:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 transition-colors"
                    onClick={() => setIsMissionExpanded(!isMissionExpanded)}
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
                                <Icon name="Session8_Flag" size={14} className="text-indigo-500"/>
                                Audit Details
                            </h3>
                            <Icon name="ChevronDown" size={14} className={`text-slate-400 transition-transform duration-300 ${isMissionExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wide transition-colors ${badgeBg}`}>
                            {badgeText}
                        </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-700 ease-spring ${progressColor}`}
                            style={{ width: `${Math.max(5, progressPercent)}%` }}
                        ></div>
                    </div>
                </div>

                <div className={`flex-1 min-h-0 grid transition-all duration-300 ease-in-out ${isMissionExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 pb-6">
                            <AuditInfoForm 
                                onAddNewStandard={() => toggleModal('addStandard', true)}
                                onOpenIntegrity={() => toggleModal('integrity', true)}
                                onKnowledgeUpload={handleKnowledgeUpload}
                                health={health}
                                auditFieldIconColor="text-indigo-700 dark:text-indigo-400"
                                standardOptions={standardOptions}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <IntegrityModal 
                isOpen={modals.integrity}
                onClose={() => toggleModal('integrity', false)}
                health={health}
                isCustomStandard={!!standardKey && !STANDARDS_DATA[standardKey]}
                onResetStandard={() => { resetStandard(standardKey); toggleModal('integrity', false); }}
                onAutoRepair={handleAutoRepair}
                isRepairing={isRepairing}
                repairStats={repairStats}
            />
        </div>
    );
});
export default Sidebar;
