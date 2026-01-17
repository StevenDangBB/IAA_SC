
import React from 'react';
import { Icon, SparkleLoader } from '../../UI';
import { UploadedFile } from '../../../types';

interface ActionToolbarProps {
    uploadedFiles: UploadedFile[];
    onOcrProcess: () => void;
    isOcrLoading: boolean;
    isProcessing: boolean;
    toggleListening: () => void;
    isListening: boolean;
    triggerFileUpload: () => void;
    onAnalyze: () => void;
    isReadyForAnalysis: boolean;
    isAnalyzeLoading: boolean;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
    uploadedFiles, onOcrProcess, isOcrLoading, isProcessing,
    toggleListening, isListening, triggerFileUpload,
    onAnalyze, isReadyForAnalysis, isAnalyzeLoading
}) => {
    return (
        <div className="flex-shrink-0 flex items-end gap-3 min-h-[52px]">
            {/* File Queue */}
            {uploadedFiles.length > 0 && (
                <div className="flex-1 flex gap-2 overflow-x-auto custom-scrollbar bg-gray-50 dark:bg-slate-900 p-1.5 rounded-xl border border-gray-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                    {uploadedFiles.map((fileEntry) => (
                        <div key={fileEntry.id} className="relative group w-10 h-10 flex-shrink-0 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-transform hover:scale-105">
                            <Icon name="FileText" size={16} className="text-indigo-500"/>
                            {fileEntry.status === 'processing' && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Icon name="Loader" size={14} className="animate-spin text-indigo-600"/></div>}
                            {fileEntry.status === 'success' && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping-once"></div>}
                        </div>
                    ))}
                    <button 
                        onClick={onOcrProcess} 
                        disabled={(isOcrLoading || isProcessing)} 
                        className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        Process {uploadedFiles.filter(f => f.status === 'pending').length}
                    </button>
                </div>
            )}

            <div className="flex gap-2 ml-auto">
                <button
                    onClick={toggleListening}
                    className={`px-4 h-[48px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm border active:scale-95 ${isListening ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-indigo-500'}`}
                >
                    <Icon name="Mic" size={18} />
                    <span className="hidden md:inline">{isListening ? "Recording..." : "Dictate"}</span>
                </button>

                <button 
                    onClick={triggerFileUpload} 
                    className="px-4 h-[48px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                    <Icon name="UploadCloud" size={18} />
                    <span className="hidden md:inline">Upload</span>
                </button>

                <button 
                    onClick={onAnalyze} 
                    disabled={!isReadyForAnalysis} 
                    className={`px-6 h-[48px] rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${isReadyForAnalysis ? "btn-shrimp text-white active:scale-95 hover:shadow-indigo-500/40" : "bg-gray-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"}`}
                >
                    {isAnalyzeLoading ? <SparkleLoader className="text-white" /> : <Icon name="Wand2" size={18}/>}
                    <span>Analyze</span>
                </button>
            </div>
        </div>
    );
};