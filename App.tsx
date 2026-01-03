
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE, MODEL_HIERARCHY, MY_FIXED_KEYS, BUILD_TIMESTAMP, DEFAULT_AUDIT_INFO } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, Standard, ApiKeyProfile, Clause, FindingsViewMode, SessionSnapshot } from './types';
import { Icon, Toast, CommandPaletteModal } from './components/UI';
import { Header } from './components/Header';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import ReferenceClauseModal from './components/ReferenceClauseModal';
import RecallModal from './components/RecallModal';
import { generateOcrContent, generateAnalysis, generateTextReport, validateApiKey, fetchFullClauseText, parseStandardStructure } from './services/geminiService';
import { cleanAndParseJSON, fileToBase64, cleanFileName, copyToClipboard, extractTextFromPdf } from './utils';

// New Component Imports
import { EvidenceView } from './components/views/EvidenceView';
import { FindingsView } from './components/views/FindingsView';
import { ReportView } from './components/views/ReportView';
import { SettingsModal } from './components/modals/SettingsModal';
import { ExportProgressModal, ExportState } from './components/modals/ExportProgressModal';
import { AddStandardModal } from './components/modals/AddStandardModal';

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
    const [showAddStandardModal, setShowAddStandardModal] = useState(false);
    
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

    // KNOWLEDGE BASE (Source Data) - Persistent & Swappable
    const [knowledgeBase, setKnowledgeBase] = useState<string | null>(null);
    const [knowledgeFileName, setKnowledgeFileName] = useState<string | null>(null);

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

    // --- LIQUID TABS EFFECT LOGIC ---
    useEffect(() => {
        const updateTabIndicator = () => {
            const activeIndex = tabsList.findIndex(t => t.id === layoutMode);
            const activeEl = tabsRef.current[activeIndex];
            if (activeEl) {
                setTabStyle({
                    left: activeEl.offsetLeft,
                    width: activeEl.offsetWidth,
                    opacity: 1,
                    color: tabsList[activeIndex].colorClass
                });
            }
        };

        // Execute immediately
        updateTabIndicator();
        
        // Execute on resize and when sidebar toggles (animations)
        window.addEventListener('resize', updateTabIndicator);
        const timer = setTimeout(updateTabIndicator, 300); // Sync with sidebar transition

        return () => {
            window.removeEventListener('resize', updateTabIndicator);
            clearTimeout(timer);
        };
    }, [layoutMode, isSidebarOpen, sidebarWidth]);

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

    // --- DARK MODE LOGIC ---
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // ... (Keep existing loadKeyData, Background Checker, etc. same as before) ...
    const loadKeyData = (): ApiKeyProfile[] => {
        try {
            const stored = localStorage.getItem("iso_api_keys");
            const loadedKeys: ApiKeyProfile[] = stored ? JSON.parse(stored) : [];
            const existingKeySet = new Set(loadedKeys.map(k => k.key));
            let hasChanges = false;
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

    // --- PERSISTENT KNOWLEDGE BASE STORAGE ---
    const getStorageKey = (stdKey: string) => `iso_kb_content_${stdKey}`;
    const getStorageNameKey = (stdKey: string) => `iso_kb_name_${stdKey}`;

    const loadKnowledgeForStandard = (key: string) => {
        try {
            const savedContent = localStorage.getItem(getStorageKey(key));
            const savedName = localStorage.getItem(getStorageNameKey(key));
            if (savedContent && savedName) {
                setKnowledgeBase(savedContent);
                setKnowledgeFileName(savedName);
                setToastMsg(`Restored source document: ${savedName}`);
            } else {
                setKnowledgeBase(null);
                setKnowledgeFileName(null);
            }
        } catch (e) {
            console.error("Failed to load KB", e);
        }
    };

    const saveKnowledgeToStorage = (key: string, content: string, fileName: string) => {
        try {
            localStorage.setItem(getStorageKey(key), content);
            localStorage.setItem(getStorageNameKey(key), fileName);
        } catch (e) {
            console.error("Storage Quota Exceeded for KB", e);
            setToastMsg("Warning: Document too large to save for future sessions (Quota Exceeded). It will work for this session only.");
        }
    };

    // --- NEW: Handle Clearing Knowledge Base ---
    const handleClearKnowledge = () => {
        setKnowledgeBase(null);
        setKnowledgeFileName(null);
        if (standardKey) {
            try {
                localStorage.removeItem(getStorageKey(standardKey));
                localStorage.removeItem(getStorageNameKey(standardKey));
                setToastMsg("Source document removed from standard.");
            } catch (e) {
                console.error("Failed to clear KB", e);
            }
        }
    };

    // --- CRITICAL: Reset/Restore Knowledge Base when Standard changes ---
    const handleSetStandardKey = (key: string) => {
        if (key !== standardKey) {
            setStandardKey(key);
            // Attempt to load existing KB for this new key
            loadKnowledgeForStandard(key);
        }
    };

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

    const determineKeyCapabilities = async (key: string): Promise<{ status: 'valid' | 'invalid' | 'quota_exceeded' | 'referrer_error' | 'unknown', activeModel?: string, latency: number }> => {
        const result = await validateApiKey(key);
        let status: 'valid' | 'invalid' | 'quota_exceeded' | 'referrer_error' | 'unknown' = 'unknown';
        if (result.isValid) status = 'valid';
        else if (result.errorType === 'network_error') status = 'unknown'; 
        else if (result.errorType) status = result.errorType as any;
        return { status, activeModel: result.activeModel, latency: result.latency };
    };

    const checkAllKeys = async (initialKeys: ApiKeyProfile[]) => {
        setIsCheckingKey(true); 
        setApiKeys(prev => prev.map(k => ({ ...k, status: 'checking' })));
        const today = new Date().toISOString().split('T')[0]; 
        const updatedKeys = [...initialKeys];
        for (let i = 0; i < updatedKeys.length; i++) {
            const profile = updatedKeys[i]; 
            const cap = await determineKeyCapabilities(profile.key);
            updatedKeys[i] = { 
                ...profile, 
                status: cap.status, 
                activeModel: cap.activeModel, 
                latency: cap.latency, 
                lastChecked: new Date().toISOString(), 
                lastResetDate: today 
            };
            setApiKeys(prev => {
                const newArr = [...prev];
                const idx = newArr.findIndex(k => k.id === profile.id);
                if (idx !== -1) newArr[idx] = updatedKeys[i];
                return newArr;
            });
            await new Promise(r => setTimeout(r, 100));
        }
        setApiKeys(currentKeys => {
            const currentActiveProfile = currentKeys.find(k => k.id === activeKeyId);
            if (!currentActiveProfile || (currentActiveProfile.status !== 'valid' && currentActiveProfile.status !== 'unknown')) {
                const bestKey = currentKeys.filter(k => k.status === 'valid').sort((a, b) => a.latency - b.latency)[0];
                if (bestKey) { 
                    setActiveKeyId(bestKey.id); 
                    localStorage.setItem("iso_active_key_id", bestKey.id);
                    setTimeout(() => setToastMsg(`Auto-switched to healthy key: ${bestKey.label}`), 0); 
                } 
            }
            localStorage.setItem("iso_api_keys", JSON.stringify(currentKeys));
            return currentKeys;
        });
        setIsCheckingKey(false);
    };

    const handleRefreshStatus = async (id: string) => {
        const keyProfile = apiKeys.find(k => k.id === id); 
        if (!keyProfile) return;
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
        else if (cap.status === 'referrer_error') setAiError("Key restricted! Check 'HTTP Referrers' in Google Cloud Console.");
        else setAiError("The key you added appears invalid or network is blocking it.");
    };

    const handleDeleteKey = (id: string) => {
        const nextKeys = apiKeys.filter(k => k.id !== id);
        let newActiveId = activeKeyId;
        if (activeKeyId === id) {
            const nextBest = nextKeys.find(k => k.status === 'valid') || nextKeys[0];
            newActiveId = nextBest ? nextBest.id : "";
        }
        setApiKeys(nextKeys);
        if (newActiveId !== activeKeyId) setActiveKeyId(newActiveId);
        localStorage.setItem("iso_api_keys", JSON.stringify(nextKeys));
        if (newActiveId) localStorage.setItem("iso_active_key_id", newActiveId);
        else localStorage.removeItem("iso_active_key_id");
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
                if (data.standardKey) {
                    setStandardKey(data.standardKey);
                    // Also attempt to load knowledge base for this standard
                    loadKnowledgeForStandard(data.standardKey);
                }
                if (data.auditInfo) setAuditInfo({ ...DEFAULT_AUDIT_INFO, ...data.auditInfo });
                if (data.selectedClauses) setSelectedClauses(data.selectedClauses);
                if (data.evidence) setEvidence(data.evidence);
                if (data.analysisResult) setAnalysisResult(data.analysisResult);
                if (data.selectedFindings) setSelectedFindings(data.selectedFindings);
                if (data.finalReportText) setFinalReportText(data.finalReportText);
                setLastSavedTime(new Date().toLocaleTimeString());
                setToastMsg("Previous session restored.");
            }
        } catch (e) { console.error("Load failed", e); }
    };

    const handleUpdateStandard = (std: Standard) => { setCustomStandards(prev => ({ ...prev, [standardKey]: std })); setToastMsg("Standard updated successfully."); };
    const handleResetStandard = (key: string) => { setCustomStandards(prev => { const next = { ...prev }; delete next[key]; return next; }); setToastMsg("Standard reset to default."); };
    
    // --- INTEGRATED SOURCE FILE PROCESSING ---
    const processSourceFile = async (file: File): Promise<string> => {
        let text = "";
        try {
            if (file.name.endsWith('.pdf')) {
                text = await extractTextFromPdf(file);
            } else if (file.name.endsWith('.docx')) {
                if (typeof mammoth === 'undefined') throw new Error("Mammoth library missing");
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            } else {
                text = await file.text();
            }
            if (!text || text.length < 50) throw new Error("File content is too short or empty.");
            return text;
        } catch (err: any) {
            console.error("File processing error:", err);
            throw new Error(`Failed to parse ${file.name}: ${err.message}`);
        }
    };

    // --- KNOWLEDGE BASE UPLOAD (EXISTING STANDARD) ---
    const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; 
        if (!file) return; 
        
        setKnowledgeFileName(file.name);
        setToastMsg("Parsing Standard Document...");
        
        try {
            const text = await processSourceFile(file);
            setKnowledgeBase(text);
            setToastMsg(`Standard Loaded (${(text.length / 1024).toFixed(0)}KB). Saving for future use...`);
            
            // Save to persistent storage
            if (standardKey) {
                saveKnowledgeToStorage(standardKey, text, file.name);
            }
        } catch (err: any) {
            setToastMsg(err.message);
            setKnowledgeFileName(null);
            setKnowledgeBase(null);
        }
    };

    // --- ADD NEW STANDARD (SMART AI IMPORT) ---
    const handleAddStandard = async (name: string, file: File | null) => {
        setShowAddStandardModal(false);
        const newKey = `CUSTOM_${Date.now()}`;
        let text = "";

        // 1. Process File first to get the structure
        if (file) {
            setToastMsg("Processing document and extracting structure...");
            try {
                text = await processSourceFile(file);
                // Save Source immediately
                setKnowledgeBase(text);
                setKnowledgeFileName(file.name);
                saveKnowledgeToStorage(newKey, text, file.name);
                
                // 2. Use AI to Parse Structure
                setToastMsg("AI is analyzing structure... (This may take 15s)");
                
                try {
                    const parsedStandard = await executeWithSmartFailover((key, model) => parseStandardStructure(text, name, key, model));
                    if (parsedStandard) {
                        setCustomStandards(prev => ({ ...prev, [newKey]: parsedStandard }));
                        setStandardKey(newKey);
                        setToastMsg(`Successfully imported ${name} with full structure.`);
                        return; // Exit here if successful
                    }
                } catch (parseError) {
                    console.error("AI Parse Failed, falling back to basic", parseError);
                    setToastMsg("AI parsing failed. Created basic structure instead.");
                }

            } catch (err: any) {
                setToastMsg(`File processing failed: ${err.message}`);
            }
        } else {
            setKnowledgeBase(null);
            setKnowledgeFileName(null);
        }

        // 3. Fallback / Basic Creation if no file or AI failed
        const newStandard: Standard = {
            name: name,
            description: `Custom Standard created on ${new Date().toLocaleDateString()}`,
            groups: [{
                id: `GRP_${Date.now()}`,
                title: "General Requirements",
                icon: "Book",
                clauses: [
                    { id: `CL_${Date.now()}_1`, code: "1", title: "General", description: "Requirement details pending AI extraction." }
                ]
            }]
        };

        setCustomStandards(prev => ({ ...prev, [newKey]: newStandard }));
        setStandardKey(newKey);
        if (!file) setToastMsg(`Created basic standard: ${name}`);
    };

    // ... (Auto Save, BeforeUnload, New Session, Restore, OCR, Export, Analyze, Report - kept same) ...
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
            setKnowledgeBase(null); 
            setKnowledgeFileName(null);
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
            if (data.standardKey) {
                setStandardKey(data.standardKey);
                loadKnowledgeForStandard(data.standardKey);
            }
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
            const text = await executeWithSmartFailover(async (key, model) => fetchFullClauseText(clause, allStandards[standardKey].name, knowledgeBase, key, model));
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

    // --- MISSING FUNCTIONS IMPLEMENTATION ---
    const handleAnalyze = async () => {
        if (!standardKey) { setToastMsg("Select a Standard first."); return; }
        if (selectedClauses.length === 0) { setToastMsg("Select at least one Clause to analyze."); return; }
        if (!hasEvidence) { setToastMsg("No evidence provided. Please add text or files."); return; }

        setIsAnalyzeLoading(true);
        setLayoutMode('findings');
        // Reset or prepare results
        // For fresh analysis on new evidence, typically we might want to clear old results.
        // Or we could append. Let's reset for this implementation to be clean.
        setAnalysisResult(null);
        
        try {
             const allClausesFlat = allStandards[standardKey].groups.flatMap(g => g.clauses);
             const findClause = (id: string, list: Clause[]): Clause | undefined => {
                for (let c of list) { if (c.id === id) return c; if (c.subClauses) { const f = findClause(id, c.subClauses); if (f) return f; } }
             };
             
             const targets = selectedClauses.map(id => findClause(id, allClausesFlat)).filter(c => !!c) as Clause[];
             
             // Construct context from evidence and processed files
             let fullEvidenceContext = evidence;
             uploadedFiles.filter(f => f.status === 'success' && f.result).forEach(f => {
                 fullEvidenceContext += `\n\n--- Document: ${f.file.name} ---\n${f.result}`;
             });

             const newResults: AnalysisResult[] = [];
             const newSelections: Record<string, boolean> = {};

             for (let i = 0; i < targets.length; i++) {
                 const clause = targets[i];
                 setCurrentAnalyzingClause(clause.code);
                 setLoadingMessage(`Analyzing Clause ${clause.code}...`);

                 const prompt = `
                 Analyze the provided EVIDENCE against ISO Standard "${allStandards[standardKey].name}", Clause "${clause.code}: ${clause.title}".
                 Clause Description: ${clause.description}
                 
                 EVIDENCE:
                 """
                 ${fullEvidenceContext.substring(0, 50000)} 
                 """
                 
                 DETERMINE:
                 1. Status (COMPLIANT, NC_MINOR, NC_MAJOR, OFI, or N_A).
                 2. Reason (Why?).
                 3. Evidence Quote (Verbatim support).
                 4. Suggestion (If NC or OFI).
                 
                 Output JSON Array with 1 object: [{ "clauseId": "${clause.code}", "status": "...", "reason": "...", "evidence": "...", "suggestion": "..." }]
                 `;
                 
                 // Using executeWithSmartFailover to handle keys
                 const jsonStr = await executeWithSmartFailover((key, model) => generateAnalysis(prompt, "You are a lead ISO Auditor.", key, model));
                 const parsed = cleanAndParseJSON(jsonStr);
                 
                 if (Array.isArray(parsed) && parsed.length > 0) {
                     const item = parsed[0];
                     item.clauseId = clause.code; 
                     newResults.push(item);
                     newSelections[clause.code] = true;
                 } else {
                     newResults.push({
                         clauseId: clause.code,
                         status: 'N_A',
                         reason: 'AI could not determine status.',
                         evidence: '',
                         suggestion: '',
                         conclusion_report: ''
                     });
                     newSelections[clause.code] = true;
                 }
             }
             
             setAnalysisResult(newResults);
             setSelectedFindings(newSelections);
             setToastMsg(`Analysis Complete. Generated ${newResults.length} findings.`);

        } catch (e: any) {
            handleGenericError(e);
        } finally {
            setIsAnalyzeLoading(false);
            setLoadingMessage("");
            setCurrentAnalyzingClause("");
        }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult || analysisResult.length === 0) {
            setToastMsg("No findings available to report.");
            return;
        }
        
        const activeFindings = analysisResult.filter(r => selectedFindings[r.clauseId]);
        if (activeFindings.length === 0) {
            setToastMsg("Please select at least one finding to include in the report.");
            return;
        }

        setIsReportLoading(true);
        setLoadingMessage("Synthesizing Final Audit Report...");
        
        try {
            const prompt = `
            Generate a comprehensive ISO Audit Report.
            
            Entity: ${auditInfo.company}
            Type: ${auditInfo.type}
            Auditor: ${auditInfo.auditor}
            Standard: ${allStandards[standardKey]?.name}
            
            FINDINGS TO INCLUDE:
            ${JSON.stringify(activeFindings)}
            
            TEMPLATE / INSTRUCTIONS:
            ${reportTemplate || "Use standard professional ISO audit report format including Executive Summary, Audit Scope, Findings Detail, and Conclusion."}
            
            Language: ${exportLanguage === 'vi' ? 'Vietnamese' : 'English'}.
            Tone: Professional, Objective.
            `;
            
            const report = await executeWithSmartFailover((key, model) => generateTextReport(prompt, "You are an expert ISO Certification Body Auditor.", key, model));
            setFinalReportText(report);
            setLayoutMode('report');
            setToastMsg("Report Generated Successfully.");
        } catch (e: any) {
            handleGenericError(e);
        } finally {
            setIsReportLoading(false);
            setLoadingMessage("");
        }
    };

    // Export Processing Effect
    useEffect(() => {
        if (!exportState.isOpen || exportState.isPaused || exportState.isFinished) return;

        const processChunk = async () => {
            const idx = exportState.processedChunksCount;
            if (idx >= exportState.totalChunks) {
                setExportState(prev => ({ ...prev, isFinished: true }));
                try {
                    const finalContent = exportState.results.join("");
                    const blob = new Blob([finalContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ISO_Audit_Export_${exportState.currentType}_${new Date().toISOString()}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch(e) { console.error("Download failed", e); }
                return;
            }

            const chunk = exportState.chunks[idx];
            try {
                let result = chunk;
                if (exportState.targetLang !== 'en' && exportState.targetLang !== 'vi') { 
                    // Should not happen based on types
                } else if (exportState.targetLang !== 'en') {
                     const prompt = `Translate this text to ${exportState.targetLang === 'vi' ? 'Vietnamese' : 'English'} maintaining formatting:\n\n${chunk}`;
                     result = await executeWithSmartFailover((key, model) => generateTextReport(prompt, "Translator", key, model));
                }
                
                setExportState(prev => {
                    const newResults = [...prev.results];
                    newResults[idx] = result;
                    return { ...prev, processedChunksCount: idx + 1, results: newResults };
                });
            } catch (e: any) {
                console.error("Export Error", e);
                setExportState(prev => ({ ...prev, isPaused: true, error: e.message }));
            }
        };
        processChunk();
    }, [exportState, executeWithSmartFailover]);

    const handleResumeExport = async () => {
        setIsRescuing(true);
        try {
            if (rescueKey.trim()) {
                const cap = await determineKeyCapabilities(rescueKey);
                if (cap.status === 'valid') {
                     const newProfile: ApiKeyProfile = { 
                        id: `rescue_${Date.now()}`, 
                        label: `Rescue Key`, 
                        key: rescueKey, 
                        status: 'valid', 
                        activeModel: cap.activeModel,
                        latency: cap.latency, 
                        lastChecked: new Date().toISOString() 
                    };
                    setApiKeys(prev => [...prev, newProfile]);
                    setActiveKeyId(newProfile.id);
                    setToastMsg("Rescue Key Added. Resuming...");
                    setExportState(prev => ({ ...prev, isPaused: false, error: null }));
                    setRescueKey("");
                } else {
                    setToastMsg("Rescue Key Invalid/Exhausted.");
                }
            } else {
                setExportState(prev => ({ ...prev, isPaused: false, error: null }));
            }
        } catch (e) {
            setToastMsg("Failed to resume.");
        } finally {
            setIsRescuing(false);
        }
    };
    // ------------------------------------

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCmdPaletteOpen(prev => !prev); } };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const commandActions = useMemo(() => {
        const baseActions: any[] = [
            { label: "Analyze Compliance", desc: `Start AI analysis`, icon: "Wand2", shortcut: "AI", action: handleAnalyze },
            { label: "Validate API Key Pool", desc: "Check connection health", icon: "RefreshCw", action: () => { checkAllKeys(apiKeys); setToastMsg("Validating Neural Pool..."); } },
            { label: "Settings", desc: "Manage configuration", icon: "Settings", action: () => setShowSettingsModal(true) },
            { label: "Generate Report", desc: "Synthesize final report", icon: "FileText", action: handleGenerateReport },
            { label: "Toggle Dark Mode", desc: `Switch to ${isDarkMode ? 'Light' : 'Dark'}`, icon: isDarkMode ? "Sun" : "Moon", action: () => setIsDarkMode(!isDarkMode) },
        ];

        // Ensure we have a valid standard selected before adding clause actions
        if (standardKey && allStandards[standardKey]) {
            const flatten = (list: Clause[]): Clause[] => list.reduce((acc, c) => {
                acc.push(c);
                if (c.subClauses) acc.push(...flatten(c.subClauses));
                return acc;
            }, [] as Clause[]);
            
            const allClauses = flatten(allStandards[standardKey].groups.flatMap(g => g.clauses));
            
            const clauseActions = allClauses.map(c => ({
                label: `[${c.code}] ${c.title}`,
                desc: c.description || "No description",
                icon: "Session6_Zap", // Use a generic icon or specific if available
                type: 'clause',
                // Action to select/deselect the clause
                action: () => {
                    const isSelected = selectedClauses.includes(c.id);
                    if (isSelected) setSelectedClauses(prev => prev.filter(id => id !== c.id));
                    else setSelectedClauses(prev => [...prev, c.id]);
                    insertTextAtCursor(`[${c.code}] ${c.title}`);
                    setToastMsg(`Inserted clause ${c.code} and ${isSelected ? 'removed from' : 'added to'} audit scope.`);
                    setIsCmdPaletteOpen(false);
                },
                // Action strictly for looking up reference
                onReference: (e: any) => {
                    if (e) e.stopPropagation();
                    handleOpenReferenceClause(c);
                    setIsCmdPaletteOpen(false);
                }
            }));
            return [...baseActions, ...clauseActions];
        }
        
        return baseActions;
    }, [isDarkMode, standardKey, allStandards, selectedClauses, activeKeyId, apiKeys]); 

    // ... (Badge, Tooltip, and Render logic - kept same) ...
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

            <Header 
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                displayBadge={displayBadge}
                badgeColorClass={badgeColorClass}
                setIsCmdPaletteOpen={setIsCmdPaletteOpen}
                fontSizeScale={fontSizeScale}
                setFontSizeScale={setFontSizeScale}
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                isSystemHealthy={isSystemHealthy}
                onOpenSettings={() => setShowSettingsModal(true)}
                onOpenAbout={() => setShowAboutModal(true)}
            />

            <main className="flex-1 flex overflow-hidden relative">
                <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-16 bottom-0 left-0 z-[60] md:absolute md:inset-y-0 md:relative md:top-0 md:translate-x-0 md:transform-none transition-transform duration-300 ease-soft h-[calc(100%-4rem)] md:h-full`}>
                    <Sidebar 
                        key={sessionKey} 
                        isOpen={isSidebarOpen} 
                        width={sidebarWidth} 
                        setWidth={setSidebarWidth} 
                        standards={allStandards} 
                        standardKey={standardKey} 
                        setStandardKey={handleSetStandardKey} 
                        auditInfo={auditInfo} 
                        setAuditInfo={setAuditInfo} 
                        selectedClauses={selectedClauses} 
                        setSelectedClauses={setSelectedClauses} 
                        onAddNewStandard={() => setShowAddStandardModal(true)} 
                        onUpdateStandard={handleUpdateStandard} 
                        onResetStandard={handleResetStandard} 
                        onReferenceClause={handleOpenReferenceClause} 
                        showIntegrityModal={showIntegrityModal} 
                        setShowIntegrityModal={setShowIntegrityModal}
                        knowledgeFileName={knowledgeFileName}
                        knowledgeBase={knowledgeBase} // Pass KB content for health check
                        onKnowledgeUpload={handleKnowledgeUpload}
                        onClearKnowledge={handleClearKnowledge}
                    />
                </div>
                {isSidebarOpen && <div className="fixed top-16 bottom-0 inset-x-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />}
                
                {/* ... (Main Content Layout remains same) ... */}
                <div className={`flex-1 flex flex-col min-w-0 relative w-full transition-all duration-300 ease-soft ${currentTabConfig.bgSoft} border-t-4 ${currentTabConfig.borderClass}`}>
                    
                    <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <div ref={tabsContainerRef} className="relative flex justify-between bg-gray-100 dark:bg-slate-950 p-1 rounded-xl w-full dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                                <div className={`absolute top-1 bottom-1 shadow-sm rounded-lg transition-all duration-500 ease-fluid z-0 ${tabStyle.color}`} style={{ left: tabStyle.left, width: tabStyle.width, opacity: tabStyle.opacity }} />
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
                                onExport={(type, lang) => startSmartExport(evidence, type, lang)}
                                evidenceLanguage={evidenceLanguage}
                                setEvidenceLanguage={setEvidenceLanguage}
                                textareaRef={evidenceTextareaRef}
                            />
                        )}
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
                                onExport={(type, lang) => {
                                    const text = analysisResult?.map(r => `[${r.clauseId}] ${r.status}\nEvidence: ${r.evidence}\nReason: ${r.reason}\nSuggestion: ${r.suggestion}`).join('\n\n') || "";
                                    startSmartExport(text, type, lang);
                                }}
                                notesLanguage={notesLanguage}
                                setNotesLanguage={setNotesLanguage}
                            />
                        )}
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
                                onExport={(type, lang) => startSmartExport(finalReportText || "", type, lang)}
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

            <AddStandardModal
                isOpen={showAddStandardModal}
                onClose={() => setShowAddStandardModal(false)}
                onAdd={handleAddStandard}
            />
        </div>
    );
}
