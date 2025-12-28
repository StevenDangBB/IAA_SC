
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE, MODEL_HIERARCHY } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, Standard, ApiKeyProfile, Clause, FindingsViewMode, FindingStatus } from './types';
import { Icon, FontSizeController, SparkleLoader, Modal, AINeuralLoader, Toast, CommandPaletteModal } from './components/UI';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import { generateOcrContent, generateAnalysis, generateTextReport, validateApiKey } from './services/geminiService';
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
    const [sidebarWidth, setSidebarWidth] = useState(390);
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

    // Toast State
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const [exportLanguage, setExportLanguage] = useState<ExportLanguage>('en');
    const [notesLanguage, setNotesLanguage] = useState<ExportLanguage>('vi'); 
    const [evidenceLanguage, setEvidenceLanguage] = useState<ExportLanguage>('en'); 
    const [isDragging, setIsDragging] = useState(false);
    
    const [reportTemplate, setReportTemplate] = useState<string>("");
    const [templateFileName, setTemplateFileName] = useState<string>("");
    
    const [customStandards, setCustomStandards] = useState<StandardsData>(STANDARDS_DATA);
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
    
    // Rescue Key State (Inline Input)
    const [rescueKey, setRescueKey] = useState("");
    const [isRescuing, setIsRescuing] = useState(false);

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

    // NEW: Trigger export processor when not paused and not finished
    useEffect(() => {
        if (exportState.isOpen && !exportState.isPaused && !exportState.isFinished && exportState.processedChunksCount < exportState.totalChunks) {
            processNextExportChunk();
        } else if (exportState.isOpen && exportState.processedChunksCount >= exportState.totalChunks && !exportState.isFinished) {
            finishExport();
        }
    }, [exportState]);

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

    // --- ENHANCED INITIALIZATION (PROBE MODELS) ---
    const checkAllKeys = async (initialKeys: ApiKeyProfile[]) => {
        setApiKeys(prev => prev.map(k => ({ ...k, status: 'checking' })));
        
        const today = new Date().toISOString().split('T')[0];

        const checkedKeys = await Promise.all(initialKeys.map(async (profile) => {
            // Logic: If it's a new day, reset to try top tier models again.
            // If same day, respect the 'activeModel' preference if it exists.
            let startModelIndex = 0;
            const isNewDay = profile.lastResetDate !== today;
            
            if (!isNewDay && profile.activeModel) {
                // If same day, start trying from the saved model to save time/calls
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

            // PROBE LOOP: Find the first working model for this key
            for (let i = startModelIndex; i < MODEL_HIERARCHY.length; i++) {
                const modelToTest = MODEL_HIERARCHY[i];
                const result = await validateApiKey(profile.key, modelToTest);
                
                if (result.isValid) {
                    validProfile = {
                        ...profile,
                        status: 'valid',
                        latency: result.latency,
                        activeModel: modelToTest, // Lock this model
                        lastResetDate: today,
                        lastChecked: new Date().toISOString()
                    };
                    break; // Found the best available model, stop probing
                } else if (result.errorType === 'invalid') {
                    // Key is trash, stop everything
                    validProfile.status = 'invalid';
                    break;
                }
                // If errorType is 'quota_exceeded' (429), the loop continues to the next lower model
            }

            return validProfile;
        }));

        setApiKeys(checkedKeys);

        const currentActive = checkedKeys.find(k => k.id === localStorage.getItem("iso_active_key_id"));
        if (!currentActive || currentActive.status !== 'valid') {
            const bestKey = checkedKeys
                .filter(k => k.status === 'valid')
                .sort((a, b) => a.latency - b.latency)[0];

            if (bestKey) {
                setActiveKeyId(bestKey.id);
                setToastMsg(`Switched to active key: ${bestKey.label} (${bestKey.activeModel?.split('-')[1]})`);
            }
        }
    };
    
    // Check specific key status (e.g., Refresh button) - also does probing
    const checkKeyStatus = async (id: string, keyStr: string) => {
        setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'checking' } : k));
        
        let bestModel = MODEL_HIERARCHY[0];
        let finalStatus: 'valid' | 'invalid' | 'quota_exceeded' = 'invalid';
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
            // If quota_exceeded, continue loop to next model
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
        
        // Use probing logic for new keys too
        let bestModel = MODEL_HIERARCHY[0];
        let isValid = false;
        let latency = 0;
        let errorType = 'unknown';

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
            status: isValid ? 'valid' : (errorType === 'quota_exceeded' ? 'quota_exceeded' : 'invalid'),
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
        if (keyProfile) {
            await checkKeyStatus(id, keyProfile.key);
        }
    };

    // --- ENHANCED FAILOVER EXECUTION ---
    // Now uses the pre-assigned 'activeModel' for each key.
    // If that model fails (mid-session quota limit), it downgrades ONLY that key permanently for the session.
    const executeWithSmartFailover = async <T,>(
        operation: (apiKey: string, model: string) => Promise<T>, 
        attemptedKeys: string[] = []
    ): Promise<T> => {
        
        // 1. Find the best available key (Standard logic)
        const availableKeys = apiKeys.filter(k => 
            k.status !== 'invalid' && 
            k.status !== 'quota_exceeded' && 
            !attemptedKeys.includes(k.id) 
        );

        // Sort by latency, but prioritize currently active
        availableKeys.sort((a, b) => a.latency - b.latency);

        let candidateKey: ApiKeyProfile | undefined = undefined;
        const activeCandidate = availableKeys.find(k => k.id === activeKeyId);
        
        if (activeCandidate) {
            candidateKey = activeCandidate;
        } else if (availableKeys.length > 0) {
            candidateKey = availableKeys[0];
        }

        if (!candidateKey) {
            throw new Error("ALL_KEYS_EXHAUSTED");
        }

        if (candidateKey.id !== activeKeyId) {
            setActiveKeyId(candidateKey.id);
        }

        // 2. Determine which model to use for this specific key
        // Default to top model if not set (rare, as checkAllKeys sets it)
        const modelToUse = candidateKey.activeModel || MODEL_HIERARCHY[0];

        try {
            return await operation(candidateKey.key, modelToUse);
        } catch (error: any) {
            const msg = error.message?.toLowerCase() || "";
            const isApiError = msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted") || (msg.includes("403") && !msg.includes("api key not valid"));

            if (isApiError) {
                // FAILOVER LOGIC:
                // Instead of just skipping the key, try to DOWNGRADE the key first.
                const currentModelIndex = MODEL_HIERARCHY.indexOf(modelToUse);
                
                if (currentModelIndex !== -1 && currentModelIndex < MODEL_HIERARCHY.length - 1) {
                    // We have a lower model available!
                    const nextModel = MODEL_HIERARCHY[currentModelIndex + 1];
                    
                    console.warn(`[Smart Cascade] Key ${candidateKey.label} exhausted on ${modelToUse}. Downgrading to ${nextModel}...`);
                    
                    // UPDATE STATE: Permanently switch this key to the lower model for this session
                    setApiKeys(prev => prev.map(k => k.id === candidateKey!.id ? { ...k, activeModel: nextModel } : k));
                    
                    // Recursive retry with SAME key (it's not exhausted, just the model was)
                    // We pass attemptedKeys unchanged so it can pick this key again with new model
                    return await executeWithSmartFailover(operation, attemptedKeys); 
                } else {
                    // No lower models available for this key. Mark key as exhausted.
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
        setCustomStandards(prev => ({ ...prev, [standardKey]: updated }));
    };

    const handleResetStandard = (key: string) => {
        setCustomStandards(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    // --- TEST DATA GENERATOR (For Validation) ---
    const loadStressTestData = () => {
        // 1. Set Audit Info
        setAuditInfo({
            company: "TechCorp Global Solutions",
            smo: "TC-2024-ISO-001",
            department: "IT Infrastructure & Cloud Ops",
            interviewee: "John Smith (CTO), Sarah Connor (SecOps Lead)",
            auditor: "Trung Dang (Lead Auditor)",
            type: "Stage 2"
        });

        // 2. Select Clauses (Mix of 9001 and 27001 logic for stress)
        setStandardKey("ISO 27001:2022 (ISMS)");
        // Select ~15 clauses for heavy analysis load
        const clauseIds = ["5.1", "5.2", "6.1.2", "6.1.3", "7.1", "7.2", "A.5.1", "A.5.2", "A.5.9", "A.5.10", "A.8.2", "A.8.8", "9.2", "9.3", "10.1"];
        setSelectedClauses(clauseIds);

        // 3. Heavy Evidence Data (~3000 words to test token limits and chunking)
        const heavyEvidence = `
AUDIT EVIDENCE RECORD - STAGE 2
DATE: ${new Date().toLocaleDateString()}

[5.1 Leadership]
Interviewed CTO. Confirmed Information Security Policy v2.4 approved on 2024-01-15.
Sighted Minutes of Management Review (MMR) dated 2024-03-10. Agenda Item 4 covers ISMS performance.
Observation: Top management demonstrates commitment. Resources for new SIEM tool approved ($50k budget).

[6.1.2 Risk Assessment]
Reviewed Risk Register (Excel Sheet 'Risk_Matrix_v4.xlsx').
Total risks identified: 45. 
Risk #12 (Ransomware): Impact High (5), Likelihood Medium (3). Risk Level 15 (Extreme).
Treatment Plan: Implement EDR and Offline Backups. Owner: Sarah C. Due: 2024-06.
Status: EDR deployed. Backups pending.
Gap: Risk acceptance criteria not explicitly defined in the procedure document "IS-PROC-003".

[A.5.9 Inventory of Assets]
Checked Asset Management System (Jira Insight).
Sampled 5 laptops:
1. Asset Tag 001 - MacBook Pro - Assigned to John S. - Found in system.
2. Asset Tag 045 - Dell XPS - Assigned to Dev Team - Found.
3. Asset Tag 099 - Server Rack B - Location: Server Room - Found.
4. Asset Tag 102 - Mobile Phone - Status "Lost" - Flagged in system correctly.
5. Asset Tag 115 - Printer - Not found in Jira.
Finding: The printer in HR department is not tagged or listed in the inventory. Potential OFI or Minor NC.

[A.8.2 Privileged Access]
Review of Active Directory groups.
"Domain Admins" group has 8 members.
Policy "IS-POL-ACCESS" states max 5 admins allowed.
Evidence: User 'temp_admin_01' created 6 months ago for a vendor project is still active.
Non-Conformity: Privileged access rights are not reviewed at planned intervals (quarterly). Last review was 2023-09.

[9.2 Internal Audit]
Internal Audit Report 2023 reviewed.
Conducted by external consultant 'SecureAudit Inc.'.
3 Minor NCs raised. 
NC1: Clean desk policy violation. Closed.
NC2: Access logs retention < 90 days. Open.
NC3: Supplier due diligence missing for 'Cleaner Corp'. Closed.
Corrective Action Plan for NC2 is overdue by 2 months.

[A.8.8 Vulnerability Management]
Sighted Tenable Nessus Report (Scan ID: 55432).
Critical Vulnerabilities: 0.
High Vulnerabilities: 2 (Apache Log4j legacy on Test Server 4).
SLA for High Vuln is 14 days. Ticket INC-4002 created 20 days ago.
Violation of SLA. Explanation: Patch requires reboot, pending change approval window.

[General Observations]
- Physical security: Access cards working. Server room locked. Visitor log maintained.
- Training: Phishing simulation results show 4% click rate (Improvement from 12% last year).
- Backup: Veeam Backup successful for last 30 days. Random restore test log missing for Q1 2024.

[End of Evidence]
        `.trim();
        
        setEvidence(heavyEvidence);
        setToastMsg("Dev: Stress Test Data Loaded! Ready for Analysis.");
        setLayoutMode('evidence');
    };

    const handleRecall = () => {
        loadSessionData();
        const notification = document.createElement("div");
        notification.textContent = "Session Recalled Successfully";
        notification.className = "fixed bottom-5 right-5 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-xl z-[9999] animate-in slide-in-from-bottom-5";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    };

    const handleUpdateStandardEntry = (updated: Standard) => {
        setCustomStandards(prev => ({ ...prev, [updated.name]: updated }));
    };

    const handleResetStandardEntry = (key: string) => {
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

    // --- NEW: EDIT FINDINGS ---
    const handleUpdateFinding = (index: number, field: keyof AnalysisResult, value: string) => {
        setAnalysisResult(prev => {
            if (!prev) return null;
            const newArr = [...prev];
            newArr[index] = { ...newArr[index], [field]: value };
            return newArr;
        });
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
                    // UPGRADE: Use executeWithSmartFailover instead of plain API call
                    const resultStr = await executeWithSmartFailover(async (key, model) => {
                        return await generateAnalysis(prompt, `Output JSON array only.`, key, model);
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
                    if (innerError.message === "ALL_RESOURCES_EXHAUSTED" || innerError.message === "ALL_KEYS_EXHAUSTED") {
                        throw innerError; 
                    }
                    console.error(`Failed to analyze clause ${clause.code}`, innerError);
                }

                await new Promise(r => setTimeout(r, 200));
            }

        } catch (e: any) { 
            if (e.message === "ALL_KEYS_EXHAUSTED" || e.message === "ALL_RESOURCES_EXHAUSTED") {
                setAiError("System Overload: All API Keys and Model Backups are exhausted. Please add a new key or wait a moment.");
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
        
        // --- 1. ENHANCED FEEDBACK: Show user we are using their template ---
        const hasTemplate = !!reportTemplate;
        setLoadingMessage(hasTemplate ? `Analyzing Template "${templateFileName}" & Synthesizing Report...` : "Synthesizing Standard ISO Report...");
        
        try {
             const acceptedFindings = analysisResult.filter(r => selectedFindings[r.clauseId]);
             
             // --- 2. ENHANCED PROMPT LOGIC: Strict Template Adherence ---
             let prompt = "";
             
             if (hasTemplate) {
                 prompt = `ROLE: You are an expert ISO Lead Auditor.
                 TASK: Generate a final audit report by STRICTLY following the provided TEMPLATE structure.
                 
                 INPUT 1: REPORT TEMPLATE (Style, Structure, Headers, Tone):
                 """
                 ${reportTemplate}
                 """
                 
                 INPUT 2: AUDIT DATA (Content to fill):
                 - Context: ${JSON.stringify(auditInfo)}
                 - Findings: ${JSON.stringify(acceptedFindings)}
                 
                 INSTRUCTIONS:
                 1. ANALYZE the Template's structure (Introduction, Summary, Findings Table, Conclusion, etc.).
                 2. REPRODUCE the report using the exact same headings and formatting style.
                 3. FILL placeholders (e.g., [Company Name], [Date]) with Context data.
                 4. POPULATE the findings section with the Audit Data provided.
                 5. Maintain the professional tone of the template.
                 6. Do NOT output JSON. Output the final report text directly.`;
             } else {
                 prompt = `GENERATE FINAL REPORT. DATA: ${JSON.stringify(auditInfo)}. FINDINGS: ${JSON.stringify(acceptedFindings)}. Use standard ISO professional reporting format.`;
             }
             
             // UPGRADE: Use executeWithSmartFailover
             const text = await executeWithSmartFailover(async (key, model) => {
                 return await generateTextReport(prompt, "Expert ISO Report Compiler.", key, model);
             });

             setFinalReportText(text || "");
        } catch (e: any) { 
            if (e.message === "ALL_KEYS_EXHAUSTED" || e.message === "ALL_RESOURCES_EXHAUSTED") {
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
                // OCR typically uses Flash Vision models, maybe we stick to one model or use failover?
                // Let's stick to simple key failover for OCR for now to avoid complexity, or use Smart Failover with fixed models if needed.
                // But generateOcrContent uses DEFAULT_VISION_MODEL internally.
                return await executeWithSmartFailover(async (key, model) => {
                    // Note: generateOcrContent usually wants a vision model. 
                    // Our Cascade includes text models which might fail on images.
                    // For safety, we will just use Key Failover for OCR with the specific Vision model.
                    return await generateOcrContent("Extract text accurately. Output raw text only.", b64, file.type, key, model); // Passing model here allows override if we wanted
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

    // --- SMART EXPORT LOGIC ---
    const startSmartExport = (text: string, type: 'notes' | 'report' | 'evidence', lang: ExportLanguage) => {
        if (!text) return;
        
        const CHUNK_SIZE = 8000;
        const chunks: string[] = [];
        let currentPos = 0;
        while (currentPos < text.length) {
            let endPos = currentPos + CHUNK_SIZE;
            if (endPos < text.length) {
                const lastNewline = text.lastIndexOf('\n', endPos);
                if (lastNewline > currentPos) endPos = lastNewline + 1;
            }
            chunks.push(text.slice(currentPos, endPos));
            currentPos = endPos;
        }

        setExportState({
            isOpen: true,
            isPaused: false,
            isFinished: false,
            totalChunks: chunks.length,
            processedChunksCount: 0,
            chunks: chunks,
            results: new Array(chunks.length).fill(""),
            error: null,
            currentType: type,
            targetLang: lang
        });
    };

    const processNextExportChunk = async () => {
        const { processedChunksCount, chunks, targetLang, results } = exportState;
        const index = processedChunksCount;
        const chunk = chunks[index];
        const targetLangName = targetLang === 'vi' ? "Vietnamese" : "English";

        const prompt = `Act as an ISO Lead Auditor. 
        Task: Translate or Refine the following audit text fragment to ${targetLangName}.
        Constraint: Output ONLY the processed text. Do NOT add conversational filler.
        Constraint: Maintain ISO terminology accuracy.
        
        Text Fragment (${index + 1}/${chunks.length}): 
        """${chunk}"""`;

        try {
            // UPGRADE: Use executeWithSmartFailover
            const result = await executeWithSmartFailover(async (key, model) => {
                return await generateTextReport(prompt, "Professional ISO Translator.", key, model);
            });
            
            const newResults = [...results];
            newResults[index] = result && result.trim() ? result : chunk; // Fallback to raw if empty

            setExportState(prev => ({
                ...prev,
                processedChunksCount: prev.processedChunksCount + 1,
                results: newResults
            }));

        } catch (error: any) {
            if (error.message === "ALL_KEYS_EXHAUSTED" || error.message === "ALL_RESOURCES_EXHAUSTED") {
                setExportState(prev => ({
                    ...prev,
                    isPaused: true,
                    error: "All API keys exhausted. Please add a new key or wait."
                }));
            } else {
                // If it's a random network error, just use raw text and proceed
                console.warn(`Export chunk ${index+1} failed. Appending raw text.`);
                const newResults = [...results];
                newResults[index] = chunk;
                setExportState(prev => ({
                    ...prev,
                    processedChunksCount: prev.processedChunksCount + 1,
                    results: newResults
                }));
            }
        }
    };

    const finishExport = () => {
        setExportState(prev => ({ ...prev, isFinished: true }));
        const contentToExport = exportState.results.join('\n\n');
        
        // Generate File
        let stdShort = "ISO";
        if (standardKey.includes("27001")) stdShort = "27k";
        else if (standardKey.includes("9001")) stdShort = "9k";
        else if (standardKey.includes("14001")) stdShort = "14k";
        else stdShort = cleanFileName(standardKey).substring(0, 10);

        const typeSuffix = exportState.currentType === 'notes' ? 'Audit_Findings' : exportState.currentType === 'evidence' ? 'Audit_Evidence' : 'Audit_Report';

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
        
        setTimeout(() => setExportState(prev => ({ ...prev, isOpen: false })), 2000);
    };

    const handleResumeExport = async () => {
        if (rescueKey.trim()) {
            setIsRescuing(true);
            const validation = await validateApiKey(rescueKey);
            if (validation.isValid) {
                 const newId = Date.now().toString();
                 const newProfile: ApiKeyProfile = {
                    id: newId,
                    label: `Rescue Key ${apiKeys.length + 1}`,
                    key: rescueKey,
                    status: 'valid',
                    latency: validation.latency,
                    lastChecked: new Date().toISOString()
                };
                setApiKeys(prev => [...prev, newProfile]);
                setActiveKeyId(newId);
                setRescueKey("");
                setExportState(prev => ({ ...prev, isPaused: false, error: null }));
                setToastMsg("Rescue Key Added & Export Resumed!");
            } else {
                setToastMsg("Invalid API Key");
            }
            setIsRescuing(false);
        } else {
            // "Soft Reset" Strategy:
            // User clicked Resume WITHOUT adding a new key.
            // This means they assume a key might have recovered (quota reset).
            // Action: Reset all 'quota_exceeded' keys back to 'valid' to allow retry.
            console.log("[Smart Resume] Soft resetting all quota_exceeded keys...");
            setApiKeys(prev => prev.map(k => k.status === 'quota_exceeded' ? { ...k, status: 'valid' } : k));
            setExportState(prev => ({ ...prev, isPaused: false, error: null }));
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
                 startSmartExport(reportTxt, 'notes', notesLanguage);
            }},
            { label: "Dev: Load Stress Test Data", desc: "Populate complex audit data for testing", icon: "Database", action: loadStressTestData },
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
        <div className="flex flex-col h-[100dvh] w-full bg-gray-50 dark:bg-slate-900 transition-colors duration-500 ease-soft relative">
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
            <div className="flex-shrink-0 px-4 md:px-6 py-0 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-[70] relative flex justify-between items-center h-16 transition-all duration-300">
                
                <div className="flex items-center h-full gap-3 md:gap-5">
                    <div 
                        className={`relative group cursor-pointer flex items-center justify-center transition-all duration-500 hover:opacity-100 active:scale-95`}
                        onClick={() => { setIsSidebarOpen(!isSidebarOpen); setLogoKey(prev => prev + 1); }}
                        title="Toggle Sidebar"
                    >
                        {/* HALO CONTAINER */}
                        <div className="relative w-10 h-10 md:w-14 md:h-14 flex items-center justify-center">
                            
                            {/* Layer 1: Ambient Glow - Subtle ambient light (invisible normally, faint glow on hover) */}
                            <div className="absolute -inset-4 bg-indigo-500/0 rounded-full blur-xl transition-all duration-500 group-hover:bg-indigo-500/10"></div>

                            {/* Layer 2: The SHRIMP HALO - Soft Light Only */}
                            {/* High blur (blur-lg) + Low opacity (opacity-30) ensures it looks like light, not a sticker */}
                            <div className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,transparent_0_deg,#f472b6_100deg,#8b5cf6_200deg,#06b6d4_300deg,transparent_360deg)] opacity-30 blur-lg animate-[spin_4s_linear_infinite] group-hover:opacity-70 group-hover:blur-md transition-all duration-500"></div>

                            {/* MAIN CONTENT (Z-Index High) */}
                            <div className="relative z-10">
                                {isSidebarOpen ? 
                                    <div className="relative w-8 h-8">
                                        {/* Infinity Spin - Enhanced with Neon Dropshadows */}
                                        <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-cyan-500 rounded-full animate-infinity-spin drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                                        <div className="absolute inset-2 border-2 border-transparent border-l-purple-500 border-r-pink-500 rounded-full animate-spin-reverse drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]"></div>
                                    </div>
                                    : 
                                    <div className="hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(0,242,195,0.6)]">
                                         <Icon name="TDLogo" size={32} />
                                    </div>
                                }
                            </div>
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
                    {/* COMMAND PALETTE TRIGGER (Visible on Mobile & Desktop) */}
                    <button 
                        onClick={() => setIsCmdPaletteOpen(true)} 
                        className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                        title="Open Command Palette (Ctrl+K)"
                    >
                        <Icon name="Search" size={20}/>
                    </button>

                    <div className="hidden lg:block">
                        <FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir: any) => setFontSizeScale(prev => dir === 'increase' ? Math.min(prev + 0.1, 1.3) : Math.max(prev - 0.1, 0.8))} />
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

                    {/* ... (Rest of content structure remains same) ... */}
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
                                    
                                    <button onClick={() => startSmartExport(evidence, 'evidence', evidenceLanguage)} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm" title="Export Raw Text">
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

                        {/* ... (Existing Findings and Report Modes) ... */}
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

                                    {/* Matrix View Render - SYNCHRONIZED LEGEND */}
                                    {findingsViewMode === 'matrix' && analysisResult && analysisResult.length > 0 && (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-1">
                                            {analysisResult.map((result, idx) => {
                                                const isActive = selectedFindings[result.clauseId];
                                                let bgColor = 'bg-gray-200 dark:bg-slate-700';
                                                let textColor = 'text-slate-500 dark:text-slate-400';
                                                
                                                if (isActive) {
                                                    // LEGEND SYNC: COMPLIANT=Emerald, MAJOR=Red, MINOR=Orange, OFI=Blue
                                                    if (result.status === 'COMPLIANT') { bgColor = 'bg-emerald-500'; textColor = 'text-white'; }
                                                    else if (result.status === 'NC_MAJOR') { bgColor = 'bg-red-600'; textColor = 'text-white'; }
                                                    else if (result.status === 'NC_MINOR') { bgColor = 'bg-orange-500'; textColor = 'text-white'; }
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

                                    {/* List View Render (EDITABLE) - SYNCHRONIZED LEGEND */}
                                    {findingsViewMode === 'list' && analysisResult?.map((result, idx) => (
                                        <div 
                                            key={result.clauseId} 
                                            className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border-l-4 shadow-sm transition-all duration-500 hover:shadow-md animate-in slide-in-from-bottom-5 fade-in ${
                                                !selectedFindings[result.clauseId] ? 'opacity-60 grayscale border-gray-300' : 
                                                result.status === 'COMPLIANT' ? 'border-emerald-500' : 
                                                result.status === 'NC_MAJOR' ? 'border-red-600' : 
                                                result.status === 'NC_MINOR' ? 'border-orange-500' : 
                                                'border-blue-500' // OFI
                                            }`} 
                                            style={{animationDelay: `${idx * 0.05}s`}}
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <input type="checkbox" checked={!!selectedFindings[result.clauseId]} onChange={() => setSelectedFindings(prev => ({...prev, [result.clauseId]: !prev[result.clauseId]}))} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-transform duration-200 active:scale-90"/>
                                                        <span className="font-black text-sm bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{result.clauseId}</span>
                                                        
                                                        {/* EDITABLE STATUS DROPDOWN - SYNCHRONIZED LEGEND */}
                                                        <select 
                                                            value={result.status} 
                                                            onChange={(e) => handleUpdateFinding(idx, 'status', e.target.value as FindingStatus)}
                                                            className={`text-xs font-bold px-2 py-0.5 rounded uppercase border-none outline-none cursor-pointer transition-colors ${
                                                                result.status === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-700' : 
                                                                result.status === 'NC_MAJOR' ? 'bg-red-100 text-red-700' : 
                                                                result.status === 'NC_MINOR' ? 'bg-orange-100 text-orange-800' : 
                                                                'bg-blue-100 text-blue-700' // OFI
                                                            }`}
                                                        >
                                                            <option value="COMPLIANT">COMPLIANT</option>
                                                            <option value="OFI">OFI</option>
                                                            <option value="NC_MINOR">NC MINOR</option>
                                                            <option value="NC_MAJOR">NC MAJOR</option>
                                                        </select>
                                                    </div>
                                                    
                                                    {/* EDITABLE REASON */}
                                                    <input 
                                                        className="w-full text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors"
                                                        value={result.reason}
                                                        onChange={(e) => handleUpdateFinding(idx, 'reason', e.target.value)}
                                                    />

                                                    {/* EDITABLE EVIDENCE */}
                                                    <div className="bg-gray-50 dark:bg-slate-950/50 p-2 rounded-lg border border-gray-100 dark:border-slate-800 mt-1">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Evidence:</span>
                                                        <textarea 
                                                            className="w-full text-xs text-slate-500 dark:text-slate-400 italic bg-transparent border-none focus:ring-0 resize-y min-h-[40px] focus:text-slate-700 dark:focus:text-slate-200"
                                                            value={result.evidence}
                                                            onChange={(e) => handleUpdateFinding(idx, 'evidence', e.target.value)}
                                                        />
                                                    </div>

                                                    {result.suggestion && (
                                                        <div className="mt-2 flex gap-2 items-start">
                                                            <Icon name="Lightbulb" size={14} className="text-amber-500 mt-0.5"/>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300">{result.suggestion}</p>
                                                        </div>
                                                    )}
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
                                    <div className="h-9 md:h-10 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-gray-200 dark:border-slate-700">
                                        <button onClick={() => setFindingsViewMode('list')} className={`h-full px-3 md:px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs ${findingsViewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300 ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                                            <Icon name="LayoutList" size={16}/> <span className="hidden md:inline">List</span>
                                        </button>
                                        <button onClick={() => setFindingsViewMode('matrix')} className={`h-full px-3 md:px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs ${findingsViewMode === 'matrix' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300 ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                                            <Icon name="Grid" size={16}/> <span className="hidden md:inline">Matrix</span>
                                        </button>
                                    </div>

                                    <button onClick={() => {
                                        const reportTxt = analysisResult?.filter(r => selectedFindings[r.clauseId]).map(r => `[${r.status}] Clause ${r.clauseId}: ${r.conclusion_report}`).join('\n\n') || "";
                                        startSmartExport(reportTxt, 'notes', notesLanguage);
                                    }} disabled={!analysisResult || analysisResult.length === 0} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-sm">
                                        <Icon name="Download"/> 
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
                                    {/* VISUAL FEEDBACK: Active Strategy Indicator */}
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50 dark:border-slate-800">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preview</h4>
                                        {reportTemplate ? (
                                            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/50 shadow-sm animate-in fade-in slide-in-from-right-2">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                                                <Icon name="FileEdit" size={14}/>
                                                <span className="text-xs font-bold">Template Active: {templateFileName.substring(0, 20)}{templateFileName.length > 20 ? '...' : ''}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700">
                                                <Icon name="FileText" size={14}/>
                                                <span className="text-xs font-medium">Standard ISO Structure</span>
                                            </div>
                                        )}
                                    </div>

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
                                        <label htmlFor="template-upload" className={`cursor-pointer h-9 md:h-10 w-auto px-3 md:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border shadow-sm whitespace-nowrap active:scale-95 ${reportTemplate ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:border-gray-300 dark:hover:border-slate-600'}`}>
                                            <Icon name="UploadCloud" size={14}/>
                                            <span className="hidden md:inline">{templateFileName ? "Change Template" : "Upload Template"}</span>
                                        </label>
                                    </div>

                                    <button onClick={handleGenerateReport} disabled={!analysisResult || analysisResult.length === 0} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-xs shadow-xl shadow-indigo-500/30 transition-transform flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                                        {isReportLoading ? <SparkleLoader className="text-white"/> : <Icon name="Wand2" size={18}/>}
                                        <span className="hidden md:inline">{isReportLoading ? "Synthesizing Report..." : "Generate Final Report"}</span>
                                    </button>

                                    <button onClick={() => startSmartExport(finalReportText || "", 'report', exportLanguage)} disabled={!finalReportText} className="h-9 md:h-10 w-auto px-3 md:px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-sm">
                                        <Icon name="Download"/> 
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
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-mono truncate">
                                                    {profile.key.substring(0, 8)}...{profile.key.substring(profile.key.length - 4)}
                                                </span>
                                                {/* ACTIVE MODEL BADGE */}
                                                {profile.activeModel && (
                                                    <span className="text-[9px] font-mono bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 px-1.5 rounded border border-blue-100 dark:border-blue-800/30">
                                                        {profile.activeModel.replace('gemini-', '')}
                                                    </span>
                                                )}
                                            </div>
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
                            <strong>Smart Model Management:</strong> The system automatically probes your keys to find the best available AI model (Pro, Flash, Lite). If a quota limit is reached during work, the key is automatically downgraded for the rest of the day to ensure continuity.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* --- SMART EXPORT PROGRESS MODAL --- */}
            {exportState.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <Icon name="Download" className="text-indigo-500"/>
                                        Export Manager
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Translating & Refining to {exportState.targetLang === 'vi' ? 'Vietnamese' : 'English'}
                                    </p>
                                </div>
                                {!exportState.isPaused && !exportState.isFinished && (
                                    <span className="text-xs font-mono bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded animate-pulse">
                                        Processing...
                                    </span>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-2 flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                <span>Progress</span>
                                <span>{Math.round((exportState.processedChunksCount / exportState.totalChunks) * 100)}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6 relative">
                                <div 
                                    className={`h-full transition-all duration-500 ease-out ${exportState.error ? 'bg-red-500' : exportState.isFinished ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${(exportState.processedChunksCount / exportState.totalChunks) * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                </div>
                            </div>

                            {/* Status Area */}
                            <div className="bg-gray-50 dark:bg-slate-950/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 mb-6 min-h-[100px] flex flex-col justify-center items-center text-center">
                                {exportState.isFinished ? (
                                    <div className="text-emerald-500 flex flex-col items-center gap-2 animate-in zoom-in">
                                        <Icon name="CheckCircle2" size={32}/>
                                        <span className="font-bold">Export Complete!</span>
                                        <span className="text-xs text-slate-500">File is downloading...</span>
                                    </div>
                                ) : exportState.error ? (
                                    <div className="text-red-500 flex flex-col items-center gap-2 animate-in shake w-full">
                                        <Icon name="AlertCircle" size={32}/>
                                        <span className="font-bold">Export Paused</span>
                                        <span className="text-xs text-slate-500 mb-2">{exportState.error}</span>
                                        
                                        {/* INLINE KEY INPUT FOR IMMEDIATE RESUME */}
                                        <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-2">
                                            <input 
                                                type="text" 
                                                className="w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                                placeholder="Paste new API Key here to fix immediately..."
                                                value={rescueKey}
                                                onChange={(e) => setRescueKey(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-xs text-slate-500">Processing Chunk</p>
                                        <p className="text-2xl font-black text-indigo-600 dark:text-white">
                                            {exportState.processedChunksCount + 1} <span className="text-base text-slate-400 font-normal">/ {exportState.totalChunks}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                {exportState.isPaused ? (
                                    <>
                                        <button 
                                            onClick={() => setShowSettingsModal(true)} 
                                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold text-xs transition-all"
                                        >
                                            Manage Keys
                                        </button>
                                        <button 
                                            onClick={handleResumeExport} 
                                            disabled={isRescuing}
                                            className={`flex-1 py-3 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${rescueKey ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
                                        >
                                            {isRescuing ? <Icon name="Loader" className="animate-spin" size={14}/> : null}
                                            {rescueKey ? "Add Key & Resume" : "Resume Export"}
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => setExportState(prev => ({ ...prev, isOpen: false, isPaused: true }))} 
                                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors rounded-xl font-bold text-xs"
                                    >
                                        {exportState.isFinished ? "Close" : "Cancel"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Global Loading Overlay (if needed for heavy non-streaming tasks) */}
            {/* Using inline loading mostly, but if we need a blocker: */}
            {isReportLoading && <AINeuralLoader message="Synthesizing Audit Report..." />}
        </div>
    );
}

export default App;
