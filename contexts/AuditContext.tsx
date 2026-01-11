
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

    const standards = { ...STANDARDS_DATA, ...customStandards };
    
    // Safe fallback
    const activeProcess = processes.find(p => p.id === activeProcessId);

    // --- SYNC EFFECTS ---
    // Save active view data back to process object
    useEffect(() => {
        if (!activeProcessId) return;
        
        setProcesses(prev => prev.map(p => {
            if (p.id === activeProcessId) {
                // Only update if something actually changed to avoid cycles
                if (p.evidence !== evidence || p.matrixData !== matrixData || p.evidenceTags !== evidenceTags) {
                    return { ...p, evidence, matrixData, evidenceTags };
                }
            }
            return p;
        }));
    }, [evidence, matrixData, evidenceTags, activeProcessId]);

    // Load process data into view when ID changes
    // CRITICAL: We only trigger this when activeProcessId changes, NOT when 'processes' changes
    // This prevents the 'processes' update loop from reverting user input in 'matrixData'
    useEffect(() => {
        if (!activeProcessId) {
            setEvidence("");
            setMatrixData({});
            setEvidenceTags([]);
            return;
        }
        
        const target = processes.find(p => p.id === activeProcessId);
        if (target) {
            setEvidence(target.evidence || "");
            setMatrixData(target.matrixData || {});
            setEvidenceTags(target.evidenceTags || []);
        }
    }, [activeProcessId]);

    // --- ACTIONS ---

    const addCustomStandard = (key: string, std: Standard) => {
        setCustomStandards(prev => ({ ...prev, [key]: std }));
    };

    const updateStandard = (std: Standard) => {
        setCustomStandards(prev => ({ ...prev, [standardKey]: std }));
    };

    const resetStandard = (key: string) => {
        // Just delete custom definition
        setCustomStandards(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        // If it was selected, unselect it
        if (standardKey === key) setStandardKey("");
    };

    // Process Actions
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
            const remaining = processes.filter(p => p.id !== idToDelete);
            const nextId = remaining.length > 0 ? remaining[0].id : null;
            setActiveProcessId(nextId);
        }
        setProcesses(prev => prev.filter(p => p.id !== idToDelete));
    };

    // HELPER to find clause details
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
        // 1. Prepare updates for the processes array (Storage)
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
        
        // 2. IMMEDIATE SYNC: If the active process is affected, update the View state instantly
        // This ensures real-time feedback without waiting for effect cycles
        const activeUpdate = updates.find(u => u.processId === activeProcessId);
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

    // Toggle specific clause for specific process (Add/Remove)
    const toggleProcessClause = (processId: string, clauseId: string) => {
        // 1. Update Storage (Processes Array)
        setProcesses(prev => prev.map(p => {
            if (p.id !== processId) return p;

            const newMatrixData = { ...p.matrixData };
            if (newMatrixData[clauseId]) {
                // DELETE
                delete newMatrixData[clauseId];
            } else {
                // ADD - PRE-LOAD DESCRIPTION HERE
                const standard = standards[standardKey];
                const clause = findClauseInStandard(clauseId, standard);
                const desc = clause?.description || "Requirement";
                
                newMatrixData[clauseId] = [{
                    id: `${clauseId}_req_0`,
                    requirement: desc, // Load real text immediately
                    evidenceInput: "",
                    status: 'pending'
                }];
            }
            return { ...p, matrixData: newMatrixData };
        }));

        // 2. IMMEDIATE SYNC: If the process is currently active on screen, update the View State directly.
        // This makes the toggle feel instant in the UI.
        if (activeProcessId === processId) {
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

    return (
        <AuditContext.Provider value={{
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
        }}>
            {children}
        </AuditContext.Provider>
    );
};

export const useAudit = () => {
    const context = useContext(AuditContext);
    if (!context) throw new Error("useAudit must be used within AuditProvider");
    return context;
};
