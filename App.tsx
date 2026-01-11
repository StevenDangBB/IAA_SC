
import React, { useState, useEffect, useMemo } from 'react';
import { AuditProvider, useAudit } from './contexts/AuditContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { KeyPoolProvider, useKeyPool } from './contexts/KeyPoolContext';
import { MainLayout } from './components/layout/MainLayout';
import { TabNavigation } from './components/TabNavigation';
import { EvidenceView } from './components/views/EvidenceView';
import { FindingsView } from './components/views/FindingsView';
import { ReportView } from './components/views/ReportView';
import { PlanningView } from './components/views/PlanningView'; 
import ReferenceClauseModal from './components/ReferenceClauseModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { AddStandardModal } from './components/modals/AddStandardModal';
import { ExportProgressModal, ExportState } from './components/modals/ExportProgressModal';
import { Icon } from './components/UI';
import { TABS_CONFIG } from './constants';
import { useAutoSave } from './hooks/useAutoSave';
import { UploadedFile, AnalysisResult, FindingsViewMode } from './types'; 
import { processSourceFile, cleanFileName } from './utils';
import { generateAnalysis, generateTextReport, translateChunk } from './services/geminiService';

const AppContent = () => {
    const [layoutMode, setLayoutMode] = useState('planning'); 
    
    // Hooks & Context
    const { isSidebarOpen, sidebarWidth, showToast, modals, toggleModal, setSidebarOpen } = useUI();
    const { 
        evidence, setEvidence, matrixData, setMatrixData, evidenceTags, addEvidenceTag,
        selectedClauses, standards, standardKey, auditInfo,
        setKnowledgeData, analysisResult, setAnalysisResult, selectedFindings, setSelectedFindings,
        finalReportText, setFinalReportText, resetSession, restoreSession,
        addCustomStandard, setStandardKey, activeProcessId, processes, privacySettings
    } = useAudit();

    const { apiKeys, addKey, deleteKey, refreshKeyStatus, checkAllKeys, activeKeyId, isCheckingKey, isAutoCheckEnabled, toggleAutoCheck } = useKeyPool();
    const { lastSavedTime, isSaving, createManualBackup } = useAutoSave();

    // Local State
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [referenceState, setReferenceState] = useState({ isOpen: false, clause: null, fullText: {en:"", vi:""}, isLoading: false });
    const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
    const [currentAnalyzingClause, setCurrentAnalyzingClause] = useState("");
    const [newKeyInput, setNewKeyInput] = useState(""); 

    // Report State
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportLoadingMessage, setReportLoadingMessage] = useState("");
    const [reportTemplate, setReportTemplate] = useState("");
    const [reportTemplateName, setReportTemplateName] = useState("");
    const [isTemplateProcessing, setIsTemplateProcessing] = useState(false);

    // View States (UI Persistence)
    const [findingsViewMode, setFindingsViewMode] = useState<FindingsViewMode>('list');
    const [focusedFindingIndex, setFocusedFindingIndex] = useState(0);
    const [evidenceLanguage, setEvidenceLanguage] = useState<'en' | 'vi'>('en');
    const [notesLanguage, setNotesLanguage] = useState<'en' | 'vi'>('en');
    const [exportLanguage, setExportLanguage] = useState<'en' | 'vi'>('en');

    // Export State
    const [exportState, setExportState] = useState<ExportState>({
        isOpen: false, isPaused: false, isFinished: false,
        totalChunks: 0, processedChunksCount: 0,
        chunks: [], results: [], error: null,
        currentType: 'report', targetLang: 'en'
    });
    const [rescueKey, setRescueKey] = useState("");
    const [isRescuing, setIsRescuing] = useState(false);

    // Event Listeners
    useEffect(() => {
        // Event to OPEN the modal (loading state)
        const handleRef = (e: CustomEvent) => setReferenceState({ isOpen: true, clause: e.detail, fullText: {en:"", vi:""}, isLoading: true });
        
        // Event to UPDATE the modal content (success/fail from sidebar logic)
        const handleRefUpdate = (e: CustomEvent) => setReferenceState(prev => ({ ...prev, fullText: e.detail, isLoading: false }));
        
        const handleSwitch = (e: CustomEvent) => { if (e.detail) setLayoutMode(e.detail); };
        
        window.addEventListener('OPEN_REFERENCE', handleRef as any);
        window.addEventListener('UPDATE_REFERENCE_CONTENT', handleRefUpdate as any);
        window.addEventListener('SWITCH_LAYOUT', handleSwitch as any);
        return () => {
            window.removeEventListener('OPEN_REFERENCE', handleRef as any);
            window.removeEventListener('UPDATE_REFERENCE_CONTENT', handleRefUpdate as any);
            window.removeEventListener('SWITCH_LAYOUT', handleSwitch as any);
        };
    }, []);

    // Helper: Dynamic Color Class for Header
    const liquidColorClass = useMemo(() => {
        const config = TABS_CONFIG.find(t => t.id === layoutMode);
        return config ? `${config.colorClass} ${config.borderClass}` : 'bg-slate-500 border-slate-600';
    }, [layoutMode]);

    // NEW: Dynamic Theme Styles for Block Backgrounds and Text Selection
    const themeStyles = useMemo(() => {
        switch (layoutMode) {
            case 'planning':
                return 'selection:bg-orange-200 selection:text-orange-900 dark:selection:bg-orange-900 dark:selection:text-orange-100 bg-orange-50/40 dark:bg-orange-950/10';
            case 'evidence':
                return 'selection:bg-blue-200 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 bg-blue-50/40 dark:bg-blue-950/10';
            case 'findings':
                return 'selection:bg-purple-200 selection:text-purple-900 dark:selection:bg-purple-900 dark:selection:text-purple-100 bg-purple-50/40 dark:bg-purple-950/10';
            case 'report':
                return 'selection:bg-emerald-200 selection:text-emerald-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/10';
            default:
                return 'selection:bg-indigo-200 selection:text-indigo-900';
        }
    }, [layoutMode]);

    const currentTabConfig = TABS_CONFIG.find(t => t.id === layoutMode) || TABS_CONFIG[0];
    const showProcessBlocker = (!activeProcessId || processes.length === 0) && layoutMode !== 'planning';

    const handleAddKeyWrapper = async () => {
        const status = await addKey(newKeyInput);
        
        if (status === 'valid') {
            setNewKeyInput("");
            showToast("Success: API Key is Active");
        } else if (status === 'quota_exceeded') {
            setNewKeyInput("");
            showToast("Added: Key Quota Exhausted (Will rotate automatically)");
        } else if (status === 'duplicate') {
            showToast("Info: Key already exists in pool");
        } else {
            showToast("Failed: Invalid API Key or Network Error");
        }
    };

    // --- ANALYSIS LOGIC ---
    const isReadyForAnalysis = useMemo(() => {
        if (!standardKey || !activeProcessId || isAnalyzeLoading) return false;
        // Check if there is ANY evidence in the matrix for the current process
        const hasMatrixData = Object.values(matrixData).some(rows => rows.some(r => r.status === 'supplied'));
        // Check if global evidence exists
        const hasGlobalEvidence = evidence && evidence.trim().length > 10;
        
        return hasMatrixData || hasGlobalEvidence;
    }, [standardKey, activeProcessId, matrixData, evidence, isAnalyzeLoading]);

    const handleAnalyze = async () => {
        if (!isReadyForAnalysis) return;
        setIsAnalyzeLoading(true);
        // Switch view immediately to findings to show the loader and results as they arrive
        setLayoutMode('findings');
        showToast("AI Auditor Analysis Started...");

        try {
            const currentStd = standards[standardKey];
            const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
            
            // Determine which clauses to analyze
            // Priority: Matrix clauses > Selected Clauses
            const clausesToAnalyze = new Set<string>();
            
            // 1. Matrix Clauses (Strong intent)
            Object.keys(matrixData).forEach(cid => {
                if (matrixData[cid].some(r => r.status === 'supplied')) {
                    clausesToAnalyze.add(cid);
                }
            });

            // 2. If Global Evidence is present, add manually selected clauses
            if (evidence && evidence.trim().length > 20) {
                selectedClauses.forEach(cid => clausesToAnalyze.add(cid));
            }

            if (clausesToAnalyze.size === 0) {
                throw new Error("Please add evidence to the Matrix or select clauses.");
            }

            // Helper to find clause data (flattened search)
            const findClauseData = (id: string) => {
                for (const g of currentStd.groups) {
                    for (const c of g.clauses) {
                        if (c.id === id) return c;
                        if (c.subClauses) {
                            const findSub = (list: any[]): any => {
                                for (const sub of list) {
                                    if (sub.id === id) return sub;
                                    if (sub.subClauses) {
                                        const found = findSub(sub.subClauses);
                                        if (found) return found;
                                    }
                                }
                                return null;
                            };
                            const sub = findSub(c.subClauses);
                            if (sub) return sub;
                        }
                    }
                }
                return null;
            };

            // Analyze Clauses Loop
            const clausesArray = Array.from(clausesToAnalyze);
            
            for (let i = 0; i < clausesArray.length; i++) {
                const cid = clausesArray[i];
                const clause = findClauseData(cid);
                if (!clause) continue;

                // Update visual tracking state
                setCurrentAnalyzingClause(`${clause.code} ${clause.title}`);

                // Prepare Context
                const matrixRows = matrixData[cid] || [];
                const matrixText = matrixRows
                    .filter(r => r.status === 'supplied')
                    .map(r => `[Requirement]: ${r.requirement}\n[Evidence]: ${r.evidenceInput}`)
                    .join("\n\n");
                
                const combinedEvidence = `
                ${matrixText ? `### MATRIX EVIDENCE:\n${matrixText}` : ''}
                
                ${evidence ? `### GENERAL PROCESS EVIDENCE:\n${evidence}` : ''}
                `.trim();

                if (!combinedEvidence) continue;

                const tagsText = evidenceTags
                    .filter(t => t.clauseId === cid)
                    .map(t => `Tagged Excerpt: "${t.text}"`)
                    .join("\n");

                // Call AI
                const jsonResult = await generateAnalysis(
                    { code: clause.code, title: clause.title, description: clause.description },
                    currentStd.name,
                    combinedEvidence,
                    tagsText,
                    activeKeyProfile?.key,
                    activeKeyProfile?.activeModel,
                    privacySettings.maskCompany // Use privacy setting
                );

                try {
                    const parsed = JSON.parse(jsonResult);
                    // Inject process context
                    parsed.processId = activeProcessId;
                    const procName = processes.find(p => p.id === activeProcessId)?.name;
                    parsed.processName = procName;
                    
                    // Normalize result fields if AI varies slightly
                    const normalizedResult: AnalysisResult = {
                        clauseId: parsed.clauseId || clause.code,
                        status: parsed.status || "N_A",
                        reason: parsed.reason || "Analysis completed.",
                        suggestion: parsed.suggestion || "",
                        evidence: parsed.evidence || "No specific evidence cited.",
                        conclusion_report: parsed.conclusion_report || parsed.reason,
                        crossRefs: parsed.crossRefs || [],
                        processId: activeProcessId || undefined,
                        processName: procName
                    };
                    
                    // IMMEDIATE STATE UPDATE: Update the UI as soon as this clause is done
                    setAnalysisResult(prev => {
                        const existing = prev ? [...prev] : [];
                        const idx = existing.findIndex(e => e.clauseId === normalizedResult.clauseId && e.processId === normalizedResult.processId);
                        if (idx >= 0) existing[idx] = normalizedResult;
                        else existing.push(normalizedResult);
                        return existing;
                    });

                } catch (e) {
                    console.error("JSON Parse Error for clause " + cid, e);
                }
                
                // Throttle: Add small delay between requests to be nice to the API quota
                if (i < clausesArray.length - 1) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            showToast(`Analysis complete. Findings updated.`);

        } catch (error: any) {
            console.error("Analysis Workflow Error", error);
            showToast("Analysis Failed: " + (error.message || "Unknown error"));
        } finally {
            setIsAnalyzeLoading(false);
            setCurrentAnalyzingClause(""); // Reset tracking state
        }
    };

    // --- EXPORT LOGIC ---
    const handleExport = async (type: 'evidence' | 'notes' | 'report', lang: 'en' | 'vi') => {
        let content = "";
        
        if (type === 'evidence') {
            content = `EVIDENCE DUMP\nDate: ${new Date().toLocaleString()}\n\n`;
            content += `--- GENERAL EVIDENCE ---\n${evidence}\n\n`;
            content += `--- MATRIX EVIDENCE ---\n`;
            // Simple serialization
            Object.keys(matrixData).forEach(k => {
                const rows = matrixData[k];
                rows.forEach(r => {
                    if (r.status === 'supplied') {
                        content += `[Clause ${k}] ${r.requirement}\nEVIDENCE: ${r.evidenceInput}\n---\n`;
                    }
                });
            });
        } else if (type === 'notes') {
            if (!analysisResult) return showToast("No findings to export.");
            content = analysisResult.map(f => 
                `[${f.clauseId}] ${f.status}\nObservation: ${f.reason}\nEvidence: ${f.evidence}\n`
            ).join("\n----------------------------------------\n\n");
        } else if (type === 'report') {
            if (!finalReportText) return showToast("No report to export.");
            content = finalReportText;
        }

        if (!content.trim()) return showToast("Nothing to export.");

        // Chunking (approx 3000 chars for safe translation context)
        const chunks = content.match(/[\s\S]{1,3000}/g) || [];
        
        setExportState({
            isOpen: true,
            isPaused: false,
            isFinished: false,
            totalChunks: chunks.length,
            processedChunksCount: 0,
            chunks,
            results: [],
            error: null,
            currentType: type,
            targetLang: lang
        });
    };

    // Export Processor Loop
    useEffect(() => {
        const processExport = async () => {
            if (exportState.isOpen && !exportState.isPaused && !exportState.isFinished) {
                const index = exportState.processedChunksCount;
                if (index >= exportState.totalChunks) {
                    // FINISH
                    const finalContent = exportState.results.join("");
                    
                    // --- NAMING CONVENTION GENERATOR ---
                    const currentStdName = standards[standardKey]?.name || "ISO";
                    let stdShort = "ISO";
                    if (currentStdName.includes("27001")) stdShort = "27k";
                    else if (currentStdName.includes("9001")) stdShort = "9k";
                    else if (currentStdName.includes("14001")) stdShort = "14k";
                    else stdShort = cleanFileName(currentStdName).split('_')[0]; // Simple fallback

                    const activeProc = processes.find(p => p.id === activeProcessId);
                    const procName = activeProc ? activeProc.name : "General";

                    let typeLabel = "Document";
                    if (exportState.currentType === 'notes') typeLabel = "Audit_Note";
                    else if (exportState.currentType === 'evidence') typeLabel = "Evidence";
                    else if (exportState.currentType === 'report') typeLabel = "Report";

                    // Format: YYYYMMDD_HHmm
                    const now = new Date();
                    const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

                    const filenameParts = [
                        stdShort,
                        cleanFileName(auditInfo.type || "Audit"),
                        cleanFileName(auditInfo.smo || "SMO"),
                        cleanFileName(auditInfo.company || "Company"),
                        cleanFileName(procName),
                        typeLabel,
                        cleanFileName(auditInfo.auditor || "Auditor"),
                        timeStr
                    ];

                    // Filter 'N_A' or empty strings to keep filename clean
                    const filename = `${filenameParts.filter(p => p && p !== 'N_A').join('_')}_${exportState.targetLang}.txt`;
                    
                    const blob = new Blob([finalContent], { type: 'text/plain' });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setExportState(prev => ({ ...prev, isFinished: true }));
                    return;
                }

                // PROCESS CHUNK
                const chunk = exportState.chunks[index];
                try {
                    const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
                    
                    // Artificial delay for UX visibility
                    await new Promise(r => setTimeout(r, 200));

                    // Use rescue key if provided (temporarily)
                    const keyToUse = rescueKey || activeKeyProfile?.key;
                    
                    // Call Translation
                    const translated = await translateChunk(chunk, exportState.targetLang, keyToUse);

                    setExportState(prev => ({
                        ...prev,
                        results: [...prev.results, translated],
                        processedChunksCount: prev.processedChunksCount + 1
                    }));
                } catch (err: any) {
                    console.error("Export Chunk Error", err);
                    setExportState(prev => ({
                        ...prev,
                        isPaused: true,
                        error: err.message || "Translation failed. Quota exceeded or Network error."
                    }));
                }
            }
        };

        processExport();
    }, [exportState, activeKeyId, rescueKey, apiKeys]);

    const handleResumeExport = async () => {
        setIsRescuing(true);
        // Verify rescue key
        const { validateApiKey } = await import('./services/geminiService');
        const check = await validateApiKey(rescueKey);
        
        if (check.isValid) {
            // Add to pool if valid
            await addKey(rescueKey, "Rescue Key");
            setExportState(prev => ({ ...prev, isPaused: false, error: null }));
            setRescueKey("");
        } else {
            showToast("Rescue Key Invalid: " + check.errorMessage);
        }
        setIsRescuing(false);
    };
    
    const handleSkipExportChunk = () => {
         setExportState(prev => ({
            ...prev,
            results: [...prev.results, prev.chunks[prev.processedChunksCount]], // Use original content
            processedChunksCount: prev.processedChunksCount + 1,
            isPaused: false,
            error: null
        }));
    };

    // --- REPORT LOGIC ---
    const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsTemplateProcessing(true);
        setReportLoadingMessage("Processing Template...");
        
        try {
            // Artifical delay for UX if file is too small, to show the loader
            const start = Date.now();
            const text = await processSourceFile(file);
            const duration = Date.now() - start;
            if(duration < 500) await new Promise(r => setTimeout(r, 500));

            setReportTemplate(text);
            setReportTemplateName(file.name);
            showToast(`Template "${file.name}" loaded successfully.`);
        } catch (err: any) {
            console.error("Template Error", err);
            showToast(`Failed to load template: ${err.message}`);
        } finally {
            setIsTemplateProcessing(false);
            setReportLoadingMessage("");
        }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult || analysisResult.length === 0) {
            showToast("No findings to report. Please run Analysis first.");
            return;
        }

        setIsReportLoading(true);
        setReportLoadingMessage("Synthesizing Final Report...");

        try {
            const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
            const standardName = standards[standardKey]?.name || "ISO Standard";

            const result = await generateTextReport(
                {
                    company: auditInfo.company || "N/A",
                    type: auditInfo.type || "Internal Audit",
                    auditor: auditInfo.auditor || "N/A",
                    standard: standardName,
                    findings: analysisResult,
                    lang: exportLanguage,
                    fullEvidenceContext: reportTemplate ? `USER PROVIDED TEMPLATE/CONTEXT:\n${reportTemplate}` : undefined
                },
                activeKeyProfile?.key,
                activeKeyProfile?.activeModel
            );

            setFinalReportText(result);
            showToast("Report Generated Successfully.");

        } catch (error: any) {
            console.error("Report Gen Error", error);
            showToast("Failed to generate report: " + error.message);
        } finally {
            setIsReportLoading(false);
            setReportLoadingMessage("");
        }
    };

    const isReadyToSynthesize = useMemo(() => {
        return !!analysisResult && analysisResult.length > 0;
    }, [analysisResult]);


    return (
        <MainLayout commandActions={[]} onRestoreSnapshot={restoreSession}>
            {/* Top Bar */}
            <div className={`flex-shrink-0 px-4 md:px-6 py-3 border-b border-gray-200 dark:border-slate-800 transition-colors duration-500 ease-fluid flex justify-between items-center gap-3 border-t-4 ${currentTabConfig.borderClass} ${liquidColorClass.split(' ')[0].replace('bg-', 'bg-opacity-5')}`}>
                <div className="flex-1 min-w-0">
                    <TabNavigation 
                        layoutMode={layoutMode} 
                        setLayoutMode={setLayoutMode}
                        isSidebarOpen={isSidebarOpen}
                        sidebarWidth={sidebarWidth}
                    />
                </div>
                <div className="flex gap-2 items-center flex-shrink-0 pl-2 border-l border-gray-200 dark:border-slate-800">
                    <button onClick={() => toggleModal('recall', true)} className={`h-10 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border ${lastSavedTime ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
                        <div className="relative">
                            <Icon name="History" size={18}/>
                            {lastSavedTime && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSaving ? 'bg-red-500' : 'bg-emerald-500'}`}></span></span>}
                        </div>
                        <span className="hidden xl:inline text-xs font-bold">Recall</span>
                    </button>
                    <button onClick={() => { if(confirm("Start New Session?")) { createManualBackup(); resetSession(); showToast("Session Reset."); }}} className="h-10 px-4 bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-100 transition-all">
                        <Icon name="Session4_FilePlus" size={18}/>
                        <span className="hidden md:inline text-xs font-bold">New</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER with Dynamic Theme Styles */}
            <div className={`flex-1 overflow-hidden relative p-2 md:p-4 transition-colors duration-500 ease-fluid ${themeStyles}`}>
                {showProcessBlocker && (
                    <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-indigo-100 dark:border-indigo-900 max-w-md text-center">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600"><Icon name="Session11_GridAdd" size={32} /></div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Process Required</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Define at least one <strong>Process</strong> to begin evidence collection.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setLayoutMode('planning')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">Go to Planning</button>
                            </div>
                        </div>
                    </div>
                )}

                {layoutMode === 'planning' && <PlanningView />}
                
                {layoutMode === 'evidence' && (
                    <EvidenceView
                        evidence={evidence} setEvidence={setEvidence}
                        uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles}
                        onOcrProcess={() => {}} isOcrLoading={false}
                        onAnalyze={handleAnalyze} 
                        isReadyForAnalysis={isReadyForAnalysis} 
                        isAnalyzeLoading={isAnalyzeLoading} 
                        analyzeTooltip="Run AI Analysis on Evidence"
                        onExport={handleExport} 
                        evidenceLanguage={evidenceLanguage} setEvidenceLanguage={setEvidenceLanguage}
                        textareaRef={{ current: null }} tags={evidenceTags} onAddTag={addEvidenceTag}
                        selectedClauses={selectedClauses} standards={standards} standardKey={standardKey}
                        matrixData={matrixData} setMatrixData={setMatrixData}
                    />
                )}

                {layoutMode === 'findings' && (
                    <FindingsView
                        analysisResult={analysisResult} setAnalysisResult={setAnalysisResult}
                        selectedFindings={selectedFindings} setSelectedFindings={setSelectedFindings}
                        isAnalyzeLoading={isAnalyzeLoading} loadingMessage="Synthesizing findings..." 
                        currentAnalyzingClause={currentAnalyzingClause}
                        viewMode={findingsViewMode} setViewMode={setFindingsViewMode}
                        focusedFindingIndex={focusedFindingIndex} setFocusedFindingIndex={setFocusedFindingIndex}
                        onExport={handleExport} 
                        notesLanguage={notesLanguage} setNotesLanguage={setNotesLanguage}
                    />
                )}

                {layoutMode === 'report' && (
                    <ReportView
                        finalReportText={finalReportText} setFinalReportText={setFinalReportText}
                        isReportLoading={isReportLoading} loadingMessage={reportLoadingMessage}
                        templateFileName={reportTemplateName}
                        isTemplateProcessing={isTemplateProcessing}
                        handleTemplateUpload={handleTemplateUpload} 
                        handleGenerateReport={handleGenerateReport}
                        isReadyToSynthesize={isReadyToSynthesize} 
                        onExport={handleExport} 
                        exportLanguage={exportLanguage} setExportLanguage={setExportLanguage}
                    />
                )}
            </div>

            {/* Modals */}
            <SettingsModal 
                isOpen={modals.settings} onClose={() => toggleModal('settings', false)} 
                apiKeys={apiKeys} 
                newKeyInput={newKeyInput} 
                setNewKeyInput={setNewKeyInput} 
                isCheckingKey={isCheckingKey}
                handleAddKey={handleAddKeyWrapper}
                activeKeyId={activeKeyId} editingKeyId={null} editLabelInput="" setEditLabelInput={() => {}}
                handleSaveLabel={() => {}} handleStartEdit={() => {}} handleRefreshStatus={refreshKeyStatus} handleDeleteKey={deleteKey}
                isAutoCheckEnabled={isAutoCheckEnabled} toggleAutoCheck={toggleAutoCheck}
            />

            <AddStandardModal
                isOpen={modals.addStandard} onClose={() => toggleModal('addStandard', false)}
                onAdd={async (name, file) => {
                    toggleModal('addStandard', false);
                    const newKey = `CUSTOM_${Date.now()}`;
                    if(file) { const text = await processSourceFile(file); setKnowledgeData(text, file.name); }
                    addCustomStandard(newKey, { name, description: "Custom", groups: [] });
                    setStandardKey(newKey);
                }}
            />

            <ReferenceClauseModal
                isOpen={referenceState.isOpen} onClose={() => setReferenceState(prev => ({...prev, isOpen: false}))}
                clause={referenceState.clause} standardName={standards[standardKey]?.name || ""}
                fullText={referenceState.fullText} isLoading={referenceState.isLoading}
                onInsert={(text) => setEvidence(prev => prev + "\n" + text)}
            />
            
            <ExportProgressModal 
                exportState={exportState}
                setExportState={setExportState}
                rescueKey={rescueKey}
                setRescueKey={setRescueKey}
                handleResumeExport={handleResumeExport}
                isRescuing={isRescuing}
                onClose={() => setExportState(prev => ({ ...prev, isOpen: false }))}
                onSkip={handleSkipExportChunk}
            />
        </MainLayout>
    );
};

export default function App() {
    return (
        <UIProvider>
            <KeyPoolProvider>
                <AuditProvider>
                    <AppContent />
                </AuditProvider>
            </KeyPoolProvider>
        </UIProvider>
    );
}
