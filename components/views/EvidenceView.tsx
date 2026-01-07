
import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Icon, SparkleLoader } from '../UI';
import { UploadedFile, EvidenceTag, StandardsData, MatrixRow, Clause } from '../../types';
import { EvidenceMatrix, EvidenceMatrixHandle } from './EvidenceMatrix'; 
import { fileToBase64 } from '../../utils';
import { generateOcrContent } from '../../services/geminiService';
import { useAudit } from '../../contexts/AuditContext';

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
    selectedClauses?: string[];
    
    standards?: StandardsData;
    standardKey?: string;
    matrixData?: Record<string, MatrixRow[]>;
    setMatrixData?: React.Dispatch<React.SetStateAction<Record<string, MatrixRow[]>>>;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
    evidence, setEvidence, uploadedFiles, setUploadedFiles,
    onOcrProcess, isOcrLoading, onAnalyze, isReadyForAnalysis,
    isAnalyzeLoading, analyzeTooltip, onExport, evidenceLanguage, setEvidenceLanguage,
    textareaRef, tags = [], onAddTag, selectedClauses = [],
    standards, standardKey, matrixData, setMatrixData
}) => {
    // --- CONTEXT: PROCESS & INTERVIEWEES ---
    const { activeProcess, activeProcessId, setActiveProcessId, processes, addInterviewee, removeInterviewee } = useAudit();
    const [newInterviewee, setNewInterviewee] = useState("");

    // --- STATE ---
    const [isDragging, setIsDragging] = useState(false);
    const [isListening, setIsListening] = useState(false); 
    const [isMatrixProcessing, setIsMatrixProcessing] = useState(false);

    // --- REFS ---
    const fileTargetRef = useRef<Record<string, { clauseId: string, rowId: string }>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const matrixRef = useRef<EvidenceMatrixHandle>(null);

    // --- CLAUSE SYNC LOGIC ---
    // Merge clauses selected in Sidebar (global `selectedClauses`) AND clauses added via Matrix (Process `matrixData` keys)
    // This solves the issue where ticked clauses in Planning view don't show up in Evidence Matrix.
    const effectiveSelectedClauses = useMemo(() => {
        const matrixKeys = matrixData ? Object.keys(matrixData) : [];
        return Array.from(new Set([...selectedClauses, ...matrixKeys]));
    }, [selectedClauses, matrixData]);

    // --- INTERVIEWEE HANDLERS ---
    const handleAddInterviewee = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newInterviewee.trim()) {
            addInterviewee(newInterviewee.trim());
            setNewInterviewee("");
        }
    };

    // --- HANDLERS: VOICE (Strictly Matrix) ---
    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice-to-Text is not supported in this browser (Try Chrome/Edge).");
            return;
        }
        
        // Matrix Mode Safety Check
        if (matrixRef.current && !matrixRef.current.getActiveRow()) {
            alert("Please click inside a Matrix cell first to dictate.");
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            // Configurable Language
            recognition.lang = evidenceLanguage === 'vi' ? 'vi-VN' : 'en-US';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript) {
                    const cleanText = finalTranscript.trim();
                    if (matrixRef.current) {
                        matrixRef.current.handleExternalDictation(cleanText);
                    }
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech Error", event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
            recognitionRef.current = recognition;
            setIsListening(true);
        } catch (e) {
            console.error("Failed to start recognition", e);
            setIsListening(false);
        }
    }, [isListening, evidenceLanguage]);

    // --- HANDLERS: FILE PROCESSING (Strictly Matrix) ---
    const processNewFiles = useCallback((files: File[], targetOverride?: { clauseId: string, rowId: string }) => {
        const target = targetOverride || matrixRef.current?.getActiveRow();
        if (!target) {
            alert("Please select a specific cell in the Matrix to attach these files.");
            return;
        }
        
        const newFiles = files.map(f => {
            const id = Math.random().toString(36).substr(2, 9);
            fileTargetRef.current[id] = target;
            return { id, file: f, status: 'pending' as const };
        });
        setUploadedFiles(prev => [...prev, ...newFiles]);
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
                     text = "[PDF Content extracted via OCR would go here]"; 
                } else {
                    text = await fileEntry.file.text();
                }

                if (text && matrixRef.current) {
                    const target = fileTargetRef.current[fileEntry.id];
                    if (target) {
                        const header = `[File: ${fileEntry.file.name}]`;
                        matrixRef.current.insertEvidence(target.clauseId, target.rowId, `${header}\n${text}`);
                        
                        setUploadedFiles(prev => prev.map(f => f.id === fileEntry.id ? { ...f, status: 'success', result: text } : f));
                        delete fileTargetRef.current[fileEntry.id];
                    } else {
                        throw new Error("Target row lost");
                    }
                } else {
                    throw new Error("No text extracted");
                }
            } catch (error: any) {
                console.error("Matrix OCR Error", error);
                setUploadedFiles(prev => prev.map(f => f.id === fileEntry.id ? { ...f, status: 'error', error: error.message || "Failed" } : f));
            }
        }
        setIsMatrixProcessing(false);
    }, [uploadedFiles, setUploadedFiles]);

    // --- HANDLERS: DRAG & DROP ---
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
        <div className="h-full flex flex-col gap-2 md:gap-4 animate-fade-in-up relative">
            
            {/* TOP BAR: PROCESS & INTERVIEWEE */}
            <div className="flex flex-col md:flex-row items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm">
                {/* 1. Process Select */}
                <div className="relative group w-full md:w-auto min-w-[180px] bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center">
                    <div className="absolute left-2 text-indigo-500 pointer-events-none">
                        <Icon name="Session11_GridAdd" size={14}/>
                    </div>
                    <select 
                        value={activeProcessId || ""} 
                        onChange={(e) => setActiveProcessId(e.target.value)}
                        className="w-full bg-transparent appearance-none pl-7 pr-6 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                        title="Switch active process context"
                    >
                        {processes.map(p => (
                            <option key={p.id} value={p.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                                {p.name}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-2 pointer-events-none text-slate-400">
                        <Icon name="ChevronDown" size={12}/>
                    </div>
                </div>

                <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 hidden md:block"></div>

                {/* 2. Interviewee Input */}
                <div className="flex-1 flex items-center gap-2 w-full overflow-x-auto custom-scrollbar px-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                        <Icon name="User" size={12}/> Persons:
                    </div>
                    {activeProcess?.interviewees?.map((name, idx) => (
                        <span key={idx} className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800 whitespace-nowrap">
                            {name}
                            <button onClick={() => removeInterviewee(name)} className="hover:text-red-500"><Icon name="X" size={10}/></button>
                        </span>
                    ))}
                    <input 
                        className="bg-transparent border-b border-dashed border-gray-300 dark:border-slate-700 text-xs py-0.5 px-1 outline-none focus:border-indigo-500 min-w-[80px] dark:text-slate-300" 
                        placeholder="+ Name..." 
                        value={newInterviewee}
                        onChange={e => setNewInterviewee(e.target.value)}
                        onKeyDown={handleAddInterviewee}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 md:gap-4 min-h-0 relative">
                
                {/* MAIN CONTENT AREA - ALWAYS MATRIX */}
                <div
                    className={`flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border overflow-hidden flex flex-row relative group transition-all duration-300 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_4px_6px_-1px_rgba(0,0,0,0.5)] ${isDragging ? 'border-indigo-500 ring-4 ring-indigo-500/20 bg-indigo-50/10' : 'border-gray-100 dark:border-transparent'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isDragging && (
                        <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 rounded-full bg-white dark:bg-slate-900 shadow-2xl border-4 border-dashed border-indigo-500">
                                <Icon name="UploadCloud" size={48} className="text-indigo-600 animate-bounce" />
                            </div>
                            <h3 className="mt-4 text-xl font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-center">Drop Files to Extract<br /><span className="text-sm font-normal normal-case">(Images, PDF, TXT)</span></h3>
                        </div>
                    )}
                    
                    {standards && standardKey && standards[standardKey] && matrixData && setMatrixData ? (
                        <div className="flex-1 w-full h-full bg-gray-50/30 dark:bg-slate-950/30 p-2">
                            <EvidenceMatrix 
                                ref={matrixRef}
                                standard={standards[standardKey]}
                                selectedClauses={effectiveSelectedClauses}
                                matrixData={matrixData}
                                setMatrixData={setMatrixData}
                                onPasteFiles={processNewFiles}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Icon name="LayoutList" size={48} className="mb-4 opacity-30" />
                            <p>Please select a Standard to view the Matrix.</p>
                        </div>
                    )}
                </div>
                
                {/* UPLOAD QUEUE */}
                {uploadedFiles.length > 0 && (
                    <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-2xl animate-in slide-in-from-bottom-5 duration-300 dark:shadow-inner">
                        <div className="mb-2 text-[10px] font-bold text-indigo-500 uppercase tracking-widest px-1">
                            Matrix Queue: Files will attach to active cells
                        </div>
                        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                            {uploadedFiles.map((fileEntry) => (
                                <div key={fileEntry.id} className={`relative group flex-shrink-0 w-24 h-24 bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden transition-all duration-300 dark:shadow-lg ${fileEntry.status === 'error' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-100 dark:border-white/5'}`}>
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
                                            <Icon name="Loader" className="animate-spin text-indigo-600" size={24} />
                                        </div>
                                    )}
                                    {fileEntry.status === 'success' && (
                                        <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                            <Icon name="CheckThick" size={10} />
                                        </div>
                                    )}
                                    {fileEntry.status === 'error' && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/80 dark:bg-red-950/80 p-1 text-center">
                                            <Icon name="AlertCircle" size={20} className="text-red-600" />
                                            <span className="text-[7px] font-black text-red-600 uppercase leading-tight mt-1">{fileEntry.error || 'Err'}</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                        <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== fileEntry.id))} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transform scale-90 hover:scale-110 transition-all duration-200"><Icon name="X" size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
                                <button 
                                    onClick={handleMatrixOcrProcess} 
                                    disabled={(isOcrLoading || isMatrixProcessing) || !uploadedFiles.some(f => f.status === 'pending' || f.status === 'error')} 
                                    className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:scale-105 duration-300"
                                >
                                    {(isOcrLoading || isMatrixProcessing) ? <Icon name="Loader" className="animate-spin" size={24} /> : <Icon name="ScanText" size={24} />}
                                    <span className="text-[10px] font-bold">Process</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* ACTION TOOLBAR */}
            <div className="flex-shrink-0 flex flex-row items-center md:justify-end gap-2 md:gap-3 w-full py-2">
                <div className="flex-none w-[52px] md:w-auto">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain" multiple onChange={(e) => e.target.files && processNewFiles(Array.from(e.target.files))} />
                    <button onClick={() => fileInputRef.current?.click()} className={`w-full h-[52px] md:w-auto md:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm border whitespace-nowrap ${uploadedFiles.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'}`} title="Upload to Active Matrix Cell">
                        <Icon name={uploadedFiles.length > 0 ? "Demo1_MultiFiles" : "Demo8_GridPlus"} size={20} />
                        <span className="hidden md:inline">Upload</span>
                    </button>
                </div>

                <button
                    onClick={toggleListening}
                    className={`flex-none w-[52px] md:w-auto md:px-4 h-[52px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm border whitespace-nowrap ${isListening ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 animate-pulse' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'}`}
                    title={isListening ? "Click to Stop" : `Start Dictation (${evidenceLanguage.toUpperCase()}) to Active Cell`}
                >
                    <Icon name="Mic" size={20} className={isListening ? "animate-pulse" : ""} />
                    <span className="hidden md:inline">
                        {isListening ? `Recording (${evidenceLanguage.toUpperCase()})...` : `Dictate (${evidenceLanguage.toUpperCase()})`}
                    </span>
                </button>

                <button onClick={onAnalyze} disabled={!isReadyForAnalysis} title={analyzeTooltip} className={`flex-1 md:flex-none md:w-auto md:px-6 h-[52px] rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg whitespace-nowrap ${isReadyForAnalysis ? "btn-shrimp text-white active:scale-95" : "bg-gray-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-70 cursor-not-allowed border border-transparent"}`}>
                    {isAnalyzeLoading ? <SparkleLoader className="text-white" /> : <Icon name="Wand2" size={20} className="hidden md:block" />}
                    <span className="inline text-xs uppercase tracking-wider">Analyze</span>
                </button>

                <button onClick={() => onExport('evidence', evidenceLanguage)} disabled={!evidence || !evidence.trim()} className="flex-none md:w-auto px-3 md:px-4 h-[52px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50 whitespace-nowrap dark:shadow-md">
                    <Icon name="Download" />
                    <span className="hidden md:inline">Export</span>
                    <div className="lang-pill-container ml-1" title="Select Input/Export Language">
                        <span onClick={(e) => { e.stopPropagation(); setEvidenceLanguage('en'); }} className={`lang-pill-btn ${evidenceLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                        <span onClick={(e) => { e.stopPropagation(); setEvidenceLanguage('vi'); }} className={`lang-pill-btn ${evidenceLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
