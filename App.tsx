
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AuditProvider, useAudit } from './contexts/AuditContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { KeyPoolProvider, useKeyPool } from './contexts/KeyPoolContext';
import { MainLayout } from './components/layout/MainLayout';
import { TabNavigation } from './components/TabNavigation';
import { EvidenceView } from './components/views/EvidenceView';
import { FindingsView } from './components/views/FindingsView';
import { ReportView } from './components/views/ReportView';
import { PlanningView } from './components/views/PlanningView'; // Import New View
import ReferenceClauseModal from './components/ReferenceClauseModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { AddStandardModal } from './components/modals/AddStandardModal';
import { Icon } from './components/UI';
import { TABS_CONFIG } from './constants';
import { useAutoSave } from './hooks/useAutoSave';
import { UploadedFile } from './types'; 
import { processSourceFile } from './utils';

// Main App Logic Wrapper
const AppContent = () => {
    const [layoutMode, setLayoutMode] = useState('planning'); // Start at Planning
    
    // Hooks & Context
    const { 
        isSidebarOpen, sidebarWidth, showToast, 
        modals, toggleModal, setSidebarOpen 
    } = useUI();
    
    const { 
        evidence, setEvidence, matrixData, setMatrixData, evidenceTags, addEvidenceTag,
        selectedClauses, standards, standardKey, auditInfo,
        knowledgeBase, setKnowledgeData,
        analysisResult, setAnalysisResult, selectedFindings, setSelectedFindings,
        finalReportText, setFinalReportText,
        resetSession, restoreSession,
        addCustomStandard, setStandardKey,
        activeProcessId, processes 
    } = useAudit();

    const { apiKeys, addKey, deleteKey, refreshKeyStatus, checkAllKeys, activeKeyId, isCheckingKey, isAutoCheckEnabled, toggleAutoCheck } = useKeyPool();
    
    const { lastSavedTime, isSaving, createManualBackup } = useAutoSave();

    // Local State for specific views
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [referenceState, setReferenceState] = useState({ isOpen: false, clause: null, fullText: {en:"", vi:""}, isLoading: false });
    
    // Listen for Sidebar Custom Event
    useEffect(() => {
        const handleRef = (e: CustomEvent) => {
            setReferenceState({ isOpen: true, clause: e.detail, fullText: {en:"", vi:""}, isLoading: true });
        };
        const handleSwitch = (e: CustomEvent) => {
            if (e.detail) setLayoutMode(e.detail);
        };
        window.addEventListener('OPEN_REFERENCE', handleRef as any);
        window.addEventListener('SWITCH_LAYOUT', handleSwitch as any);
        return () => {
            window.removeEventListener('OPEN_REFERENCE', handleRef as any);
            window.removeEventListener('SWITCH_LAYOUT', handleSwitch as any);
        };
    }, []);

    // Command Actions
    const commandActions = useMemo(() => [
        { label: "Analyze", action: () => showToast("Analysis triggered") },
        { label: "New Session", action: () => { createManualBackup(); resetSession(); showToast("New Session"); } }
    ], []);

    const handleNewSession = () => {
        if(confirm("Start New Session? Current data will be backed up.")) {
            createManualBackup();
            resetSession();
            showToast("Session Reset.");
        }
    };

    const currentTabConfig = TABS_CONFIG.find(t => t.id === layoutMode) || TABS_CONFIG[0];

    // Liquid Color Logic: Determine Background Color for Top Bar based on active Tab
    const liquidColorClass = useMemo(() => {
        switch(layoutMode) {
            case 'planning': return 'bg-orange-500 border-orange-600';
            case 'evidence': return 'bg-blue-500 border-blue-600';
            case 'findings': return 'bg-purple-500 border-purple-600';
            case 'report': return 'bg-emerald-500 border-emerald-600';
            default: return 'bg-slate-500 border-slate-600';
        }
    }, [layoutMode]);

    // Handlers for Settings Modal
    const settingsProps = {
        apiKeys, newKeyInput: "", setNewKeyInput: () => {}, isCheckingKey,
        handleAddKey: () => {}, activeKeyId, editingKeyId: null, editLabelInput: "",
        setEditLabelInput: () => {}, handleSaveLabel: () => {}, handleStartEdit: () => {},
        handleRefreshStatus: refreshKeyStatus, handleDeleteKey: deleteKey,
        isAutoCheckEnabled, toggleAutoCheck
    };

    // BLOCKING OVERLAY IF NO PROCESS
    // We only block evidence/findings/report views. Planning is always allowed.
    const showProcessBlocker = (!activeProcessId || processes.length === 0) && layoutMode !== 'planning';

    return (
        <MainLayout commandActions={commandActions} onRestoreSnapshot={restoreSession}>
            
            {/* Top Bar with Liquid Color */}
            <div className={`flex-shrink-0 px-4 md:px-6 py-3 border-b border-gray-200 dark:border-slate-800 transition-colors duration-500 ease-fluid flex justify-between items-center gap-3 border-t-4 ${currentTabConfig.borderClass} ${liquidColorClass.replace('bg-', 'bg-opacity-5') /* Use slight tint instead of full solid for background */}`}>
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
                    <button onClick={handleNewSession} className="h-10 px-4 bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-100 transition-all">
                        <Icon name="Session4_FilePlus" size={18}/>
                        <span className="hidden md:inline text-xs font-bold">New</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative p-2 md:p-4">
                
                {/* Process Enforcement Blocker */}
                {showProcessBlocker && (
                    <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-indigo-100 dark:border-indigo-900 max-w-md text-center">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                <Icon name="Session11_GridAdd" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Process Required</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                To ensure audit integrity, you must define at least one <strong>Process</strong> (e.g., Purchasing, Production) before managing evidence.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button 
                                    onClick={() => setLayoutMode('planning')} 
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-transform active:scale-95"
                                >
                                    Go to Planning
                                </button>
                                <button 
                                    onClick={() => setSidebarOpen(true)} 
                                    className="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-transform active:scale-95"
                                >
                                    Open Sidebar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {layoutMode === 'planning' && (
                    <PlanningView />
                )}

                {layoutMode === 'evidence' && (
                    <EvidenceView
                        evidence={evidence}
                        setEvidence={setEvidence}
                        uploadedFiles={uploadedFiles}
                        setUploadedFiles={setUploadedFiles}
                        onOcrProcess={() => {}}
                        isOcrLoading={false}
                        onAnalyze={() => {}}
                        isReadyForAnalysis={false}
                        isAnalyzeLoading={false}
                        analyzeTooltip="AI Analysis"
                        onExport={() => {}}
                        evidenceLanguage='en'
                        setEvidenceLanguage={() => {}}
                        textareaRef={{ current: null }}
                        tags={evidenceTags}
                        onAddTag={addEvidenceTag}
                        selectedClauses={selectedClauses}
                        standards={standards}
                        standardKey={standardKey}
                        matrixData={matrixData}
                        setMatrixData={setMatrixData}
                    />
                )}
                {layoutMode === 'findings' && (
                    <FindingsView
                        analysisResult={analysisResult}
                        setAnalysisResult={setAnalysisResult}
                        selectedFindings={selectedFindings}
                        setSelectedFindings={setSelectedFindings}
                        isAnalyzeLoading={false}
                        loadingMessage=""
                        currentAnalyzingClause=""
                        viewMode="list"
                        setViewMode={() => {}}
                        focusedFindingIndex={0}
                        setFocusedFindingIndex={() => {}}
                        onExport={() => {}}
                        notesLanguage="en"
                        setNotesLanguage={() => {}}
                    />
                )}
                {layoutMode === 'report' && (
                    <ReportView
                        finalReportText={finalReportText}
                        setFinalReportText={setFinalReportText}
                        isReportLoading={false}
                        loadingMessage=""
                        templateFileName=""
                        handleTemplateUpload={() => {}}
                        handleGenerateReport={() => {}}
                        isReadyToSynthesize={false}
                        onExport={() => {}}
                        exportLanguage="en"
                        setExportLanguage={() => {}}
                    />
                )}
            </div>

            {/* Modals needing Context Data */}
            <SettingsModal 
                isOpen={modals.settings} 
                onClose={() => toggleModal('settings', false)} 
                {...settingsProps} 
                handleAddKey={() => {
                    const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                    if(input) addKey(input.value);
                }}
            />

            <AddStandardModal
                isOpen={modals.addStandard}
                onClose={() => toggleModal('addStandard', false)}
                onAdd={async (name, file) => {
                    toggleModal('addStandard', false);
                    const newKey = `CUSTOM_${Date.now()}`;
                    if(file) {
                        const text = await processSourceFile(file);
                        setKnowledgeData(text, file.name);
                    }
                    addCustomStandard(newKey, { name, description: "Custom", groups: [] });
                    setStandardKey(newKey);
                }}
            />

            <ReferenceClauseModal
                isOpen={referenceState.isOpen}
                onClose={() => setReferenceState(prev => ({...prev, isOpen: false}))}
                clause={referenceState.clause}
                standardName={standards[standardKey]?.name || ""}
                fullText={referenceState.fullText}
                isLoading={referenceState.isLoading}
                onInsert={(text) => setEvidence(prev => prev + "\n" + text)}
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
