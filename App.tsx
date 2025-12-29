import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE, MODEL_HIERARCHY } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, Standard, ApiKeyProfile, Clause, FindingsViewMode, FindingStatus } from './types';
import { Icon, FontSizeController, SparkleLoader, Modal, AINeuralLoader, Toast, CommandPaletteModal } from './components/UI';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import ReferenceClauseModal from './components/ReferenceClauseModal';
import { generateOcrContent, generateAnalysis, generateTextReport, validateApiKey, fetchFullClauseText } from './services/geminiService';
import { cleanAndParseJSON, fileToBase64, cleanFileName } from './utils';

declare var mammoth: any;

type LayoutMode = 'evidence' | 'findings' | 'report' | 'split';
type ExportLanguage = 'en' | 'vi';

// --- Smart Export State Interface ---
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

function App() {
    // -- STATE --
    const [fontSizeScale, setFontSizeScale] = useState(1.0);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(420); // Increased default width
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    
    // Feature: Command Palette
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

    // Feature: Matrix View
    const [findingsViewMode, setFindingsViewMode] = useState<FindingsViewMode>('list');
    
    // API Key Management State
    const [apiKeys, setApiKeys] = useState<ApiKeyProfile[]>([]);
    const [activeKeyId, setActiveKeyId] = useState<string>("");
    const [newKeyInput, setNewKeyInput] = useState("");
    const [newKeyLabel, setNewKeyLabel] = useState("");
    const [isCheckingKey, setIsCheckingKey] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    // API Key Renaming State
    const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
    const [editLabelInput, setEditLabelInput] = useState("");

    // Toast State
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // NEW: State for Reference Clause Modal (with bilingual support)
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
    const [pastedImages, setPastedImages] = useState<File[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult[] | null>(null);
    const [selectedFindings, setSelectedFindings] = useState<Record<string, boolean>>({});
    const [finalReportText, setFinalReportText] = useState<string | null>(null);
    const [layoutMode, setLayoutMode] = useState('evidence' as LayoutMode);
    
    // Loading States
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
    const [currentAnalyzingClause, setCurrentAnalyzingClause] = useState<string>(""); 
    const [loadingMessage, setLoadingMessage] = useState<string>(""); 
    const [isReportLoading, setIsReportLoading] = useState(false);
    
    // Smart Export State
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
    
    // Rescue Key State (Inline Input)
    const [rescueKey, setRescueKey] = useState("");
    const [isRescuing, setIsRescuing] = useState(false);

    // Logo Animation State
    const [logoKey, setLogoKey] = useState(0);
    
    // Fluid Tab State
    const [tabStyle, setTabStyle] = useState({ left: 0, width: 0, opacity: 0, color: '' });
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const tabsContainerRef = useRef<HTMLDivElement>(null); 
    
    const tabsList = [
        { id: 'evidence', label: '1. Evidence', icon: 'ScanText', colorClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-500', bgSoft: 'bg-blue-50 dark:bg-blue-900/10' }, 
        { id: 'findings', label: '2. Findings', icon: 'Wand2', colorClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-500', bgSoft: 'bg-purple-50 dark:bg-purple-900/10' }, 
        { id: 'report', label: '3. Report', icon: 'FileText', colorClass: 'bg-emerald-500', textClass: 'text-emerald-600', borderClass: 'border-emerald-500', bgSoft: 'bg-emerald-50 dark:bg-emerald-900/10' }
    ];

    const currentTabConfig = tabsList.find(t => t.id === layoutMode) || tabsList[0];

    const fileInputRef = useRef<HTMLInputElement>(null);
    const evidenceTextareaRef = useRef<HTMLTextAreaElement>(null);
    const findingsContainerRef = useRef<HTMLDivElement>(null);

    const allStandards = useMemo(() => ({ ...STANDARDS_DATA, ...customStandards }), [customStandards]);
    const hasEvidence = evidence.trim().length > 0 || pastedImages.length > 0;
    
    const isReadyForAnalysis = !isAnalyzeLoading && selectedClauses.length > 0 && hasEvidence;

    const dismissError = () => {
        setIsErrorClosing(true);
        setTimeout(() => {
            setAiError(null);
            setIsErrorClosing(false);
        }, 300);
    };

    const insertTextAtCursor = (textToInsert: string) => {
        if (evidenceTextareaRef.current) {
            const textarea = evidenceTextareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const textWithBreaks = `\n${textToInsert.trim()}\n`;
            const newValue = evidence.substring(0, start) + textWithBreaks + evidence.substring(end);
            
            setEvidence(newValue);
            
            if (layoutMode !== 'evidence') setLayoutMode('evidence');

            setTimeout(() => {
                if (evidenceTextareaRef.current) {
                    evidenceTextareaRef.current.focus();
                    evidenceTextareaRef.current.setSelectionRange(start + textWithBreaks.length, start + textWithBreaks.length);
                }
            }, 100);
        } else {
            setEvidence(prev => prev + "\n" + textToInsert.trim());
            if (layoutMode !== 'evidence') setLayoutMode('evidence');
        }
    };
    
    const handleOpenReferenceClause = async (clause: Clause) => {
        setReferenceClauseState({ isOpen: true, clause, isLoading: true, fullText: { en: "", vi: "" } });
        try {
            const text = await executeWithSmartFailover(async (key, model) => {
                return await fetchFullClauseText(clause, allStandards[standardKey].name, key, model);
            });
            setReferenceClauseState(prev => ({ ...prev, isLoading: false, fullText: text }));
        } catch (e: any) {
            setAiError(e.message || "Failed to fetch clause reference.");
            setReferenceClauseState({ isOpen: false, clause: null, isLoading: false, fullText: { en: "", vi: "" } });
        }
    };

    const handleInsertReferenceText = (text: string) => {
        if (!referenceClauseState.clause) return;
        const quoteText = `
--- REFERENCE: [${referenceClauseState.clause.code}] ${referenceClauseState.clause.title} ---
${text}
--- END REFERENCE ---
        `.trim();
        insertTextAtCursor(quoteText);
        setReferenceClauseState({ isOpen: false, clause: null, isLoading: false, fullText: { en: "", vi: "" } });
    };

    useEffect(() => {
        const storedScale = localStorage.getItem('iso_font_scale');
        if (storedScale) setFontSizeScale(parseFloat(storedScale));
        
        loadSessionData();
        const loadedKeys = loadKeyData();
        
        if (!hasStartupChecked.current && loadedKeys.length > 0) {
            hasStartupChecked.current = true;
            checkAllKeys(loadedKeys);
        }

        const savedDarkMode = localStorage.getItem('iso_dark_mode');
        if (savedDarkMode !== null) {
            setIsDarkMode(savedDarkMode === 'true');
        } else {
            setIsDarkMode(true); 
        }

        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, []);

    const hasStartupChecked = useRef(false);

    useEffect(() => {
        const updateTabs = () => {
            const activeIndex = tabsList.findIndex(t => t.id === layoutMode);
            const el = tabsRef.current[activeIndex];
            if (el) {
                setTabStyle({
                    left: el.offsetLeft,
                    width: el.offsetWidth,
                    opacity: 1,
                    color: tabsList[activeIndex].colorClass
                });
            }
        };
        updateTabs();
        const t = setTimeout(updateTabs, 50);
        const observer = new ResizeObserver(() => {
            updateTabs();
        });
        if (tabsContainerRef.current) observer.observe(tabsContainerRef.current);
        return () => {
            clearTimeout(t);
            observer.disconnect();
        };
    }, [layoutMode, sidebarWidth, fontSizeScale]); 

    useEffect(() => {
        if (layoutMode === 'findings' && findingsContainerRef.current) {
            findingsContainerRef.current.scrollTop = findingsContainerRef.current.scrollHeight;
        }
    }, [analysisResult]);

    useEffect(() => {
        if (exportState.isOpen && !exportState.isPaused && !exportState.isFinished && exportState.processedChunksCount < exportState.totalChunks) {
            processNextExportChunk();
        } else if (exportState.isOpen && exportState.processedChunksCount >= exportState.totalChunks && !exportState.isFinished) {
            finishExport();
        }
    }, [exportState]);

    const loadSessionData = () => {
        try {
            const savedCustomStandards = localStorage.getItem("iso_custom_standards");
            if (savedCustomStandards) setCustomStandards(JSON.parse(savedCustomStandards));

            const savedAuditInfo = localStorage.getItem("iso_audit_info");
            const savedEvidence = localStorage.getItem("iso_evidence");
            const savedStandardKey = localStorage.getItem("iso_standard_key");
            const savedSelectedClauses = localStorage.getItem("iso_selected_clauses");
            const savedTemplate = localStorage.getItem('iso_report_template');
            const savedTemplateName = localStorage.getItem('iso_report_template_name');

            if (savedAuditInfo) setAuditInfo(JSON.parse(savedAuditInfo));
            if (savedEvidence && savedEvidence.trim() !== '') setEvidence(savedEvidence);
            if (savedStandardKey) setStandardKey(savedStandardKey);
            if (savedSelectedClauses) setSelectedClauses(JSON.parse(savedSelectedClauses));
            if (savedTemplate) setReportTemplate(savedTemplate);
            if (savedTemplateName) setTemplateFileName(savedTemplateName);
        } catch (e) {
            console.error("Failed to load session data", e);
        }
    };

    const loadKeyData = (): ApiKeyProfile[] => {
        try {
            const savedKeys = localStorage.getItem("iso_api_keys");
            const savedActiveId = localStorage.getItem("iso_active_key_id");
            const legacyKey = localStorage.getItem("iso_api_key");
            
            let loadedKeys: ApiKeyProfile[] = [];
            
            if (savedKeys) {
                loadedKeys = JSON.parse(savedKeys);
            } else if (legacyKey) {
                const newId = Date.now().toString();
                loadedKeys = [{
                    id: newId,
                    label: "Default Key",
                    key: legacyKey,
                    status: 'unknown',
                    latency: 0,
                    lastChecked: new Date().toISOString()
                }];
                setActiveKeyId(newId);
                localStorage.setItem("iso_active_key_id", newId);
            }

            setApiKeys(loadedKeys);
            if (savedActiveId) {
                setActiveKeyId(savedActiveId);
            } else if (loadedKeys.length > 0) {
                setActiveKeyId(loadedKeys[0].id);
            }
            return loadedKeys;
        } catch (e) { 
            console.error("Failed to load keys", e); 
            return [];
        }
    };

    useEffect(() => {
        if (isDarkMode) document.body.classList.add('dark');
        else document.body.classList.remove('dark');
        localStorage.setItem('iso_dark_mode', String(isDarkMode));
    }, [isDarkMode]);
    
    useEffect(() => {
        document.documentElement.style.setProperty('--font-scale', fontSizeScale.toString());
        localStorage.setItem('iso_font_scale', fontSizeScale.toString());
    }, [fontSizeScale]);
    
    // Persistence Hooks
    useEffect(() => { localStorage.setItem("iso_audit_info", JSON.stringify(auditInfo)); }, [auditInfo]);
    useEffect(() => { localStorage.setItem("iso_evidence", evidence); }, [evidence]);
    useEffect(() => { localStorage.setItem("iso_standard_key", standardKey); }, [standardKey]);
    useEffect(() => { localStorage.setItem("iso_selected_clauses", JSON.stringify(selectedClauses)); }, [selectedClauses]);
    useEffect(() => { localStorage.setItem('iso_report_template', reportTemplate); localStorage.setItem('iso_report_template_name', templateFileName); }, [reportTemplate, templateFileName]);
    useEffect(() => { localStorage.setItem("iso_api_keys", JSON.stringify(apiKeys)); localStorage.setItem("iso_active_key_id", activeKeyId); }, [apiKeys, activeKeyId]);
    useEffect(() => { localStorage.setItem("iso_custom_standards", JSON.stringify(customStandards)); }, [customStandards]);

    const checkAllKeys = async (initialKeys: ApiKeyProfile[]) => {
        setApiKeys(prev => prev.map(k => ({ ...k, status: 'checking' })));
        
        const today = new Date().toISOString().split('T')[0];

        const checkedKeys = await Promise.all(initialKeys.map(async (profile) => {
            let startModelIndex = 0;
            const isNewDay = profile.lastResetDate !== today;
            
            if (!isNewDay && profile.activeModel) {
                const foundIndex = MODEL_HIERARCHY.indexOf(profile.activeModel);
                if (foundIndex !== -1) startModelIndex = foundIndex;
            }

            let validProfile: ApiKeyProfile = { 
                ...profile, 
                status: 'invalid', 
                latency: 0, 
                lastChecked: new Date().toISOString(),
                lastResetDate: today 
            };

            for (let i = startModelIndex; i < MODEL_HIERARCHY.length; i++) {
                const modelToTest = MODEL_HIERARCHY[i];
                const result = await validateApiKey(profile.key, modelToTest);
                
                if (result.isValid) {
                    validProfile = {
                        ...profile,
                        status: 'valid',
                        latency: result.latency,
                        activeModel: modelToTest,
                        lastResetDate: today,
                        lastChecked: new Date().toISOString()
                    };
                    break;
                } else if (result.errorType === 'invalid') {
                    validProfile.status = 'invalid';
                    break;
                }
            }
            return validProfile;
        }));

        setApiKeys(checkedKeys);

        const currentActive = checkedKeys.find(k => k.id === localStorage.getItem("iso_active_key_id"));
        if (!currentActive || currentActive.status !== 'valid') {
            const bestKey = checkedKeys.filter(k => k.status === 'valid').sort((a, b) => a.latency - b.latency)[0];
            if (bestKey) {
                setActiveKeyId(bestKey.id);
                setToastMsg(`Switched to active key: ${bestKey.label} (${bestKey.activeModel?.split('-')[1]})`);
            }
        }
    };
    
    const checkKeyStatus = async (id: string, keyStr: string) => {
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'checking' } : k));
        
        let bestModel = MODEL_HIERARCHY[0];
        let finalStatus: 'valid' | 'invalid' | 'quota_exceeded' | 'unknown' = 'invalid';
        let latency = 0;

        for (const model of MODEL_HIERARCHY) {
            const result = await validateApiKey(keyStr, model);
            if (result.isValid) {
                bestModel = model;
                finalStatus = 'valid';
                latency = result.latency;
                break;
            }
            if (result.errorType === 'invalid') {
                finalStatus = 'invalid';
                break;
            }
            finalStatus = result.errorType || 'unknown';
        }

        setApiKeys(prev => prev.map(k => k.id === id ? { 
            ...k, 
            status: finalStatus,
            latency: latency,
            activeModel: finalStatus === 'valid' ? bestModel : k.activeModel,
            lastChecked: new Date().toISOString()
        } : k));
    };

    const handleAddKey = async () => {
        if (!newKeyInput.trim()) return;
        setIsCheckingKey(true);
        const tempId = Date.now().toString();
        
        let bestModel = MODEL_HIERARCHY[0];
        let isValid = false;
        let latency = 0;
        let errorType: 'invalid' | 'quota_exceeded' | 'unknown' = 'unknown';

        for (const model of MODEL_HIERARCHY) {
            const res = await validateApiKey(newKeyInput, model);
            if (res.isValid) {
                bestModel = model;
                isValid = true;
                latency = res.latency;
                break;
            }
            errorType = res.errorType || 'unknown';
            if (errorType === 'invalid') break;
        }
        
        const newProfile: ApiKeyProfile = {
            id: tempId,
            label: newKeyLabel || `API Key ${apiKeys.length + 1}`,
            key: newKeyInput,
            status: isValid ? 'valid' : errorType,
            activeModel: isValid ? bestModel : undefined,
            latency: latency,
            lastChecked: new Date().toISOString(),
            lastResetDate: new Date().toISOString().split('T')[0]
        };

        setApiKeys(prev => [...prev, newProfile]);
        if (apiKeys.length === 0) setActiveKeyId(tempId);
        
        setNewKeyInput("");
        setNewKeyLabel("");
        setIsCheckingKey(false);
    };

    const handleDeleteKey = (id: string) => {
        const remaining = apiKeys.filter(k => k.id !== id);
        setApiKeys(remaining);
        if (activeKeyId === id && remaining.length > 0) {
            setActiveKeyId(remaining[0].id);
        } else if (remaining.length === 0) {
            setActiveKeyId("");
        }
    };

    const handleRefreshStatus = async (id: string) => {
        const keyProfile = apiKeys.find(k => k.id === id);
        if (keyProfile) await checkKeyStatus(id, keyProfile.key);
    };

    // --- Key Label Editing Functions ---
    const handleStartEdit = (key: ApiKeyProfile) => {
        setEditingKeyId(key.id);
        setEditLabelInput(key.label);
    };

    const handleSaveLabel = () => {
        if (!editingKeyId || !editLabelInput.trim()) return;
        setApiKeys(prev => prev.map(k => k.id === editingKeyId ? { ...k, label: editLabelInput.trim() } : k));
        setEditingKeyId(null);
        setEditLabelInput("");
    };

    const executeWithSmartFailover = async <T,>(operation: (apiKey: string, model: string) => Promise<T>, attemptedKeys: string[] = []): Promise<T> => {
        const availableKeys = apiKeys.filter(k => k.status !== 'invalid' && k.status !== 'quota_exceeded' && !attemptedKeys.includes(k.id)).sort((a, b) => a.latency - b.latency);
        let candidateKey: ApiKeyProfile | undefined = availableKeys.find(k => k.id === activeKeyId) || availableKeys[0];

        if (!candidateKey) throw new Error("ALL_KEYS_EXHAUSTED");
        if (candidateKey.id !== activeKeyId) setActiveKeyId(candidateKey.id);

        const modelToUse = candidateKey.activeModel || MODEL_HIERARCHY[0];

        try {
            return await operation(candidateKey.key, modelToUse);
        } catch (error: any) {
            const msg = error.message?.toLowerCase() || "";
            const isApiError = msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted") || (msg.includes("403") && !msg.includes("api key not valid"));

            if (isApiError) {
                const currentModelIndex = MODEL_HIERARCHY.indexOf(modelToUse);
                if (currentModelIndex !== -1 && currentModelIndex < MODEL_HIERARCHY.length - 1) {
                    const nextModel = MODEL_HIERARCHY[currentModelIndex + 1];
                    console.warn(`[Smart Cascade] Key ${candidateKey.label} exhausted on ${modelToUse}. Downgrading to ${nextModel}...`);
                    setApiKeys(prev => prev.map(k => k.id === candidateKey!.id ? { ...k, activeModel: nextModel } : k));
                    return await executeWithSmartFailover(operation, attemptedKeys); 
                } else {
                    setApiKeys(prev => prev.map(k => k.id === candidateKey!.id ? { ...k, status: 'quota_exceeded' } : k));
                    return await executeWithSmartFailover(operation, [...attemptedKeys, candidateKey.id]);
                }
            }
            
            if (msg.includes("key not valid") || msg.includes("api key")) {
                 setApiKeys(prev => prev.map(k => k.id === candidateKey!.id ? { ...k, status: 'invalid' } : k));
                 return await executeWithSmartFailover(operation, [...attemptedKeys, candidateKey.id]);
            }
            throw error;
        }
    };

    const handleNewSession = () => {
        if (window.confirm("Start new session? Current work will be cleared.")) {
            setAuditInfo({ company: "", smo: "", department: "", interviewee: "", auditor: "", type: "" });
            setSelectedClauses([]);
            setEvidence(INITIAL_EVIDENCE);
            setPastedImages([]);
            setAnalysisResult(null);
            setSelectedFindings({});
            setFinalReportText(null);
            setLayoutMode('evidence');
            setAiError(null);
        }
    };

    const handleUpdateStandard = (updated: Standard) => {
        setCustomStandards(prev => ({ ...prev, [updated.name]: updated }));
        setStandardKey(updated.name); // Switch to the updated standard
    };

    const handleResetStandard = (key: string) => {
        setCustomStandards(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTemplateFileName(file.name);
        if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            mammoth.extractRawText({ arrayBuffer })
                .then((result: any) => setReportTemplate(result.value))
                .catch((err: any) => console.error("Mammoth Error:", err));
        } else {
            const reader = new FileReader();
            reader.onload = (re) => setReportTemplate(re.target?.result as string);
            reader.readAsText(file);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const newImages: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) newImages.push(blob);
            }
        }
        if (newImages.length > 0) setPastedImages(prev => [...prev, ...newImages]);
    };

    const handleRemoveImage = (indexToRemove: number) => setPastedImages(prev => prev.filter((_, index) => index !== indexToRemove));

    const handleUpdateFinding = (index: number, field: keyof AnalysisResult, value: string) => {
        setAnalysisResult(prev => {
            if (!prev) return null;
            const newArr = [...prev];
            newArr[index] = { ...newArr[index], [field]: value };
            return newArr;
        });
    };

    const handleAnalyze = async () => {
        if (!isReadyForAnalysis) return;
        setIsAnalyzeLoading(true); setAiError(null); setAnalysisResult([]); setLayoutMode('findings'); setLoadingMessage("Initializing AI Auditor...");
        try {
            const allClausesInStandard = allStandards[standardKey].groups.flatMap(g => g.clauses);
            const flatten = (list: Clause[]): Clause[] => list.reduce((acc, c) => (acc.push(c), c.subClauses && acc.push(...flatten(c.subClauses)), acc), [] as Clause[]);
            const flatAllClauses = flatten(allClausesInStandard);
            const scopeClauses = selectedClauses.map(id => flatAllClauses.find(c => c.id === id)).filter((c): c is Clause => !!c);
            
            for (let i = 0; i < scopeClauses.length; i++) {
                const clause = scopeClauses[i];
                setCurrentAnalyzingClause(clause.code); setLoadingMessage(`Analyzing Clause ${clause.code}...`);
                const prompt = `Act as an ISO Lead Auditor. Evaluate compliance for this SINGLE clause: [${clause.code}] ${clause.title}: ${clause.description}\nCONTEXT: ${auditInfo.type} for ${auditInfo.company}.\nRAW EVIDENCE: """ ${evidence} """\nReturn a JSON Array with exactly ONE object containing: clauseId (must be "${clause.id}"), status (COMPLIANT, NC_MAJOR, NC_MINOR, OFI), reason, suggestion, evidence, conclusion_report (concise).`;
                try {
                    const resultStr = await executeWithSmartFailover(async (key, model) => generateAnalysis(prompt, `Output JSON array only.`, key, model));
                    const chunkResult = cleanAndParseJSON(resultStr || "");
                    if (chunkResult && Array.isArray(chunkResult) && chunkResult.length > 0) {
                        const resultItem = chunkResult[0];
                        resultItem.clauseId = clause.id;
                        setAnalysisResult(prev => {
                            const prevSafe = prev || [];
                            if (prevSafe.find(r => r.clauseId === resultItem.clauseId)) return prevSafe;
                            setSelectedFindings(sel => ({...sel, [resultItem.clauseId]: true}));
                            return [...prevSafe, resultItem];
                        });
                    }
                } catch (innerError: any) {
                    if (innerError.message.includes("ALL_")) throw innerError; 
                    console.error(`Failed to analyze clause ${clause.code}`, innerError);
                }
                await new Promise(r => setTimeout(r, 200));
            }
        } catch (e: any) { 
            if (e.message.includes("ALL_")) {
                setAiError("System Overload: All API Keys and Model Backups are exhausted. Please add a new key or wait a moment.");
                setShowSettingsModal(true); 
            } else setAiError(e.message || "Analysis Failed");
        } finally { setIsAnalyzeLoading(false); setCurrentAnalyzingClause(""); setLoadingMessage(""); }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult) return;
        setIsReportLoading(true); setLayoutMode('report'); setAiError(null);
        const hasTemplate = !!reportTemplate;
        setLoadingMessage(hasTemplate ? `Analyzing Template "${templateFileName}" & Synthesizing Report...` : "Synthesizing Standard ISO Report...");
        try {
             const acceptedFindings = analysisResult.filter(r => selectedFindings[r.clauseId]);
             let prompt = "";
             if (hasTemplate) {
                 prompt = `ROLE: You are an expert ISO Lead Auditor. TASK: Generate a final audit report by STRICTLY following the provided TEMPLATE structure. INPUT 1: REPORT TEMPLATE (Style, Structure, Headers, Tone): """ ${reportTemplate} """ INPUT 2: AUDIT DATA (Content to fill): - Context: ${JSON.stringify(auditInfo)} - Findings: ${JSON.stringify(acceptedFindings)} INSTRUCTIONS: 1. ANALYZE the Template's structure. 2. REPRODUCE the report using the exact same headings and formatting style. 3. FILL placeholders with Context data. 4. POPULATE the findings section with the Audit Data. 5. Maintain the professional tone of the template. 6. Do NOT output JSON. Output the final report text directly.`;
             } else {
                 prompt = `GENERATE FINAL REPORT. DATA: ${JSON.stringify(auditInfo)}. FINDINGS: ${JSON.stringify(acceptedFindings)}. Use standard ISO professional reporting format.`;
             }
             const text = await executeWithSmartFailover(async (key, model) => generateTextReport(prompt, "Expert ISO Report Compiler.", key, model));
             setFinalReportText(text || "");
        } catch (e: any) { 
            if (e.message.includes("ALL_")) {
                setAiError("API Quota Exceeded during report generation. Please check Settings.");
                setShowSettingsModal(true);
            } else setAiError(e.message || "Report Generation Failed"); 
        } finally { setIsReportLoading(false); setLoadingMessage(""); }
    };

    const handleOcrUpload = async () => {
        if (pastedImages.length === 0) return;
        setIsOcrLoading(true); setAiError(null);
        try {
            const promises = pastedImages.map(async (file) => {
                const b64 = await fileToBase64(file);
                return await executeWithSmartFailover(async (key, model) => generateOcrContent("Extract text accurately. Output raw text only.", b64, file.type, key, model));
            });
            const results = await Promise.all(promises);
            insertTextAtCursor(results.join('\n\n'));
            setPastedImages([]);
        } catch (e: any) { setAiError(e.message || "OCR Processing Failed"); 
        } finally { setIsOcrLoading(false); }
    };

    const startSmartExport = (text: string, type: 'notes' | 'report' | 'evidence', lang: ExportLanguage) => {
        if (!text) return;
        const CHUNK_SIZE = 8000;
        const chunks = text.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) || [];
        setExportState({ isOpen: true, isPaused: false, isFinished: false, totalChunks: chunks.length, processedChunksCount: 0, chunks: chunks, results: new Array(chunks.length).fill(""), error: null, currentType: type, targetLang: lang });
    };

    const processNextExportChunk = async () => {
        const { processedChunksCount, chunks, targetLang, results } = exportState;
        const index = processedChunksCount;
        const chunk = chunks[index];
        const targetLangName = targetLang === 'vi' ? "Vietnamese" : "English";
        const prompt = `Act as an ISO Lead Auditor. Task: Translate or Refine the following audit text fragment to ${targetLangName}. Constraint: Output ONLY the processed text. Do NOT add conversational filler. Maintain ISO terminology accuracy. Text Fragment (${index + 1}/${chunks.length}): """${chunk}"""`;
        try {
            const result = await executeWithSmartFailover(async (key, model) => generateTextReport(prompt, "Professional ISO Translator.", key, model));
            const newResults = [...results];
            newResults[index] = result && result.trim() ? result : chunk;
            setExportState(prev => ({ ...prev, processedChunksCount: prev.processedChunksCount + 1, results: newResults }));
        } catch (error: any) {
            if (error.message.includes("ALL_")) {
                setExportState(prev => ({ ...prev, isPaused: true, error: "All API keys exhausted. Please add a new key or wait." }));
            } else {
                console.warn(`Export chunk ${index+1} failed. Appending raw text.`);
                const newResults = [...results]; newResults[index] = chunk;
                setExportState(prev => ({ ...prev, processedChunksCount: prev.processedChunksCount + 1, results: newResults }));
            }
        }
    };

    const finishExport = () => {
        setExportState(prev => ({ ...prev, isFinished: true }));
        const contentToExport = exportState.results.join('\n\n');
        let stdShort = cleanFileName(standardKey).substring(0, 10) || "ISO";
        const typeSuffix = exportState.currentType === 'notes' ? 'Audit_Findings' : exportState.currentType === 'evidence' ? 'Audit_Evidence' : 'Audit_Report';
        const fnParts = [ stdShort, cleanFileName(auditInfo.type) || "Type", cleanFileName(auditInfo.smo) || "ID", cleanFileName(auditInfo.company) || "Company", cleanFileName(auditInfo.department) || "Dept", cleanFileName(auditInfo.auditor) || "Auditor", typeSuffix, new Date().toISOString().split('T')[0] ];
        const fileName = fnParts.join('_');
        const blob = new Blob([contentToExport], {type: 'text/plain;charset=utf-8'});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setExportState(prev => ({ ...prev, isOpen: false })), 2000);
    };

    const handleResumeExport = async () => {
        if (rescueKey.trim()) {
            setIsRescuing(true);
            const validation = await validateApiKey(rescueKey);
            if (validation.isValid) {
                 const newId = Date.now().toString();
                 const newProfile: ApiKeyProfile = { id: newId, label: `Rescue Key ${apiKeys.length + 1}`, key: rescueKey, status: 'valid', latency: validation.latency, lastChecked: new Date().toISOString() };
                setApiKeys(prev => [...prev, newProfile]);
                setActiveKeyId(newId);
                setRescueKey("");
                setExportState(prev => ({ ...prev, isPaused: false, error: null }));
                setToastMsg("Rescue Key Added & Export Resumed!");
            } else setToastMsg("Invalid API Key");
            setIsRescuing(false);
        } else {
            setApiKeys(prev => prev.map(k => k.status === 'quota_exceeded' ? { ...k, status: 'valid' } : k));
            setExportState(prev => ({ ...prev, isPaused: false, error: null }));
        }
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
        if (files.length > 0) setPastedImages(prev => [...prev, ...files]);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCmdPaletteOpen(prev => !prev); } };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const commandActions = useMemo(() => {
        const actions: any[] = [
            { label: "Analyze Compliance", desc: "Start AI analysis", icon: "Wand2", shortcut: "AI", action: handleAnalyze },
            { label: "Toggle Dark Mode", desc: `Switch to ${isDarkMode ? 'Light' : 'Dark'}`, icon: isDarkMode ? "Sun" : "Moon", action: () => setIsDarkMode(!isDarkMode) },
            { label: "Generate Report", desc: "Synthesize final report", icon: "FileText", action: handleGenerateReport },
            { label: "Export Notes", desc: "Download findings", icon: "Download", action: () => { const reportTxt = analysisResult?.filter(r => selectedFindings[r.clauseId]).map(r => `[${r.status}] Clause ${r.clauseId}: ${r.conclusion_report}`).join('\n\n') || ""; startSmartExport(reportTxt, 'notes', notesLanguage); }},
            { label: "Settings / API Key", desc: "Manage configuration", icon: "Settings", action: () => setShowSettingsModal(true) },
        ];
        if (allStandards[standardKey]) {
            const flatten = (list: Clause[]): any[] => list.flatMap(c => {
                const item = { label: `${c.code} ${c.title}`, desc: c.description, type: 'clause', icon: 'Book', action: () => insertTextAtCursor(`[${c.code}] ${c.title}`) };
                return c.subClauses ? [item, ...flatten(c.subClauses)] : [item];
            });
            return [...actions, ...allStandards[standardKey].groups.flatMap(g => flatten(g.clauses))];
        }
        return actions;
    }, [isDarkMode, standardKey, allStandards, analysisResult, selectedFindings]);

    const getAnalyzeTooltip = () => {
        if (isAnalyzeLoading) return "AI is analyzing...";
        const missing = [];
        if (selectedClauses.length === 0) missing.push("Clauses");
        if (!hasEvidence) missing.push("Evidence");
        if (missing.length > 0) return `Feature Unavailable. Missing: ${missing.join(" & ")}.`;
        return "Ready! Click to Start AI Analysis.";
    };

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-gray-50 dark:bg-slate-900 transition-colors duration-500 ease-soft relative">
            {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

            {aiError && (
                <div className={`fixed top-20 right-5 z-[9999] max-w-sm w-full bg-white dark:bg-slate-800 border-l-4 border-red-500 shadow-2xl rounded-r-xl p-4 animate-shake transition-all duration-300 ease-soft ${isErrorClosing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold"><Icon name="AlertCircle" size={20}/><span>System Alert</span></div>
                        <button onClick={dismissError} className="text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"><Icon name="X" size={18}/></button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{aiError}</p>
                    <div className="flex justify-end"><button onClick={dismissError} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white underline">Dismiss</button></div>
                </div>
            )}

            <header className="flex-shrink-0 px-4 md:px-6 py-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-[70] relative flex justify-between items-center h-16 transition-all duration-300">
                <div className="flex items-center h-full gap-3 md:gap-5">
                    <div className="relative group cursor-pointer flex items-center justify-center transition-all duration-500 hover:opacity-100 active:scale-95" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="Toggle Sidebar">
                        <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center">
                            <div className="absolute -inset-4 bg-indigo-500/0 rounded-full blur-xl transition-all duration-500 group-hover:bg-indigo-500/10"></div>
                            <div className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,transparent_0_deg,#f472b6_100deg,#8b5cf6_200deg,#06b6d4_300deg,transparent_360deg)] opacity-30 blur-lg animate-[spin_4s_linear_infinite] group-hover:opacity-70 group-hover:blur-md transition-all duration-500"></div>
                            <div className="relative z-10">
                                {isSidebarOpen ? <div className="relative w-8 h-8"><div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-cyan-500 rounded-full animate-infinity-spin drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div><div className="absolute inset-2 border-2 border-transparent border-l-purple-500 border-r-pink-500 rounded-full animate-spin-reverse drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]"></div></div>
                                    : <div className="hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(0,242,195,0.6)]"><Icon name="TDLogo" size={32} /></div> }
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <h1 className="hidden md:block text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">ISO Audit <span className="font-light text-slate-400">Pro</span></h1>
                        <div className="hidden md:block h-5 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>
                        <div className="flex items-center"><span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50 shadow-sm uppercase tracking-wider backdrop-blur-sm">{allStandards[standardKey]?.name.split(' ')[0] || 'ISO'}</span></div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsCmdPaletteOpen(true)} className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95" title="Open Command Palette (Ctrl+K)"><Icon name="Search" size={20}/></button>
                    <div className="hidden lg:block"><FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir: 'increase' | 'decrease') => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} /></div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"><Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/></button>
                    <div className="hidden md:block h-4 w-px bg-gray-200 dark:bg-slate-800 mx-1"></div>
                    <button onClick={() => setShowSettingsModal(true)} className="group relative w-8 h-8 flex items-center justify-center transition-all" title="Connection Status">
                        <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${activeKeyId ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <div className={`relative w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 ${activeKeyId ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </button>
                    <button onClick={() => setShowAboutModal(true)} className="ml-1 p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Icon name="Info" size={18}/></button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-16 bottom-0 left-0 z-[60] md:absolute md:inset-y-0 md:relative md:top-0 md:translate-x-0 md:transform-none transition-transform duration-300 ease-soft h-[calc(100%-4rem)] md:h-full`}>
                    <Sidebar isOpen={isSidebarOpen} width={sidebarWidth} setWidth={setSidebarWidth} standards={allStandards} standardKey={standardKey} setStandardKey={setStandardKey} auditInfo={auditInfo} setAuditInfo={setAuditInfo} selectedClauses={selectedClauses} setSelectedClauses={setSelectedClauses} onAddNewStandard={() => { const name = prompt("Enter new Standard Name (e.g. ISO 45001:2018):"); if(name) setCustomStandards(prev => ({...prev, [name]: { name, description: "Custom Standard", groups: [] }})); }} onUpdateStandard={handleUpdateStandard} onResetStandard={handleResetStandard} onReferenceClause={handleOpenReferenceClause} />
                </div>
                {isSidebarOpen && <div className="fixed top-16 bottom-0 inset-x-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />}
                
                <div className={`flex-1 flex flex-col min-w-0 relative w-full transition-all duration-300 ease-soft ${isDragging ? 'ring-4 ring-indigo-500/50 scale-[0.99]' : ''} ${currentTabConfig.bgSoft} border-t-4 ${currentTabConfig.borderClass}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    {isDragging && <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-500/10 backdrop-blur-sm rounded-3xl border-4 border-dashed border-indigo-500 m-4 pointer-events-none"><div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce"><Icon name="UploadCloud" size={48} className="text-indigo-500 mb-4"/><h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">Drop Evidence Here</h3><p className="text-slate-500 font-medium">Images or Screenshots</p></div></div>}

                    <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <div ref={tabsContainerRef} className="relative flex justify-between bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full">
                                <div className={`absolute top-1 bottom-1 shadow-sm rounded-lg transition-all duration-500 ease-fluid-spring z-0 ${tabStyle.color}`} style={{ left: tabStyle.left, width: tabStyle.width, opacity: tabStyle.opacity }} />
                                {tabsList.map((tab, idx) => (
                                    <button key={tab.id} ref={el => { tabsRef.current[idx] = el; }} onClick={() => setLayoutMode(tab.id as LayoutMode)} className={`flex-1 relative z-10 flex items-center justify-center gap-2 px-1 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors duration-300 ${layoutMode === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title={tab.label}>
                                        <Icon name={tab.icon} size={16}/> 
                                        <span className={`${isSidebarOpen ? 'hidden xl:inline' : 'hidden md:inline'}`}>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0 pl-2 border-l border-gray-200 dark:border-slate-800">
                            <button onClick={loadSessionData} className="p-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95" title="Recall Session"><Icon name="History" size={18}/></button>
                            <button onClick={handleNewSession} className="p-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all shadow-sm hover:text-indigo-600 dark:hover:text-indigo-400 duration-300 hover:scale-105 active:scale-95" title="Start New Session"><Icon name="Session4_FilePlus" size={18}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative p-4 md:p-6">
                        {layoutMode === 'evidence' && <div className="h-full flex flex-col gap-4 animate-fade-in-up relative"><div className="flex-1 flex flex-col gap-4 min-h-0"><div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col relative group focus-within:ring-2 ring-indigo-500/20 transition-all duration-300"><textarea ref={evidenceTextareaRef} className="flex-1 w-full h-full p-6 bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-300 font-mono text-sm leading-relaxed" placeholder="Paste audit evidence here or drag & drop screenshots..." value={evidence} onChange={(e) => setEvidence(e.target.value)} onPaste={handlePaste} /><div className="absolute bottom-4 right-4 flex gap-2"><input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => e.target.files && setPastedImages(prev => [...prev, ...Array.from(e.target.files!)])} /><button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm" title="Upload Files"><Icon name="Demo8_GridPlus" size={20}/></button></div></div>{pastedImages.length > 0 && <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl animate-in slide-in-from-bottom-5 duration-300"><div className="flex justify-between items-center mb-2 px-1"><h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Icon name="UploadCloud" size={14} className="text-indigo-500"/>Pending Extraction ({pastedImages.length})</h4><button onClick={() => setPastedImages([])} className="text-xs text-red-500 hover:text-red-600 font-bold">Clear All</button></div><div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">{pastedImages.map((file, idx) => (<div key={idx} className="relative group flex-shrink-0 w-24 h-24 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-transform duration-300 hover:scale-105"><img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button onClick={() => handleRemoveImage(idx)} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transform scale-90 hover:scale-110 transition-all duration-200" title="Remove File"><Icon name="X" size={14}/></button></div><div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[8px] text-white truncate text-center">{file.name}</div></div>))}<div className="flex-shrink-0 w-24 h-24 flex items-center justify-center"><button onClick={handleOcrUpload} disabled={isOcrLoading} className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:scale-105 duration-300">{isOcrLoading ? <Icon name="Loader" className="animate-spin" size={24}/> : <Icon name="ScanText" size={24}/>}<span className="text-[10px] font-bold">Extract All</span></button></div></div></div>}</div><div className="flex items-center justify-center md:justify-end gap-2 md:gap-3 w-full"><button onClick={handleAnalyze} disabled={!isReadyForAnalysis} title={getAnalyzeTooltip()} className={`h-9 md:h-10 w-auto px-3 md:px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 ${isReadyForAnalysis ? "btn-shrimp shadow-xl active:scale-95" : "bg-gray-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-70 cursor-not-allowed border border-transparent"}`}>{isAnalyzeLoading ? <SparkleLoader className="text-white"/> : <Icon name="Wand2" size={18}/>}<span className="hidden md:inline text-xs uppercase tracking-wider">Analyze Compliance</span></button><button onClick={() => startSmartExport(evidence, 'evidence', evidenceLanguage)} disabled={!evidence || !evidence.trim()} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:border-gray-200 dark:disabled:hover:border-slate-700" title="Export Raw Text"><Icon name="Download"/> <span className="hidden md:inline">Export Raw</span><div className="lang-pill-container ml-1"><span onClick={(e) => {e.stopPropagation(); setEvidenceLanguage('en');}} className={`lang-pill-btn ${evidenceLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span><span onClick={(e) => {e.stopPropagation(); setEvidenceLanguage('vi');}} className={`lang-pill-btn ${evidenceLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span></div></button></div></div>}
                        {layoutMode === 'findings' && <div className="h-full flex flex-col animate-fade-in-up"><div ref={findingsContainerRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">{(!analysisResult || analysisResult.length === 0) && !isAnalyzeLoading && <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 animate-in zoom-in-95 duration-500"><Icon name="Wand2" size={64} className="mb-4 text-slate-300 dark:text-slate-700"/><p>No analysis data yet. Run analysis first.</p></div>}{findingsViewMode === 'matrix' && analysisResult && analysisResult.length > 0 && <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-1">{analysisResult.map((result, idx) => { const isActive = selectedFindings[result.clauseId]; let bgColor = 'bg-gray-200 dark:bg-slate-700'; let textColor = 'text-slate-500 dark:text-slate-400'; if (isActive) { if (result.status === 'COMPLIANT') { bgColor = 'bg-emerald-500'; textColor = 'text-white'; } else if (result.status === 'NC_MAJOR') { bgColor = 'bg-red-600'; textColor = 'text-white'; } else if (result.status === 'NC_MINOR') { bgColor = 'bg-orange-500'; textColor = 'text-white'; } else if (result.status === 'OFI') { bgColor = 'bg-blue-500'; textColor = 'text-white'; } } return <div key={result.clauseId} className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all hover:scale-110 shadow-sm ${bgColor} ${textColor} ${!isActive ? 'opacity-50' : ''}`} title={`${result.clauseId}: ${result.status}\n${result.reason}`} onClick={() => setSelectedFindings(prev => ({...prev, [result.clauseId]: !prev[result.clauseId]}))}>{result.clauseId}</div>; })}</div>}{findingsViewMode === 'list' && analysisResult?.map((result, idx) => <div key={result.clauseId} className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border-l-4 shadow-sm transition-all duration-500 hover:shadow-md animate-in slide-in-from-bottom-5 fade-in ${!selectedFindings[result.clauseId] ? 'opacity-60 grayscale border-gray-300' : result.status === 'COMPLIANT' ? 'border-emerald-500' : result.status === 'NC_MAJOR' ? 'border-red-600' : result.status === 'NC_MINOR' ? 'border-orange-500' : 'border-blue-500'}`} style={{animationDelay: `${idx * 0.05}s`}}><div className="flex justify-between items-start gap-4"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><input type="checkbox" checked={!!selectedFindings[result.clauseId]} onChange={() => setSelectedFindings(prev => ({...prev, [result.clauseId]: !prev[result.clauseId]}))} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-transform duration-200 active:scale-90"/><span className="font-black text-sm bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{result.clauseId}</span><select value={result.status} onChange={(e) => handleUpdateFinding(idx, 'status', e.target.value as FindingStatus)} className={`text-xs font-bold px-2 py-0.5 rounded uppercase border-none outline-none cursor-pointer transition-colors ${result.status === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-700' : result.status === 'NC_MAJOR' ? 'bg-red-100 text-red-700' : result.status === 'NC_MINOR' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-700'}`}><option value="COMPLIANT">Compliant</option><option value="NC_MAJOR">NC Major</option><option value="NC_MINOR">NC Minor</option><option value="OFI">OFI</option></select></div><div className="space-y-3 mt-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</label><input type="text" value={result.reason} onChange={(e) => handleUpdateFinding(idx, 'reason', e.target.value)} className="editable-finding-input" /></div><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evidence</label><input type="text" value={result.evidence} onChange={(e) => handleUpdateFinding(idx, 'evidence', e.target.value)} className="editable-finding-input" /></div><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggestion / Corrective Action</label><input type="text" value={result.suggestion} onChange={(e) => handleUpdateFinding(idx, 'suggestion', e.target.value)} className="editable-finding-input" /></div><div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Conclusion</label><textarea value={result.conclusion_report} onChange={(e) => handleUpdateFinding(idx, 'conclusion_report', e.target.value)} className="editable-finding-input h-20" /></div></div></div></div></div>)}{isAnalyzeLoading && <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 animate-in fade-in duration-500"><AINeuralLoader message={loadingMessage}/></div>}</div><div className="flex-shrink-0 flex items-center justify-between gap-4 mt-2"><div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl"><button onClick={() => setFindingsViewMode('list')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${findingsViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>List View</button><button onClick={() => setFindingsViewMode('matrix')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${findingsViewMode === 'matrix' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Matrix View</button></div><div className="flex items-center gap-3"><button onClick={() => startSmartExport(analysisResult?.filter(r => selectedFindings[r.clauseId]).map(r => `[${r.status}] Clause ${r.clauseId}:\n- Reason: ${r.reason}\n- Evidence: ${r.evidence}\n- Suggestion: ${r.suggestion}\n- Conclusion: ${r.conclusion_report}`).join('\n\n') || "", 'notes', notesLanguage)} disabled={!analysisResult} className="h-10 w-auto px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50" title="Export Notes"><Icon name="Download"/>Export Notes<div className="lang-pill-container ml-1"><span onClick={(e) => {e.stopPropagation(); setNotesLanguage('en');}} className={`lang-pill-btn ${notesLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span><span onClick={(e) => {e.stopPropagation(); setNotesLanguage('vi');}} className={`lang-pill-btn ${notesLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span></div></button><button onClick={handleGenerateReport} disabled={!analysisResult || Object.values(selectedFindings).every(v => !v)} className="h-10 w-auto px-5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 btn-shrimp shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" title="Synthesize Findings into Report"><Icon name="FileText" size={18}/>Generate Report</button></div></div></div>}
                        {layoutMode === 'report' && <div className="h-full flex flex-col gap-4 animate-fade-in-up">{isReportLoading ? <AINeuralLoader message={loadingMessage}/> : <> <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col">{finalReportText === null ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60"><Icon name="FileText" size={64} className="mb-4 text-slate-300 dark:text-slate-700"/><p>Generate a report from the Findings tab first.</p></div> : <textarea className="flex-1 w-full h-full p-6 bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-300 font-serif text-base leading-relaxed" value={finalReportText} onChange={(e) => setFinalReportText(e.target.value)} />}</div><div className="flex-shrink-0 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><input type="file" id="template-upload" className="hidden" accept=".txt,.md,.docx" onChange={handleTemplateUpload} /><label htmlFor="template-upload" className="h-10 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm cursor-pointer"><Icon name="UploadCloud"/><span>{templateFileName ? `Template: ${templateFileName}` : "Upload Template (.docx, .txt)"}</span></label>{templateFileName && <button onClick={() => { setReportTemplate(""); setTemplateFileName(""); }} className="text-red-500 text-xs font-bold">Clear</button>}</div><button onClick={() => startSmartExport(finalReportText || "", 'report', exportLanguage)} disabled={!finalReportText} className="h-10 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50" title="Export Final Report"><Icon name="Download"/>Export Report<div className="lang-pill-container ml-1"><span onClick={(e) => {e.stopPropagation(); setExportLanguage('en');}} className={`lang-pill-btn ${exportLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span><span onClick={(e) => {e.stopPropagation(); setExportLanguage('vi');}} className={`lang-pill-btn ${exportLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span></div></button></div></>}</div>}
                    </div>
                </div>
            </main>

            <ReleaseNotesModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)}/>
            <ReferenceClauseModal isOpen={referenceClauseState.isOpen} onClose={() => setReferenceClauseState({ isOpen: false, clause: null, isLoading: false, fullText: { en: "", vi: "" } })} clause={referenceClauseState.clause} standardName={allStandards[standardKey]?.name || ""} fullText={referenceClauseState.fullText} isLoading={referenceClauseState.isLoading} onInsert={handleInsertReferenceText} />
            <CommandPaletteModal isOpen={isCmdPaletteOpen} onClose={() => setIsCmdPaletteOpen(false)} actions={commandActions} onSelectAction={(action: any) => { action.action(); setIsCmdPaletteOpen(false); }} />

            <Modal isOpen={showSettingsModal} title="Settings & API Keys" onClose={() => setShowSettingsModal(false)}>
                <div className="space-y-6"><div><h4 className="text-xs font-bold text-slate-400 uppercase mb-2">API Key Management</h4><div className="space-y-2">{apiKeys.map(k => (<div key={k.id} className={`p-3 rounded-xl border-l-4 flex items-center gap-3 transition-all ${activeKeyId === k.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' : 'bg-gray-50 dark:bg-slate-800 border-transparent'}`}><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1.5"><span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${k.status === 'valid' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : k.status === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} title={`Status: ${k.status}`}></span>{editingKeyId === k.id ? (<div className="flex items-center gap-1 flex-1 animate-in fade-in zoom-in-95 duration-200"><input autoFocus value={editLabelInput} onChange={(e) => setEditLabelInput(e.target.value)} className="text-xs font-bold bg-white dark:bg-black border border-indigo-300 dark:border-indigo-700 rounded px-1 py-0.5 w-full text-indigo-700 dark:text-indigo-300 outline-none shadow-sm focus:ring-1 focus:ring-indigo-500" onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()} /><button onClick={handleSaveLabel} className="text-emerald-500 hover:text-emerald-600 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"><Icon name="CheckThick" size={14}/></button><button onClick={() => setEditingKeyId(null)} className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Icon name="X" size={14}/></button></div>) : (<div className="flex items-center gap-2 group/label"><p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate cursor-pointer" onClick={() => handleStartEdit(k)}>{k.label}</p><button onClick={() => handleStartEdit(k)} className="opacity-0 group-hover/label:opacity-100 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-200 transform hover:scale-110" title="Rename Label"><Icon name="FileEdit" size={12}/></button></div>)}</div><div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono bg-gray-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-gray-100 dark:border-slate-700"><Icon name="Key" size={10} className="opacity-50"/><span>...{k.key.slice(-8)}</span></div>{k.activeModel && (<div className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-tight shadow-sm"><Icon name="Cpu" size={10}/><span>{k.activeModel}</span></div>)}{k.latency > 0 && (<div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"><span>{k.latency}ms</span></div>)}</div></div><div className="flex items-center gap-1"><button onClick={() => handleRefreshStatus(k.id)} title="Refresh Status" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"><Icon name="RefreshCw" size={14}/></button><button onClick={() => setActiveKeyId(k.id)} disabled={activeKeyId === k.id || k.status !== 'valid'} title="Set Active" className={`p-2 rounded-lg transition-colors ${activeKeyId === k.id ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Icon name="CheckCircle2" size={14}/></button><button onClick={() => handleDeleteKey(k.id)} title="Delete Key" className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"><Icon name="Trash2" size={14}/></button></div></div>))}</div><div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700"><div className="flex gap-2"><input type="text" placeholder="New API Key..." value={isInputFocused ? newKeyInput : (newKeyInput ? "•".repeat(Math.min(newKeyInput.length - 5, 20)) + newKeyInput.slice(-5) : "")} onChange={e => setNewKeyInput(e.target.value)} onFocus={() => setIsInputFocused(true)} onBlur={() => setIsInputFocused(false)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-900 dark:bg-black border border-slate-700 text-emerald-400 placeholder-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono tracking-wide transition-all shadow-inner" /><input type="text" placeholder="Label (optional)" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} className="w-32 text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50" /></div><button onClick={handleAddKey} disabled={isCheckingKey} className="mt-2 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">{isCheckingKey ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Plus"/>}{isCheckingKey ? "Validating..." : "Add & Validate Key"}</button></div></div></div>
            </Modal>
            
             <Modal isOpen={exportState.isOpen} title="Smart Export Engine" onClose={() => setExportState(prev => ({...prev, isOpen: false}))}>
                 <div className="space-y-4"><div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700"><h4 className="font-bold text-slate-800 dark:text-white">Exporting {exportState.currentType}</h4><p className="text-xs text-slate-500">Processing {exportState.totalChunks} chunks to ensure stability. Target Language: <strong>{exportState.targetLang.toUpperCase()}</strong>.</p></div><div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5"><div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{width: `${(exportState.processedChunksCount / exportState.totalChunks) * 100}%`}}></div></div><p className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">{exportState.processedChunksCount} / {exportState.totalChunks} Chunks Processed</p>{exportState.error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded-r-lg"><h5 className="font-bold">Export Paused: API Error</h5><p className="text-xs mb-2">{exportState.error}</p><div className="flex gap-2"><input type="text" placeholder="Inject Rescue API Key..." value={rescueKey} onChange={(e) => setRescueKey(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 outline-none focus:ring-2 ring-red-500/50" /><button onClick={handleResumeExport} disabled={isRescuing} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold flex items-center gap-1">{isRescuing ? <Icon name="Loader"/> : <Icon name="RefreshCw"/>}Resume</button></div></div>}{exportState.isFinished && <div className="p-4 text-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl animate-in zoom-in-95"><h5 className="font-bold">Export Complete!</h5><p className="text-xs">Your download should start automatically.</p></div>}</div>
             </Modal>
        </div>
    );
}
export default App;