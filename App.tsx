
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, Standard, ApiKeyProfile, Clause, FindingsViewMode } from './types';
import { Icon, FontSizeController, SparkleLoader, Modal, IconInput, AINeuralLoader, Toast, CommandPaletteModal } from './components/UI';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import { generateOcrContent, generateAnalysis, generateTextReport, validateApiKey } from './services/geminiService';
import { cleanAndParseJSON, fileToBase64, cleanFileName } from './utils';

declare var mammoth: any;

type LayoutMode = 'evidence' | 'findings' | 'report' | 'split';
type ExportLanguage = 'en' | 'vi';

function App() {
    // -- STATE --
    const [fontSizeScale, setFontSizeScale] = useState(1.0);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(390);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    
    // Feature: Command Palette
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

    // Feature: Matrix View
    const [findingsViewMode, setFindingsViewMode] = useState<FindingsViewMode>('list');
    
    // New: Track Window Width for responsive calculations in JS
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // API Key Management State
    const [apiKeys, setApiKeys] = useState<ApiKeyProfile[]>([]);
    const [activeKeyId, setActiveKeyId] = useState<string>("");
    const [newKeyInput, setNewKeyInput] = useState("");
    const [newKeyLabel, setNewKeyLabel] = useState("");
    const [isCheckingKey, setIsCheckingKey] = useState(false);

    // Toast State
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const [exportLanguage, setExportLanguage] = useState<ExportLanguage>('en');
    const [notesLanguage, setNotesLanguage] = useState<ExportLanguage>('vi'); 
    const [evidenceLanguage, setEvidenceLanguage] = useState<ExportLanguage>('en'); // New state for Evidence export
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
    const [isExportLoading, setIsExportLoading] = useState(false);
    const [isNotesExportLoading, setIsNotesExportLoading] = useState(false);
    const [isEvidenceExportLoading, setIsEvidenceExportLoading] = useState(false); 
    
    const [aiError, setAiError] = useState<string | null>(null);
    
    // Logo Animation State
    const [logoKey, setLogoKey] = useState(0);
    
    // Fluid Tab State
    const [tabStyle, setTabStyle] = useState({ left: 0, width: 0, opacity: 0, color: '' });
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const tabsContainerRef = useRef<HTMLDivElement>(null); 
    
    // Process Steps Configuration
    const tabsList = [
        { id: 'evidence', label: '1. Evidence', icon: 'ScanText', colorClass: 'bg-blue-500', textClass: 'text-blue-600', borderClass: 'border-blue-500', bgSoft: 'bg-blue-50 dark:bg-blue-900/10' }, 
        { id: 'findings', label: '2. Findings', icon: 'Wand2', colorClass: 'bg-purple-500', textClass: 'text-purple-600', borderClass: 'border-purple-500', bgSoft: 'bg-purple-50 dark:bg-purple-900/10' }, 
        { id: 'report', label: '3. Report', icon: 'FileText', colorClass: 'bg-emerald-500', textClass: 'text-emerald-600', borderClass: 'border-emerald-500', bgSoft: 'bg-emerald-50 dark:bg-emerald-900/10' }
    ];

    const currentTabConfig = tabsList.find(t => t.id === layoutMode) || tabsList[0];

    const fileInputRef = useRef<HTMLInputElement>(null);
    const evidenceTextareaRef = useRef<HTMLTextAreaElement>(null);
    const findingsContainerRef = useRef<HTMLDivElement>(null);

    const allStandards = { ...STANDARDS_DATA, ...customStandards };
    const hasEvidence = evidence.trim().length > 0 || pastedImages.length > 0;
    
    const isReadyForAnalysis = !isAnalyzeLoading && selectedClauses.length > 0 && hasEvidence;

    // --- HELPER: INSERT TEXT AT CURSOR ---
    const insertTextAtCursor = (textToInsert: string) => {
        if (evidenceTextareaRef.current) {
            const textarea = evidenceTextareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = evidence.substring(0, start) + textToInsert + evidence.substring(end);
            
            setEvidence(newValue);
            
            if (layoutMode !== 'evidence') setLayoutMode('evidence');

            setTimeout(() => {
                if (evidenceTextareaRef.current) {
                    evidenceTextareaRef.current.focus();
                    evidenceTextareaRef.current.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
                }
            }, 100);
        } else {
            setEvidence(prev => prev + "\n" + textToInsert);
            if (layoutMode !== 'evidence') setLayoutMode('evidence');
        }
    };

    // --- EFFECTS & PERSISTENCE ---
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

        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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

    const loadSessionData = () => {
        try {
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
        else {
            document.body.classList.remove('dark');
        }
        localStorage.setItem('iso_dark_mode', String(isDarkMode));
    }, [isDarkMode]);
    
    useEffect(() => {
        document.documentElement.style.setProperty('--font-scale', fontSizeScale.toString());
        localStorage.setItem('iso_font_scale', fontSizeScale.toString());
    }, [fontSizeScale]);

    useEffect(() => { localStorage.setItem("iso_audit_info", JSON.stringify(auditInfo)); }, [auditInfo]);
    useEffect(() => { localStorage.setItem("iso_evidence", evidence); }, [evidence]);
    useEffect(() => { localStorage.setItem("iso_standard_key", standardKey); }, [standardKey]);
    useEffect(() => { localStorage.setItem("iso_selected_clauses", JSON.stringify(selectedClauses)); }, [selectedClauses]);
    
    useEffect(() => {
        localStorage.setItem('iso_report_template', reportTemplate);
        localStorage.setItem('iso_report_template_name', templateFileName);
    }, [reportTemplate, templateFileName]);

    useEffect(() => {
        localStorage.setItem("iso_api_keys", JSON.stringify(apiKeys));
        localStorage.setItem("iso_active_key_id", activeKeyId);
        
        const activeProfile = apiKeys.find(k => k.id === activeKeyId);
        if (activeProfile) {
            localStorage.setItem("iso_api_key", activeProfile.key);
        } else {
            localStorage.removeItem("iso_api_key");
        }
    }, [apiKeys, activeKeyId]);

    const checkAllKeys = async (initialKeys: ApiKeyProfile[]) => {
        setApiKeys(prev => prev.map(k => ({ ...k, status: 'checking' })));

        const checkedKeys = await Promise.all(initialKeys.map(async (profile) => {
            const result = await validateApiKey(profile.key);
            return {
                ...profile,
                status: result.isValid ? 'valid' : (result.errorType || 'invalid'),
                latency: result.latency,
                lastChecked: new Date().toISOString()
            } as ApiKeyProfile;
        }));

        setApiKeys(checkedKeys);

        const currentActive = checkedKeys.find(k => k.id === localStorage.getItem("iso_active_key_id"));
        
        if (!currentActive || currentActive.status !== 'valid') {
            const bestKey = checkedKeys
                .filter(k => k.status === 'valid')
                .sort((a, b) => a.latency - b.latency)[0];

            if (bestKey) {
                setActiveKeyId(bestKey.id);
                setToastMsg(`Switched to active key: ${bestKey.label}`);
            }
        }
    };
    
    const checkKeyStatus = async (id: string, keyStr: string) => {
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'checking' } : k));
        const result = await validateApiKey(keyStr);
        setApiKeys(prev => prev.map(k => k.id === id ? { 
            ...k, 
            status: result.isValid ? 'valid' : (result.errorType || 'invalid'),
            latency: result.latency,
            lastChecked: new Date().toISOString()
        } : k));
        return result.isValid;
    };

    const handleAddKey = async () => {
        if (!newKeyInput.trim()) return;
        setIsCheckingKey(true);
        const tempId = Date.now().toString();
        
        const validation = await validateApiKey(newKeyInput);
        
        const newProfile: ApiKeyProfile = {
            id: tempId,
            label: newKeyLabel || `API Key ${apiKeys.length + 1}`,
            key: newKeyInput,
            status: validation.isValid ? 'valid' : (validation.errorType || 'invalid'),
            latency: validation.latency,
            lastChecked: new Date().toISOString()
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
        if (keyProfile) {
            await checkKeyStatus(id, keyProfile.key);
        }
    };

    const executeWithApiKeyFailover = async <T,>(
        operation: (apiKey: string) => Promise<T>, 
        attemptedKeys: string[] = []
    ): Promise<T> => {
        const availableKeys = apiKeys.filter(k => 
            k.status !== 'invalid' && 
            k.status !== 'quota_exceeded' && 
            !attemptedKeys.includes(k.id) 
        );

        availableKeys.sort((a, b) => a.latency - b.latency);

        let candidateKey = availableKeys.find(k => k.id === activeKeyId);
        if (!candidateKey && availableKeys.length > 0) {
            candidateKey = availableKeys[0];
        }

        if (!candidateKey) {
            throw new Error("ALL_KEYS_EXHAUSTED");
        }

        if (candidateKey.id !== activeKeyId) {
            setActiveKeyId(candidateKey.id);
            setToastMsg(`Switching to backup key: ${candidateKey.label}...`);
        }

        try {
            return await operation(candidateKey.key);
        } catch (error: any) {
            console.warn(`Key [${candidateKey.label}] failed. Error:`, error);
            
            const msg = error.message?.toLowerCase() || "";
            const isApiError = msg.includes("403") || msg.includes("429") || msg.includes("quota") || msg.includes("key") || msg.includes("permission") || msg.includes("resource exhausted");

            if (isApiError) {
                setApiKeys(prev => prev.map(k => k.id === candidateKey!.id ? { ...k, status: 'quota_exceeded' } : k));
                return await executeWithApiKeyFailover(operation, [...attemptedKeys, candidateKey.id]);
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

    const handleRecall = () => {
        loadSessionData();
        const notification = document.createElement("div");
        notification.textContent = "Session Recalled Successfully";
        notification.className = "fixed bottom-5 right-5 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-xl z-[9999] animate-in slide-in-from-bottom-5";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    };

    const handleUpdateStandard = (updated: Standard) => {
        setCustomStandards(prev => ({ ...prev, [updated.name]: updated }));
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
        if (newImages.length > 0) {
            setPastedImages(prev => [...prev, ...newImages]);
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setPastedImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleAnalyze = async () => {
        if (!hasEvidence || selectedClauses.length === 0) return;
        
        setIsAnalyzeLoading(true); 
        setAiError(null);
        setAnalysisResult([]); 
        setLayoutMode('findings'); 
        setLoadingMessage("Initializing AI Auditor...");

        try {
            const scopeClauses = allStandards[standardKey].groups.flatMap(g => g.clauses).filter(c => selectedClauses.includes(c.id));
            
            for (let i = 0; i < scopeClauses.length; i++) {
                const clause = scopeClauses[i];
                setCurrentAnalyzingClause(clause.code); 
                setLoadingMessage(`Analyzing Clause ${clause.code}...`);

                const prompt = `Act as an ISO Lead Auditor. Evaluate compliance for this SINGLE clause:
                [${clause.code}] ${clause.title}: ${clause.description}

                CONTEXT: ${auditInfo.type} for ${auditInfo.company}.
                RAW EVIDENCE: """ ${evidence} """

                Return a JSON Array with exactly ONE object containing: clauseId (must be "${clause.id}"), status (COMPLIANT, NC_MAJOR, NC_MINOR, OFI), reason, suggestion, evidence, conclusion_report (concise).`;

                try {
                    const resultStr = await executeWithApiKeyFailover(async (key) => {
                        return await generateAnalysis(prompt, `Output JSON array only.`, key);
                    });

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
                    if (innerError.message === "ALL_KEYS_EXHAUSTED") {
                        throw innerError; 
                    }
                    console.error(`Failed to analyze clause ${clause.code}`, innerError);
                }

                await new Promise(r => setTimeout(r, 200));
            }

        } catch (e: any) { 
            if (e.message === "ALL_KEYS_EXHAUSTED") {
                setAiError("All API Keys have been exhausted (Quota Limit). Please add a new valid key in Settings to continue.");
                setShowSettingsModal(true); 
            } else {
                setAiError(e.message || "Analysis Failed");
            }
        } finally { 
            setIsAnalyzeLoading(false); 
            setCurrentAnalyzingClause("");
            setLoadingMessage("");
        }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult) return;
        setIsReportLoading(true); setLayoutMode('report'); setAiError(null);
        setLoadingMessage("Synthesizing Final Report..."); 
        try {
             const acceptedFindings = analysisResult.filter(r => selectedFindings[r.clauseId]);
             const prompt = `GENERATE FINAL REPORT. TEMPLATE: ${reportTemplate || "Standard"}. DATA: ${JSON.stringify(auditInfo)}. FINDINGS: ${JSON.stringify(acceptedFindings)}.`;
             
             const text = await executeWithApiKeyFailover(async (key) => {
                 return await generateTextReport(prompt, "Expert ISO Report Compiler.", key);
             });

             setFinalReportText(text || "");
        } catch (e: any) { 
            if (e.message === "ALL_KEYS_EXHAUSTED") {
                setAiError("API Quota Exceeded during report generation. Please check Settings.");
                setShowSettingsModal(true);
            } else {
                setAiError(e.message || "Report Generation Failed"); 
            }
        } finally { setIsReportLoading(false); setLoadingMessage(""); }
    };

    const handleOcrUpload = async () => {
        if (pastedImages.length === 0) return;
        setIsOcrLoading(true); 
        setAiError(null);
        try {
            const promises = pastedImages.map(async (file) => {
                const b64 = await fileToBase64(file);
                return await executeWithApiKeyFailover(async (key) => {
                    return await generateOcrContent("Extract text accurately. Output raw text only.", b64, file.type, key);
                });
            });
            const results = await Promise.all(promises);
            const textToInsert = results.join('\n\n');
            
            setEvidence(prev => {
                const textarea = evidenceTextareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newValue = prev.substring(0, start) + textToInsert + prev.substring(end);
                    setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
                    }, 0);
                    return newValue;
                }
                return prev + (prev ? "\n\n" : "") + textToInsert;
            });
            
            setPastedImages([]);
        } catch (e: any) { 
            setAiError(e.message || "OCR Processing Failed"); 
        } finally { 
            setIsOcrLoading(false);
        }
    };

    const handleExport = async (text: string, type: 'notes' | 'report' | 'evidence', lang: ExportLanguage) => {
        if (!text) return;
        let setLoading = setIsExportLoading;
        if (type === 'notes') setLoading = setIsNotesExportLoading;
        if (type === 'evidence') setLoading = setIsEvidenceExportLoading;
        
        setLoading(true);
        setAiError(null);
        setLoadingMessage("Preparing export...");

        try {
            let contentToExport = text;
            const targetLangName = lang === 'vi' ? "Vietnamese" : "English";

            const CHUNK_SIZE = 12000; 
            
            const chunks: string[] = [];
            let currentPos = 0;
            while (currentPos < text.length) {
                let endPos = currentPos + CHUNK_SIZE;
                if (endPos < text.length) {
                    const lastNewline = text.lastIndexOf('\n', endPos);
                    if (lastNewline > currentPos) {
                        endPos = lastNewline + 1; 
                    }
                }
                chunks.push(text.slice(currentPos, endPos));
                currentPos = endPos;
            }

            let processedContent = "";
            
            try {
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    setLoadingMessage(`Translating/Refining Part ${i + 1}/${chunks.length}...`);
                    
                    const prompt = `Act as a professional ISO Lead Auditor. 
                    Task: Translate or Refine the following audit text fragment to ${targetLangName}.
                    Constraint: Output ONLY the processed text. Do NOT add conversational filler like "Here is the translation".
                    Constraint: Maintain ISO terminology accuracy.
                    
                    Text Fragment (${i + 1}/${chunks.length}): 
                    """${chunk}"""`;

                    const result = await executeWithApiKeyFailover(async (key) => {
                        return await generateTextReport(prompt, "You are a professional ISO Audit Translator.", key);
                    });
                    
                    if (result) {
                        processedContent += result + "\n"; 
                    } else {
                        processedContent += chunk + "\n"; 
                    }
                    
                    await new Promise(r => setTimeout(r, 200));
                }
                
                contentToExport = processedContent.trim();

            } catch (aiErr) {
                console.warn("Export AI processing failed, falling back to raw text", aiErr);
                setAiError(`AI processing failed during export. Exporting original text.`);
                contentToExport = text; 
            }

            let stdShort = "ISO";
            if (standardKey.includes("27001")) stdShort = "27k";
            else if (standardKey.includes("9001")) stdShort = "9k";
            else if (standardKey.includes("14001")) stdShort = "14k";
            else stdShort = cleanFileName(standardKey).substring(0, 10);

            const typeSuffix = type === 'notes' ? 'Audit_Findings' : type === 'evidence' ? 'Audit_Evidence' : 'Audit_Report';

            const fnParts = [
                stdShort,
                cleanFileName(auditInfo.type) || "Type",
                cleanFileName(auditInfo.smo) || "ID",
                cleanFileName(auditInfo.company) || "Company",
                cleanFileName(auditInfo.department) || "Dept",
                cleanFileName(auditInfo.auditor) || "Auditor",
                typeSuffix,
                new Date().toISOString().split('T')[0]
            ];
            
            const fileName = fnParts.join('_');

            const blob = new Blob([contentToExport], {type: 'text/plain;charset=utf-8'});
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e: any) { 
            setAiError(e.message || "Export Failed"); 
        } finally { 
            setLoading(false); 
            setLoadingMessage(""); 
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setPastedImages(prev => [...prev, ...files]);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCmdPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const commandActions = useMemo(() => {
        const actions: any[] = [
            { label: "Analyze Compliance", desc: "Start AI analysis", icon: "Wand2", shortcut: "AI", action: handleAnalyze },
            { label: "Toggle Dark Mode", desc: `Switch to ${isDarkMode ? 'Light' : 'Dark'}`, icon: isDarkMode ? "Sun" : "Moon", action: () => setIsDarkMode(!isDarkMode) },
            { label: "Generate Report", desc: "Synthesize final report", icon: "FileText", action: handleGenerateReport },
            { label: "Export Notes", desc: "Download findings", icon: "Download", action: () => {
                 const reportTxt = analysisResult?.filter(r => selectedFindings[r.clauseId]).map(r => `[${r.status}] Clause ${r.clauseId}: ${r.conclusion_report}`).join('\n\n') || "";
                 handleExport(reportTxt, 'notes', notesLanguage);
            }},
            { label: "Settings / API Key", desc: "Manage configuration", icon: "Settings", action: () => setShowSettingsModal(true) },
        ];

        if (allStandards[standardKey]) {
            const flatten = (list: Clause[]): any[] => list.flatMap(c => {
                const item = { 
                    label: `${c.code} ${c.title}`, 
                    desc: c.description, 
                    type: 'clause', 
                    icon: 'Book', 
                    action: () => { 
                        insertTextAtCursor(`[${c.code}] ${c.title}`);
                    } 
                };
                return c.subClauses ? [item, ...flatten(c.subClauses)] : [item];
            });
            const clauses = allStandards[standardKey].groups.flatMap(g => flatten(g.clauses));
            return [...actions, ...clauses];
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
        <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-slate-900 transition-colors duration-500 ease-soft relative">
            {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

            {aiError && (
                <div className="fixed top-20 right-5 z-[9999] max-w-sm w-full bg-white dark:bg-slate-800 border-l-4 border-red-500 shadow-2xl rounded-r-xl p-4 animate-in slide-in-from-right-10 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                            <Icon name="AlertCircle" size={20}/>
                            <span>System Alert</span>
                        </div>
                        <button 
                            onClick={() => setAiError(null)} 
                            className="text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                            <Icon name="X" size={18}/>
                        </button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{aiError}</p>
                    <div className="flex justify-end">
                        <button onClick={() => setAiError(null)} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white underline">Dismiss</button>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="flex-shrink-0 px-4 md:px-6 py-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-[70] sticky top-0 flex justify-between items-center h-16 relative transition-all duration-300">
                
                <div className="flex items-center h-full gap-3 md:gap-5">
                    <div 
                        className={`relative group cursor-pointer flex items-center justify-center transition-all duration-500 hover:opacity-80 active:scale-95`}
                        onClick={() => { setIsSidebarOpen(!isSidebarOpen); setLogoKey(prev => prev + 1); }}
                        title="Toggle Sidebar"
                    >
                        <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center">
                            {isSidebarOpen ? 
                                <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-cyan-500 rounded-full animate-infinity-spin"></div>
                                    <div className="absolute inset-2 border-2 border-transparent border-l-purple-500 border-r-pink-500 rounded-full animate-spin-reverse"></div>
                                </div>
                                : 
                                <div className="hover:scale-110 transition-transform duration-300">
                                     <Icon name="TDLogo" size={32} className="drop-shadow-md" />
                                </div>
                            }
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-3">
                        <h1 className="hidden md:block text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                            ISO Audit <span className="font-light text-slate-400">Pro</span>
                        </h1>
                        <div className="hidden md:block h-5 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>
                        <div className="flex items-center">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50 shadow-sm uppercase tracking-wider backdrop-blur-sm">
                                {allStandards[standardKey]?.name.split(' ')[1] || 'ISO'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden lg:block">
                        <FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir) => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} />
                    </div>
                    
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">
                        <Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/>
                    </button>
                    
                    <div className="hidden md:block h-4 w-px bg-gray-200 dark:bg-slate-800 mx-1"></div>

                    {/* API STATUS PULSING DOT - Requirement 2 */}
                    <button 
                        onClick={() => setShowSettingsModal(true)} 
                        className="group relative w-8 h-8 flex items-center justify-center transition-all"
                        title="Connection Status"
                    >
                        {/* Pulse Ring */}
                        <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${activeKeyId ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        {/* Core Dot */}
                        <div className={`relative w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900 ${activeKeyId ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </button>
                    
                    <button onClick={() => setShowAboutModal(true)} className="ml-1 p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Icon name="Info" size={18}/>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-16 bottom-0 left-0 z-[60] md:absolute md:inset-y-0 md:relative md:top-0 md:translate-x-0 md:transform-none transition-transform duration-500 ease-fluid-spring h-[calc(100%-4rem)] md:h-full`}>
                    <Sidebar 
                        isOpen={isSidebarOpen} 
                        width={sidebarWidth} 
                        setWidth={setSidebarWidth} 
                        standards={allStandards} 
                        standardKey={standardKey} 
                        setStandardKey={setStandardKey} 
                        auditInfo={auditInfo} 
                        setAuditInfo={setAuditInfo}
                        selectedClauses={selectedClauses}
                        setSelectedClauses={setSelectedClauses}
                        onAddNewStandard={() => {
                            const name = prompt("Enter new Standard Name (e.g. ISO 45001:2018):");
                            if(name) setCustomStandards(prev => ({...prev, [name]: { name, description: "Custom Standard", groups: [] }}));
                        }}
                        onUpdateStandard={handleUpdateStandard}
                        onResetStandard={handleResetStandard}
                    />
                </div>
                
                {isSidebarOpen && (
                    <div 
                        className="fixed top-16 bottom-0 inset-x-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" 
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                
                {/* MAIN CONTENT WRAPPER - Requirement 3 (Visual Contrast Flow) */}
                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 relative w-full ${isDragging ? 'ring-4 ring-indigo-500/50 scale-[0.99]' : ''} ${currentTabConfig.bgSoft} border-t-4 ${currentTabConfig.borderClass}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    {isDragging && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-500/10 backdrop-blur-sm rounded-3xl border-4 border-dashed border-indigo-500 m-4 pointer-events-none">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce">
                                <Icon name="UploadCloud" size={48} className="text-indigo-500 mb-4"/>
                                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">Drop Evidence Here</h3>
                                <p className="text-slate-500 font-medium">Images or Screenshots</p>
                            </div>
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <div ref={tabsContainerRef} className="relative flex justify-between bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full">
                                <div 
                                    className={`absolute top-1 bottom-1 shadow-sm rounded-lg transition-all duration-500 ease-fluid-spring z-0 ${tabStyle.color}`}
                                    style={{
                                        left: tabStyle.left,
                                        width: tabStyle.width,
                                        opacity: tabStyle.opacity
                                    }}
                                />
                                
                                {tabsList.map((tab, idx) => {
                                    const isActive = layoutMode === tab.id;
                                    return (
                                        <button 
                                            key={tab.id} 
                                            ref={el => { tabsRef.current[idx] = el; }}
                                            onClick={() => setLayoutMode(tab.id as LayoutMode)} 
                                            className={`flex-1 relative z-10 flex items-center justify-center gap-2 px-1 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                            title={tab.label}
                                        >
                                            <Icon name={tab.icon} size={16}/> 
                                            <span className={`${isSidebarOpen ? 'hidden xl:inline' : 'hidden md:inline'}`}>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-2 items-center flex-shrink-0 pl-2 border-l border-gray-200 dark:border-slate-800">
                            <button onClick={handleRecall} className="p-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95" title="Recall Session">
                                <Icon name="History" size={18}/>
                            </button>
                            <button onClick={handleNewSession} className="p-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all shadow-sm hover:text-indigo-600 dark:hover:text-indigo-400 duration-300 hover:scale-105 active:scale-95" title="Start New Session">
                                <Icon name="Session4_FilePlus" size={18}/>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative p-4 md:p-6">
                        {/* 1. EVIDENCE MODE */}
                        {layoutMode === 'evidence' && (
                            <div className="h-full flex flex-col gap-4 animate-fade-in-up relative">
                                
                                <div className="flex-1 flex flex-col gap-4 min-h-0">
                                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col relative group focus-within:ring-2 ring-indigo-500/20 transition-all duration-300">
                                        <textarea 
                                            ref={evidenceTextareaRef}
                                            className="flex-1 w-full h-full p-6 bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-300 font-mono text-sm leading-relaxed" 
                                            placeholder="Paste audit evidence here or drag & drop screenshots..." 
                                            value={evidence} 
                                            onChange={(e) => setEvidence(e.target.value)}
                                            onPaste={handlePaste}
                                        />
                                        <div className="absolute bottom-4 right-4 flex gap-2">
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => e.target.files && setPastedImages(prev => [...prev, ...Array.from(e.target.files!)])} />
                                            <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm" title="Upload Files">
                                                <Icon name="Demo8_GridPlus" size={20}/>
                                            </button>
                                        </div>
                                    </div>

                                    {pastedImages.length > 0 && (
                                        <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl animate-in slide-in-from-bottom-5 duration-300">
                                            <div className="flex justify-between items-center mb-2 px-1">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Icon name="UploadCloud" size={14} className="text-indigo-500"/>
                                                    Pending Extraction ({pastedImages.length})
                                                </h4>
                                                <button onClick={() => setPastedImages([])} className="text-xs text-red-500 hover:text-red-600 font-bold">Clear All</button>
                                            </div>
                                            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                                                {pastedImages.map((file, idx) => (
                                                    <div key={idx} className="relative group flex-shrink-0 w-24 h-24 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-transform duration-300 hover:scale-105">
                                                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button onClick={() => handleRemoveImage(idx)} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transform scale-90 hover:scale-110 transition-all duration-200" title="Remove File"><Icon name="X" size={14}/></button>
                                                        </div>
                                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[8px] text-white truncate text-center">{file.name}</div>
                                                    </div>
                                                ))}
                                                <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
                                                    <button onClick={handleOcrUpload} disabled={isOcrLoading} className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:scale-105 duration-300">
                                                        {isOcrLoading ? <Icon name="Loader" className="animate-spin" size={24}/> : <Icon name="ScanText" size={24}/>}
                                                        <span className="text-[10px] font-bold">Extract All</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* BLOCK 1 FOOTER: Analysis, Report (Export) */}
                                <div className="flex items-center justify-center md:justify-end gap-2 md:gap-3 w-full">
                                    <button onClick={handleAnalyze} disabled={!isReadyForAnalysis} title={getAnalyzeTooltip()} className={`h-9 md:h-10 w-auto px-3 md:px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 ${isReadyForAnalysis ? "btn-shrimp shadow-xl active:scale-95" : "bg-gray-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-70 cursor-not-allowed border border-transparent"}`}>
                                        {isAnalyzeLoading ? <SparkleLoader className="text-white"/> : <Icon name="Wand2" size={18}/>}
                                        <span className="hidden md:inline text-xs uppercase tracking-wider">Analyze Compliance</span>
                                    </button>
                                    
                                    <button onClick={() => handleExport(evidence, 'evidence', evidenceLanguage)} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm" title="Export Raw Text">
                                        {isEvidenceExportLoading ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Download"/>} 
                                        <span className="hidden md:inline">Export Raw</span>
                                        <div className="lang-pill-container ml-1">
                                            <span onClick={(e) => {e.stopPropagation(); setEvidenceLanguage('en');}} className={`lang-pill-btn ${evidenceLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                            <span onClick={(e) => {e.stopPropagation(); setEvidenceLanguage('vi');}} className={`lang-pill-btn ${evidenceLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. FINDINGS MODE */}
                        {layoutMode === 'findings' && (
                             <div className="h-full flex flex-col animate-fade-in-up">
                                
                                <div ref={findingsContainerRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
                                    {(!analysisResult || analysisResult.length === 0) && !isAnalyzeLoading && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 animate-in zoom-in-95 duration-500">
                                            <Icon name="Wand2" size={64} className="mb-4 text-slate-300 dark:text-slate-700"/>
                                            <p>No analysis data yet. Run analysis first.</p>
                                        </div>
                                    )}

                                    {/* Matrix View Render */}
                                    {findingsViewMode === 'matrix' && analysisResult && analysisResult.length > 0 && (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-1">
                                            {analysisResult.map((result, idx) => {
                                                const isActive = selectedFindings[result.clauseId];
                                                let bgColor = 'bg-gray-200 dark:bg-slate-700';
                                                let textColor = 'text-slate-500 dark:text-slate-400';
                                                
                                                if (isActive) {
                                                    if (result.status === 'COMPLIANT') { bgColor = 'bg-emerald-500'; textColor = 'text-white'; }
                                                    else if (result.status.includes('MAJOR')) { bgColor = 'bg-red-600'; textColor = 'text-white'; }
                                                    else if (result.status.includes('MINOR')) { bgColor = 'bg-orange-400'; textColor = 'text-white'; }
                                                    else if (result.status === 'OFI') { bgColor = 'bg-blue-500'; textColor = 'text-white'; }
                                                }

                                                return (
                                                    <div 
                                                        key={result.clauseId}
                                                        className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all hover:scale-110 shadow-sm ${bgColor} ${textColor} ${!isActive ? 'opacity-50' : ''}`}
                                                        title={`${result.clauseId}: ${result.status}\n${result.reason}`}
                                                        onClick={() => setSelectedFindings(prev => ({...prev, [result.clauseId]: !prev[result.clauseId]}))}
                                                    >
                                                        {result.clauseId}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* List View Render */}
                                    {findingsViewMode === 'list' && analysisResult?.map((result, idx) => (
                                        <div key={result.clauseId} className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border-l-4 shadow-sm transition-all duration-500 hover:shadow-md hover:translate-x-1 animate-in slide-in-from-bottom-5 fade-in ${!selectedFindings[result.clauseId] ? 'opacity-60 grayscale border-gray-300' : result.status === 'COMPLIANT' ? 'border-green-500' : result.status.includes('NC') ? 'border-red-500' : 'border-yellow-500'}`} style={{animationDelay: `${idx * 0.05}s`}}>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <input type="checkbox" checked={!!selectedFindings[result.clauseId]} onChange={() => setSelectedFindings(prev => ({...prev, [result.clauseId]: !prev[result.clauseId]}))} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-transform duration-200 active:scale-90"/>
                                                        <span className="font-black text-sm bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{result.clauseId}</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${result.status === 'COMPLIANT' ? 'bg-green-100 text-green-700' : result.status.includes('NC') ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{result.status.replace('_', ' ')}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{result.reason}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-gray-50 dark:bg-slate-950/50 p-2 rounded-lg border border-gray-100 dark:border-slate-800">Evidence: {result.evidence}</p>
                                                    {result.suggestion && <div className="mt-2 flex gap-2 items-start"><Icon name="Lightbulb" size={14} className="text-amber-500 mt-0.5"/><p className="text-xs text-slate-600 dark:text-slate-300">{result.suggestion}</p></div>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {isAnalyzeLoading && (
                                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 shadow-lg animate-pulse">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full animate-spin">
                                                    <Icon name="Loader" size={20} className="text-indigo-600 dark:text-indigo-400"/>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{loadingMessage || "AI Analyst is working..."}</p>
                                                    <p className="text-xs text-slate-500">{currentAnalyzingClause ? `Processing ${currentAnalyzingClause}` : "Please wait"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* BLOCK 2 FOOTER: Toggle, Export */}
                                <div className="flex items-center justify-center md:justify-end gap-2 md:gap-3 w-full mt-2">
                                    <div className="bg-gray-200 dark:bg-slate-800 rounded-xl p-1 flex gap-1 h-9 md:h-10 items-center justify-center w-auto">
                                        <button onClick={() => setFindingsViewMode('list')} className={`h-full px-3 md:px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs ${findingsViewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600' : 'text-slate-400'}`}>
                                            <Icon name="LayoutList" size={16}/> <span className="hidden md:inline">List</span>
                                        </button>
                                        <button onClick={() => setFindingsViewMode('matrix')} className={`h-full px-3 md:px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs ${findingsViewMode === 'matrix' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600' : 'text-slate-400'}`}>
                                            <Icon name="Grid" size={16}/> <span className="hidden md:inline">Matrix</span>
                                        </button>
                                    </div>

                                    <button onClick={() => {
                                        const reportTxt = analysisResult?.filter(r => selectedFindings[r.clauseId]).map(r => `[${r.status}] Clause ${r.clauseId}: ${r.conclusion_report}`).join('\n\n') || "";
                                        handleExport(reportTxt, 'notes', notesLanguage);
                                    }} disabled={!analysisResult || analysisResult.length === 0} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-sm">
                                        {isNotesExportLoading ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Download"/>} 
                                        <span className="hidden md:inline">Download Findings</span>
                                        <div className="lang-pill-container ml-2">
                                            <span onClick={(e) => {e.stopPropagation(); setNotesLanguage('en');}} className={`lang-pill-btn ${notesLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                            <span onClick={(e) => {e.stopPropagation(); setNotesLanguage('vi');}} className={`lang-pill-btn ${notesLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 3. REPORT MODE */}
                        {layoutMode === 'report' && (
                             <div className="h-full flex flex-col animate-fade-in-up">
                                
                                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 overflow-hidden flex flex-col relative">
                                    {!finalReportText ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                            <div className="w-20 h-20 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                                <Icon name="FileText" size={40} className="text-indigo-200 dark:text-slate-600"/>
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Ready to Synthesize</h4>
                                            <p className="text-sm text-slate-500 max-w-md mb-6">Generate a comprehensive audit report based on {Object.keys(selectedFindings).length} identified findings and context data.</p>
                                        </div>
                                    ) : (
                                        <textarea 
                                            className="flex-1 w-full h-full bg-transparent resize-none focus:outline-none text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed" 
                                            value={finalReportText} 
                                            onChange={(e) => setFinalReportText(e.target.value)}
                                        />
                                    )}
                                </div>

                                {/* BLOCK 3 FOOTER: Template, Generate Report, Export */}
                                <div className="flex items-center justify-center md:justify-end gap-2 md:gap-3 w-full mt-2">
                                    {/* Template Upload Button */}
                                    <div className="relative">
                                        <input type="file" id="template-upload" className="hidden" accept=".txt,.md,.docx" onChange={handleTemplateUpload}/>
                                        <label htmlFor="template-upload" className="cursor-pointer h-9 md:h-10 w-auto px-3 md:px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-transparent hover:border-gray-300 dark:hover:border-slate-600 shadow-sm whitespace-nowrap active:scale-95">
                                            <Icon name="UploadCloud" size={14}/>
                                            <span className="hidden md:inline">{templateFileName ? templateFileName.substring(0, 8) + "..." : "Template"}</span>
                                        </label>
                                    </div>

                                    <button onClick={handleGenerateReport} disabled={!analysisResult || analysisResult.length === 0} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-xs shadow-xl shadow-indigo-500/30 transition-transform flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                                        {isReportLoading ? <SparkleLoader className="text-white"/> : <Icon name="Wand2" size={18}/>}
                                        <span className="hidden md:inline">{isReportLoading ? "Synthesizing Report..." : "Generate Final Report"}</span>
                                    </button>

                                    <button onClick={() => handleExport(finalReportText || "", 'report', exportLanguage)} disabled={!finalReportText} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-sm">
                                        {isExportLoading ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Download"/>} 
                                        <span className="hidden md:inline">Export Report</span>
                                        <div className="lang-pill-container ml-2">
                                            <span onClick={(e) => {e.stopPropagation(); setExportLanguage('en');}} className={`lang-pill-btn ${exportLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                            <span onClick={(e) => {e.stopPropagation(); setExportLanguage('vi');}} className={`lang-pill-btn ${exportLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <CommandPaletteModal 
                isOpen={isCmdPaletteOpen} 
                onClose={() => setIsCmdPaletteOpen(false)}
                actions={commandActions}
                onSelectAction={(item: any) => {
                    item.action();
                    setIsCmdPaletteOpen(false);
                }}
            />
            
            <ReleaseNotesModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            
            {/* Settings Modal - API Keys */}
            <Modal isOpen={showSettingsModal} title="Settings & API Keys" onClose={() => setShowSettingsModal(false)}>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Manage API Keys</h4>
                        <div className="space-y-3">
                            {/* Key List */}
                            {apiKeys.map(profile => (
                                <div key={profile.id} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${profile.id === activeKeyId ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-gray-100 dark:bg-slate-800 dark:border-slate-700'}`}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div onClick={() => setActiveKeyId(profile.id)} className={`cursor-pointer w-4 h-4 rounded-full border-2 flex items-center justify-center ${profile.id === activeKeyId ? 'border-indigo-500' : 'border-gray-300 dark:border-slate-500'}`}>
                                            {profile.id === activeKeyId && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{profile.label}</span>
                                                {profile.status === 'valid' && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Valid</span>}
                                                {profile.status === 'invalid' && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Invalid</span>}
                                                {profile.status === 'quota_exceeded' && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase">Quota</span>}
                                                {profile.status === 'checking' && <Icon name="Loader" size={10} className="animate-spin text-indigo-500"/>}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono truncate">
                                                {profile.key.substring(0, 8)}...{profile.key.substring(profile.key.length - 4)} • {profile.latency > 0 ? `${profile.latency}ms` : 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                         <button onClick={() => handleRefreshStatus(profile.id)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Check Status">
                                            <Icon name="RefreshCw" size={14} className={profile.status === 'checking' ? 'animate-spin' : ''}/>
                                        </button>
                                        <button onClick={() => handleDeleteKey(profile.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove Key">
                                            <Icon name="Trash2" size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Add New Key Input */}
                            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 flex flex-col gap-3">
                                <input 
                                    className="w-full bg-transparent text-xs outline-none text-slate-700 dark:text-slate-300 placeholder-gray-400 border-b border-gray-200 dark:border-slate-700 pb-2 focus:border-indigo-500 transition-colors"
                                    placeholder="Enter Google Gemini API Key (starts with AIza...)"
                                    value={newKeyInput}
                                    onChange={(e) => setNewKeyInput(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 bg-transparent text-xs outline-none text-slate-700 dark:text-slate-300 placeholder-gray-400 border-b border-gray-200 dark:border-slate-700 pb-2 focus:border-indigo-500 transition-colors"
                                        placeholder="Label (Optional, e.g. 'Personal Key')"
                                        value={newKeyLabel}
                                        onChange={(e) => setNewKeyLabel(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleAddKey} 
                                        disabled={!newKeyInput || isCheckingKey}
                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                                    >
                                        {isCheckingKey ? <Icon name="Loader" className="animate-spin"/> : "Add Key"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl flex gap-3">
                        <Icon name="Info" className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={16}/>
                        <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                            <strong>Note:</strong> Multiple keys are supported for "Failover Strategy". If one key hits the rate limit (Quota Exceeded), the system automatically switches to the next available valid key to continue your audit without interruption.
                        </p>
                    </div>
                </div>
            </Modal>
            
            {/* Global Loading Overlay (if needed for heavy non-streaming tasks) */}
            {/* Using inline loading mostly, but if we need a blocker: */}
            {isReportLoading && <AINeuralLoader message="Synthesizing Audit Report..." />}
        </div>
    );
}

export default App;
