
import React, { useRef, useState } from 'react';
import { Icon, SparkleLoader } from '../UI';
import { UploadedFile } from '../../App'; // We will export this type from App or Types
import { fileToBase64 } from '../../utils';

interface EvidenceViewProps {
    evidence: string;
    setEvidence: (text: string) => void;
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
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
    evidence, setEvidence, uploadedFiles, setUploadedFiles,
    onOcrProcess, isOcrLoading, onAnalyze, isReadyForAnalysis,
    isAnalyzeLoading, analyzeTooltip, onExport, evidenceLanguage, setEvidenceLanguage,
    textareaRef
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processNewFiles = (files: File[]) => {
        const newFiles = files.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            status: 'pending' as const
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
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
            <div className="flex-1 flex flex-col gap-2 md:gap-4 min-h-0">
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
                        className="flex-1 w-full h-full p-4 pb-6 bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-300 font-medium text-sm leading-relaxed text-justify break-words whitespace-pre-wrap"
                        placeholder="Paste audit evidence here or drag files (Images, PDF, TXT) directly..."
                        value={evidence}
                        onChange={(e) => setEvidence(e.target.value)}
                        onPaste={handlePaste}
                    />
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
            <div className="flex-shrink-0 flex flex-row items-center md:justify-end gap-2 md:gap-3 w-full pt-2">
                <div className="flex-none w-[52px] md:w-auto">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,text/plain" multiple onChange={(e) => e.target.files && processNewFiles(Array.from(e.target.files))} />
                    <button onClick={() => fileInputRef.current?.click()} className={`w-full h-[52px] md:w-auto md:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm border whitespace-nowrap ${uploadedFiles.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'}`} title="Upload Files">
                        <Icon name={uploadedFiles.length > 0 ? "Demo1_MultiFiles" : "Demo8_GridPlus"} size={20} />
                        <span className="hidden md:inline">Upload</span>
                    </button>
                </div>

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
