
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE, MODEL_HIERARCHY, MODEL_META, MY_FIXED_KEYS } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, Standard, ApiKeyProfile, Clause, FindingsViewMode, FindingStatus } from './types';
import { Icon, FontSizeController, SparkleLoader, Modal, AINeuralLoader, Toast, CommandPaletteModal } from './components/UI';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import ReferenceClauseModal from './components/ReferenceClauseModal';
import { generateOcrContent, generateAnalysis, generateTextReport, validateApiKey, fetchFullClauseText } from './services/geminiService';
import { cleanAndParseJSON, fileToBase64, cleanFileName, copyToClipboard } from './utils';

declare var mammoth: any;

type LayoutMode = 'evidence' | 'findings' | 'report' | 'split';
type ExportLanguage = 'en' | 'vi';

interface ExportState {
    isOpen: boolean;
    isPaused: boolean;
    isFinished: boolean;
    totalChunks: number;
    processedChunksCount: number;
    chunks: string[];
    results: string[];
    error: string | null;
    currentType: 'notes' | 'report' | 'evidence';
    targetLang: ExportLanguage;
}

interface UploadedFile {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
    result?: string;
}

function App() {
    // -- STATE --
    const [fontSizeScale, setFontSizeScale] = useState(1.0);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(420); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showIntegrityModal, setShowIntegrityModal] = useState(false);
    
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
    const [findingsViewMode, setFindingsViewMode] = useState<FindingsViewMode>('list');
    
    const [apiKeys, setApiKeys] = useState<ApiKeyProfile[]>([]);
    const [activeKeyId, setActiveKeyId] = useState<string>("");
    const [newKeyInput, setNewKeyInput] = useState("");
    const [newKeyLabel, setNewKeyLabel] = useState("");
    const [isCheckingKey, setIsCheckingKey] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    const [isAutoCheckEnabled, setIsAutoCheckEnabled] = useState(false);
    
    const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
    const [editLabelInput, setEditLabelInput] = useState("");

    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

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
    const [isDragging, setIsDragging] = useState(false);
    
    const [reportTemplate, setReportTemplate] = useState<string>("");
    const [templateFileName, setTemplateFileName] = useState<string>("");
    
    const [customStandards, setCustomStandards] = useState<StandardsData>({});
    const [standardKey, setStandardKey] = useState<string>("ISO 9001:2015");
    const [auditInfo, setAuditInfo] = useState<AuditInfo>({ company: "", smo: "", department: "", interviewee: "", auditor: "", type: "" });
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
        { id: 'evidence', label: '1. Evidence', icon: 'ScanText', colorClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-500', bgSoft: 'bg-blue-50 dark:bg-blue-900/10' }, 
        { id: 'findings', label: '2. Findings', icon: 'Wand2', colorClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-500', bgSoft: 'bg-purple-50 dark:bg-purple-900/10' }, 
        { id: 'report', label: '3. Report', icon: 'FileText', colorClass: 'bg-emerald-500', textClass: 'text-emerald-600', borderClass: 'border-emerald-500', bgSoft: 'bg-emerald-50 dark:bg-emerald-900/10' }
    ];

    const currentTabConfig = tabsList.find(t => t.id === layoutMode) || tabsList[0];
    const fileInputRef = useRef<HTMLInputElement>(null);
    const evidenceTextareaRef = useRef<HTMLTextAreaElement>(null);
    const findingsContainerRef = useRef<HTMLDivElement>(null);
    const findingRefs = useRef<(HTMLDivElement | null)[]>([]);

    const allStandards = useMemo(() => ({ ...STANDARDS_DATA, ...customStandards }), [customStandards]);
    const hasEvidence = evidence.trim().length > 0 || uploadedFiles.length > 0;
    
    const isReadyForAnalysis = !isAnalyzeLoading && selectedClauses.length > 0 && hasEvidence;
    const isReadyToSynthesize = !isReportLoading && analysisResult && Object.values(selectedFindings).some(v => v);

    // Compute Pool Health Statistics
    const poolStats = useMemo(() => {
        const total = apiKeys.length;
        const valid = apiKeys.filter(k => k.status === 'valid').length;
        const quotaExceeded = apiKeys.filter(k => k.status === 'quota_exceeded').length;
        const tier1Count = apiKeys.filter(k => k.status === 'valid' && k.activeModel === MODEL_HIERARCHY[0]).length;
        
        let rawScore = 0;
        apiKeys.forEach(k => {
            if (k.status === 'valid') {
                if (k.activeModel === MODEL_HIERARCHY[0]) rawScore += 100; // Pro 3.0
                else if (k.activeModel === MODEL_HIERARCHY[1]) rawScore += 70; // Flash 3.0
                else rawScore += 40; // Legacy/Lite
            }
        });
        const maxPossible = total * 100;
        const healthPercent = total > 0 ? Math.round((rawScore / maxPossible) * 100) : 0;

        return { total, valid, quotaExceeded, tier1Count, healthPercent };
    }, [apiKeys]);

    const activeKeyProfile = useMemo(() => apiKeys.find(k => k.id === activeKeyId), [apiKeys, activeKeyId]);
    const isSystemHealthy = activeKeyProfile?.status === 'valid';

    // --- KEY LOADING LOGIC (Fixing the request to use constants) ---
    const loadKeyData = (): ApiKeyProfile[] => {
        try {
            const stored = localStorage.getItem("iso_api_keys");
            const loadedKeys: ApiKeyProfile[] = stored ? JSON.parse(stored) : [];
            const existingKeySet = new Set(loadedKeys.map(k => k.key));
            let hasChanges = false;
            MY_FIXED_KEYS.forEach((fixedKey, index) => {
                if (!existingKeySet.has(fixedKey)) {
                    loadedKeys.push({ id: `fixed_key_${index}_${Math.random().toString(36).substr(2, 5)}`, label: `Fixed Key ${index + 1}`, key: fixedKey, status: 'unknown', latency: 0, lastChecked: new Date().toISOString() });
                    hasChanges = true;
                }
            });
            if (hasChanges) localStorage.setItem("iso_api_keys", JSON.stringify(loadedKeys));
            const legacyKey = localStorage.getItem("iso_api_key");
            if (loadedKeys.length === 0 && legacyKey && !MY_FIXED_KEYS.includes(legacyKey)) {
                const newId = Date.now().toString();
                loadedKeys.push({ id: newId, label: "Default Key", key: legacyKey, status: 'unknown', latency: 0, lastChecked: new Date().toISOString() });
                setActiveKeyId(newId);
                localStorage.setItem("iso_active_key_id", newId);
            }
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
        setApiKeys(prev => prev.map(k => k.id === candidate.id ? { ...k, status: cap.status, activeModel: cap.bestModel || k.activeModel, latency: cap.latency, lastChecked: new Date().toISOString(), lastResetDate: today } : k));
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

    const determineKeyCapabilities = async (key: string): Promise<{ status: 'valid' | 'invalid' | 'quota_exceeded' | 'unknown', bestModel?: string, latency: number }> => {
        let lastErrorType: 'invalid' | 'quota_exceeded' | 'unknown' = 'unknown';
        for (const model of MODEL_HIERARCHY) {
            const result = await validateApiKey(key, model);
            if (result.isValid) return { status: 'valid', bestModel: model, latency: result.latency };
            if (result.errorType) lastErrorType = result.errorType;
            if (result.errorType === 'invalid') return { status: 'invalid', latency: 0 };
            await new Promise(r => setTimeout(r, 600));
        }
        return { status: lastErrorType, latency: 0 };
    };

    const checkAllKeys = async (initialKeys: ApiKeyProfile[]) => {
        setIsCheckingKey(true); setApiKeys(prev => prev.map(k => ({ ...k, status: 'checking' })));
        const today = new Date().toISOString().split('T')[0]; const updatedKeys = [...initialKeys];
        for (let i = 0; i < updatedKeys.length; i++) {
            const profile = updatedKeys[i]; const cap = await determineKeyCapabilities(profile.key);
            updatedKeys[i] = { ...profile, status: cap.status, activeModel: cap.bestModel, latency: cap.latency, lastChecked: new Date().toISOString(), lastResetDate: today };
            setApiKeys(prev => prev.map(k => k.id === profile.id ? updatedKeys[i] : k));
            await new Promise(r => setTimeout(r, 500)); 
        }
        setApiKeys(currentKeys => {
            const currentActiveProfile = currentKeys.find(k => k.id === activeKeyId);
            if (!currentActiveProfile || currentActiveProfile.status !== 'valid') {
                const bestKey = currentKeys.filter(k => k.status === 'valid').sort((a, b) => a.latency - b.latency)[0];
                if (bestKey) { setActiveKeyId(bestKey.id); setTimeout(() => setToastMsg(`Auto-switched to healthy key: ${bestKey.label}`), 0); } 
            }
            return currentKeys;
        });
        setIsCheckingKey(false);
    };

    const handleRefreshStatus = async (id: string) => {
        const keyProfile = apiKeys.find(k => k.id === id); if (!keyProfile) return;
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'checking' } : k));
        const cap = await determineKeyCapabilities(keyProfile.key);
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: cap.status, activeModel: cap.bestModel || k.activeModel, latency: cap.latency, lastChecked: new Date().toISOString() } : k));
    };

    const handleAddKey = async () => {
        if (!newKeyInput.trim()) return;
        if (apiKeys.some(k => k.key === newKeyInput.trim())) { setToastMsg("This API Key is already in your pool!"); setNewKeyInput(""); return; }
        setIsCheckingKey(true); const tempId = Date.now().toString(); const cap = await determineKeyCapabilities(newKeyInput);
        const newProfile: ApiKeyProfile = { id: tempId, label: newKeyLabel || `Key ${apiKeys.length + 1}`, key: newKeyInput, status: cap.status, activeModel: cap.bestModel, latency: cap.latency, lastChecked: new Date().toISOString(), lastResetDate: new Date().toISOString().split('T')[0] };
        setApiKeys(prev => [...prev, newProfile]);
        if (apiKeys.length === 0 || (activeKeyProfile?.status !== 'valid' && cap.status === 'valid')) setActiveKeyId(tempId);
        setNewKeyInput(""); setNewKeyLabel(""); setIsCheckingKey(false);
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
                if (data.auditInfo) setAuditInfo(data.auditInfo);
                if (data.selectedClauses) setSelectedClauses(data.selectedClauses);
                if (data.evidence) setEvidence(data.evidence);
                if (data.analysisResult) setAnalysisResult(data.analysisResult);
                if (data.selectedFindings) setSelectedFindings(data.selectedFindings);
                if (data.finalReportText) setFinalReportText(data.finalReportText);
                setToastMsg("Previous session restored automatically.");
            }
        } catch (e) { console.error("Load failed", e); }
    };

    const handleUpdateStandard = (std: Standard) => { setCustomStandards(prev => ({ ...prev, [standardKey]: std })); setToastMsg("Standard updated successfully."); };
    const handleResetStandard = (key: string) => { setCustomStandards(prev => { const next = { ...prev }; delete next[key]; return next; }); setToastMsg("Standard reset to default."); };
    
    // --- UPDATED NEW SESSION & RECALL LOGIC ---
    
    const handleNewSession = (e?: any) => { 
        if(e) e.stopPropagation(); 
        if(!confirm("Start new session? Current fields will be cleared (Backup saved).")) return; 
        
        // 1. SAVE BACKUP SNAPSHOT BEFORE CLEARING
        const currentSession = { standardKey, auditInfo, selectedClauses, evidence, analysisResult, selectedFindings, finalReportText };
        localStorage.setItem("iso_backup_session", JSON.stringify(currentSession));
        
        // 2. CLEAR STATE
        setEvidence(""); setUploadedFiles([]); setAnalysisResult(null); setFinalReportText(null); 
        setSelectedClauses([]); setSelectedFindings({}); 
        setAuditInfo({ company: "", smo: "", department: "", interviewee: "", auditor: "", type: "" }); 
        setLayoutMode('evidence'); 
        
        setToastMsg("New session started. Previous data backed up."); 
    };
    
    const handleRecallBackup = () => {
        const backup = localStorage.getItem("iso_backup_session");
        if (!backup) { setToastMsg("No backup session found to recall."); return; }
        
        if (hasEvidence && !confirm("Overwrite current active fields with backup data?")) return;
        
        try {
            const data = JSON.parse(backup);
            if (data.standardKey) setStandardKey(data.standardKey);
            if (data.auditInfo) setAuditInfo(data.auditInfo);
            if (data.selectedClauses) setSelectedClauses(data.selectedClauses);
            if (data.evidence) setEvidence(data.evidence);
            if (data.analysisResult) setAnalysisResult(data.analysisResult);
            if (data.selectedFindings) setSelectedFindings(data.selectedFindings);
            if (data.finalReportText) setFinalReportText(data.finalReportText);
            setToastMsg("Recalled data from last backup.");
        } catch (e) {
            console.error("Recall failed", e);
            setToastMsg("Failed to recall backup data.");
        }
    };

    const processNewFiles = (files: File[]) => { const newFiles = files.map(f => ({ id: Math.random().toString(36).substr(2, 9), file: f, status: 'pending' as const })); setUploadedFiles(prev => [...prev, ...newFiles]); setToastMsg(`${newFiles.length} file(s) added to queue.`); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { processNewFiles(Array.from(e.dataTransfer.files)); } };
    const handlePaste = (e: React.ClipboardEvent) => { if (e.clipboardData.files && e.clipboardData.files.length > 0) { e.preventDefault(); processNewFiles(Array.from(e.clipboardData.files)); } };
    const handleRemoveFile = (id: string) => { setUploadedFiles(prev => prev.filter(f => f.id !== id)); };

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
    const handleDeleteKey = (id: string) => { if (confirm("Delete this API key?")) { setApiKeys(prev => prev.filter(k => k.id !== id)); if (activeKeyId === id) setActiveKeyId(""); } };
    
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
        const storedScale = localStorage.getItem('iso_font_scale'); if (storedScale) setFontSizeScale(parseFloat(storedScale));
        loadSessionData();
        const loadedKeys = loadKeyData();
        setApiKeys(loadedKeys);
        if (!hasStartupChecked.current && loadedKeys.length > 0) { hasStartupChecked.current = true; checkAllKeys(loadedKeys); }
        const savedAutoCheck = localStorage.getItem('iso_auto_check'); if (savedAutoCheck !== null) setIsAutoCheckEnabled(savedAutoCheck === 'true');
        const savedDarkMode = localStorage.getItem('iso_dark_mode'); if (savedDarkMode !== null) setIsDarkMode(savedDarkMode === 'true'); else setIsDarkMode(true); 
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    }, []);
    
    // --- REAL-TIME SAVING EFFECT ---
    useEffect(() => {
        const sessionData = { standardKey, auditInfo, selectedClauses, evidence, analysisResult, selectedFindings, finalReportText };
        localStorage.setItem("iso_session_data", JSON.stringify(sessionData));
        localStorage.setItem("iso_custom_standards", JSON.stringify(customStandards));
        localStorage.setItem("iso_api_keys", JSON.stringify(apiKeys));
        
        // Update visual timestamp for "Real-Time Saved"
        const now = new Date();
        setLastSavedTime(now.toLocaleTimeString());
    }, [standardKey, auditInfo, selectedClauses, evidence, analysisResult, selectedFindings, finalReportText, customStandards, apiKeys]);

    // --- FIX: Robust Dark Mode handling ---
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

    useEffect(() => { if (layoutMode === 'findings' && findingsContainerRef.current) findingsContainerRef.current.scrollTop = findingsContainerRef.current.scrollHeight; }, [analysisResult?.length]);

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

    const handleUpdateFinding = (index: number, field: keyof AnalysisResult, value: string) => {
        setAnalysisResult(prev => { if (!prev) return null; const newArr = [...prev]; newArr[index] = { ...newArr[index], [field]: value }; return newArr; });
        if (field === 'status' && analysisResult) { const nextIndex = index + 1; if (nextIndex < analysisResult.length && findingRefs.current[nextIndex]) setTimeout(() => findingRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }
    };

    // --- REPLACED: Sequential Analysis with Parallel Batch Processing (Turbo Mode) ---
    const handleAnalyze = async () => {
        if (!isReadyForAnalysis) return;
        setIsAnalyzeLoading(true); setAiError(null); setAnalysisResult([]); setLayoutMode('findings'); 
        
        // TURBO MODE: Calculate concurrency based on available health keys
        // Logic: 2 threads base, plus 1 thread for every valid key, capped at 6 to be safe for browsers.
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
            
            // --- BATCH PROCESSING LOOP ---
            for (let i = 0; i < scopeClauses.length; i += CONCURRENCY_LIMIT) {
                const batch = scopeClauses.slice(i, i + CONCURRENCY_LIMIT);
                const batchCodes = batch.map(c => c.code).join(", ");
                
                setCurrentAnalyzingClause(batchCodes); 
                setLoadingMessage(`Turbo Analyzing Batch: [${batchCodes}]...`);

                // Fire requests in parallel
                const promises = batch.map(async (clause) => {
                    const prompt = `Act as an ISO Lead Auditor. Evaluate compliance for this SINGLE clause: [${clause.code}] ${clause.title}: ${clause.description}\nCONTEXT: ${auditInfo.type} for ${auditInfo.company}.\nRAW EVIDENCE: """ ${evidence} """\nReturn a JSON Array with exactly ONE object containing: clauseId (must be "${clause.id}"), status (COMPLIANT, NC_MAJOR, NC_MINOR, OFI), reason, suggestion, evidence, conclusion_report (concise).`;
                    try {
                        const resultStr = await executeWithSmartFailover(async (key, model) => generateAnalysis(prompt, `Output JSON array only.`, key, model));
                        return { clause, resultStr, error: null };
                    } catch (innerError: any) {
                        if (innerError.message.includes("ALL_")) throw innerError; // Stop global if all keys dead
                        console.error(`Failed to analyze clause ${clause.code}`, innerError);
                        return { clause, resultStr: null, error: innerError };
                    }
                });

                const results = await Promise.all(promises);

                // Process results
                setAnalysisResult(prev => {
                    const prevSafe = prev || [];
                    const newItems = [...prevSafe];
                    
                    results.forEach(res => {
                        if (res.error || !res.resultStr) return; // Skip failed
                        const chunkResult = cleanAndParseJSON(res.resultStr);
                        if (chunkResult && Array.isArray(chunkResult) && chunkResult.length > 0) {
                            const resultItem = chunkResult[0];
                            resultItem.clauseId = res.clause.id;
                            
                            // Avoid duplicates if re-running
                            if (!newItems.find(r => r.clauseId === resultItem.clauseId)) {
                                newItems.push(resultItem);
                            }
                        }
                    });
                    return newItems;
                });
                
                // Update selection map in separate state
                setSelectedFindings(prev => {
                    const next = { ...prev };
                    results.forEach(res => {
                         if (!res.error && res.resultStr) next[res.clause.id] = true;
                    });
                    return next;
                });

                // Small breather for the event loop
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
                 setApiKeys(prev => [...prev, { id: newId, label: `Rescue Key`, key: rescueKey, status: 'valid', activeModel: cap.bestModel, latency: cap.latency, lastChecked: new Date().toISOString() }]);
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

    const getFindingColorClass = (status: FindingStatus) => {
        switch (status) {
            case 'COMPLIANT': return 'bg-emerald-500 text-white';
            case 'NC_MAJOR': return 'bg-red-600 text-white';
            case 'NC_MINOR': return 'bg-orange-500 text-white';
            case 'OFI': return 'bg-blue-500 text-white';
            default: return 'bg-gray-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
        }
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
                <div className="flex items-center gap-2">
                    {/* AUTO SAVE INDICATOR */}
                    {lastSavedTime && (
                        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 rounded-full border border-gray-100 dark:border-slate-800 text-[10px] font-medium text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Auto-saved
                        </div>
                    )}
                    
                    <button onClick={() => setIsCmdPaletteOpen(true)} className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95" title="Open Command Palette (Ctrl+K)">
                        <Icon name="Session6_Zap" size={20}/>
                    </button>
                    <div className="hidden lg:block"><FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir: 'increase' | 'decrease') => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} /></div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/></button>
                    <button onClick={() => setShowSettingsModal(true)} className="group relative w-8 h-8 flex items-center justify-center transition-all" title="Connection Status">
                        {/* FIX: Status Indicator now reflects REAL status of the active key */}
                        <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${isSystemHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <div className={`relative w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 ${isSystemHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </button>
                    <button onClick={() => setShowAboutModal(true)} className="ml-1 p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Icon name="Info" size={18}/></button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-16 bottom-0 left-0 z-[60] md:absolute md:inset-y-0 md:relative md:top-0 md:translate-x-0 md:transform-none transition-transform duration-300 ease-soft h-[calc(100%-4rem)] md:h-full`}>
                    <Sidebar isOpen={isSidebarOpen} width={sidebarWidth} setWidth={setSidebarWidth} standards={allStandards} standardKey={standardKey} setStandardKey={setStandardKey} auditInfo={auditInfo} setAuditInfo={setAuditInfo} selectedClauses={selectedClauses} setSelectedClauses={setSelectedClauses} onAddNewStandard={() => {}} onUpdateStandard={handleUpdateStandard} onResetStandard={handleResetStandard} onReferenceClause={handleOpenReferenceClause} showIntegrityModal={showIntegrityModal} setShowIntegrityModal={setShowIntegrityModal}/>
                </div>
                {isSidebarOpen && <div className="fixed top-16 bottom-0 inset-x-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />}
                
                <div className={`flex-1 flex flex-col min-w-0 relative w-full transition-all duration-300 ease-soft ${currentTabConfig.bgSoft} border-t-4 ${currentTabConfig.borderClass}`}>
                    
                    <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <div ref={tabsContainerRef} className="relative flex justify-between bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full">
                                <div className={`absolute top-1 bottom-1 shadow-sm rounded-lg transition-all duration-500 ease-fluid-spring z-0 ${tabStyle.color}`} style={{ left: tabStyle.left, width: tabStyle.width, opacity: tabStyle.opacity }} />
                                {tabsList.map((tab, idx) => (
                                    <button key={tab.id} ref={el => { tabsRef.current[idx] = el; }} onClick={() => setLayoutMode(tab.id as LayoutMode)} className={`flex-1 relative z-10 flex items-center justify-center gap-2 px-1 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors duration-300 ${layoutMode === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                        <Icon name={tab.icon} size={16}/> 
                                        <span className={`${isSidebarOpen ? 'hidden xl:inline' : 'hidden md:inline'}`}>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0 pl-2 border-l border-gray-200 dark:border-slate-800">
                            <button onClick={handleRecallBackup} className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95" title="Recall Previous Session (Backup)"><Icon name="History" size={18}/></button>
                            <button onClick={(e) => handleNewSession(e)} className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all shadow-sm hover:text-indigo-600 dark:hover:text-indigo-400 duration-300 hover:scale-105 active:scale-95" title="Start New Session (Clears Fields)"><Icon name="Session4_FilePlus" size={18}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative p-4 md:p-6">
                        {/* Evidence View */}
                        {layoutMode === 'evidence' && (
                            <div className="h-full flex flex-col gap-4 animate-fade-in-up relative">
                                <div className="flex-1 flex flex-col gap-4 min-h-0">
                                    <div 
                                        className={`flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border overflow-hidden flex flex-col relative group transition-all duration-300 ${isDragging ? 'border-indigo-500 ring-4 ring-indigo-500/20 bg-indigo-50/10' : 'border-gray-100 dark:border-slate-800'}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        {isDragging && (
                                            <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                                <div className="p-6 rounded-full bg-white dark:bg-slate-900 shadow-2xl border-4 border-dashed border-indigo-500">
                                                    <Icon name="UploadCloud" size={48} className="text-indigo-600 animate-bounce" />
                                                </div>
                                                <h3 className="mt-4 text-xl font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-center">Drop Files to Extract<br/><span className="text-sm font-normal normal-case">(Images, PDF, TXT)</span></h3>
                                            </div>
                                        )}
                                        <textarea ref={evidenceTextareaRef} className="flex-1 w-full h-full p-6 pb-6 bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-300 font-medium text-sm leading-relaxed text-justify break-words whitespace-pre-wrap" placeholder="Paste audit evidence here or drag files (Images, PDF, TXT) directly..." value={evidence} onChange={(e) => setEvidence(e.target.value)} onPaste={handlePaste} />
                                    </div>
                                    {uploadedFiles.length > 0 && (
                                        <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl animate-in slide-in-from-bottom-5 duration-300">
                                            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                                                {uploadedFiles.map((fileEntry) => (
                                                    <div key={fileEntry.id} className={`relative group flex-shrink-0 w-24 h-24 bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${fileEntry.status === 'error' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-100 dark:border-slate-700'}`}>
                                                        {fileEntry.file.type.startsWith('image/') ? (
                                                            <img src={URL.createObjectURL(fileEntry.file)} alt="preview" className={`w-full h-full object-cover transition-opacity ${fileEntry.status === 'processing' ? 'opacity-30' : 'opacity-80 group-hover:opacity-100'}`} />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 p-2 text-center">
                                                                <Icon name={fileEntry.file.type === 'application/pdf' ? 'FileText' : 'Book'} size={24} className="text-indigo-600 dark:text-indigo-400 mb-1" />
                                                                <span className="text-[8px] font-bold text-indigo-700 dark:text-indigo-300 truncate w-full">{fileEntry.file.name}</span>
                                                            </div>
                                                        )}
                                                        
                                                        {fileEntry.status === 'processing' && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-black/40">
                                                                <Icon name="Loader" className="animate-spin text-indigo-600" size={24}/>
                                                            </div>
                                                        )}
                                                        {fileEntry.status === 'success' && (
                                                            <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                                                <Icon name="CheckThick" size={10}/>
                                                            </div>
                                                        )}
                                                        {fileEntry.status === 'error' && (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/80 dark:bg-red-950/80 p-1 text-center">
                                                                <Icon name="AlertCircle" size={20} className="text-red-600" />
                                                                <span className="text-[7px] font-black text-red-600 uppercase leading-tight mt-1">{fileEntry.error || 'Lỗi'}</span>
                                                            </div>
                                                        )}

                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                                            <button onClick={() => handleRemoveFile(fileEntry.id)} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transform scale-90 hover:scale-110 transition-all duration-200"><Icon name="X" size={14}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
                                                    <button onClick={handleOcrUpload} disabled={isOcrLoading || !uploadedFiles.some(f => f.status === 'pending' || f.status === 'error')} className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:scale-105 duration-300">
                                                        {isOcrLoading ? <Icon name="Loader" className="animate-spin" size={24}/> : <Icon name="ScanText" size={24}/>}
                                                        <span className="text-[10px] font-bold">Process</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-shrink-0 flex items-center justify-between w-full gap-[5px] md:w-auto md:justify-end md:gap-3">
                                    <div className="flex flex-1 gap-[5px] md:flex-none md:gap-3">
                                        <div className="flex-1 md:w-auto flex items-center justify-center">
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain" multiple onChange={(e) => e.target.files && processNewFiles(Array.from(e.target.files))} />
                                            <button onClick={() => fileInputRef.current?.click()} className={`w-full h-10 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm border ${uploadedFiles.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'}`} title="Upload Files">
                                                <Icon name={uploadedFiles.length > 0 ? "Demo1_MultiFiles" : "Demo8_GridPlus"} size={18}/>
                                                <span className="hidden md:inline">Upload</span>
                                            </button>
                                        </div>
                                        <button onClick={handleAnalyze} disabled={!isReadyForAnalysis} title={getAnalyzeTooltip()} className={`h-10 px-3 md:px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 shrink-0 flex-1 md:w-auto ${isReadyForAnalysis ? "btn-shrimp shadow-xl active:scale-95" : "bg-gray-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-70 cursor-not-allowed border border-transparent"}`}>
                                            {isAnalyzeLoading ? <SparkleLoader className="text-white"/> : <Icon name="Wand2" size={18}/>}
                                            <span className="hidden md:inline text-xs uppercase tracking-wider">Analyze</span>
                                        </button>
                                    </div>
                                    <button onClick={() => startSmartExport(evidence, 'evidence', evidenceLanguage)} disabled={!evidence || !evidence.trim()} className="h-10 px-3 md:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50 flex-1 md:flex-none min-w-[50px]">
                                        <Icon name="Download"/> 
                                        <span className="hidden md:inline">Export Raw</span>
                                        <div className="lang-pill-container ml-1">
                                            <span onClick={(e) => {e.stopPropagation(); setEvidenceLanguage('en');}} className={`lang-pill-btn ${evidenceLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                            <span onClick={(e) => {e.stopPropagation(); setEvidenceLanguage('vi');}} className={`lang-pill-btn ${evidenceLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Findings View */}
                        {layoutMode === 'findings' && (
                            <div className="h-full flex flex-col gap-4 animate-fade-in-up">
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-1" ref={findingsContainerRef}>
                                    {!analysisResult && !isAnalyzeLoading && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                            <Icon name="Wand2" size={48} className="mb-4 text-gray-200 dark:text-slate-700"/>
                                            <p>No analysis results yet.</p>
                                        </div>
                                    )}
                                    {isAnalyzeLoading && (
                                        <div className="h-full flex flex-col items-center justify-center">
                                            <div className="relative w-24 h-24 mb-6">
                                                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full opacity-50"></div>
                                                <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                                                <div className="absolute inset-4 border-r-4 border-purple-500 rounded-full animate-spin-reverse opacity-70"></div>
                                            </div>
                                            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse mb-2">
                                                AI Analysis In Progress
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{loadingMessage}</p>
                                            <p className="text-xs text-slate-400 font-mono">
                                                {currentAnalyzingClause && `Processing: [${currentAnalyzingClause}]`}
                                            </p>
                                        </div>
                                    )}
                                    {analysisResult && (
                                        <div className="space-y-4">
                                            {analysisResult.map((res, idx) => (
                                                <div 
                                                    key={idx} 
                                                    ref={el => { findingRefs.current[idx] = el; }}
                                                    className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg ${selectedFindings[res.clauseId] ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-gray-100 dark:border-slate-800 opacity-70 hover:opacity-100'}`}
                                                    onClick={() => setSelectedFindings(prev => ({...prev, [res.clauseId]: !prev[res.clauseId]}))}
                                                >
                                                    <div className="absolute top-4 right-4 z-10">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedFindings[res.clauseId] ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-slate-600 bg-transparent'}`}>
                                                            {selectedFindings[res.clauseId] && <Icon name="CheckLineart" size={12} className="text-white" />}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-4 pr-10">
                                                        <div className={`p-2 rounded-xl shrink-0 ${getFindingColorClass(res.status as FindingStatus)}`}>
                                                            <span className="text-xs font-black uppercase">{res.status.replace('NC_', '')}</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-xs font-black text-slate-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">{res.clauseId}</span>
                                                            </div>
                                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">{res.reason}</h4>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800/50">
                                                                <strong className="block mb-1 text-indigo-600 dark:text-indigo-400">Evidence:</strong>
                                                                {res.evidence}
                                                            </p>
                                                            {res.suggestion && (
                                                                <div className="mt-3 flex gap-2 items-start">
                                                                    <Icon name="Lightbulb" size={14} className="text-amber-500 mt-0.5 shrink-0"/>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">{res.suggestion}</p>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Manual Edit Controls (Visible on Hover/Focus) */}
                                                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                <select 
                                                                    value={res.status}
                                                                    onChange={(e) => handleUpdateFinding(idx, 'status', e.target.value)}
                                                                    className="w-full text-xs p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500"
                                                                >
                                                                    <option value="COMPLIANT">Compliant</option>
                                                                    <option value="NC_MINOR">Minor NC</option>
                                                                    <option value="NC_MAJOR">Major NC</option>
                                                                    <option value="OFI">OFI</option>
                                                                </select>
                                                                <textarea 
                                                                    value={res.reason}
                                                                    onChange={(e) => handleUpdateFinding(idx, 'reason', e.target.value)}
                                                                    className="w-full text-xs p-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 resize-none h-8 focus:h-20 transition-all"
                                                                    placeholder="Edit finding reason..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-shrink-0 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 p-2 rounded-xl border border-gray-100 dark:border-slate-800">
                                    <div className="flex gap-2">
                                        <button onClick={() => { 
                                            const allIds = analysisResult?.reduce((acc: any, r) => ({...acc, [r.clauseId]: true}), {});
                                            if(allIds) setSelectedFindings(allIds);
                                        }} className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">Select All</button>
                                        <button onClick={() => setSelectedFindings({})} className="text-[10px] font-bold text-slate-500 hover:bg-gray-100 px-2 py-1 rounded transition-colors">Deselect All</button>
                                    </div>
                                    <button onClick={handleGenerateReport} disabled={!isReadyToSynthesize} className={`h-10 px-6 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 shadow-lg ${isReadyToSynthesize ? "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 hover:shadow-indigo-500/30" : "bg-gray-200 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed"}`}>
                                        <Icon name="FileText" size={18}/>
                                        <span>Generate Report</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Report View */}
                        {layoutMode === 'report' && (
                            <div className="h-full flex flex-col gap-4 animate-fade-in-up">
                                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col relative">
                                    {isReportLoading && <AINeuralLoader message={loadingMessage} />}
                                    
                                    {!finalReportText && !isReportLoading && !reportTemplate && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-full mb-4">
                                                <Icon name="FileText" size={32} className="text-indigo-400"/>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Report Not Generated</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                                                Complete the analysis step and select findings to synthesize your final ISO audit report. You can also load a template below.
                                            </p>
                                        </div>
                                    )}

                                    <textarea 
                                        className="flex-1 w-full h-full p-8 bg-transparent resize-none focus:outline-none text-slate-800 dark:text-slate-200 font-serif text-base leading-relaxed whitespace-pre-wrap" 
                                        placeholder={reportTemplate ? "Template loaded. Ready to generate..." : ""}
                                        value={finalReportText || reportTemplate || ""} 
                                        onChange={(e) => setFinalReportText(e.target.value)} 
                                    />
                                    
                                    {/* Template Badge Overlay */}
                                    {templateFileName && !finalReportText && (
                                        <div className="absolute top-4 right-4 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-indigo-100 dark:border-indigo-800">
                                            <Icon name="LayoutList" size={14}/>
                                            Template: {templateFileName}
                                            <button onClick={() => { setReportTemplate(""); setTemplateFileName(""); }} className="ml-1 hover:text-red-500"><Icon name="X" size={12}/></button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => document.getElementById('template-upload')?.click()} className="h-10 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm">
                                            <Icon name="LayoutList" size={16}/>
                                            <span>Load Template</span>
                                        </button>
                                        <input id="template-upload" type="file" accept=".txt,.md,.docx" className="hidden" onChange={handleTemplateUpload}/>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => startSmartExport(finalReportText || "", 'report', 'en')} disabled={!finalReportText} className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none">
                                            <Icon name="Download" size={16}/>
                                            <span>Export English</span>
                                        </button>
                                        <button onClick={() => startSmartExport(finalReportText || "", 'report', 'vi')} disabled={!finalReportText} className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none">
                                            <Icon name="Download" size={16}/>
                                            <span>Export Vietnamese</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- MODALS --- */}
            
            <CommandPaletteModal 
                isOpen={isCmdPaletteOpen} 
                onClose={() => setIsCmdPaletteOpen(false)} 
                actions={commandActions} 
                onSelectAction={(action: any) => { action.action(); setIsCmdPaletteOpen(false); }} 
            />

            <ReleaseNotesModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            
            {/* Settings Modal - Redesigned for Key Pool */}
            <Modal isOpen={showSettingsModal} title="System Configuration" onClose={() => setShowSettingsModal(false)}>
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Icon name="Cpu" size={18} className="text-indigo-500"/>
                                    Neural API Key Pool
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Smart Load Balancing & Auto-Failover
                                </p>
                            </div>
                            <div className="text-right">
                                <div className={`text-2xl font-black ${poolStats.healthPercent > 80 ? 'text-emerald-500' : poolStats.healthPercent > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {poolStats.healthPercent}%
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Score</span>
                            </div>
                        </div>

                        {/* Add New Key Input */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 space-y-2">
                                <input 
                                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                    placeholder="Label (Optional, e.g. 'Personal Key')"
                                    value={newKeyLabel}
                                    onChange={e => setNewKeyLabel(e.target.value)}
                                />
                                <input 
                                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
                                    placeholder="Paste Google Gemini API Key (AIza...)"
                                    value={newKeyInput}
                                    onChange={e => setNewKeyInput(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleAddKey} 
                                disabled={isCheckingKey || !newKeyInput}
                                className="w-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isCheckingKey ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Plus"/>}
                            </button>
                        </div>

                        {/* Key List */}
                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {apiKeys.length === 0 && <div className="text-center text-slate-400 text-xs py-4 italic">No keys added. System will not function.</div>}
                            {apiKeys.map(k => (
                                <div key={k.id} className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${k.id === activeKeyId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-700'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${k.status === 'valid' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : k.status === 'checking' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`} />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                {editingKeyId === k.id ? (
                                                    <input 
                                                        autoFocus
                                                        className="text-xs font-bold bg-transparent border-b border-indigo-500 outline-none w-24"
                                                        value={editLabelInput}
                                                        onChange={e => setEditLabelInput(e.target.value)}
                                                        onBlur={handleSaveLabel}
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveLabel()}
                                                    />
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate cursor-pointer hover:text-indigo-500" onClick={() => handleStartEdit(k)}>{k.label}</span>
                                                )}
                                                {k.id === activeKeyId && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 rounded font-bold">ACTIVE</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-mono text-slate-400">...{k.key.substr(-4)}</span>
                                                {k.activeModel && (
                                                    <span className={`text-[9px] px-1 rounded ${MODEL_META[k.activeModel] ? MODEL_META[k.activeModel].color.split(' ')[0] + ' bg-opacity-10 text-opacity-80' : 'bg-gray-100 text-gray-500'}`}>
                                                        {MODEL_META[k.activeModel]?.label || 'Unk'}
                                                    </span>
                                                )}
                                                <span className="text-[9px] text-slate-400">{k.latency > 0 ? `${k.latency}ms` : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleRefreshStatus(k.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-500" title="Re-validate"><Icon name="RefreshCw" size={14} className={k.status === 'checking' ? 'animate-spin' : ''}/></button>
                                        <button onClick={() => handleDeleteKey(k.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-400 hover:text-red-500" title="Delete"><Icon name="Trash2" size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
                         <div className="flex items-center gap-2">
                             <div className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors duration-300 ${isAutoCheckEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-slate-600'}`} onClick={() => toggleAutoCheck(!isAutoCheckEnabled)}>
                                 <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isAutoCheckEnabled ? 'translate-x-5' : 'translate-x-0'}`}/>
                             </div>
                             <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Auto-Check Health (45s)</span>
                         </div>
                         <button onClick={() => checkAllKeys(apiKeys)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                             <Icon name="RefreshCw" size={14}/> Run Full Diagnostics
                         </button>
                    </div>
                </div>
            </Modal>

            <ReferenceClauseModal 
                isOpen={referenceClauseState.isOpen} 
                onClose={() => setReferenceClauseState(prev => ({ ...prev, isOpen: false }))}
                clause={referenceClauseState.clause}
                standardName={allStandards[standardKey]?.name || ""}
                fullText={referenceClauseState.fullText}
                isLoading={referenceClauseState.isLoading}
                onInsert={handleInsertReferenceText}
            />

            <Modal isOpen={exportState.isOpen} title="Smart Export & Translation" onClose={() => setExportState(prev => ({ ...prev, isOpen: false }))}>
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${exportState.isFinished ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {exportState.isFinished ? <Icon name="CheckThick" size={24}/> : <Icon name="Loader" size={24} className="animate-spin"/>}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 dark:text-white">
                                {exportState.isFinished ? "Export Ready" : "Processing with AI..."}
                            </h4>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                                <div 
                                    className="bg-indigo-500 h-full transition-all duration-500" 
                                    style={{ width: `${(exportState.processedChunksCount / (exportState.totalChunks || 1)) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Chunk {exportState.processedChunksCount} of {exportState.totalChunks}</p>
                        </div>
                    </div>

                    {exportState.error && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                            <h5 className="text-red-600 dark:text-red-400 font-bold text-sm flex items-center gap-2">
                                <Icon name="AlertCircle" size={16}/> Export Paused
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{exportState.error}</p>
                            
                            <div className="mt-3 flex gap-2">
                                <input 
                                    className="flex-1 text-xs p-2 rounded border outline-none" 
                                    placeholder="Enter backup API Key to resume..."
                                    value={rescueKey}
                                    onChange={e => setRescueKey(e.target.value)}
                                />
                                <button 
                                    onClick={handleResumeExport}
                                    disabled={isRescuing}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold"
                                >
                                    {isRescuing ? "Verifying..." : "Rescue"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            
            <Modal isOpen={showIntegrityModal} title="Standard Health Index" onClose={() => setShowIntegrityModal(false)}>
                 <div className="space-y-6">
                    {/* ... */}
                 </div>
            </Modal>
        </div>
    );
};
export default App;
