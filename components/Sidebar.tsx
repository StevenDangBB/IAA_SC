
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './UI';
import { Standard, Clause, Group } from '../types';
import { STANDARDS_DATA } from '../constants';
import { generateMissingDescriptions } from '../services/geminiService';
import { AuditInfoForm } from './sidebar/AuditInfoForm';
import { StandardExplorer } from './sidebar/StandardExplorer';
import { IntegrityModal } from './modals/IntegrityModal';
import { cleanAndParseJSON } from '../utils';

// Contexts
import { useAudit } from '../contexts/AuditContext';
import { useUI } from '../contexts/UIContext';
import { useStandardHealth } from '../hooks/useStandardHealth';

interface SidebarProps {
    isOpen: boolean;
    width: number;
    setWidth: (w: number) => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ isOpen, width, setWidth }) => {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [isMissionExpanded, setIsMissionExpanded] = useState(true);
    
    // Integrity Logic State
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairStats, setRepairStats] = useState<{ fixed: number, cleaned: number } | null>(null);
    const [repairedIds, setRepairedIds] = useState<string[]>([]);

    // Consume Context
    const { 
        standards, standardKey, setStandardKey, updateStandard, resetStandard, addCustomStandard,
        auditInfo, setAuditInfo, selectedClauses, setSelectedClauses,
        knowledgeBase, knowledgeFileName, setKnowledgeData, clearKnowledge,
        processes, activeProcessId, addProcess, renameProcess, deleteProcess, setActiveProcessId
    } = useAudit();

    const { modals, toggleModal } = useUI();

    // Derived Health
    const health = useStandardHealth(standards, standardKey, knowledgeBase);

    // Resizing Logic
    useEffect(() => {
        const stopResizing = () => {
            if (isResizing) {
                setIsResizing(false);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                if (sidebarRef.current) {
                    const finalWidth = parseInt(sidebarRef.current.style.width, 10);
                    if (!isNaN(finalWidth)) setWidth(finalWidth);
                }
            }
        };
        const resize = (e: MouseEvent) => {
            if (isResizing && sidebarRef.current) {
                const newWidth = Math.max(390, Math.min(e.clientX, 800));
                sidebarRef.current.style.width = `${newWidth}px`;
            }
        };
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, setWidth]);

    const handleAutoRepair = async () => {
        if (!standardKey || !standards[standardKey]) return;
        setIsRepairing(true);
        setRepairStats(null);
        try {
            const currentStandard = JSON.parse(JSON.stringify(standards[standardKey])) as Standard; 
            const missingClauses: {ref: Clause, code: string, title: string}[] = [];
            const fixedIds: string[] = [];
            let duplicateRemovedCount = 0;

            const findMissing = (list: Clause[]) => {
                list.forEach(c => {
                    if (!c.description || c.description.trim().length < 5) {
                        missingClauses.push({ ref: c, code: c.code, title: c.title });
                    }
                    if (c.subClauses) findMissing(c.subClauses);
                });
            };
            currentStandard.groups.forEach((g: Group) => findMissing(g.clauses));

            if (missingClauses.length > 0) {
                const targets = missingClauses.map(i => ({ code: i.code, title: i.title }));
                const jsonStr = await generateMissingDescriptions(targets);
                const descriptions = cleanAndParseJSON(jsonStr);
                
                if (Array.isArray(descriptions)) {
                    const descMap = descriptions.reduce((acc: any, item: any) => {
                        if(item.code && item.description) acc[item.code] = item.description;
                        return acc;
                    }, {});
                    missingClauses.forEach(item => {
                        if (descMap[item.code]) {
                            item.ref.description = descMap[item.code];
                            fixedIds.push(item.ref.id);
                        }
                    });
                }
            }

            const cleanClauses = (clauses: Clause[]): Clause[] => {
                const seenCodes = new Set<string>();
                const unique: Clause[] = [];
                for (const c of clauses) {
                    if (!seenCodes.has(c.code)) {
                        seenCodes.add(c.code);
                        if (c.subClauses) {
                            c.subClauses = cleanClauses(c.subClauses);
                        }
                        unique.push(c);
                    } else {
                        duplicateRemovedCount++;
                    }
                }
                return unique;
            };

            currentStandard.groups.forEach(g => {
                g.clauses = cleanClauses(g.clauses);
            });

            updateStandard(currentStandard);
            setRepairedIds(fixedIds);
            setRepairStats({ fixed: fixedIds.length, cleaned: duplicateRemovedCount });
            
        } catch (e) {
            console.error("Repair failed", e);
            alert("Failed to repair automatically.");
        } finally {
            setIsRepairing(false);
        }
    };

    const handleReset = () => {
        if(confirm("Are you sure? This will revert to original data.")) {
            resetStandard(standardKey);
            toggleModal('integrity', false);
            setRepairStats(null);
            setRepairedIds([]);
        }
    };

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

    const handleReference = (clause: Clause) => {
        window.dispatchEvent(new CustomEvent('OPEN_REFERENCE', { detail: clause }));
    };

    return (
        <div 
            ref={sidebarRef}
            className={`${isOpen ? 'border-r' : 'w-0 border-0 overflow-hidden'} flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xl z-50 relative shrink-0 ${isResizing ? 'transition-none' : 'transition-[width] duration-300 ease-soft'} h-full`} 
            style={{ width: isOpen ? (window.innerWidth < 768 ? '100%' : width) : 0 }}
        >
             {isOpen && <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-50 group resize-handle hidden md:block" onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }} />}
            
            <div className={`flex-shrink-0 bg-white dark:bg-slate-900 w-full md:min-w-[390px] flex flex-col transition-all duration-400 ease-soft overflow-hidden`}>
                <div 
                    className="flex items-center justify-between p-4 cursor-pointer group select-none hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    onClick={() => setIsMissionExpanded(!isMissionExpanded)}
                >
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
                        <Icon name="Session8_Flag" size={14} className="text-indigo-500"/>
                        Audit Mission Charter
                    </h3>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-0.5 items-center">
                            {[1, 2, 3, 4].map(step => (
                                <div key={step} className={`w-3 h-1 rounded-full ${step <= infoCompletion ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-slate-700'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`grid transition-all duration-300 ease-in-out border-b border-gray-100 dark:border-slate-800 ${isMissionExpanded ? 'grid-rows-[1fr] opacity-100 p-4 pt-0' : 'grid-rows-[0fr] opacity-0 p-0'}`}>
                    <div className="overflow-hidden">
                        <AuditInfoForm 
                            standards={standards}
                            standardKey={standardKey}
                            setStandardKey={setStandardKey}
                            auditInfo={auditInfo}
                            setAuditInfo={setAuditInfo}
                            onAddNewStandard={() => toggleModal('addStandard', true)}
                            onOpenIntegrity={() => toggleModal('integrity', true)}
                            knowledgeFileName={knowledgeFileName}
                            onKnowledgeUpload={(e) => {/* Handle in wrapper or here */}}
                            onClearKnowledge={clearKnowledge}
                            health={health}
                            auditFieldIconColor="text-indigo-700 dark:text-indigo-400"
                            standardOptions={standardOptions}
                            scopes={processes}
                            activeScopeId={activeProcessId}
                            onAddScope={addProcess}
                            onChangeScope={setActiveProcessId}
                            onRenameScope={renameProcess}
                            onDeleteScope={deleteProcess}
                        />
                    </div>
                </div>
            </div>

            <StandardExplorer 
                standard={standards[standardKey]}
                standardKey={standardKey}
                selectedClauses={selectedClauses}
                setSelectedClauses={setSelectedClauses}
                onReferenceClause={handleReference}
                repairedIds={repairedIds}
                onScrollTrigger={() => setIsMissionExpanded(false)}
            />

            <IntegrityModal 
                isOpen={modals.integrity}
                onClose={() => toggleModal('integrity', false)}
                health={health}
                isCustomStandard={!!standardKey && !STANDARDS_DATA[standardKey]}
                onResetStandard={handleReset}
                onAutoRepair={handleAutoRepair}
                isRepairing={isRepairing}
                repairStats={repairStats}
            />
        </div>
    );
});
export default Sidebar;
