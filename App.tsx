
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE, MODEL_HIERARCHY, MY_FIXED_KEYS, BUILD_TIMESTAMP, DEFAULT_AUDIT_INFO } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, Standard, ApiKeyProfile, Clause, FindingsViewMode, SessionSnapshot } from './types';
import { Icon, FontSizeController, Toast, CommandPaletteModal } from './components/UI';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import ReferenceClauseModal from './components/ReferenceClauseModal';
import RecallModal from './components/RecallModal';
import { generateOcrContent, generateAnalysis, generateTextReport, validateApiKey, fetchFullClauseText } from './services/geminiService';
import { cleanAndParseJSON, fileToBase64, cleanFileName, copyToClipboard } from './utils';

// New Component Imports
import { EvidenceView } from './components/views/EvidenceView';
import { FindingsView } from './components/views/FindingsView';
import { ReportView } from './components/views/ReportView';
import { SettingsModal } from './components/modals/SettingsModal';
import { ExportProgressModal, ExportState } from './components/modals/ExportProgressModal';

declare var mammoth: any;

type LayoutMode = 'evidence' | 'findings' | 'report';
type ExportLanguage = 'en' | 'vi';

export interface UploadedFile {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
    result?: string;
}

export default function App() {
    // -- STATE --
    const [sessionKey, setSessionKey] = useState(Date.now());
    
    const [fontSizeScale, setFontSizeScale] = useState(1.0);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(420); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showIntegrityModal, setShowIntegrityModal] = useState(false);
    const [showRecallModal, setShowRecallModal] = useState(false); 
    
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
    const [findingsViewMode, setFindingsViewMode] = useState<FindingsViewMode>('list');
    const [focusedFindingIndex, setFocusedFindingIndex] = useState<number>(0); 
    
    const [apiKeys, setApiKeys] = useState<ApiKeyProfile[]>([]);
    const [activeKeyId, setActiveKeyId] = useState<string>("");
    const [newKeyInput, setNewKeyInput] = useState("");
    const [newKeyLabel, setNewKeyLabel] = useState("");
    const [isCheckingKey, setIsCheckingKey] = useState(false);
    
    const [isAutoCheckEnabled, setIsAutoCheckEnabled] = useState(false);
    
    const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
    const [editLabelInput, setEditLabelInput] = useState("");

    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false); 
    
    const isRestoring = useRef(false);
    const isManuallyCleared = useRef(false);

    const [referenceClauseState, setReferenceClauseState] = useState<{
        isOpen: boolean;
        clause: Clause | null;
        fullText: { en: string; vi: string };
        isLoading: boolean;
    }>({
        isOpen: false,
        clause: null,
        fullText: { en: "", vi: "" },
        isLoading: false,
    });

    const [exportLanguage, setExportLanguage] = useState<ExportLanguage>('en');
    const [notesLanguage, setNotesLanguage] = useState<ExportLanguage>('vi'); 
    const [evidenceLanguage, setEvidenceLanguage] = useState<ExportLanguage>('en'); 
    
    const [reportTemplate, setReportTemplate] = useState<string>("");
    const [templateFileName, setTemplateFileName] = useState<string>("");
    
    const [customStandards, setCustomStandards] = useState<StandardsData>({});
    const [standardKey, setStandardKey] = useState<string>("");
    const [auditInfo, setAuditInfo] = useState<AuditInfo>(DEFAULT_AUDIT_INFO);
    const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
    const [evidence, setEvidence] = useState(INITIAL_EVIDENCE);
    
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult[] | null>(null);
    const [selectedFindings, setSelectedFindings] = useState<Record<string, boolean>>({});
    const [finalReportText, setFinalReportText] = useState<string | null>(null);
    const [layoutMode, setLayoutMode] = useState('evidence' as LayoutMode);
    
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
    const [currentAnalyzingClause, setCurrentAnalyzingClause] = useState<string>(""); 
    const [loadingMessage, setLoadingMessage] = useState<string>(""); 
    const [isReportLoading, setIsReportLoading] = useState(false);
    
    const [exportState, setExportState] = useState<ExportState>({
        isOpen: false,
        isPaused: false,
        isFinished: false,
        totalChunks: 0,
        processedChunksCount: 0,
        chunks: [],
        results: [],
        error: null,
        currentType: 'report',
        targetLang: 'en'
    });
    
    const [aiError, setAiError] = useState<string | null>(null);
    const [isErrorClosing, setIsErrorClosing] = useState(false);
    const [rescueKey, setRescueKey] = useState("");
    const [isRescuing, setIsRescuing] = useState(false);

    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const tabsContainerRef = useRef<HTMLDivElement>(null); 
    const [tabStyle, setTabStyle] = useState({ left: 0, width: 0, opacity: 0, color: '' });
    
    const tabsList = [
        { id: 'evidence', label: '1. Evidence', icon: 'ScanText', colorClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-500', bgSoft: 'bg-blue-50 dark:bg-blue-950/30' }, 
        { id: 'findings', label: '2. Findings', icon: 'Wand2', colorClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-500', bgSoft: 'bg-purple-50 dark:bg-purple-950/30' }, 
        { id: 'report', label: '3. Report', icon: 'FileText', colorClass: 'bg-emerald-500', textClass: 'text-emerald-600', borderClass: 'border-emerald-500', bgSoft: 'bg-emerald-50 dark:bg-emerald-950/30' }
    ];

    const currentTabConfig = tabsList.find(t => t.id === layoutMode) || tabsList[0];
    const evidenceTextareaRef = useRef<HTMLTextAreaElement>(null);

    const allStandards = useMemo(() => ({ ...STANDARDS_DATA, ...customStandards }), [customStandards]);
    const hasEvidence = evidence.trim().length > 0 || uploadedFiles.length > 0;
    
    const isReadyForAnalysis = !isAnalyzeLoading && selectedClauses.length > 0 && hasEvidence;
    const isReadyToSynthesize = !isReportLoading && analysisResult && Object.values(selectedFindings).some(v => v);

    const poolStats = useMemo(() => {
        const total = apiKeys.length;
        const valid = apiKeys.filter(k => k.status === 'valid').length;
        return { total, valid };
    }, [apiKeys]);

    const activeKeyProfile = useMemo(() => apiKeys.find(k => k.id === activeKeyId), [apiKeys, activeKeyId]);
    const isSystemHealthy = activeKeyProfile?.status === 'valid';

    // --- KEY LOADING LOGIC ---
    const loadKeyData = (): ApiKeyProfile[] => {
        try {
            const stored = localStorage.getItem("iso_api_keys");
            const loadedKeys: ApiKeyProfile[] = stored ? JSON.parse(stored) : [];
            const existingKeySet = new Set(loadedKeys.map(k => k.key));
            let hasChanges = false;
            
            // Only add Fixed Keys if they are not empty AND not already in list
            MY_FIXED_KEYS.forEach((fixedKey, index) => {
                if (fixedKey && !existingKeySet.has(fixedKey)) {
                    loadedKeys.push({ id: `fixed_key_${index}_${Math.random().toString(36).substr(2, 5)}`, label: `Environment Key ${index + 1}`, key: fixedKey, status: 'unknown', latency: 0, lastChecked: new Date().toISOString() });
                    hasChanges = true;
                }
            });

            if (hasChanges) localStorage.setItem("iso_api_keys", JSON.stringify(loadedKeys));
            
            const savedActiveId = localStorage.getItem("iso_active_key_id");
            if (savedActiveId && loadedKeys.some(k => k.id === savedActiveId)) setActiveKeyId(savedActiveId);
            else if (loadedKeys.length > 0 && !activeKeyId) setActiveKeyId(loadedKeys[0].id);
            
            return loadedKeys;
        } catch (e) { console.error("Failed to load keys", e); return []; }
    };

    // --- BACKGROUND AUTO HEALTH CHECKER ---
    useEffect(() => {
        if (!isAutoCheckEnabled) return;
        const intervalId = setInterval(() => {
            if (!isAnalyzeLoading && !isOcrLoading && !isReportLoading && !isCheckingKey && apiKeys.length > 0) performBackgroundHealthCheck();
        }, 45000); 
        return () => clearInterval(intervalId);
    }, [isAutoCheckEnabled, isAnalyzeLoading, isOcrLoading, isReportLoading, isCheckingKey, apiKeys]);

    const performBackgroundHealthCheck = async () => {
        const sortedKeys = [...apiKeys].sort((a, b) => new Date(a.lastChecked || 0).getTime() - new Date(b.lastChecked || 0).getTime());
        const candidate = sortedKeys[0]; if (!candidate) return;
        setApiKeys(prev => prev.map(k => k.id === candidate.id ? { ...k, status: 'checking' } : k));
        const cap = await determineKeyCapabilities(candidate.key);
        const today = new Date().toISOString().split('T')[0];
        setApiKeys(prev => prev.map(k => k.id === candidate.id ? { ...k, status: cap.status, activeModel: cap.activeModel || k.activeModel, latency: cap.latency, lastChecked: new Date().toISOString(), lastResetDate: today } : k));
    };

    const dismissError = () => { setIsErrorClosing(true); setTimeout(() => { setAiError(null); setIsErrorClosing(false); }, 300); };

    const handleGenericError = (e: any) => {
        const msg = e.message || "Unknown error";
        if (msg.includes("ALL_KEYS_EXHAUSTED")) { setAiError("All API Keys have been exhausted or Quota exceeded."); setShowSettingsModal(true); }
        else if (msg.includes("API Key is missing")) { setToastMsg("API Key is required. Please check settings."); setShowSettingsModal(true); }
        else setAiError(msg);
    };

    const insertTextAtCursor = (textToInsert: string) => {
        if (evidenceTextareaRef.current) {
            const textarea = evidenceTextareaRef.current;
            const start = textarea.selectionStart; const end = textarea.selectionEnd; const currentText = textarea.value;
            const textWithBreaks = `\n${textToInsert.trim()}\n`;
            const newValue = currentText.substring(0, start) + textWithBreaks + currentText.substring(end);
            setEvidence(newValue);
            if (layoutMode !== 'evidence') setLayoutMode('evidence');
            setTimeout(() => { if (evidenceTextareaRef.current) { evidenceTextareaRef.current.focus(); evidenceTextareaRef.current.setSelectionRange(start + textWithBreaks.length, start + textWithBreaks.length); } }, 100);
        } else {
            setEvidence(prev => prev + "\n" + textToInsert.trim());
            if (layoutMode !== 'evidence') setLayoutMode('evidence');
        }
    };

    const determineKeyCapabilities = async (key: string): Promise<{ status: 'valid' | 'invalid' | 'quota_exceeded' | 'unknown', activeModel?: string, latency: number }> => {
        // Smart Validation: Tries default model first, then fallbacks
        const result = await validateApiKey(key);
        
        let status: 'valid' | 'invalid' | 'quota_exceeded' | 'unknown' = 'unknown';
        if (result.isValid) status = 'valid';
        else if (result.errorType === 'network_error') status = 'unknown'; // Allow network errors to be retried or kept as unknown rather than invalid
        else if (result.errorType) status = result.errorType as any;

        return { status, activeModel: result.activeModel, latency: result.latency };
    };

    const checkAllKeys = async (initialKeys: ApiKeyProfile[]) => {
        setIsCheckingKey(true); 
        // Visual indicator that check started
        setApiKeys(prev => prev.map(k => ({ ...k, status: 'checking' })));
        
        const today = new Date().toISOString().split('T')[0]; 
        const updatedKeys = [...initialKeys];
        
        let hasAtLeastOneValid = false;

        for (let i = 0; i < updatedKeys.length; i++) {
            const profile = updatedKeys[i]; 
            const cap = await determineKeyCapabilities(profile.key);
            
            // Construct updated profile
            updatedKeys[i] = { 
                ...profile, 
                status: cap.status, 
                activeModel: cap.activeModel, 
                latency: cap.latency, 
                lastChecked: new Date().toISOString(), 
                lastResetDate: today 
            };
            
            // Immediate State Update for UI feedback per item
            setApiKeys(prev => {
                const newArr = [...prev];
                const idx = newArr.findIndex(k => k.id === profile.id);
                if (idx !== -1) newArr[idx] = updatedKeys[i];
                return newArr;
            });

            if(cap.status === 'valid') hasAtLeastOneValid = true;
            await new Promise(r => setTimeout(r, 100)); // Slight delay to prevent UI freezing
        }

        // Final sync and active key switch logic
        setApiKeys(currentKeys => {
            const currentActiveProfile = currentKeys.find(k => k.id === activeKeyId);
            // If active key is bad, switch to a good one
            if (!currentActiveProfile || (currentActiveProfile.status !== 'valid' && currentActiveProfile.status !== 'unknown')) {
                const bestKey = currentKeys.filter(k => k.status === 'valid').sort((a, b) => a.latency - b.latency)[0];
                if (bestKey) { 
                    setActiveKeyId(bestKey.id); 
                    localStorage.setItem("iso_active_key_id", bestKey.id);
                    setTimeout(() => setToastMsg(`Auto-switched to healthy key: ${bestKey.label}`), 0); 
                } 
            }
            // Persist to local storage
            localStorage.setItem("iso_api_keys", JSON.stringify(currentKeys));
            return currentKeys;
        });

        setIsCheckingKey(false);
    };

    const handleRefreshStatus = async (id: string) => {
        const keyProfile = apiKeys.find(k => k.id === id); 
        if (!keyProfile) return;
        
        // Set specific item to checking
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'checking' } : k));
        
        const cap = await determineKeyCapabilities(keyProfile.key);
        
        setApiKeys(prev => {
            const next = prev.map(k => k.id === id ? { 
                ...k, 
                status: cap.status, 
                activeModel: cap.activeModel || k.activeModel, 
                latency: cap.latency, 
                lastChecked: new Date().toISOString() 
            } : k);
            localStorage.setItem("iso_api_keys", JSON.stringify(next));
            return next;
        });
    };

    const handleAddKey = async () => {
        if (!newKeyInput.trim()) return;
        if (apiKeys.some(k => k.key === newKeyInput.trim())) { setToastMsg("This API Key is already in your pool!"); setNewKeyInput(""); return; }
        
        setIsCheckingKey(true); 
        const tempId = Date.now().toString(); 
        const cap = await determineKeyCapabilities(newKeyInput);
        
        const newProfile: ApiKeyProfile = { 
            id: tempId, 
            label: newKeyLabel || `Key ${apiKeys.length + 1}`, 
            key: newKeyInput, 
            status: cap.status, 
            activeModel: cap.activeModel, 
            latency: cap.latency, 
            lastChecked: new Date().toISOString(), 
            lastResetDate: new Date().toISOString().split('T')[0] 
        };
        
        const nextKeys = [...apiKeys, newProfile];
        setApiKeys(nextKeys);
        localStorage.setItem("iso_api_keys", JSON.stringify(nextKeys));

        if (apiKeys.length === 0 || (activeKeyProfile?.status !== 'valid' && cap.status === 'valid')) {
            setActiveKeyId(tempId);
            localStorage.setItem("iso_active_key_id", tempId);
        }
        
        setNewKeyInput(""); setNewKeyLabel(""); setIsCheckingKey(false);
        if(cap.status === 'valid') setToastMsg("Key added successfully!");
        else setAiError("The key you added appears invalid or network is blocking it.");
    };

    // --- REFACTORED DELETE LOGIC ---
    const handleDeleteKey = (id: string) => {
        // 1. Calculate the new list *before* updating state
        const nextKeys = apiKeys.filter(k => k.id !== id);
        
        // 2. Determine new Active Key if we just deleted the current one
        let newActiveId = activeKeyId;
        if (activeKeyId === id) {
            const nextBest = nextKeys.find(k => k.status === 'valid') || nextKeys[0];
            newActiveId = nextBest ? nextBest.id : "";
        }

        // 3. Update States synchronously
        setApiKeys(nextKeys);
        if (newActiveId !== activeKeyId) {
            setActiveKeyId(newActiveId);
        }

        // 4. Persist Changes
        localStorage.setItem("iso_api_keys", JSON.stringify(nextKeys));
        if (newActiveId) {
            localStorage.setItem("iso_active_key_id", newActiveId);
        } else {
            localStorage.removeItem("iso_active_key_id");
        }
        
        setToastMsg("Key removed from pool.");
    };

    const executeWithSmartFailover = async <T,>(operation: (apiKey: string, model: string) => Promise<T>): Promise<T> => {
        const candidates = apiKeys.filter(k => k.status !== 'invalid').sort((a, b) => {
            if (a.status === 'valid' && b.status !== 'valid') return -1;
            if (a.status !== 'valid' && b.status === 'valid') return 1;
            if (a.id === activeKeyId) return -1;
            if (b.id === activeKeyId) return 1;
            return a.latency - b.latency;
        });
        if (candidates.length === 0) throw new Error("API Key is missing or all keys are invalid.");
        let lastError: any;
        for (const profile of candidates) {
            const modelToUse = profile.activeModel || MODEL_HIERARCHY[0];
            try {
                if (profile.id !== activeKeyId) setActiveKeyId(profile.id);
                const result = await operation(profile.key, modelToUse);
                return result;
            } catch (error: any) {
                console.warn(`Key ${profile.label} failed on ${modelToUse}:`, error); lastError = error;
                const msg = (error.message || "").toLowerCase();
                if (msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted")) setApiKeys(prev => prev.map(k => k.id === profile.id ? { ...k, status: 'quota_exceeded' } : k));
                else if (msg.includes("403") || msg.includes("key not valid") || msg.includes("permission denied")) setApiKeys(prev => prev.map(k => k.id === profile.id ? { ...k, status: 'invalid' } : k));
            }
        }
        throw new Error(lastError?.message || "ALL_KEYS_EXHAUSTED");
    };

    const loadSessionData = () => {
        try {
            const session = localStorage.getItem("iso_session_data");
            const customStds = localStorage.getItem("iso_custom_standards");
            if (customStds) setCustomStandards(JSON.parse(customStds));
            if (session) {
                const data = JSON.parse(session);
                if (data.standardKey) setStandardKey(data.standardKey);
                if (data.auditInfo) setAuditInfo({ ...DEFAULT_AUDIT_INFO, ...data.auditInfo });
                if (data.selectedClauses) setSelectedClauses(data.selectedClauses);
                if (data.evidence) setEvidence(data.evidence);
                if (data.analysisResult) setAnalysisResult(data.analysisResult);
                if (data.selectedFindings) setSelectedFindings(data.selectedFindings);
                if (data.finalReportText) setFinalReportText(data.finalReportText);
                setLastSavedTime(new Date().toLocaleTimeString());
                setToastMsg("Previous session restored.");
            }
        } catch (e) { 
            console.error("Load failed", e);
        }
    };

    const handleUpdateStandard = (std: Standard) => { setCustomStandards(prev => ({ ...prev, [standardKey]: std })); setToastMsg("Standard updated successfully."); };
    const handleResetStandard = (key: string) => { setCustomStandards(prev => { const next = { ...prev }; delete next[key]; return next; }); setToastMsg("Standard reset to default."); };
    
    // --- ROBUST AUTO-SAVE LOGIC ---
    useEffect(() => {
        if (isRestoring.current) return;
        const isEmptyState = !evidence && (!selectedClauses || selectedClauses.length === 0);
        if (isEmptyState && !isManuallyCleared.current) {
            if (localStorage.getItem("iso_session_data")) {
                return; 
            }
        }
        setIsSaving(true);
        const handler = setTimeout(() => {
            if (isRestoring.current) {
                setIsSaving(false);
                return;
            }
            const sessionData = { standardKey, auditInfo, selectedClauses, evidence, analysisResult, selectedFindings, finalReportText };
            localStorage.setItem("iso_session_data", JSON.stringify(sessionData));
            localStorage.setItem("iso_custom_standards", JSON.stringify(customStandards));
            // Also save API keys on auto-save just in case
            localStorage.setItem("iso_api_keys", JSON.stringify(apiKeys));
            
            if (isManuallyCleared.current) isManuallyCleared.current = false;
            const now = new Date();
            setLastSavedTime(now.toLocaleTimeString());
            setIsSaving(false);
        }, 800); 
        return () => clearTimeout(handler);
    }, [standardKey, auditInfo, selectedClauses, evidence, analysisResult, selectedFindings, finalReportText, customStandards, apiKeys]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!isRestoring.current) {
                const sessionData = { standardKey, auditInfo, selectedClauses, evidence, analysisResult, selectedFindings, finalReportText };
                localStorage.setItem("iso_session_data", JSON.stringify(sessionData));
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [standardKey, auditInfo, selectedClauses, evidence, analysisResult, selectedFindings, finalReportText]);

    const handleNewSession = (e?: any) => { 
        if(e) e.stopPropagation(); 
        if(!confirm("Start New Session? Current data will be moved to 'Backup Vault'.")) return; 
        try {
            const currentData = { standardKey, auditInfo, selectedClauses, evidence, analysisResult, selectedFindings, finalReportText };
            const hasData = evidence.trim().length > 0 || selectedClauses.length > 0;
            if (hasData) {
                const snapshot: SessionSnapshot = {
                    id: `backup_${Date.now()}`,
                    timestamp: Date.now(),
                    label: "Backup (Pre-Reset)",
                    triggerType: "MANUAL_BACKUP",
                    data: currentData
                };
                const historyRaw = localStorage.getItem("iso_session_history");
                const history = historyRaw ? JSON.parse(historyRaw) : [];
                const newHistory = [snapshot, ...history].slice(0, 5);
                localStorage.setItem("iso_session_history", JSON.stringify(newHistory));
            }
            isManuallyCleared.current = true;
            localStorage.removeItem("iso_session_data");
            // UPDATED: Reset Standard to empty
            setStandardKey("");
            setAuditInfo(DEFAULT_AUDIT_INFO); 
            setEvidence(""); 
            setSelectedClauses([]); 
            setUploadedFiles([]); 
            setAnalysisResult(null); 
            setSelectedFindings({}); 
            setFinalReportText(null); 
            setLastSavedTime(null); 
            setSessionKey(Date.now());
            setLayoutMode('evidence'); 
            setToastMsg("New Session Started. (Previous session archived in Recall)");
        } catch (error) {
            console.error("New Session Error", error);
            setToastMsg("Error creating backup. Session reset anyway.");
        }
    };
    
    const handleRestoreSnapshot = (snapshot: SessionSnapshot) => {
        try {
            isRestoring.current = true;
            setShowRecallModal(false);
            const data = snapshot.data;
            localStorage.setItem("iso_session_data", JSON.stringify(data));
            if (data.standardKey) setStandardKey(data.standardKey);
            setAuditInfo({ ...DEFAULT_AUDIT_INFO, ...(data.auditInfo || {}) });
            if (data.selectedClauses) setSelectedClauses(data.selectedClauses);
            if (data.evidence !== undefined) setEvidence(data.evidence);
            setUploadedFiles([]); 
            if (data.analysisResult) setAnalysisResult(data.analysisResult);
            if (data.selectedFindings) setSelectedFindings(data.selectedFindings);
            if (data.finalReportText) setFinalReportText(data.finalReportText);
            setSessionKey(Date.now());
            const now = new Date();
            setLastSavedTime(now.toLocaleTimeString());
            setToastMsg(`Restored session from: ${new Date(snapshot.timestamp).toLocaleTimeString()}`);
            setTimeout(() => {
                isRestoring.current = false;
                isManuallyCleared.current = false; 
            }, 1200);
        } catch (e) {
            console.error("Restore failed", e);
            setToastMsg("Failed to restore session snapshot.");
            isRestoring.current = false;
        }
    };

    const handleOcrUpload = async () => {
        const pendingFiles = uploadedFiles.filter(f => f.status === 'pending' || f.status === 'error');
        if (pendingFiles.length === 0) return;
        setIsOcrLoading(true); setLoadingMessage("Processing documents with Vision AI...");
        let processedCount = 0;
        for (const fileEntry of pendingFiles) {
            try {
                setUploadedFiles(prev => prev.map(f => f.id === fileEntry.id ? { ...f, status: 'processing' } : f));
                let text = "";
                if (fileEntry.file.type === 'text/plain') text = await fileEntry.file.text();
                else {
                    const base64 = await fileToBase64(fileEntry.file);
                    text = await executeWithSmartFailover(async (key, model) => generateOcrContent("Extract all text.", base64, fileEntry.file.type, key, model));
                }
                if (text) {
                    const separator = `\n\n--- FILE: ${fileEntry.file.name} ---\n`;
                    insertTextAtCursor(separator + text);
                    setUploadedFiles(prev => prev.map(f => f.id === fileEntry.id ? { ...f, status: 'success', result: text } : f));
                    processedCount++;
                } else throw new Error("No text extracted");
            } catch (error: any) {
                console.error("OCR Error", error);
                setUploadedFiles(prev => prev.map(f => f.id === fileEntry.id ? { ...f, status: 'error', error: error.message || "Failed" } : f));
            }
        }
        setIsOcrLoading(false); setLoadingMessage(""); setToastMsg(`Processed ${processedCount} files.`);
    };

    const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; setTemplateFileName(file.name);
        try {
            if (file.name.endsWith('.docx')) {
                if (typeof mammoth === 'undefined') { alert("Mammoth library not loaded for .docx support"); return; }
                const arrayBuffer = await file.arrayBuffer(); const result = await mammoth.extractRawText({ arrayBuffer }); setReportTemplate(result.value);
            } else { const text = await file.text(); setReportTemplate(text); }
            setToastMsg("Template loaded successfully.");
        } catch (err) { setToastMsg("Failed to load template."); console.error(err); }
    };

    const startSmartExport = (content: string, type: 'notes' | 'report' | 'evidence', lang: ExportLanguage) => {
        if (!content) return;
        const CHUNK_SIZE = 4000; const chunks = []; for (let i = 0; i < content.length; i += CHUNK_SIZE) chunks.push(content.substring(i, i + CHUNK_SIZE));
        setExportState({ isOpen: true, isPaused: false, isFinished: false, totalChunks: chunks.length, processedChunksCount: 0, chunks, results: new Array(chunks.length).fill(""), error: null, currentType: type, targetLang: lang });
    };

    const toggleAutoCheck = (enabled: boolean) => { setIsAutoCheckEnabled(enabled); localStorage.setItem('iso_auto_check', String(enabled)); setToastMsg(enabled ? "Auto-health check enabled." : "Auto-health check disabled."); };
    const handleStartEdit = (keyProfile: ApiKeyProfile) => { setEditingKeyId(keyProfile.id); setEditLabelInput(keyProfile.label); };
    const handleSaveLabel = () => { if (editingKeyId) { setApiKeys(prev => prev.map(k => k.id === editingKeyId ? { ...k, label: editLabelInput } : k)); setEditingKeyId(null); } };
    
    
    const handleOpenReferenceClause = async (clause: Clause) => {
        setReferenceClauseState({ isOpen: true, clause, isLoading: true, fullText: { en: "", vi: "" } });
        try {
            const text = await executeWithSmartFailover(async (key, model) => fetchFullClauseText(clause, allStandards[standardKey].name, key, model));
            setReferenceClauseState(prev => ({ ...prev, isLoading: false, fullText: text }));
        } catch (e: any) {
            setReferenceClauseState({ isOpen: false, clause: null, isLoading: false, fullText: { en: "", vi: "" } });
            setAiError("API Failed during lookup."); setShowSettingsModal(true); 
        }
    };

    const handleInsertReferenceText = (text: string) => {
        if (!referenceClauseState.clause) return;
        const quoteText = `\n--- REFERENCE: [${referenceClauseState.clause.code}] ${referenceClauseState.clause.title} ---\n${text}\n--- END REFERENCE ---\n`.trim();
        insertTextAtCursor(quoteText);
        setReferenceClauseState({ isOpen: false, clause: null, isLoading: false, fullText: { en: "", vi: "" } });
    };

    useEffect(() => {
        document.documentElement.style.setProperty('--font-scale', fontSizeScale.toString());
        localStorage.setItem('iso_font_scale', fontSizeScale.toString());
        window.dispatchEvent(new Event('resize'));
    }, [fontSizeScale]);

    useEffect(() => {
        console.log(`%c ISO Audit Pro v${APP_VERSION} %c ${BUILD_TIMESTAMP}`, 'background: #4f46e5; color: white; padding: 2px 4px; border-radius: 4px;', 'color: #64748b;');
        const storedScale = localStorage.getItem('iso_font_scale'); if (storedScale) setFontSizeScale(parseFloat(storedScale));
        loadSessionData();
        const loadedKeys = loadKeyData();
        setApiKeys(loadedKeys);
        if (!hasStartupChecked.current && loadedKeys.length > 0) { 
            hasStartupChecked.current = true; 
            checkAllKeys(loadedKeys); 
        }
        const savedAutoCheck = localStorage.getItem('iso_auto_check'); if (savedAutoCheck !== null) setIsAutoCheckEnabled(savedAutoCheck === 'true');
        const savedDarkMode = localStorage.getItem('iso_dark_mode'); if (savedDarkMode !== null) setIsDarkMode(savedDarkMode === 'true'); else setIsDarkMode(true); 
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) { root.classList.add('dark'); document.body.classList.add('dark'); }
        else { root.classList.remove('dark'); document.body.classList.remove('dark'); }
        localStorage.setItem('iso_dark_mode', String(isDarkMode));
    }, [isDarkMode]);

    const hasStartupChecked = useRef(false);

    useEffect(() => {
        const updateTabs = () => { const activeIndex = tabsList.findIndex(t => t.id === layoutMode); const el = tabsRef.current[activeIndex]; if (el) { setTabStyle({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1, color: tabsList[activeIndex].colorClass }); } };
        updateTabs(); const t = setTimeout(updateTabs, 50); const observer = new ResizeObserver(() => updateTabs()); if (tabsContainerRef.current) observer.observe(tabsContainerRef.current); return () => { clearTimeout(t); observer.disconnect(); };
    }, [layoutMode, sidebarWidth, fontSizeScale]); 

    const processNextExportChunk = async () => {
        const { processedChunksCount, chunks, targetLang, results, currentType } = exportState;
        if (processedChunksCount >= exportState.totalChunks) return;
        const index = processedChunksCount; const chunk = chunks[index]; const targetLangName = targetLang === 'vi' ? "Vietnamese" : "English";
        const prompt = currentType === 'evidence' ? `TASK: Perform a 100% literal and verbatim translation of the following text into ${targetLangName}. Do NOT summarize. Output ONLY the translated text: """${chunk}"""` : `Act as an ISO Lead Auditor. Translate/Refine to ${targetLangName}: """${chunk}"""`;
        try {
            const result = await executeWithSmartFailover(async (key, model) => generateTextReport(prompt, "Professional ISO Translator.", key, model));
            const newResults = [...results]; newResults[index] = result && result.trim() ? result : chunk;
            setExportState(prev => ({ ...prev, processedChunksCount: prev.processedChunksCount + 1, results: newResults }));
        } catch (error: any) {
            if (error.message.includes("ALL_KEYS")) setExportState(prev => ({ ...prev, isPaused: true, error: "All keys exhausted." }));
            else { const newResults = [...results]; newResults[index] = chunk; setExportState(prev => ({ ...prev, processedChunksCount: prev.processedChunksCount + 1, results: newResults })); }
        }
    };

    const finishExport = () => {
        setExportState(prev => ({ ...prev, isFinished: true }));
        const contentToExport = exportState.results.join('\n\n');
        let stdShort = cleanFileName(standardKey).substring(0, 10) || "ISO";
        const typeSuffix = exportState.currentType === 'notes' ? 'Audit_Findings' : exportState.currentType === 'evidence' ? 'Audit_Evidence' : 'Audit_Report';
        const fileName = `${stdShort}_${cleanFileName(auditInfo.type)}_${cleanFileName(auditInfo.smo)}_${cleanFileName(auditInfo.company)}_${typeSuffix}_${new Date().toISOString().split('T')[0]}`;
        const blob = new Blob([contentToExport], {type: 'text/plain;charset=utf-8'});
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${fileName}.txt`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => setExportState(prev => ({ ...prev, isOpen: false })), 2000);
    };

    useEffect(() => {
        if (exportState.isOpen && !exportState.isPaused && !exportState.isFinished && exportState.processedChunksCount < exportState.totalChunks) processNextExportChunk();
        else if (exportState.isOpen && exportState.processedChunksCount >= exportState.totalChunks && !exportState.isFinished) finishExport();
    }, [exportState]);

    const handleAnalyze = async () => {
        if (!isReadyForAnalysis) return;
        setIsAnalyzeLoading(true); setAiError(null); setAnalysisResult([]); setLayoutMode('findings'); 
        
        const healthyKeysCount = apiKeys.filter(k => k.status === 'valid').length;
        const CONCURRENCY_LIMIT = Math.max(2, Math.min(6, healthyKeysCount + 2));
        
        setLoadingMessage(`Initializing Turbo Analysis (Parallel Threads: ${CONCURRENCY_LIMIT})...`);

        try {
            const allClausesInStandard = allStandards[standardKey].groups.flatMap(g => g.clauses);
            const flatten = (list: Clause[]): Clause[] => list.reduce((acc, c) => {
                acc.push(c);
                if (c.subClauses) acc.push(...flatten(c.subClauses));
                return acc;
            }, [] as Clause[]);
            const flatAllClauses = flatten(allClausesInStandard);
            const scopeClauses = selectedClauses.map(id => flatAllClauses.find(c => c.id === id)).filter((c): c is Clause => !!c);
            
            for (let i = 0; i < scopeClauses.length; i += CONCURRENCY_LIMIT) {
                const batch = scopeClauses.slice(i, i + CONCURRENCY_LIMIT);
                const batchCodes = batch.map(c => c.code).join(", ");
                
                setCurrentAnalyzingClause(batchCodes); 
                setLoadingMessage(`Turbo Analyzing Batch: [${batchCodes}]...`);

                const promises = batch.map(async (clause) => {
                    const prompt = `Act as an ISO Lead Auditor. Evaluate compliance for this SINGLE clause: [${clause.code}] ${clause.title}: ${clause.description}\nCONTEXT: ${auditInfo.type} for ${auditInfo.company}.\nRAW EVIDENCE: """ ${evidence} """\nReturn a JSON Array with exactly ONE object containing: clauseId (must be "${clause.id}"), status (COMPLIANT, NC_MAJOR, NC_MINOR, OFI), reason, suggestion, evidence, conclusion_report (concise).`;
                    try {
                        const resultStr = await executeWithSmartFailover(async (key, model) => generateAnalysis(prompt, `Output JSON array only.`, key, model));
                        return { clause, resultStr, error: null };
                    } catch (innerError: any) {
                        if (innerError.message.includes("ALL_")) throw innerError; 
                        console.error(`Failed to analyze clause ${clause.code}`, innerError);
                        return { clause, resultStr: null, error: innerError };
                    }
                });

                const results = await Promise.all(promises);

                setAnalysisResult(prev => {
                    const prevSafe = prev || [];
                    const newItems = [...prevSafe];
                    
                    results.forEach(res => {
                        if (res.error || !res.resultStr) return; 
                        const chunkResult = cleanAndParseJSON(res.resultStr);
                        if (chunkResult && Array.isArray(chunkResult) && chunkResult.length > 0) {
                            const resultItem = chunkResult[0];
                            resultItem.clauseId = res.clause.id;
                            if (!newItems.find(r => r.clauseId === resultItem.clauseId)) {
                                newItems.push(resultItem);
                            }
                        }
                    });
                    return newItems;
                });
                
                setSelectedFindings(prev => {
                    const next = { ...prev };
                    results.forEach(res => {
                         if (!res.error && res.resultStr) next[res.clause.id] = true;
                    });
                    return next;
                });

                await new Promise(r => setTimeout(r, 100));
            }
        } catch (e: any) { 
           handleGenericError(e);
        } finally { setIsAnalyzeLoading(false); setCurrentAnalyzingClause(""); setLoadingMessage(""); }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult) return;
        setIsReportLoading(true); setLayoutMode('report'); setAiError(null);
        const hasTemplate = !!reportTemplate;
        setLoadingMessage(hasTemplate ? `Analyzing Template & Synthesizing Report...` : "Synthesizing Standard ISO Report...");
        try {
             const acceptedFindings = analysisResult.filter(r => selectedFindings[r.clauseId]);
             let prompt = hasTemplate 
                ? `ROLE: You are an expert ISO Lead Auditor. TASK: Generate a final audit report by STRICTly following the provided TEMPLATE structure. INPUT 1: REPORT TEMPLATE: """ ${reportTemplate} """ INPUT 2: AUDIT DATA: Context: ${JSON.stringify(auditInfo)}, Findings: ${JSON.stringify(acceptedFindings)}. Output final report text directly.`
                : `GENERATE FINAL REPORT. DATA: ${JSON.stringify(auditInfo)}. FINDINGS: ${JSON.stringify(acceptedFindings)}. Use standard ISO professional reporting format.`;
             const text = await executeWithSmartFailover(async (key, model) => generateTextReport(prompt, "Expert ISO Report Compiler.", key, model));
             setFinalReportText(text || "");
        } catch (e: any) { 
           handleGenericError(e);
        } finally { setIsReportLoading(false); setLoadingMessage(""); }
    };

    const handleResumeExport = async () => {
        if (rescueKey.trim()) {
            setIsRescuing(true);
            const cap = await determineKeyCapabilities(rescueKey);
            if (cap.status === 'valid') {
                 const newId = Date.now().toString();
                 setApiKeys(prev => [...prev, { id: newId, label: `Rescue Key`, key: rescueKey, status: 'valid', activeModel: cap.activeModel, latency: cap.latency, lastChecked: new Date().toISOString() }]);
                 setActiveKeyId(newId);
                 setRescueKey("");
                 setExportState(prev => ({ ...prev, isPaused: false, error: null }));
            }
            setIsRescuing(false);
        } else {
            setApiKeys(prev => prev.map(k => k.status === 'quota_exceeded' ? { ...k, status: 'valid' } : k));
            setExportState(prev => ({ ...prev, isPaused: false, error: null }));
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCmdPaletteOpen(prev => !prev); } };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const commandActions = useMemo(() => {
        const baseActions: any[] = [
            { 
                label: "Debug: Load UAT Mock Data", 
                desc: "Simulate full audit flow: Info, Evidence & Findings (TechGlobal Case)", 
                icon: "Cpu", 
                action: () => {
                    setAuditInfo({
                        company: "TechGlobal Manufacturing Solutions Ltd.",
                        smo: "24-UAT-TEST-001",
                        department: "Production, QC, and Supply Chain",
                        interviewee: "Mr. Sarah Connors (Plant Mgr), Dave Bowman (QC)",
                        auditor: "T-800 Model 101 (Lead Auditor)",
                        type: "Stage 2 Certification Audit"
                    });
                    setStandardKey("ISO 9001:2015");
                    const mockClauses = ["4.1", "5.2", "6.1", "7.1.3", "8.5.1", "9.2"];
                    setSelectedClauses(mockClauses);
                    const mockEvidence = `--- AUDIT INTERVIEW NOTES ---...`; // Simplified for brevity
                    setEvidence(mockEvidence);
                    // Mock data...
                    setLayoutMode('findings');
                    setToastMsg("UAT Data Loaded: Ready for Report Synthesis.");
                    setIsCmdPaletteOpen(false);
                } 
            },
            { label: "Analyze Compliance", desc: `Start AI analysis (Turbo: ${Math.max(2, Math.min(6, poolStats.valid + 2))} threads)`, icon: "Wand2", shortcut: "AI", action: handleAnalyze },
            { label: "Validate API Key Pool", desc: "Check connection health", icon: "RefreshCw", action: () => { checkAllKeys(apiKeys); setToastMsg("Validating Neural Pool..."); } },
            { label: "Standard Health & Changes", desc: "View integrity & repair options", icon: "Session10_Pulse", action: () => setShowIntegrityModal(true) },
            { label: "Clear All Clause Selection", desc: "Remove all clauses from scope", icon: "Trash2", action: () => { setSelectedClauses([]); setToastMsg("All clauses removed from scope."); } },
            { label: "Toggle Dark Mode", desc: `Switch to ${isDarkMode ? 'Light' : 'Dark'}`, icon: isDarkMode ? "Sun" : "Moon", action: () => setIsDarkMode(!isDarkMode) },
            { label: "Generate Report", desc: "Synthesize final report", icon: "FileText", action: handleGenerateReport },
            { label: "Settings", desc: "Manage configuration", icon: "Settings", action: () => setShowSettingsModal(true) },
        ];
        if (standardKey && allStandards[standardKey]) {
            const flatten = (list: Clause[]): Clause[] => list.reduce((acc, c) => {
                acc.push(c);
                if (c.subClauses) acc.push(...flatten(c.subClauses));
                return acc;
            }, [] as Clause[]);
            const allClauses = flatten(allStandards[standardKey].groups.flatMap(g => g.clauses));
            const clauseActions = allClauses.map(c => ({
                label: `[${c.code}] ${c.title}`,
                desc: c.description,
                icon: "Session6_Zap",
                type: 'clause',
                action: () => {
                    const isSelected = selectedClauses.includes(c.id);
                    if (isSelected) setSelectedClauses(prev => prev.filter(id => id !== c.id));
                    else setSelectedClauses(prev => [...prev, c.id]);
                    insertTextAtCursor(`[${c.code}] ${c.title}`);
                    setToastMsg(`Inserted clause ${c.code} and ${isSelected ? 'removed from' : 'added to'} audit scope.`);
                    setIsCmdPaletteOpen(false);
                },
                onReference: (e: any) => {
                    e.stopPropagation();
                    handleOpenReferenceClause(c);
                    setIsCmdPaletteOpen(false);
                }
            }));
            return [...baseActions, ...clauseActions];
        }
        return baseActions;
    }, [isDarkMode, standardKey, allStandards, selectedClauses, activeKeyId, apiKeys, poolStats.valid]); 

    const displayBadge = useMemo(() => {
        const currentStandardName = allStandards[standardKey]?.name || "";
        const match = currentStandardName.match(/\((.*?)\)/);
        return match ? match[1] : (currentStandardName.split(' ')[0] || 'ISO');
    }, [standardKey, allStandards]);

    const badgeColorClass = useMemo(() => {
        const text = displayBadge.toUpperCase();
        if (text.includes('EMS') || text.includes('14001')) return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50";
        if (text.includes('QMS') || text.includes('9001')) return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50";
        if (text.includes('ISMS') || text.includes('27001')) return "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50";
        return "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50";
    }, [displayBadge]);

    const getAnalyzeTooltip = () => {
        if (isAnalyzeLoading) return "AI is analyzing...";
        const missing = [];
        if (selectedClauses.length === 0) missing.push("Clauses");
        if (!hasEvidence) missing.push("Evidence");
        return missing.length > 0 ? `Missing: ${missing.join(" & ")}` : "Click to Start AI Analysis";
    };

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-gray-50 dark:bg-slate-900 transition-colors duration-500 ease-soft relative">
            {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

            {aiError && (
                <div className={`fixed z-[9999] top-20 left-4 right-4 md:left-auto md:right-5 md:w-96 md:max-w-sm bg-white dark:bg-slate-800 border-l-4 border-red-500 shadow-2xl rounded-r-xl p-4 animate-shake transition-all duration-300 ${isErrorClosing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold"><Icon name="AlertCircle" size={20}/><span>System Alert</span></div>
                        <button onClick={dismissError} className="text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"><Icon name="X" size={18}/></button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">{aiError}</p>
                </div>
            )}

            <header className="flex-shrink-0 px-4 md:px-6 py-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-[70] relative flex justify-between items-center h-16 transition-all duration-300">
                <div className="flex items-center h-full gap-3 md:gap-5">
                    <div className="relative group cursor-pointer flex items-center justify-center transition-all duration-500 hover:opacity-100 active:scale-95" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="Toggle Sidebar">
                        <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="relative z-10">
                                {isSidebarOpen ? <div className="relative w-8 h-8"><div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-cyan-500 rounded-full animate-infinity-spin drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div><div className="absolute inset-2 border-2 border-transparent border-l-purple-500 border-r-pink-500 rounded-full animate-spin-reverse drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]"></div></div>
                                    : <div className="hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(0,242,195,0.6)]"><Icon name="TDLogo" size={32} /></div> }
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <h1 className="hidden md:block text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">ISO Audit <span className="font-light text-slate-400">Pro</span></h1>
                        <div className="flex items-center"><span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm uppercase tracking-wider backdrop-blur-sm transition-colors duration-300 ${badgeColorClass}`}>{displayBadge}</span></div>
                    </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button onClick={() => setIsCmdPaletteOpen(true)} className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95" title="Command Palette (Ctrl+K)">
                        <Icon name="Session6_Zap" size={20}/>
                    </button>
                    <div className="hidden lg:block"><FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir: 'increase' | 'decrease') => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} /></div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/></button>
                    <button onClick={() => setShowSettingsModal(true)} className="group relative w-8 h-8 flex items-center justify-center transition-all" title="Connection Status">
                        <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${isSystemHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <div className={`relative w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 ${isSystemHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </button>
                    <button onClick={() => setShowAboutModal(true)} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all" title="About & Release Notes"><Icon name="Info" size={18}/></button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-16 bottom-0 left-0 z-[60] md:absolute md:inset-y-0 md:relative md:top-0 md:translate-x-0 md:transform-none transition-transform duration-300 ease-soft h-[calc(100%-4rem)] md:h-full`}>
                    <Sidebar key={sessionKey} isOpen={isSidebarOpen} width={sidebarWidth} setWidth={setSidebarWidth} standards={allStandards} standardKey={standardKey} setStandardKey={setStandardKey} auditInfo={auditInfo} setAuditInfo={setAuditInfo} selectedClauses={selectedClauses} setSelectedClauses={setSelectedClauses} onAddNewStandard={() => {}} onUpdateStandard={handleUpdateStandard} onResetStandard={handleResetStandard} onReferenceClause={handleOpenReferenceClause} showIntegrityModal={showIntegrityModal} setShowIntegrityModal={setShowIntegrityModal}/>
                </div>
                {isSidebarOpen && <div className="fixed top-16 bottom-0 inset-x-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />}
                
                <div className={`flex-1 flex flex-col min-w-0 relative w-full transition-all duration-300 ease-soft ${currentTabConfig.bgSoft} border-t-4 ${currentTabConfig.borderClass}`}>
                    
                    <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <div ref={tabsContainerRef} className="relative flex justify-between bg-gray-100 dark:bg-slate-950 p-1 rounded-xl w-full dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                                <div className={`absolute top-1 bottom-1 shadow-sm rounded-lg transition-all duration-500 ease-fluid-spring z-0 ${tabStyle.color}`} style={{ left: tabStyle.left, width: tabStyle.width, opacity: tabStyle.opacity }} />
                                {tabsList.map((tab, idx) => (
                                    <button key={tab.id} ref={el => { tabsRef.current[idx] = el; }} onClick={() => setLayoutMode(tab.id as LayoutMode)} className={`flex-1 relative z-10 flex items-center justify-center gap-2 px-1 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors duration-300 ${layoutMode === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                                        <Icon name={tab.icon} size={16}/> 
                                        <span className={`${isSidebarOpen ? 'hidden xl:inline' : 'hidden md:inline'}`}>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0 pl-2 border-l border-gray-200 dark:border-slate-800">
                            <button 
                                onClick={() => setShowRecallModal(true)} 
                                className={`h-10 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 border ${lastSavedTime ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`} 
                                title={lastSavedTime ? `Last Auto-Saved: ${lastSavedTime}. Click to Open Time Machine.` : "Open Session History"}
                            >
                                <div className="relative">
                                    <Icon name="History" size={18}/>
                                    {lastSavedTime && (
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            {isSaving && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSaving ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                        </span>
                                    )}
                                </div>
                                <span className="hidden xl:inline text-xs font-bold">Recall</span>
                            </button>

                            <button 
                                onClick={(e) => handleNewSession(e)} 
                                className="h-10 w-10 md:w-auto md:px-4 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:text-amber-700 dark:hover:text-amber-400 duration-300 active:scale-95" 
                                title="Start New Session (Archives current data)"
                            >
                                <Icon name="Session4_FilePlus" size={18}/>
                                <span className="hidden md:inline text-xs font-bold">New</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative p-2 md:p-4">
                        {/* Evidence View */}
                        {layoutMode === 'evidence' && (
                            <EvidenceView
                                evidence={evidence}
                                setEvidence={setEvidence}
                                uploadedFiles={uploadedFiles}
                                setUploadedFiles={setUploadedFiles}
                                onOcrProcess={handleOcrUpload}
                                isOcrLoading={isOcrLoading}
                                onAnalyze={handleAnalyze}
                                isReadyForAnalysis={isReadyForAnalysis}
                                isAnalyzeLoading={isAnalyzeLoading}
                                analyzeTooltip={getAnalyzeTooltip()}
                                onExport={startSmartExport}
                                evidenceLanguage={evidenceLanguage}
                                setEvidenceLanguage={setEvidenceLanguage}
                                textareaRef={evidenceTextareaRef}
                            />
                        )}
                        
                        {/* Findings View */}
                        {layoutMode === 'findings' && (
                            <FindingsView
                                analysisResult={analysisResult}
                                setAnalysisResult={setAnalysisResult}
                                selectedFindings={selectedFindings}
                                setSelectedFindings={setSelectedFindings}
                                isAnalyzeLoading={isAnalyzeLoading}
                                loadingMessage={loadingMessage}
                                currentAnalyzingClause={currentAnalyzingClause}
                                viewMode={findingsViewMode}
                                setViewMode={setFindingsViewMode}
                                focusedFindingIndex={focusedFindingIndex}
                                setFocusedFindingIndex={setFocusedFindingIndex}
                                onExport={startSmartExport}
                                notesLanguage={notesLanguage}
                                setNotesLanguage={setNotesLanguage}
                            />
                        )}

                        {/* Report View */}
                        {layoutMode === 'report' && (
                            <ReportView
                                finalReportText={finalReportText}
                                setFinalReportText={setFinalReportText}
                                isReportLoading={isReportLoading}
                                loadingMessage={loadingMessage}
                                templateFileName={templateFileName}
                                handleTemplateUpload={handleTemplateUpload}
                                handleGenerateReport={handleGenerateReport}
                                isReadyToSynthesize={isReadyToSynthesize}
                                onExport={startSmartExport}
                                exportLanguage={exportLanguage}
                                setExportLanguage={setExportLanguage}
                            />
                        )}
                    </div>
                </div>
            </main>

            <CommandPaletteModal 
                isOpen={isCmdPaletteOpen} 
                onClose={() => setIsCmdPaletteOpen(false)} 
                actions={commandActions} 
                onSelectAction={(action: any) => { action.action(); }} 
            />
            
            <ReleaseNotesModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />

            <ReferenceClauseModal 
                isOpen={referenceClauseState.isOpen} 
                onClose={() => setReferenceClauseState(prev => ({ ...prev, isOpen: false }))}
                clause={referenceClauseState.clause}
                standardName={allStandards[standardKey]?.name || ""}
                fullText={referenceClauseState.fullText}
                isLoading={referenceClauseState.isLoading}
                onInsert={handleInsertReferenceText}
            />

            <RecallModal
                isOpen={showRecallModal}
                onClose={() => setShowRecallModal(false)}
                onRestore={handleRestoreSnapshot}
            />

            <ExportProgressModal 
                exportState={exportState}
                setExportState={setExportState}
                rescueKey={rescueKey}
                setRescueKey={setRescueKey}
                handleResumeExport={handleResumeExport}
                isRescuing={isRescuing}
            />

            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                apiKeys={apiKeys}
                newKeyInput={newKeyInput}
                setNewKeyInput={setNewKeyInput}
                isCheckingKey={isCheckingKey}
                handleAddKey={handleAddKey}
                activeKeyId={activeKeyId}
                editingKeyId={editingKeyId}
                editLabelInput={editLabelInput}
                setEditLabelInput={setEditLabelInput}
                handleSaveLabel={handleSaveLabel}
                handleStartEdit={handleStartEdit}
                handleRefreshStatus={handleRefreshStatus}
                handleDeleteKey={handleDeleteKey}
                isAutoCheckEnabled={isAutoCheckEnabled}
                toggleAutoCheck={toggleAutoCheck}
            />
        </div>
    );
}
