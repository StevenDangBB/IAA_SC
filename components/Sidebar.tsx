
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
        standards, standardKey, setStandardKey, resetStandard, auditInfo, knowledgeBase
    } = useAudit();

    const { modals, toggleModal } = useUI();

    const health = useStandardHealth(standards, standardKey, knowledgeBase);

    const standardOptions = (() => {
        const rawOptions = Object.keys(standards).map(k => ({ value: k, label: standards[k].name }));
        return [...rawOptions, {value: "ADD_NEW", label: "+ Add New Standard..."}];
    })();

    const infoCompletion = (() => {
        let score = 0;
        if (standardKey) score++;
        if (auditInfo.type) score++;
        if (auditInfo.company) score++;
        if (auditInfo.auditor) score++;
        return Math.min(4, score); 
    })();

    return (
        <div 
            ref={sidebarRef}
            className={`${isOpen ? 'border-r' : 'w-0 border-0 overflow-hidden'} flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xl z-50 relative shrink-0 ${isResizing ? 'transition-none' : 'transition-[width] duration-300 ease-soft'} h-full`} 
            style={{ width: isOpen ? (window.innerWidth < 768 ? '100%' : width) : 0 }}
        >
             {isOpen && <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-50 group resize-handle hidden md:block" onMouseDown={(e) => { e.preventDefault(); startResizing(); }} />}
            
            <div className={`flex-1 bg-white dark:bg-slate-900 w-full md:min-w-[390px] flex flex-col transition-all duration-400 ease-soft overflow-hidden`}>
                <div 
                    className="flex-shrink-0 flex items-center justify-between p-6 cursor-pointer group select-none hover:bg-gray-50 dark:hover:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800"
                    onClick={() => setIsMissionExpanded(!isMissionExpanded)}
                >
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
                        <Icon name="Session8_Flag" size={14} className="text-indigo-500"/>
                        Audit Details
                    </h3>
                    <div className="flex gap-4 items-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 items-center">
                            {[1, 2, 3, 4].map(step => (
                                <div key={step} className={`w-3 h-1 rounded-full ${step <= infoCompletion ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-slate-700'}`}></div>
                            ))}
                        </div>
                        <Icon name="ChevronDown" size={14} className={`text-slate-400 transition-transform duration-300 ${isMissionExpanded ? 'rotate-180' : ''}`} />
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
