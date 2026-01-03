
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './UI';
import { StandardsData, AuditInfo, Clause, Group, Standard } from '../types';
import { cleanAndParseJSON } from '../utils';
import { STANDARDS_DATA } from '../constants';
import { generateMissingDescriptions } from '../services/geminiService';
import { AuditInfoForm } from './sidebar/AuditInfoForm';
import { StandardExplorer } from './sidebar/StandardExplorer';
import { IntegrityModal } from './modals/IntegrityModal';

interface SidebarProps {
    isOpen: boolean;
    width: number;
    setWidth: (w: number) => void;
    standards: StandardsData;
    standardKey: string;
    setStandardKey: (k: string) => void;
    auditInfo: AuditInfo;
    setAuditInfo: (info: AuditInfo) => void;
    selectedClauses: string[];
    setSelectedClauses: React.Dispatch<React.SetStateAction<string[]>>;
    onAddNewStandard: () => void;
    onUpdateStandard: (std: Standard) => void;
    onResetStandard: (key: string) => void;
    onReferenceClause: (clause: Clause) => void;
    showIntegrityModal: boolean;
    setShowIntegrityModal: (show: boolean) => void;
    knowledgeFileName: string | null;
    knowledgeBase: string | null; 
    onKnowledgeUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearKnowledge: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, width, setWidth, standards, standardKey, setStandardKey, 
    auditInfo, setAuditInfo, selectedClauses, setSelectedClauses, 
    onAddNewStandard, onUpdateStandard, onResetStandard, onReferenceClause, 
    showIntegrityModal, setShowIntegrityModal, knowledgeFileName, knowledgeBase, onKnowledgeUpload, onClearKnowledge
}) => {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    
    // UI State
    const [isMissionExpanded, setIsMissionExpanded] = useState(true);
    
    // Logic State
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairStats, setRepairStats] = useState<{ fixed: number, cleaned: number } | null>(null);
    const [repairedIds, setRepairedIds] = useState<string[]>([]);

    const startResizing = (e: React.MouseEvent) => {
        if ((e.target as Element).classList.contains('resize-handle')) {
            e.preventDefault();
            setIsResizing(true);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; 
        }
    };

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

    // Handle collapse on scroll from child component
    const handleContentScroll = () => {
        if (isMissionExpanded) {
            setIsMissionExpanded(false);
        }
    };

    const runHealthCheck = () => {
        if (!standardKey || !standards[standardKey]) return { isHealthy: false, score: 0, integrity: [], completeness: [] };
        const data = standards[standardKey];
        const integrity: { label: string, status: 'pass' | 'fail', detail: string }[] = [];
        const completeness: { label: string, status: 'pass' | 'fail', detail: string }[] = [];
        
        const allClauses = data.groups.flatMap(g => g.clauses);
        const flatten = (list: Clause[]): Clause[] => {
            return list.reduce((acc, c) => {
                acc.push(c);
                if (c.subClauses) acc.push(...flatten(c.subClauses));
                return acc;
            }, [] as Clause[]);
        };
        const flatList = flatten(allClauses);

        // 1. Structure Integrity
        const missingDesc = flatList.filter(c => !c.description || c.description.trim().length < 2).length;
        integrity.push({ 
            label: 'Content Quality', 
            status: missingDesc === 0 ? 'pass' : 'fail', 
            detail: missingDesc === 0 ? 'Descriptions OK' : `${missingDesc} incomplete` 
        });
        
        const uniqueCodes = new Set(flatList.map(c => c.code));
        const duplicateCount = flatList.length - uniqueCodes.size;
        integrity.push({ 
            label: 'Data Cleanliness', 
            status: duplicateCount === 0 ? 'pass' : 'fail', 
            detail: duplicateCount === 0 ? 'Clean' : `${duplicateCount} Duplicates` 
        });

        // 2. Ground Truth Validation (If Source PDF exists)
        if (knowledgeBase && knowledgeBase.length > 1000) {
            let missingInSource = 0;
            const sampleClauses = flatList.slice(0, 20); // Check a sample to avoid performance hit
            sampleClauses.forEach(c => {
                if (!knowledgeBase.includes(c.code)) missingInSource++;
            });
            
            const ratio = missingInSource / sampleClauses.length;
            const isSourceValid = ratio < 0.2; // Tolerable margin

            completeness.push({
                label: 'Source Verification',
                status: isSourceValid ? 'pass' : 'fail',
                detail: isSourceValid ? 'Matches Document' : `${(ratio*100).toFixed(0)}% Clauses Missing in Source`
            });
        } else {
             completeness.push({
                label: 'Source Verification',
                status: 'fail',
                detail: 'No Source Document Linked'
            });
        }

        // 3. Standard Specific Checks
        if (standardKey.includes("9001")) {
            const crucial = ['8.4', '8.6', '8.7', '7.1.4'];
            crucial.forEach(code => {
                const found = flatList.some(c => c.code === code);
                completeness.push({ label: `Clause ${code}`, status: found ? 'pass' : 'fail', detail: found ? 'Present' : 'Missing (Required)' });
            });
        }
        
        if (standardKey.includes("27001")) {
            const annexItems = flatList.filter(c => c.code.startsWith("A."));
            const isFullSet = annexItems.length >= 90; 
            completeness.push({ label: 'Annex A Controls', status: isFullSet ? 'pass' : 'fail', detail: isFullSet ? `${annexItems.length} Controls (OK)` : `${annexItems.length}/93 (Incomplete)` });
        }

        const integrityPass = integrity.every(i => i.status === 'pass');
        const completenessPass = completeness.every(i => i.status === 'pass');
        const isHealthy = integrityPass && completenessPass;
        const totalItems = integrity.length + completeness.length;
        const passItems = integrity.filter(i => i.status === 'pass').length + completeness.filter(i => i.status === 'pass').length;
        const score = Math.round((passItems / (totalItems || 1)) * 100);

        return { isHealthy, score, integrity, completeness };
    };

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

            onUpdateStandard(currentStandard);
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
        if(confirm("Are you sure? This will remove all AI repairs and revert to the original static data.")) {
            onResetStandard(standardKey);
            setShowIntegrityModal(false);
            setRepairStats(null);
            setRepairedIds([]);
        }
    };

    const auditFieldIconColor = "text-indigo-700 dark:text-indigo-400";
    const health = runHealthCheck();
    const isCustomStandard = !STANDARDS_DATA[standardKey] || (standards[standardKey] && standards[standardKey] !== STANDARDS_DATA[standardKey]);

    const standardOptions = (() => {
        const rawOptions = Object.keys(standards).map(k => ({ value: k, label: standards[k].name }));
        const seen = new Set();
        const unique = rawOptions.filter(item => {
            const duplicate = seen.has(item.label);
            seen.add(item.label);
            return !duplicate;
        });
        return [...unique, {value: "ADD_NEW", label: "+ Add New Standard..."}];
    })();

    // Workflow Completion Calculation
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
            className={`${isOpen ? 'border-r' : 'w-0 border-0 overflow-hidden'} flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xl z-50 relative shrink-0 ${isResizing ? 'transition-none' : 'transition-[width] duration-300 ease-soft'} h-full dark:shadow-[5px_0_15px_-3px_rgba(0,0,0,0.5)]`} 
            style={{ width: isOpen ? (window.innerWidth < 768 ? '100%' : width) : 0 }}
        >
             {isOpen && <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-50 group resize-handle hidden md:block" onMouseDown={startResizing} />}
            
            {/* --- AUDIT MISSION CHARTER --- */}
            <div className={`flex-shrink-0 bg-white dark:bg-slate-900 w-full md:min-w-[390px] flex flex-col transition-all duration-400 ease-soft overflow-hidden`}>
                <div 
                    className="flex items-center justify-between p-4 cursor-pointer group select-none hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    onClick={() => setIsMissionExpanded(!isMissionExpanded)}
                    title={isMissionExpanded ? "Collapse Mission Charter" : "Expand Mission Charter"}
                >
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
                        <Icon name="Session8_Flag" size={14} className="text-indigo-500"/>
                        Audit Mission Charter
                        <Icon name="ChevronDown" size={12} className={`transition-transform duration-300 text-slate-300 group-hover:text-indigo-400 ${isMissionExpanded ? 'rotate-180' : ''}`}/>
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
                            onAddNewStandard={onAddNewStandard}
                            onOpenIntegrity={() => setShowIntegrityModal(true)}
                            knowledgeFileName={knowledgeFileName}
                            onKnowledgeUpload={onKnowledgeUpload}
                            onClearKnowledge={onClearKnowledge}
                            health={health}
                            auditFieldIconColor={auditFieldIconColor}
                            standardOptions={standardOptions}
                        />
                    </div>
                </div>
            </div>

            {/* --- STANDARD EXPLORER --- */}
            <StandardExplorer 
                standard={standards[standardKey]}
                standardKey={standardKey}
                selectedClauses={selectedClauses}
                setSelectedClauses={setSelectedClauses}
                onReferenceClause={onReferenceClause}
                repairedIds={repairedIds}
                onScrollTrigger={handleContentScroll}
            />

            {/* --- INTEGRITY MODAL --- */}
            <IntegrityModal 
                isOpen={showIntegrityModal}
                onClose={() => setShowIntegrityModal(false)}
                health={health}
                isCustomStandard={isCustomStandard}
                onResetStandard={handleReset}
                onAutoRepair={handleAutoRepair}
                isRepairing={isRepairing}
                repairStats={repairStats}
            />
        </div>
    );
};
export default Sidebar;
