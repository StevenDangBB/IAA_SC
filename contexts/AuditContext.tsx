
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { StandardsData, AuditInfo, AuditProcess, Standard, MatrixRow, EvidenceTag, AnalysisResult, PrivacySettings } from '../types';
import { DEFAULT_AUDIT_INFO, STANDARDS_DATA, INITIAL_EVIDENCE } from '../constants';
import { KnowledgeStore } from '../services/knowledgeStore';

interface AuditContextType {
    // Standard
    standards: StandardsData;
    standardKey: string;
    setStandardKey: (key: string) => void;
    customStandards: StandardsData;
    addCustomStandard: (key: string, std: Standard) => void;
    updateStandard: (std: Standard) => void;
    resetStandard: (key: string) => void;

    // Audit Info
    auditInfo: AuditInfo;
    setAuditInfo: (info: AuditInfo) => void;
    
    // Privacy
    privacySettings: PrivacySettings;
    setPrivacySettings: React.Dispatch<React.SetStateAction<PrivacySettings>>;

    // Process Management
    processes: AuditProcess[];
    activeProcessId: string | null;
    activeProcess: AuditProcess | undefined;
    setActiveProcessId: (id: string | null) => void;
    addProcess: (name: string) => void;
    renameProcess: (id: string, name: string) => void;
    deleteProcess: (id: string) => void;
    batchUpdateProcessClauses: (updates: { processId: string, clauses: string[] }[]) => void;
    toggleProcessClause: (processId: string, clauseId: string) => void; 
    
    // Interviewee Management
    addInterviewee: (name: string) => void;
    removeInterviewee: (name: string) => void;

    // Active Data
    evidence: string;
    setEvidence: React.Dispatch<React.SetStateAction<string>>;
    matrixData: Record<string, MatrixRow[]>;
    setMatrixData: React.Dispatch<React.SetStateAction<Record<string, MatrixRow[]>>>;
    evidenceTags: EvidenceTag[];
    addEvidenceTag: (tag: EvidenceTag) => void;
    
    // Selections (Global/Legacy - mostly for sidebar highlighting)
    selectedClauses: string[];
    setSelectedClauses: React.Dispatch<React.SetStateAction<string[]>>;
    
    // Knowledge Base
    knowledgeBase: string | null;
    knowledgeFileName: string | null;
    loadKnowledgeForStandard: (key: string) => Promise<void>;
    clearKnowledge: () => void;
    setKnowledgeData: (content: string, fileName: string) => void;

    // Results
    analysisResult: AnalysisResult[] | null;
    setAnalysisResult: React.Dispatch<React.SetStateAction<AnalysisResult[] | null>>;
    selectedFindings: Record<string, boolean>;
    setSelectedFindings: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    finalReportText: string | null;
    setFinalReportText: (text: string | null) => void;

    // Actions
    resetSession: () => void;
    restoreSession: (data: any) => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

const DEFAULT_PRIVACY: PrivacySettings = {
    maskCompany: true,
    maskSmo: true,
    maskPeople: true,
    maskEmail: true,
    maskPhone: true,
    maskAddress: true,
    maskIP: true
};

export const AuditProvider = ({ children }: React.PropsWithChildren<{}>) => {
    // --- STATE ---
    const [customStandards, setCustomStandards] = useState<StandardsData>({});
    const [standardKey, setStandardKey] = useState<string>("");
    const [auditInfo, setAuditInfo] = useState<AuditInfo>(DEFAULT_AUDIT_INFO);
    const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
    
    // Processes (Start Empty)
    const [processes, setProcesses] = useState<AuditProcess[]>([]);
    const [activeProcessId, setActiveProcessId] = useState<string | null>(null);

    // Active View Data (Synced with Active Process)
    // We use `loadedProcessId` to track which process owns the current `evidence` and `matrixData` in state.
    // This prevents race conditions where we might save data from Process A into Process B during a switch.
    const [loadedProcessId, setLoadedProcessId] = useState<string | null>(null);
    
    const [evidence, setEvidence] = useState(INITIAL_EVIDENCE);
    const [matrixData, setMatrixData] = useState<Record<string, MatrixRow[]>>({});
    const [evidenceTags, setEvidenceTags] = useState<EvidenceTag[]>([]);
    
    const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
    
    // KB
    const [knowledgeBase, setKnowledgeBase] = useState<string | null>(null);
    const [knowledgeFileName, setKnowledgeFileName] = useState<string | null>(null);

    // Analysis
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult[] | null>(null);
    const [selectedFindings, setSelectedFindings] = useState<Record<string, boolean>>({});
    const [finalReportText, setFinalReportText] = useState<string | null>(null);

    const standards = useMemo(() => ({ ...STANDARDS_DATA, ...customStandards }), [customStandards]);
    
    // Safe fallback
    const activeProcess = useMemo(() => processes.find(p => p.id === activeProcessId), [processes, activeProcessId]);

    // Use a ref for processes to access them in effects without causing dependency loops
    const processesRef = useRef(processes);
    useEffect(() => { processesRef.current = processes; }, [processes]);

    // --- SYNC EFFECTS ---

    // 1. Load Process Data (Read Layer)
    // This runs when the user selects a different process.
    useEffect(() => {
        // If we deselected, clear everything
        if (!activeProcessId) {
            setEvidence("");
            setMatrixData({});
            setEvidenceTags([]);
            setLoadedProcessId(null);
            return;
        }

        // Do not reload if we are already loaded (avoids spurious resets)
        if (activeProcessId === loadedProcessId) return;

        const target = processesRef.current.find(p => p.id === activeProcessId);
        if (target) {
            // CRITICAL: We set the loaded ID *simultaneously* with the data.
            // This ensures that any subsequent "Save" effect sees consistent state.
            setEvidence(target.evidence || "");
            setMatrixData(target.matrixData || {});
            setEvidenceTags(target.evidenceTags || []);
            setLoadedProcessId(activeProcessId);
        } else {
            // Fallback if ID invalid
            setLoadedProcessId(null);
        }
    }, [activeProcessId, loadedProcessId]); 

    // 2. Save View Data (Write Layer)
    // This runs whenever the local view data changes (user typing).
    // CRITICAL FIX: We ONLY save to `loadedProcessId`. We do NOT use `activeProcessId` here.
    // If `activeProcessId` changed but `loadedProcessId` hasn't updated yet (race condition),
    // this effect will effectively pause or save to the OLD process (which is safe),
    // rather than overwriting the NEW process with OLD data.
    useEffect(() => {
        if (!loadedProcessId) return;
        
        // Double Guard: If for some reason activeProcessId has switched but loadedProcessId hasn't updated
        // (e.g. during a rapid switch race), we must PAUSE saving to avoid writing old data to the wrong slot.
        // We only save when the loaded ID matches the user's intent or if we are purely saving the loaded context.
        // Actually, we should just save to loadedProcessId regardless of activeProcessId to ensure data persistence 
        // before the switch completes. But to be safe against "bleeding", checking mismatch is useful.
        
        // HOWEVER, a strict check (activeProcessId !== loadedProcessId) might prevent the FINAL save of the old process
        // right as we switch. 
        // Better Strategy: The `setProcesses` update below strictly targets `loadedProcessId`.
        // This is safe. The issue in the past was using `activeProcessId` here.
        
        setProcesses(prev => prev.map(p => {
            if (p.id === loadedProcessId) {
                // Optimization: Only update reference if data actually changed
                if (p.evidence !== evidence || p.matrixData !== matrixData || p.evidenceTags !== evidenceTags) {
                    return { ...p, evidence, matrixData, evidenceTags };
                }
            }
            return p;
        }));
    }, [evidence, matrixData, evidenceTags, loadedProcessId]);

    // --- ACTIONS ---

    const addCustomStandard = (key: string, std: Standard) => {
        setCustomStandards(prev => ({ ...prev, [key]: std }));
    };

    const updateStandard = (std: Standard) => {
        setCustomStandards(prev => ({ ...prev, [standardKey]: std }));
    };

    const resetStandard = (key: string) => {
        setCustomStandards(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        if (standardKey === key) setStandardKey("");
    };

    const addProcess = (name: string) => {
        const newId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newProcess = { 
            id: newId, 
            name, 
            evidence: "", 
            interviewees: [],
            matrixData: {}, 
            evidenceTags: [], 
            uploadedFiles: [] 
        };
        setProcesses(prev => [...prev, newProcess]);
        setActiveProcessId(newId);
    };

    const renameProcess = (id: string, name: string) => {
        setProcesses(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    };

    const deleteProcess = (idToDelete: string) => {
        if (activeProcessId === idToDelete) {
            setProcesses(prev => {
                const remaining = prev.filter(p => p.id !== idToDelete);
                const nextId = remaining.length > 0 ? remaining[0].id : null;
                setActiveProcessId(nextId);
                return remaining;
            });
        } else {
            setProcesses(prev => prev.filter(p => p.id !== idToDelete));
        }
    };

    const findClauseInStandard = (cid: string, standard: Standard | undefined): any => {
        if (!standard) return null;
        const allClauses = standard.groups.flatMap(g => g.clauses);
        const findRecursive = (id: string, list: any[]): any => {
            for (const c of list) {
                if (c.id === id) return c;
                if (c.subClauses) {
                    const found = findRecursive(id, c.subClauses);
                    if (found) return found;
                }
            }
            return null;
        };
        return findRecursive(cid, allClauses);
    };

    const batchUpdateProcessClauses = (updates: { processId: string, clauses: string[] }[]) => {
        setProcesses(prev => prev.map(p => {
            const update = updates.find(u => u.processId === p.id);
            if (update) {
                const newMatrixData = { ...p.matrixData };
                const standard = standards[standardKey];
                
                update.clauses.forEach(clauseId => {
                    if (!newMatrixData[clauseId]) {
                        const clause = findClauseInStandard(clauseId, standard);
                        const desc = clause?.description || "Requirement";
                        newMatrixData[clauseId] = [{
                            id: `${clauseId}_req_0`,
                            requirement: desc,
                            evidenceInput: "",
                            status: 'pending'
                        }];
                    }
                });
                return { ...p, matrixData: newMatrixData };
            }
            return p;
        }));
        
        // If we updated the currently loaded process, we must also update local state to reflect changes
        // This is a special case: External modification of the ACTIVE process's structure.
        const activeUpdate = updates.find(u => u.processId === loadedProcessId);
        if (activeUpdate) {
             setMatrixData(prev => {
                 const next = { ...prev };
                 const standard = standards[standardKey];
                 activeUpdate.clauses.forEach(cid => {
                     if(!next[cid]) {
                         const c = findClauseInStandard(cid, standard);
                         const desc = c?.description || "Requirement";
                         next[cid] = [{ id: `${cid}_req_0`, requirement: desc, evidenceInput: "", status: 'pending' }];
                     }
                 });
                 return next;
             });
        }
    };

    const toggleProcessClause = (processId: string, clauseId: string) => {
        setProcesses(prev => prev.map(p => {
            if (p.id !== processId) return p;

            const newMatrixData = { ...p.matrixData };
            if (newMatrixData[clauseId]) {
                delete newMatrixData[clauseId];
            } else {
                const standard = standards[standardKey];
                const clause = findClauseInStandard(clauseId, standard);
                const desc = clause?.description || "Requirement";
                
                newMatrixData[clauseId] = [{
                    id: `${clauseId}_req_0`,
                    requirement: desc,
                    evidenceInput: "",
                    status: 'pending'
                }];
            }
            return { ...p, matrixData: newMatrixData };
        }));

        // Sync local state if we modified the currently loaded process
        if (loadedProcessId === processId) {
            setMatrixData(prev => {
                const next = { ...prev };
                if (next[clauseId]) {
                    delete next[clauseId];
                } else {
                    const standard = standards[standardKey];
                    const clause = findClauseInStandard(clauseId, standard);
                    const desc = clause?.description || "Requirement";
                    next[clauseId] = [{
                        id: `${clauseId}_req_0`,
                        requirement: desc,
                        evidenceInput: "",
                        status: 'pending'
                    }];
                }
                return next;
            });
        }
    };

    const addInterviewee = (name: string) => {
        setProcesses(prev => prev.map(p => {
            if (p.id === activeProcessId) {
                if (!p.interviewees.includes(name)) {
                    return { ...p, interviewees: [...p.interviewees, name] };
                }
            }
            return p;
        }));
    };

    const removeInterviewee = (name: string) => {
        setProcesses(prev => prev.map(p => {
            if (p.id === activeProcessId) {
                return { ...p, interviewees: p.interviewees.filter(i => i !== name) };
            }
            return p;
        }));
    };

    const addEvidenceTag = (tag: EvidenceTag) => {
        setEvidenceTags(prev => [...prev, tag]);
    };

    const loadKnowledgeForStandard = async (key: string) => {
        try {
            const doc = await KnowledgeStore.getDocument(key);
            if (doc) {
                setKnowledgeBase(doc.content);
                setKnowledgeFileName(doc.fileName);
            } else {
                setKnowledgeBase(null);
                setKnowledgeFileName(null);
            }
        } catch (e) { console.error(e); }
    };

    const clearKnowledge = async () => {
        setKnowledgeBase(null);
        setKnowledgeFileName(null);
        if (standardKey) {
            await KnowledgeStore.deleteDocument(standardKey);
        }
    };

    const setKnowledgeData = (content: string, fileName: string) => {
        setKnowledgeBase(content);
        setKnowledgeFileName(fileName);
    };

    const resetSession = () => {
        setStandardKey("");
        setAuditInfo(DEFAULT_AUDIT_INFO);
        setProcesses([]);
        setActiveProcessId(null);
        setLoadedProcessId(null); // Clear loaded tracker
        setEvidence("");
        setMatrixData({});
        setEvidenceTags([]);
        setSelectedClauses([]);
        setAnalysisResult(null);
        setSelectedFindings({});
        setFinalReportText(null);
        setKnowledgeBase(null);
        setKnowledgeFileName(null);
        setPrivacySettings(DEFAULT_PRIVACY);
    };

    const restoreSession = (data: any) => {
        if (data.standardKey) setStandardKey(data.standardKey);
        if (data.auditInfo) setAuditInfo({ ...DEFAULT_AUDIT_INFO, ...data.auditInfo });
        if (data.selectedClauses) setSelectedClauses(data.selectedClauses);
        if (data.privacySettings) setPrivacySettings(data.privacySettings);
        
        if (data.processes && data.processes.length > 0) {
            setProcesses(data.processes);
            if(data.activeProcessId) setActiveProcessId(data.activeProcessId);
        } else if (data.scopes && data.scopes.length > 0) {
             const migrated = data.scopes.map((s: any) => ({
                 ...s,
                 interviewees: [] 
             }));
             setProcesses(migrated);
             if(data.activeScopeId) setActiveProcessId(data.activeScopeId);
        }

        if (data.analysisResult) setAnalysisResult(data.analysisResult);
        if (data.selectedFindings) setSelectedFindings(data.selectedFindings);
        if (data.finalReportText) setFinalReportText(data.finalReportText);
        
        if(data.standardKey) loadKnowledgeForStandard(data.standardKey);
    };

    const contextValue = useMemo(() => ({
        standards, standardKey, setStandardKey, customStandards, addCustomStandard, updateStandard, resetStandard,
        auditInfo, setAuditInfo,
        privacySettings, setPrivacySettings,
        processes, activeProcessId, activeProcess, setActiveProcessId, addProcess, renameProcess, deleteProcess, batchUpdateProcessClauses, toggleProcessClause,
        addInterviewee, removeInterviewee,
        evidence, setEvidence, matrixData, setMatrixData, evidenceTags, addEvidenceTag,
        selectedClauses, setSelectedClauses,
        knowledgeBase, knowledgeFileName, loadKnowledgeForStandard, clearKnowledge, setKnowledgeData,
        analysisResult, setAnalysisResult, selectedFindings, setSelectedFindings, finalReportText, setFinalReportText,
        resetSession, restoreSession
    }), [
        standards, standardKey, customStandards, auditInfo, privacySettings,
        processes, activeProcessId, activeProcess,
        evidence, matrixData, evidenceTags,
        selectedClauses, knowledgeBase, knowledgeFileName,
        analysisResult, selectedFindings, finalReportText
    ]);

    return (
        <AuditContext.Provider value={contextValue}>
            {children}
        </AuditContext.Provider>
    );
};

export const useAudit = () => {
    const context = useContext(AuditContext);
    if (!context) throw new Error("useAudit must be used within AuditProvider");
    return context;
};
