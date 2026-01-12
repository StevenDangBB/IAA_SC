
import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Icon } from '../UI';
import { UploadedFile, EvidenceTag, StandardsData, MatrixRow } from '../../types';
import { EvidenceMatrix, EvidenceMatrixHandle } from './EvidenceMatrix'; 
import { fileToBase64 } from '../../utils';
import { generateOcrContent } from '../../services/geminiService';
import { useAudit } from '../../contexts/AuditContext';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { ProcessHeader } from './evidence/ProcessHeader';
import { ActionToolbar } from './evidence/ActionToolbar';
import { useReferenceLookup } from '../../hooks/useReferenceLookup'; 
import { TABS_CONFIG } from '../../constants';

interface EvidenceViewProps {
    evidence: string;
    setEvidence: React.Dispatch<React.SetStateAction<string>>;
    uploadedFiles: UploadedFile[];
    setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    onOcrProcess: () => void;
    isOcrLoading: boolean;
    onAnalyze: () => void;
    isReadyForAnalysis: boolean;
    isAnalyzeLoading: boolean;
    analyzeTooltip: string;
    onExport: (type: 'evidence', lang: 'en' | 'vi') => void;
    evidenceLanguage: 'en' | 'vi';
    setEvidenceLanguage: (lang: 'en' | 'vi') => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    tags?: EvidenceTag[];
    onAddTag?: (tag: EvidenceTag) => void;
    selectedClauses?: string[]; // Deprecated for View logic, kept for interface compat
    standards?: StandardsData;
    standardKey?: string;
    matrixData?: Record<string, MatrixRow[]>;
    setMatrixData?: React.Dispatch<React.SetStateAction<Record<string, MatrixRow[]>>>;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
    evidence, setEvidence, uploadedFiles, setUploadedFiles,
    isOcrLoading, onAnalyze, isReadyForAnalysis,
    isAnalyzeLoading, analyzeTooltip, evidenceLanguage, setEvidenceLanguage,
    onExport,
    // Note: We deliberately ignore the passed `selectedClauses` prop here to prevent global state from bleeding into process context.
    standards, standardKey, matrixData, setMatrixData
}) => {
    const { activeProcess, activeProcessId, setActiveProcessId, processes, addInterviewee, removeInterviewee } = useAudit();
    
    // UI State
    const [isDragging, setIsDragging] = useState(false);
    const [isMatrixProcessing, setIsMatrixProcessing] = useState(false);

    // Refs
    const fileTargetRef = useRef<Record<string, { clauseId: string, rowId: string }>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const matrixRef = useRef<EvidenceMatrixHandle>(null);

    // Lookup Hook
    const handleLookup = useReferenceLookup();

    // Computed: STRICT ISOLATION MODE
    // CRITICAL FIX: Do NOT use global `selectedClauses`. 
    // The Audit View must ONLY reflect what is inside the active process's `matrixData`.
    // Merging global state caused "data bleeding" where clauses from Process A would appear in Process B.
    const effectiveSelectedClauses = useMemo(() => {
        if (!matrixData) return [];
        const activeKeys = Object.keys(matrixData);
        // Sort keys naturally (e.g. 4.1, 4.2, 4.10) to maintain document structure
        return activeKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [matrixData]);

    // Color Theme Sync
    const themeConfig = TABS_CONFIG.find(t => t.id === 'evidence')!;

    // --- LOGIC: Voice ---
    const handleVoiceResult = useCallback((text: string) => {
        if (text && matrixRef.current) {
            // Safety check: Ensure row is active (handled by matrixRef generally but good to verify)
            matrixRef.current.handleExternalDictation(text);
        } else {
            alert("Please select a Requirement row in the Matrix first.");
        }
    }, []);

    const { isListening, toggleListening } = useVoiceInput(evidenceLanguage, handleVoiceResult);

    // --- LOGIC: Files ---
    const processNewFiles = useCallback((files: File[], targetOverride?: { clauseId: string, rowId: string }) => {
        const target = targetOverride || matrixRef.current?.getActiveRow();
        if (!target) {
            alert("Please click/focus on a specific Requirement row to attach files.");
            return;
        }
        
        const newFiles = files.map(f => {
            const id = Math.random().toString(36).substr(2, 9);
            fileTargetRef.current[id] = target;
            return { id, file: f, status: 'pending' as const };
        });
        setUploadedFiles(prev => [...prev, ...newFiles]);
    }, [setUploadedFiles]);

    const handleRemoveFile = useCallback((fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        delete fileTargetRef.current[fileId];
    }, [setUploadedFiles]);

    const handleMatrixOcrProcess = useCallback(async () => {
        const pendingFiles = uploadedFiles.filter(f => f.status === 'pending' || f.status === 'error');
        if (pendingFiles.length === 0) return;

        setIsMatrixProcessing(true);
        
        for (const fileEntry of pendingFiles) {
            try {
                setUploadedFiles(prev => prev.map(f => f.id === fileEntry.id ? { ...f, status: 'processing' } : f));
                
                let text = "";
                if (fileEntry.file.type.startsWith('image/')) {
                    const base64 = await fileToBase64(fileEntry.file);
                    text = await generateOcrContent("Transcribe text.", base64, fileEntry.file.type);
                } else if (fileEntry.file.type === 'application/pdf') {
                     text = "[PDF Content extracted via OCR would go here - System limitation]"; 
                } else {
                    text = await fileEntry.file.text();
                }

                if (text && matrixRef.current) {
                    const target = fileTargetRef.current[fileEntry.id];
                    if (target) {
                        const header = `[File: ${fileEntry.file.name}]`;
                        matrixRef.current.insertEvidence(target.clauseId, target.rowId, `${header}\n${text}`);
                        
                        // AUTO-REMOVE SUCCESSFUL FILE
                        setUploadedFiles(prev => prev.filter(f => f.id !== fileEntry.id));
                    }
                }
            } catch (error: any) {
                console.error("Matrix OCR Error", error);
                setUploadedFiles(prev => prev.map(f => f.id === fileEntry.id ? { ...f, status: 'error', error: error.message || "Failed" } : f));
            }
        }
        setIsMatrixProcessing(false);
    }, [uploadedFiles, setUploadedFiles]);

    // --- LOGIC: Drag & Drop ---
    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processNewFiles(Array.from(e.dataTransfer.files));
        }
    }, [processNewFiles]);

    return (
        <div className="h-full flex flex-col gap-2 md:gap-3 animate-fade-in-up relative p-1">
            
            <ProcessHeader 
                processes={processes}
                activeProcessId={activeProcessId}
                activeProcess={activeProcess}
                setActiveProcessId={(id) => setActiveProcessId(id)}
                addInterviewee={addInterviewee}
                removeInterviewee={removeInterviewee}
            />

            <div className="flex-1 flex flex-col gap-2 min-h-0 relative">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain" multiple onChange={(e) => e.target.files && processNewFiles(Array.from(e.target.files))} />

                <div
                    className={`flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-t-4 border-t-${themeConfig.borderClass.replace('border-', '')} overflow-hidden flex flex-row relative group transition-all duration-500 ease-fluid dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_4px_6px_-1px_rgba(0,0,0,0.5)] ${isDragging ? `${themeConfig.borderClass} ring-4 ring-blue-500/20 bg-blue-50/10` : 'border-gray-100 dark:border-transparent'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 rounded-full bg-white dark:bg-slate-900 shadow-2xl border-4 border-dashed border-blue-500">
                                <Icon name="UploadCloud" size={48} className="text-blue-600 animate-bounce" />
                            </div>
                            <h3 className="mt-4 text-xl font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Drop Files to Active Row</h3>
                        </div>
                    )}
                    
                    {standards && standardKey && standards[standardKey] && matrixData && setMatrixData ? (
                        effectiveSelectedClauses.length > 0 ? (
                            <div className="flex-1 w-full h-full p-1">
                                <EvidenceMatrix 
                                    ref={matrixRef}
                                    standard={standards[standardKey]}
                                    selectedClauses={effectiveSelectedClauses}
                                    matrixData={matrixData}
                                    setMatrixData={setMatrixData}
                                    onPasteFiles={processNewFiles}
                                    uploadedFiles={uploadedFiles}
                                    onRemoveFile={handleRemoveFile}
                                    onLookup={handleLookup} // Connect Lookup
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-gray-50/20 dark:bg-slate-900/50">
                                <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-lg mb-4">
                                    <Icon name="LayoutList" size={48} className="text-indigo-200 dark:text-slate-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">No Clauses Planned</h3>
                                <p className="text-xs text-slate-400 mt-2 max-w-xs text-center">
                                    Go to the <strong>Planning</strong> tab to select which clauses apply to the <strong>{activeProcess?.name || "Active"}</strong> process.
                                </p>
                            </div>
                        )
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Icon name="LayoutList" size={48} className="mb-4 opacity-30" />
                            <p>Please select a Standard to view the Matrix.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ACTION & EXPORT FOOTER */}
            <div className="flex-shrink-0 flex flex-row items-center justify-between gap-2 md:gap-3 w-full pt-1">
                {/* Left Side: Input Tools */}
                <div className="flex-1 min-w-0">
                    <ActionToolbar 
                        uploadedFiles={uploadedFiles}
                        onOcrProcess={handleMatrixOcrProcess}
                        isOcrLoading={isOcrLoading}
                        isProcessing={isMatrixProcessing}
                        toggleListening={toggleListening}
                        isListening={isListening}
                        triggerFileUpload={() => fileInputRef.current?.click()}
                        onAnalyze={onAnalyze}
                        isReadyForAnalysis={isReadyForAnalysis}
                        isAnalyzeLoading={isAnalyzeLoading}
                    />
                </div>

                {/* Right Side: Export with Language Toggle */}
                <button 
                    onClick={() => onExport('evidence', evidenceLanguage)} 
                    className="flex-none md:w-auto px-3 md:px-4 h-[52px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm whitespace-nowrap dark:shadow-md"
                    title="Export Raw Evidence"
                >
                    <Icon name="Download" />
                    <span className="hidden md:inline">Export</span>
                    <div className="lang-pill-container">
                        <span onClick={(e) => { e.stopPropagation(); setEvidenceLanguage('en'); }} className={`lang-pill-btn ${evidenceLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                        <span onClick={(e) => { e.stopPropagation(); setEvidenceLanguage('vi'); }} className={`lang-pill-btn ${evidenceLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
