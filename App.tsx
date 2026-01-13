
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { AuditProvider, useAudit } from './contexts/AuditContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { KeyPoolProvider, useKeyPool } from './contexts/KeyPoolContext';
import { MainLayout } from './components/layout/MainLayout';
import { TabNavigation } from './components/TabNavigation';
// Lazy Load Views
import { AINeuralLoader } from './components/ui/Loaders';
import ReferenceClauseModal from './components/ReferenceClauseModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { AddStandardModal } from './components/modals/AddStandardModal';
import { ExportProgressModal } from './components/modals/ExportProgressModal';
import { Icon } from './components/UI';
import { TABS_CONFIG } from './constants';
import { useAutoSave } from './hooks/useAutoSave';
import { UploadedFile, FindingsViewMode, MatrixRow } from './types'; 
import { processSourceFile } from './utils';

// New Custom Hooks
import { useAuditWorkflow } from './hooks/useAuditWorkflow';
import { useReportGenerator } from './hooks/useReportGenerator';
import { useExportManager } from './hooks/useExportManager';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';

// Lazy Components
const EvidenceView = React.lazy(() => import('./components/views/EvidenceView').then(module => ({ default: module.EvidenceView })));
const FindingsView = React.lazy(() => import('./components/views/FindingsView').then(module => ({ default: module.FindingsView })));
const ReportView = React.lazy(() => import('./components/views/ReportView').then(module => ({ default: module.ReportView })));
const PlanningView = React.lazy(() => import('./components/views/PlanningView').then(module => ({ default: module.PlanningView })));

const AppContent = () => {
    const [layoutMode, setLayoutMode] = useState('planning'); 
    
    // Enable Global Keyboard Navigation (Arrow Keys)
    useKeyboardNavigation();

    // Contexts
    const { isSidebarOpen, sidebarWidth, showToast, modals, toggleModal, setSidebarOpen } = useUI();
    const { 
        evidence, setEvidence, matrixData, setMatrixData, evidenceTags, addEvidenceTag,
        selectedClauses, standards, standardKey, auditInfo,
        setKnowledgeData, analysisResult, setAnalysisResult, selectedFindings, setSelectedFindings,
        finalReportText, setFinalReportText, resetSession, restoreSession,
        addCustomStandard, setStandardKey, activeProcessId, processes, privacySettings
    } = useAudit();

    const { apiKeys, addKey, deleteKey, refreshKeyStatus, activeKeyId, isCheckingKey, isAutoCheckEnabled, toggleAutoCheck } = useKeyPool();
    const { lastSavedTime, isSaving, createManualBackup } = useAutoSave();

    // Local UI State
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [referenceState, setReferenceState] = useState({ isOpen: false, clause: null, fullText: {en:"", vi:""}, isLoading: false });
    const [newKeyInput, setNewKeyInput] = useState(""); 
    
    // View Persistence
    const [findingsViewMode, setFindingsViewMode] = useState<FindingsViewMode>('list');
    const [focusedFindingIndex, setFocusedFindingIndex] = useState(0);
    const [evidenceLanguage, setEvidenceLanguage] = useState<'en' | 'vi'>('en');
    const [notesLanguage, setNotesLanguage] = useState<'en' | 'vi'>('en');
    const [exportLanguage, setExportLanguage] = useState<'en' | 'vi'>('en');

    // --- INTEGRATE HOOKS ---
    const { 
        handleAnalyze, isAnalyzeLoading, currentAnalyzingClause, 
        progressPercent, analysisLogs 
    } = useAuditWorkflow();
    
    const { 
        isReportLoading, reportLoadingMessage, reportTemplateName, isTemplateProcessing,
        handleTemplateUpload, handleGenerateReport, generationLogs, progressPercent: reportProgress
    } = useReportGenerator(exportLanguage);
    const { 
        handleExport, exportState, setExportState, 
        rescueKey, setRescueKey, handleResumeExport, isRescuing, handleSkipExportChunk 
    } = useExportManager();

    // Event Listeners
    useEffect(() => {
        const handleRef = (e: CustomEvent) => setReferenceState({ isOpen: true, clause: e.detail, fullText: {en:"", vi:""}, isLoading: true });
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

    // Helper: Dynamic Styles
    const liquidColorClass = useMemo(() => {
        const config = TABS_CONFIG.find(t => t.id === layoutMode);
        return config ? `${config.colorClass} ${config.borderClass}` : 'bg-slate-500 border-slate-600';
    }, [layoutMode]);

    const themeStyles = useMemo(() => {
        switch (layoutMode) {
            case 'planning': return 'selection:bg-orange-200 selection:text-orange-900 dark:selection:bg-orange-900 dark:selection:text-orange-100 bg-orange-50/80 dark:bg-orange-950/20';
            case 'evidence': return 'selection:bg-blue-200 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 bg-blue-50/80 dark:bg-blue-950/20';
            case 'findings': return 'selection:bg-purple-200 selection:text-purple-900 dark:selection:bg-purple-900 dark:selection:text-purple-100 bg-purple-50/80 dark:bg-purple-950/20';
            case 'report': return 'selection:bg-emerald-200 selection:text-emerald-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100 bg-emerald-50/80 dark:bg-emerald-950/20';
            default: return 'selection:bg-indigo-200 selection:text-indigo-900';
        }
    }, [layoutMode]);

    const currentTabConfig = TABS_CONFIG.find(t => t.id === layoutMode) || TABS_CONFIG[0];
    const showProcessBlocker = (!activeProcessId || processes.length === 0) && layoutMode !== 'planning';

    const handleAddKeyWrapper = async () => {
        const status = await addKey(newKeyInput);
        if (status === 'valid') { setNewKeyInput(""); showToast("Success: API Key is Active"); } 
        else if (status === 'quota_exceeded') { setNewKeyInput(""); showToast("Added: Key Quota Exhausted"); } 
        else if (status === 'duplicate') showToast("Info: Key already exists"); 
        else showToast("Failed: Invalid API Key or Network Error");
    };

    const isReadyForAnalysis = useMemo(() => {
        if (!standardKey || !activeProcessId || isAnalyzeLoading) return false;
        // Explicitly type the iterator to MatrixRow[] to avoid 'unknown' error
        const hasMatrixData = Object.values(matrixData).some((rows: MatrixRow[]) => rows.some(r => r.status === 'supplied'));
        const hasGlobalEvidence = evidence && evidence.trim().length > 10;
        return hasMatrixData || hasGlobalEvidence;
    }, [standardKey, activeProcessId, matrixData, evidence, isAnalyzeLoading]);

    // Wrap Analyze with Auto-Switch
    const handleAnalyzeClick = async () => {
        setLayoutMode('findings'); // Auto-switch to see progress
        await handleAnalyze();
    };

    return (
        <MainLayout commandActions={[]} onRestoreSnapshot={restoreSession}>
            {/* Top Bar - Color Synced Border Top */}
            <div className={`flex-shrink-0 px-4 md:px-6 py-3 border-b border-gray-200 dark:border-slate-800 transition-colors duration-500 ease-fluid flex justify-between items-center gap-3 border-t-4 ${currentTabConfig.borderClass} ${liquidColorClass.split(' ')[0].replace('bg-', 'bg-opacity-10 ')}`}>
                <div className="flex-1 min-w-0">
                    <TabNavigation 
                        layoutMode={layoutMode} 
                        setLayoutMode={setLayoutMode}
                        isSidebarOpen={isSidebarOpen}
                        sidebarWidth={sidebarWidth}
                    />
                </div>
                <div className="flex gap-2 items-center flex-shrink-0 pl-2 border-l border-gray-200 dark:border-slate-800">
                    <button onClick={() => toggleModal('recall', true)} className={`h-10 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border shadow-sm ${lastSavedTime ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
                        <div className="relative">
                            <Icon name="History" size={18}/>
                            {lastSavedTime && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSaving ? 'bg-red-500' : 'bg-emerald-500'}`}></span></span>}
                        </div>
                        <span className="hidden xl:inline text-xs font-bold">Recall</span>
                    </button>
                    <button onClick={() => { if(confirm("Start New Session?")) { createManualBackup(); resetSession(); showToast("Session Reset."); }}} className="h-10 px-4 bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-100 transition-all shadow-sm">
                        <Icon name="Session4_FilePlus" size={18}/>
                        <span className="hidden md:inline text-xs font-bold">New</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER */}
            <div className={`flex-1 overflow-hidden relative p-2 md:p-4 transition-colors duration-500 ease-fluid ${themeStyles}`}>
                {showProcessBlocker && (
                    <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-floating border border-indigo-100 dark:border-indigo-900 max-w-md text-center">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600"><Icon name="Session11_GridAdd" size={32} /></div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Process Required</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Define at least one <strong>Process</strong> to begin evidence collection.</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setLayoutMode('planning')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">Go to Planning</button>
                            </div>
                        </div>
                    </div>
                )}

                <Suspense fallback={<AINeuralLoader message="Loading View..." />}>
                    {layoutMode === 'planning' && <PlanningView />}
                    
                    {layoutMode === 'evidence' && (
                        <EvidenceView
                            key={activeProcessId} // Forces a fresh mount when switching processes to prevent state bleeding
                            evidence={evidence} setEvidence={setEvidence}
                            uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles}
                            onOcrProcess={() => {}} isOcrLoading={false}
                            onAnalyze={handleAnalyzeClick} 
                            isReadyForAnalysis={isReadyForAnalysis} 
                            isAnalyzeLoading={isAnalyzeLoading} 
                            analyzeTooltip="Run AI Analysis"
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
                            isAnalyzeLoading={isAnalyzeLoading} loadingMessage="Scanning Matrix Evidence..." 
                            currentAnalyzingClause={currentAnalyzingClause}
                            viewMode={findingsViewMode} setViewMode={setFindingsViewMode}
                            focusedFindingIndex={focusedFindingIndex} setFocusedFindingIndex={setFocusedFindingIndex}
                            onExport={handleExport} 
                            notesLanguage={notesLanguage} setNotesLanguage={setNotesLanguage}
                            progressPercent={progressPercent}
                            analysisLogs={analysisLogs}
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
                            isReadyToSynthesize={!!analysisResult && analysisResult.length > 0} 
                            onExport={handleExport} 
                            exportLanguage={exportLanguage} setExportLanguage={setExportLanguage}
                            analysisResult={analysisResult} // Pass results for Stage Builder
                            generationLogs={generationLogs}
                            progressPercent={reportProgress}
                            selectedFindings={selectedFindings} // PASS SELECTION STATE
                        />
                    )}
                </Suspense>
            </div>

            {/* Modals */}
            <SettingsModal 
                isOpen={modals.settings} onClose={() => toggleModal('settings', false)} 
                apiKeys={apiKeys} newKeyInput={newKeyInput} setNewKeyInput={setNewKeyInput} 
                isCheckingKey={isCheckingKey} handleAddKey={handleAddKeyWrapper}
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
                exportState={exportState} setExportState={setExportState}
                rescueKey={rescueKey} setRescueKey={setRescueKey}
                handleResumeExport={handleResumeExport} isRescuing={isRescuing}
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
