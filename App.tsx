
import React, { useState, useEffect, useRef } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, Standard, ApiKeyProfile } from './types';
import { Icon, FontSizeController, SparkleLoader, Modal, SnowOverlay, IconInput, AINeuralLoader, Toast } from './components/UI';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import { generateOcrContent, generateAnalysis, generateTextReport, generateJsonFromText, validateApiKey } from './services/geminiService';
import { cleanAndParseJSON, fileToBase64, cleanFileName } from './utils';

declare var mammoth: any;

type LayoutMode = 'evidence' | 'findings' | 'report' | 'split';
type ExportLanguage = 'en' | 'vi';

// Strictly Infinity Only
type LogoEffect = 'infinity';

function App() {
    // -- STATE --
    const [fontSizeScale, setFontSizeScale] = useState(1.0);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isSnowing, setIsSnowing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    
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
    const [loadingMessage, setLoadingMessage] = useState<string>(""); // New dynamic loading message
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [isExportLoading, setIsExportLoading] = useState(false);
    const [isNotesExportLoading, setIsNotesExportLoading] = useState(false);
    const [isEvidenceExportLoading, setIsEvidenceExportLoading] = useState(false); // Loading for Evidence Export
    
    const [aiError, setAiError] = useState<string | null>(null);
    
    // Logo Animation State - Fixed to Infinity
    const [logoKey, setLogoKey] = useState(0);
    const logoEffect: LogoEffect = 'infinity';
    
    // Fluid Tab State
    const [tabStyle, setTabStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const tabsContainerRef = useRef<HTMLDivElement>(null); // New Ref for container
    
    const tabsList = [
        { id: 'evidence', label: 'Evidence', icon: 'ScanText' }, 
        { id: 'findings', label: 'Findings', icon: 'Wand2' }, 
        { id: 'report', label: 'Report', icon: 'FileText' }
    ];

    const fileInputRef = useRef<HTMLInputElement>(null);
    const templateInputRef = useRef<HTMLInputElement>(null);
    const evidenceTextareaRef = useRef<HTMLTextAreaElement>(null);
    const hasStartupChecked = useRef(false);

    const allStandards = { ...STANDARDS_DATA, ...customStandards };
    const hasEvidence = evidence.trim().length > 0 || pastedImages.length > 0;
    
    // NEW: Strict Readiness Check
    const isReadyForAnalysis = !isAnalyzeLoading && selectedClauses.length > 0 && hasEvidence;

    // --- EFFECTS & PERSISTENCE ---
    useEffect(() => {
        // Init load
        const storedScale = localStorage.getItem('iso_font_scale');
        if (storedScale) setFontSizeScale(parseFloat(storedScale));
        
        loadSessionData(); // Load all saved data
        
        // Initial Key Load
        const loadedKeys = loadKeyData(); // Now returns keys for immediate use
        
        // Auto Precheck API Key on Startup
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

        // Mobile: Auto close sidebar on initial load if screen is small
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }

        // Window resize listener to track full width
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Update Fluid Tab Position - Enhanced Logic
    useEffect(() => {
        const updateTabs = () => {
            const activeIndex = tabsList.findIndex(t => t.id === layoutMode);
            const el = tabsRef.current[activeIndex];
            if (el) {
                setTabStyle({
                    left: el.offsetLeft,
                    width: el.offsetWidth,
                    opacity: 1
                });
            }
        };

        // 1. Run immediately
        updateTabs();

        // 2. Run slightly delayed to catch font reflows
        const t = setTimeout(updateTabs, 50);

        // 3. ResizeObserver for robust layout tracking
        // This detects when the tab container itself changes size (e.g. font scale up pushes width)
        const observer = new ResizeObserver(() => {
            updateTabs();
        });
        
        if (tabsContainerRef.current) {
            observer.observe(tabsContainerRef.current);
        }

        return () => {
            clearTimeout(t);
            observer.disconnect();
        };
    }, [layoutMode, sidebarWidth, fontSizeScale]); // Added fontSizeScale explicitly

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
            // Migration for legacy single key
            const legacyKey = localStorage.getItem("iso_api_key");
            
            let loadedKeys: ApiKeyProfile[] = [];
            
            if (savedKeys) {
                loadedKeys = JSON.parse(savedKeys);
            } else if (legacyKey) {
                // Migrate legacy key to new structure
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

    // Real-time Saving
    useEffect(() => {
        if (isDarkMode) document.body.classList.add('dark');
        else {
            document.body.classList.remove('dark');
            setIsSnowing(false); 
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

    // Save Keys and update the 'legacy' key slot for geminiService usage
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

    // --- API KEY HANDLERS ---

    const checkAllKeys = async (initialKeys: ApiKeyProfile[]) => {
        // Set all to checking state visually
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

        // Auto-switch logic: 
        // 1. Is the current active key valid?
        const currentActive = checkedKeys.find(k => k.id === localStorage.getItem("iso_active_key_id"));
        
        if (!currentActive || currentActive.status !== 'valid') {
            // Find the best valid key (lowest latency)
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
        
        // Validate before adding
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
        // If it's the first key, make it active
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

    // --- EXECUTION WITH FAILOVER ---
    
    // Generic wrapper to execute AI function with auto-key-switching on failure
    const executeWithApiKeyFailover = async <T,>(operation: (apiKey: string) => Promise<T>): Promise<T> => {
        // 1. Determine which key to start with (Active one)
        let currentKeyProfile = apiKeys.find(k => k.id === activeKeyId);
        if (!currentKeyProfile && apiKeys.length > 0) currentKeyProfile = apiKeys[0];
        
        if (!currentKeyProfile) {
            throw new Error("No API Configuration found. Please add a valid key in Settings.");
        }

        try {
            // Attempt 1
            return await operation(currentKeyProfile.key);
        } catch (error: any) {
            console.warn(`Execution failed with key [${currentKeyProfile.label}]. Checking failover...`, error);
            
            // Check if error is related to API Key (403, 429, quota)
            const msg = error.message?.toLowerCase() || "";
            const isApiError = msg.includes("403") || msg.includes("429") || msg.includes("quota") || msg.includes("key") || msg.includes("permission");

            if (isApiError) {
                // Mark current key as invalid/quota in state
                setApiKeys(prev => prev.map(k => k.id === currentKeyProfile!.id ? { ...k, status: 'invalid' } : k));

                // Find a backup key
                const backupKeys = apiKeys.filter(k => k.id !== currentKeyProfile!.id && k.status === 'valid');
                
                if (backupKeys.length > 0) {
                    const nextKey = backupKeys[0];
                    console.log(`Failing over to: ${nextKey.label}`);
                    
                    // Switch State
                    setActiveKeyId(nextKey.id);
                    setToastMsg(`API Error. Switched to backup key: ${nextKey.label}`);
                    
                    // Attempt 2 (Recursive could be better, but simple retry for now)
                    return await operation(nextKey.key);
                }
            }
            throw error;
        }
    };

    // --- MAIN HANDLERS ---

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

    // AI HANDLERS
    const handleAnalyze = async () => {
        if (!hasEvidence || selectedClauses.length === 0) return;
        
        setIsAnalyzeLoading(true); 
        setAiError(null);
        setLoadingMessage("Preparing Analysis Batch...");

        try {
            // 1. Prepare Data
            const scopeClauses = allStandards[standardKey].groups.flatMap(g => g.clauses).filter(c => selectedClauses.includes(c.id));
            
            // 2. Batch Processing Logic
            // Chunk size of 5 is safe for most API tiers to avoid "Too Many Requests" and timeouts
            const BATCH_SIZE = 5; 
            const chunks = [];
            for (let i = 0; i < scopeClauses.length; i += BATCH_SIZE) {
                chunks.push(scopeClauses.slice(i, i + BATCH_SIZE));
            }

            let combinedResults: any[] = [];

            // 3. Sequential Execution
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                // Update UI
                setLoadingMessage(`Analyzing batch ${i + 1}/${chunks.length} (${Math.round(((i) / chunks.length) * 100)}%)...`);

                const clausesTxt = chunk.map(c => `- ${c.code} ${c.title}: ${c.description}`).join('\n');
                
                // Prompt optimized for token usage - removed request for full report in analysis phase
                const prompt = `Act as an ISO Lead Auditor. Evaluate compliance for these specific clauses:
${clausesTxt}

CONTEXT: ${auditInfo.type} for ${auditInfo.company}.
RAW EVIDENCE: """ ${evidence} """

Return JSON array with clauseId, status (COMPLIANT, NC_MAJOR, NC_MINOR, OFI), reason, suggestion, evidence, conclusion_report. Keep 'conclusion_report' concise (1-2 sentences).`;

                // Execute with specific key
                const resultStr = await executeWithApiKeyFailover(async (key) => {
                    return await generateAnalysis(prompt, `Output JSON array only.`, key);
                });

                const chunkResult = cleanAndParseJSON(resultStr || "");
                if (chunkResult && Array.isArray(chunkResult)) {
                    combinedResults = [...combinedResults, ...chunkResult];
                }

                // Add a small delay between batches to respect Rate Limits (TPM/RPM)
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 800)); 
                }
            }

            if (combinedResults.length > 0) { 
                setAnalysisResult(combinedResults); 
                const initialSelection: Record<string, boolean> = {};
                combinedResults.forEach((r: any) => initialSelection[r.clauseId] = true);
                setSelectedFindings(initialSelection);
                setLayoutMode('findings'); 
            } else {
                throw new Error("Analysis completed but returned no valid results.");
            }

        } catch (e: any) { 
            setAiError(e.message || "Analysis Failed"); 
        } finally { 
            setIsAnalyzeLoading(false); 
            setLoadingMessage("");
        }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult) return;
        setIsReportLoading(true); setLayoutMode('report'); setAiError(null);
        setLoadingMessage("Synthesizing Final Report..."); // Use shared loader state
        try {
             const acceptedFindings = analysisResult.filter(r => selectedFindings[r.clauseId]);
             const prompt = `GENERATE FINAL REPORT. TEMPLATE: ${reportTemplate || "Standard"}. DATA: ${JSON.stringify(auditInfo)}. FINDINGS: ${JSON.stringify(acceptedFindings)}.`;
             
             // Use Failover Wrapper
             const text = await executeWithApiKeyFailover(async (key) => {
                 return await generateTextReport(prompt, "Expert ISO Report Compiler.", key);
             });

             setFinalReportText(text || "");
        } catch (e: any) { setAiError(e.message || "Report Generation Failed"); } finally { setIsReportLoading(false); setLoadingMessage(""); }
    };

    const handleOcrUpload = async () => {
        if (pastedImages.length === 0) return;
        setIsOcrLoading(true); 
        setAiError(null);
        try {
            // Processing multiple files - logic is complex to wrap individually.
            // We will wrap the execution of EACH file or the whole block.
            // Let's wrap each call to robustly handle partial failures or switch mid-stream.
            
            const promises = pastedImages.map(async (file) => {
                const b64 = await fileToBase64(file);
                
                // Use Failover Wrapper for each file
                return await executeWithApiKeyFailover(async (key) => {
                    return await generateOcrContent("Extract text accurately. Output raw text only, no additional commentary.", b64, file.type, key);
                });
            });
            const results = await Promise.all(promises);
            const textToInsert = results.join('\n\n');
            
            // Insert at cursor position if possible
            setEvidence(prev => {
                const textarea = evidenceTextareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    
                    // Construct new value
                    const newValue = prev.substring(0, start) + textToInsert + prev.substring(end);
                    
                    // Update cursor position after render
                    setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
                    }, 0);
                    
                    return newValue;
                }
                // Fallback: append
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

        try {
            let contentToExport = text;
            const targetLangName = lang === 'vi' ? "Vietnamese" : "English";

            // Strict Translation Request
            try {
                // Enhanced prompt for better audit quality
                const prompt = `Act as a professional Lead Auditor. Translate or Refine the following audit text to ${targetLangName}. 
                1. If translating: Ensure strict adherence to ISO terminology (e.g., 'Nonconformity', 'Opportunity for Improvement').
                2. If already in ${targetLangName}: Refine for professional tone, clarity, and conciseness suitable for an official audit report.
                3. Maintain all original formatting (markdown, bullet points).
                
                Text to process:
                """${text}"""`;
                
                // Use Failover Wrapper
                const trans = await executeWithApiKeyFailover(async (key) => {
                     return await generateTextReport(prompt, "You are a professional ISO Audit Translator.", key);
                });

                if (trans) contentToExport = trans;
            } catch (aiErr) {
                console.warn("Translation failed, falling back to raw text", aiErr);
                setAiError(`Translation to ${targetLangName} failed. Exporting original text.`);
            }

            // Generate Filename Logic
            // Rule: [Standard name(27k/9k/14k)]_[Audit type]_[Audit ID]_[Company name]_[department]_[auditor name]_Audit Note A7_[Export date]
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

    // Tooltip Generator
    const getAnalyzeTooltip = () => {
        if (isAnalyzeLoading) return "AI is analyzing...";
        const missing = [];
        if (selectedClauses.length === 0) missing.push("Clauses");
        if (!hasEvidence) missing.push("Evidence");
        
        if (missing.length > 0) return `Feature Unavailable. Missing: ${missing.join(" & ")}.`;
        return "Ready! Click to Start AI Analysis.";
    };

    // Responsive Calculation for Main Content Layout
    // Calculate the actual available width for the main content area
    const mainContentWidth = isSidebarOpen ? (windowWidth - sidebarWidth) : windowWidth;
    // Threshold to switch to "Mobile Stacked" layout (500px is a reasonable breakpoint for buttons)
    const isCompactLayout = mainContentWidth < 500;

    return (
        <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-slate-900 transition-colors duration-500 ease-soft relative">
            {/* Toast Notification */}
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

            {/* HEADER - Sticky on Mobile, Z-Index 70 to sit ABOVE sidebar */}
            <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-[70] sticky top-0 flex justify-between items-center h-16 relative transition-all duration-300">
                <div className="flex items-center gap-4 md:gap-6">
                    {/* 
                        FIXED LOGO - INFINITY
                    */}
                    <div 
                        className={`relative group cursor-pointer flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95`}
                        onClick={() => { setIsSidebarOpen(!isSidebarOpen); setLogoKey(prev => prev + 1); }}
                        title="Toggle Sidebar"
                    >
                        <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center">
                            {isSidebarOpen ? 
                                <Icon name="TDLogo" size={32} className="relative z-10 md:w-[42px] md:h-[42px] transition-transform duration-500" /> 
                                : 
                                <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-cyan-500 rounded-full animate-infinity-spin"></div>
                                    <div className="absolute inset-2 border-2 border-transparent border-l-purple-500 border-r-pink-500 rounded-full animate-spin-reverse"></div>
                                </div>
                            }
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <h1 className="text-lg md:text-xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">ISO Audit <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400">Pro</span></h1>
                        <div className="hidden sm:flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">v{APP_VERSION}</span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{allStandards[standardKey]?.name.split(' ')[1] || 'ISO'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <button onClick={() => setIsSnowing(!isSnowing)} className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 hidden sm:block ${isSnowing ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`} title="Winter Mode"><Icon name="Snowflake" size={18}/></button>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm">
                        <Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/>
                    </button>
                    
                    <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-1"></div>
                    <div className="hidden sm:block">
                        <FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir) => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} />
                    </div>
                    
                    {/* API Key Status Indicator */}
                    <button onClick={() => setShowSettingsModal(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 hover:scale-105 active:scale-95 ${activeKeyId ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 animate-pulse'}`}>
                        <div className={`w-2 h-2 rounded-full ${activeKeyId ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-bold hidden md:block">{activeKeyId ? 'API Ready' : 'No Key'}</span>
                    </button>
                    
                    <button onClick={() => setShowSettingsModal(true)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm"><Icon name="Settings" size={18}/></button>
                    {/* Fixed Info Button: Remove hidden sm:block to show on mobile */}
                    <button onClick={() => setShowAboutModal(true)} className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-110 active:scale-95"><Icon name="Info" size={18}/></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* 
                    MOBILE RESPONSIVE SIDEBAR LOGIC UPDATED:
                    - Sidebar container is now Fixed on Mobile, starting at Top-16 (below header)
                    - This ensures the Header (Z-70) is always visible and clickable above the Sidebar (Z-60)
                */}
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
                
                {/* Mobile Backdrop for Sidebar - Starts below header */}
                {isSidebarOpen && (
                    <div 
                        className="fixed top-16 bottom-0 inset-x-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" 
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                
                <div className={`flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-950 transition-all relative w-full ${isDragging ? 'ring-4 ring-indigo-500/50 scale-[0.99]' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    {isDragging && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-500/10 backdrop-blur-sm rounded-3xl border-4 border-dashed border-indigo-500 m-4 pointer-events-none">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce">
                                <Icon name="UploadCloud" size={48} className="text-indigo-500 mb-4"/>
                                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">Drop Evidence Here</h3>
                                <p className="text-slate-500 font-medium">Images or Screenshots</p>
                            </div>
                        </div>
                    )}

                    {/* Toolbar - FIXED FOR MOBILE: COMPACT TABS */}
                    <div className="flex-shrink-0 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur flex justify-between items-center gap-3">
                        {/* Compact Tabs Area - Flex Grow to take space, Hide text on mobile */}
                        <div className="flex-1 min-w-0">
                            <div ref={tabsContainerRef} className="relative flex justify-between bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-full">
                                {/* FLUID ACTIVE INDICATOR */}
                                <div 
                                    className="absolute top-1 bottom-1 bg-white dark:bg-slate-700 shadow-sm rounded-lg transition-all duration-500 ease-fluid-spring z-0"
                                    style={{
                                        left: tabStyle.left,
                                        width: tabStyle.width,
                                        opacity: tabStyle.opacity
                                    }}
                                />
                                
                                {tabsList.map((tab, idx) => (
                                    <button 
                                        key={tab.id} 
                                        ref={el => { tabsRef.current[idx] = el; }}
                                        onClick={() => setLayoutMode(tab.id as LayoutMode)} 
                                        className={`flex-1 relative z-10 flex items-center justify-center gap-2 px-1 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors duration-300 ${layoutMode === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        title={tab.label}
                                    >
                                        <Icon name={tab.icon} size={16}/> 
                                        {/* Adaptive Label Visibility */}
                                        <span className={`${isSidebarOpen ? 'hidden xl:inline' : 'hidden md:inline'}`}>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Fixed Actions Area - UNIFIED STYLES */}
                        <div className="flex gap-2 items-center flex-shrink-0 pl-2 border-l border-gray-200 dark:border-slate-800">
                            <button onClick={handleRecall} className="p-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95" title="Recall Session">
                                <Icon name="History" size={18}/>
                            </button>
                            {/* Unified Style: New Session now uses same Ghost style as Recall to reduce clutter */}
                            <button onClick={handleNewSession} className="p-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center transition-all shadow-sm hover:text-indigo-600 dark:hover:text-indigo-400 duration-300 hover:scale-105 active:scale-95" title="Start New Session">
                                <Icon name="Session4_FilePlus" size={18}/>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative p-4 md:p-6">
                        {/* 1. EVIDENCE MODE */}
                        {layoutMode === 'evidence' && (
                            <div className="h-full flex flex-col gap-4 animate-fade-in-up">
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
                                        {/* Action Bar Container */}
                                        <div className="absolute bottom-4 right-4 flex gap-2">
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => e.target.files && setPastedImages(prev => [...prev, ...Array.from(e.target.files!)])} />
                                            <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm" title="Upload Files">
                                                <Icon name="Demo8_GridPlus" size={20}/>
                                            </button>
                                        </div>
                                    </div>

                                    {/* PENDING FILES STAGING AREA */}
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
                                                            <button 
                                                                onClick={() => handleRemoveImage(idx)} 
                                                                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transform scale-90 hover:scale-110 transition-all duration-200"
                                                                title="Remove File"
                                                            >
                                                                <Icon name="X" size={14}/>
                                                            </button>
                                                        </div>
                                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[8px] text-white truncate text-center">
                                                            {file.name}
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* Batch Action Card */}
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

                                {/* 
                                    RESPONSIVE BUTTON LAYOUT LOGIC:
                                    - If isCompactLayout is TRUE: Switch to flex-col (Vertical Stack).
                                    - Order: First child (Export container) is on top, Second child (Analyze) is on bottom.
                                    - Widths: In compact mode, buttons become w-full for easier touch targets.
                                */}
                                <div className={`flex ${isCompactLayout ? 'flex-col gap-3' : 'flex-row justify-between items-center gap-3 md:gap-0'} mt-2`}>
                                    <div className={`flex gap-2 ${isCompactLayout ? 'w-full' : 'w-full md:w-auto'}`}>
                                        <button 
                                            onClick={() => handleExport(evidence, 'evidence', evidenceLanguage)} 
                                            className={`${isCompactLayout ? 'w-full justify-center' : 'flex-1 md:flex-none'} px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95`} 
                                            title="Export Raw Text"
                                        >
                                            {isEvidenceExportLoading ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Download"/>} 
                                            <div className="lang-pill-container ml-1">
                                                <span onClick={(e) => {e.stopPropagation(); setEvidenceLanguage('en');}} className={`lang-pill-btn ${evidenceLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                                <span onClick={(e) => {e.stopPropagation(); setEvidenceLanguage('vi');}} className={`lang-pill-btn ${evidenceLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                            </div>
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleAnalyze} 
                                        disabled={!isReadyForAnalysis}
                                        title={getAnalyzeTooltip()} 
                                        className={`${isCompactLayout ? 'w-full' : 'w-full md:w-auto'} px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3 ${
                                            isReadyForAnalysis 
                                            ? "btn-shrimp shadow-xl hover:scale-105 active:scale-95" 
                                            : "bg-gray-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-70 cursor-not-allowed border border-transparent"
                                        }`}
                                    >
                                        {isAnalyzeLoading ? <SparkleLoader className="text-white"/> : <Icon name="Wand2" size={20}/>}
                                        {isAnalyzeLoading ? "AI Auditor Analyzing..." : "Compliance Analysis"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. FINDINGS MODE */}
                        {layoutMode === 'findings' && analysisResult && (
                             <div className="h-full flex flex-col animate-fade-in-up">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Icon name="List" size={24} className="text-indigo-500"/> Audit Findings</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            const reportTxt = analysisResult.filter(r => selectedFindings[r.clauseId]).map(r => `[${r.status}] Clause ${r.clauseId}: ${r.conclusion_report}`).join('\n\n');
                                            handleExport(reportTxt, 'notes', notesLanguage);
                                        }} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95">
                                            {isNotesExportLoading ? <Icon name="Loader"/> : <Icon name="Download"/>} 
                                            Export Notes
                                            <div className="lang-pill-container ml-2">
                                                <span onClick={(e) => {e.stopPropagation(); setNotesLanguage('en');}} className={`lang-pill-btn ${notesLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                                <span onClick={(e) => {e.stopPropagation(); setNotesLanguage('vi');}} className={`lang-pill-btn ${notesLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                                    {analysisResult.map((result) => (
                                        <div key={result.clauseId} className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border-l-4 shadow-sm transition-all duration-300 hover:shadow-md hover:translate-x-1 ${!selectedFindings[result.clauseId] ? 'opacity-60 grayscale border-gray-300' : result.status === 'COMPLIANT' ? 'border-green-500' : result.status.includes('NC') ? 'border-red-500' : 'border-yellow-500'}`}>
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
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button onClick={handleGenerateReport} className="btn-brain-wave px-8 py-3 rounded-xl text-white font-bold text-sm shadow-lg flex items-center gap-2 hover:scale-105 transition-transform w-full md:w-auto justify-center active:scale-95 duration-300">
                                        Generate Full Report <Icon name="FileText" size={18}/>
                                    </button>
                                </div>
                             </div>
                        )}

                        {/* 3. REPORT MODE */}
                        {layoutMode === 'report' && finalReportText && (
                            <div className="h-full flex flex-col animate-zoom-in-spring">
                                <div className="flex justify-between items-center mb-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-indigo-600"><Icon name="FileText" size={24}/></div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">Final Report Ready</h3>
                                            <p className="text-xs text-slate-500">Review and export your document.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowImportModal(true)} className="px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">Change Template</button>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-inner border border-gray-200 dark:border-slate-800 overflow-y-auto custom-scrollbar p-8">
                                    <div className="prose prose-sm dark:prose-invert max-w-none font-serif whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-white [&_*]:dark:text-white animate-in fade-in duration-700">
                                        {finalReportText}
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-3">
                                    <div className="lang-pill-container p-1.5 shadow-sm">
                                        <span onClick={() => setExportLanguage('en')} className={`lang-pill-btn ${exportLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                        <span onClick={() => setExportLanguage('vi')} className={`lang-pill-btn ${exportLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                    </div>
                                    <button onClick={() => handleExport(finalReportText, 'report', exportLanguage)} disabled={isExportLoading} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all active:scale-95 w-full md:w-auto justify-center hover:scale-105 duration-300">
                                        {isExportLoading ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Download"/>}
                                        Download Report
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Empty States */}
                        {layoutMode === 'findings' && !analysisResult && (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 animate-in zoom-in-95 duration-500">
                                <Icon name="Wand2" size={64} className="mb-4 text-slate-300 dark:text-slate-700"/>
                                <p>No analysis data yet. Run analysis first.</p>
                             </div>
                        )}
                        {layoutMode === 'report' && !finalReportText && (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 animate-in zoom-in-95 duration-500">
                                <Icon name="FileText" size={64} className="mb-4 text-slate-300 dark:text-slate-700"/>
                                <p>No report generated. Go to Findings &gt; Generate Report.</p>
                             </div>
                        )}

                        {/* Loaders */}
                        {isAnalyzeLoading && <AINeuralLoader message={loadingMessage || "Analyzing Compliance..."} />}
                        {isReportLoading && <AINeuralLoader message={loadingMessage || "Synthesizing Report..."} />}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ReleaseNotesModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            
            <Modal isOpen={showImportModal} title="Report Template Settings" onClose={() => setShowImportModal(false)}>
                <div className="space-y-4">
                    <div className="p-4 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group" onClick={() => templateInputRef.current?.click()}>
                        <Icon name="UploadCloud" size={32} className="text-gray-400 mb-2 group-hover:scale-110 transition-transform duration-300"/>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Click to Upload .docx / .txt Template</p>
                        <p className="text-xs text-slate-400 mt-1">{templateFileName || "No file selected"}</p>
                        <input type="file" ref={templateInputRef} className="hidden" accept=".docx,.txt" onChange={handleTemplateUpload}/>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-3 items-start">
                        <Icon name="Info" className="text-blue-500 mt-0.5 shrink-0"/>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            The AI will use the structure and tone of your uploaded document to generate the final report. 
                            Supported formats: <strong>Word (.docx)</strong> or Text (.txt).
                        </p>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showSettingsModal} title="API Key Configuration" onClose={() => setShowSettingsModal(false)}>
                <div className="space-y-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm mb-2">Why do I need this?</h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
                            This app communicates directly with Google Gemini AI. Your key is stored locally in your browser and is never sent to our servers.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {apiKeys.map(keyProfile => (
                            <div key={keyProfile.id} className={`p-3 rounded-xl border flex justify-between items-center transition-all duration-300 ${activeKeyId === keyProfile.id ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500 scale-[1.02]' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 opacity-80 hover:opacity-100 hover:scale-100'}`}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div onClick={() => setActiveKeyId(keyProfile.id)} className={`w-5 h-5 rounded-full border-2 cursor-pointer flex items-center justify-center transition-colors ${activeKeyId === keyProfile.id ? 'border-indigo-600' : 'border-gray-400'}`}>
                                        {activeKeyId === keyProfile.id && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-zoom-in-spring"></div>}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{keyProfile.label}</p>
                                            <span className={`text-[10px] px-1.5 rounded uppercase font-bold ${keyProfile.status === 'valid' ? 'bg-emerald-100 text-emerald-700' : keyProfile.status === 'checking' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                {keyProfile.status === 'checking' ? 'Checking...' : keyProfile.status}
                                            </span>
                                        </div>
                                        <p className="text-xs font-mono text-slate-500 truncate w-32">••••••••{keyProfile.key.slice(-4)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleRefreshStatus(keyProfile.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Re-check"><Icon name="RefreshCw" size={14}/></button>
                                    <button onClick={() => handleDeleteKey(keyProfile.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Icon name="Trash2" size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add New Key</label>
                        <div className="grid grid-cols-3 gap-3">
                            <input type="text" placeholder="Label (e.g. Personal)" className="col-span-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 transition-shadow focus:shadow-sm" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} />
                            <div className="col-span-2 flex gap-2">
                                <input type="password" placeholder="Paste Gemini API Key here..." className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 transition-shadow focus:shadow-sm" value={newKeyInput} onChange={e => setNewKeyInput(e.target.value)} />
                                <button onClick={handleAddKey} disabled={!newKeyInput || isCheckingKey} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 transition-all active:scale-95">
                                    {isCheckingKey ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Plus"/>}
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-2">
                            Get your key from <a href="https://aistudio.google.com/" target="_blank" className="text-indigo-500 hover:underline">Google AI Studio</a>.
                        </p>
                    </div>
                </div>
            </Modal>
            
            {/* 
               MOVED: SnowOverlay is now the absolute last element in the root div.
               This ensures it sits on top of everything else (Header, Sidebar, Content).
            */}
            {isSnowing && <SnowOverlay />}
        </div>
    );
}

export default App;
