
import React, { useRef, useState, useEffect } from 'react';
import { Icon, SparkleLoader } from '../UI';
import { UploadedFile } from '../../App'; 
import { EvidenceTag } from '../../types';

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
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
    evidence, setEvidence, uploadedFiles, setUploadedFiles,
    onOcrProcess, isOcrLoading, onAnalyze, isReadyForAnalysis,
    isAnalyzeLoading, analyzeTooltip, onExport, evidenceLanguage, setEvidenceLanguage,
    textareaRef, tags = [], onAddTag, selectedClauses = []
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isListening, setIsListening] = useState(false); // Voice state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    
    // Tagging State with Coordinates
    const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string, start: number, end: number } | null>(null);

    // --- VOICE LOGIC ---
    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert("Voice-to-Text not supported in this browser.");
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = evidenceLanguage === 'vi' ? 'vi-VN' : 'en-US';

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                
                // Append only final results to state to avoid overwriting user edits
                if (finalTranscript) {
                    setEvidence(prev => prev + (prev ? " " : "") + finalTranscript);
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech Error", event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    alert("Microphone permission denied. Please check your browser settings.");
                }
            };

            recognition.onend = () => {
                // If it stops automatically (e.g. silence), update UI
                // However, we set isListening false on manual stop or error.
                // If we want continuous to truly mean continuous, we might need to restart it here if not manually stopped.
                // For this implementation, we'll just let it toggle off.
                if (isListening) {
                     setIsListening(false);
                }
            };

            try {
                recognition.start();
                recognitionRef.current = recognition;
                setIsListening(true);
            } catch (e) {
                console.error("Failed to start recognition", e);
                setIsListening(false);
            }
        }
    };

    const processNewFiles = (files: File[]) => {
        const newFiles = files.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            status: 'pending' as const
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
    };

    // --- TAGGING LOGIC ---
    const handleTextSelect = (e: React.MouseEvent) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        
        if (start !== end) {
            const text = evidence.substring(start, end);
            
            // Calculate position relative to viewport to place the menu near the cursor
            // We use clientX/Y from the mouse event for simplicity
            const x = e.clientX;
            const y = e.clientY;

            setSelectionMenu({
                x,
                y,
                text,
                start,
                end
            });
        } else {
            setSelectionMenu(null);
        }
    };

    const confirmTag = (clauseId: string) => {
        if (selectionMenu && onAddTag) {
            onAddTag({
                id: `tag_${Date.now()}`,
                clauseId,
                text: selectionMenu.text,
                startIndex: selectionMenu.start,
                endIndex: selectionMenu.end,
                timestamp: Date.now()
            });
            setSelectionMenu(null);
            // clear selection visually
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur(); 
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processNewFiles(Array.from(e.dataTransfer.files));
        }
    };
    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            e.preventDefault();
            processNewFiles(Array.from(e.clipboardData.files));
        }
    };
    const handleRemoveFile = (id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };

    return (
        <div className="h-full flex flex-col gap-2 md:gap-4 animate-fade-in-up relative">
            <div className="flex-1 flex flex-col gap-2 md:gap-4 min-h-0 relative">
                
                {/* --- FLOATING TAGGING TOOLBAR (PORTAL-LIKE) --- */}
                {selectionMenu && selectedClauses.length > 0 && (
                    <div 
                        className="fixed z-[9999] bg-slate-900/90 backdrop-blur-md text-white p-2.5 rounded-xl shadow-2xl flex flex-col gap-2 animate-in zoom-in-95 duration-200 border border-slate-700/50 ring-1 ring-white/10 max-w-[200px]"
                        style={{ top: selectionMenu.y - 120, left: Math.min(selectionMenu.x - 100, window.innerWidth - 220) }}
                    >
                        <div className="flex justify-between items-center border-b border-slate-700/50 pb-1.5 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                                <Icon name="Tag" size={10}/> Tag As:
                            </span>
                            <button onClick={() => setSelectionMenu(null)} className="text-slate-400 hover:text-white bg-white/10 rounded-full p-0.5"><Icon name="X" size={10}/></button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-start max-h-[150px] overflow-y-auto custom-scrollbar">
                            {selectedClauses.map(clauseId => (
                                <button 
                                    key={clauseId}
                                    onClick={() => confirmTag(clauseId)}
                                    className="text-[10px] font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg transition-all active:scale-95 shadow-sm border border-indigo-500 hover:border-indigo-400"
                                >
                                    {clauseId}
                                </button>
                            ))}
                        </div>
                        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/90 rotate-45 border-r border-b border-slate-700/50"></div>
                    </div>
                )}

                <div
                    className={`flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border overflow-hidden flex flex-col relative group transition-all duration-300 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_4px_6px_-1px_rgba(0,0,0,0.5)] ${isDragging ? 'border-indigo-500 ring-4 ring-indigo-500/20 bg-indigo-50/10' : 'border-gray-100 dark:border-transparent'}`}
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
                    <textarea
                        ref={textareaRef}
                        className="flex-1 w-full h-full p-4 pb-6 bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-300 font-medium text-sm leading-relaxed text-justify break-words whitespace-pre-wrap selection:bg-indigo-200 dark:selection:bg-indigo-900/60"
                        placeholder="Paste audit evidence here or use Voice Dictation..."
                        value={evidence}
                        onChange={(e) => setEvidence(e.target.value)}
                        onPaste={handlePaste}
                        onMouseUp={handleTextSelect} 
                    />
                    
                    {/* Tags Indicator Overlay - Kept floating as it is informational */}
                    {tags.length > 0 && (
                        <div className="absolute bottom-4 right-4 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                                <Icon name="Tag" size={12}/>
                                {tags.length} Evidence Tags
                            </div>
                        </div>
                    )}
                </div>
                {uploadedFiles.length > 0 && (
                    <div className="flex-shrink-0 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-2xl animate-in slide-in-from-bottom-5 duration-300 dark:shadow-inner">
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
                                            <span className="text-[7px] font-black text-red-600 uppercase leading-tight mt-1">{fileEntry.error || 'Lỗi'}</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                        <button onClick={() => handleRemoveFile(fileEntry.id)} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transform scale-90 hover:scale-110 transition-all duration-200"><Icon name="X" size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
                                <button onClick={onOcrProcess} disabled={isOcrLoading || !uploadedFiles.some(f => f.status === 'pending' || f.status === 'error')} className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:scale-105 duration-300">
                                    {isOcrLoading ? <Icon name="Loader" className="animate-spin" size={24} /> : <Icon name="ScanText" size={24} />}
                                    <span className="text-[10px] font-bold">Process</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* ... Bottom toolbar ... */}
            <div className="flex-shrink-0 flex flex-row items-center md:justify-end gap-2 md:gap-3 w-full pt-2">
                <div className="flex-none w-[52px] md:w-auto">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain" multiple onChange={(e) => e.target.files && processNewFiles(Array.from(e.target.files))} />
                    <button onClick={() => fileInputRef.current?.click()} className={`w-full h-[52px] md:w-auto md:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm border whitespace-nowrap ${uploadedFiles.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'}`} title="Upload Files">
                        <Icon name={uploadedFiles.length > 0 ? "Demo1_MultiFiles" : "Demo8_GridPlus"} size={20} />
                        <span className="hidden md:inline">Upload</span>
                    </button>
                </div>

                {/* Voice Dictation Button - Positioned AFTER Upload based on order: Upload - Voice - Analyze - Export */}
                <button
                    onClick={toggleListening}
                    className={`flex-none w-[52px] md:w-auto md:px-4 h-[52px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm border whitespace-nowrap ${isListening ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 animate-pulse' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'}`}
                    title={isListening ? "Stop Recording" : "Voice Dictation"}
                >
                    <Icon name="Mic" size={20} className={isListening ? "animate-pulse" : ""} />
                    <span className="hidden md:inline">{isListening ? "Listening..." : "Dictate"}</span>
                </button>

                <button onClick={onAnalyze} disabled={!isReadyForAnalysis} title={analyzeTooltip} className={`flex-1 md:flex-none md:w-auto md:px-6 h-[52px] rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg whitespace-nowrap ${isReadyForAnalysis ? "btn-shrimp text-white active:scale-95" : "bg-gray-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-70 cursor-not-allowed border border-transparent"}`}>
                    {isAnalyzeLoading ? <SparkleLoader className="text-white" /> : <Icon name="Wand2" size={20} className="hidden md:block" />}
                    <span className="inline text-xs uppercase tracking-wider">Analyze</span>
                </button>

                <button onClick={() => onExport('evidence', evidenceLanguage)} disabled={!evidence || !evidence.trim()} className="flex-none md:w-auto px-3 md:px-4 h-[52px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50 whitespace-nowrap dark:shadow-md">
                    <Icon name="Download" />
                    <span className="hidden md:inline">Export</span>
                    <div className="lang-pill-container ml-1">
                        <span onClick={(e) => { e.stopPropagation(); setEvidenceLanguage('en'); }} className={`lang-pill-btn ${evidenceLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                        <span onClick={(e) => { e.stopPropagation(); setEvidenceLanguage('vi'); }} className={`lang-pill-btn ${evidenceLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
