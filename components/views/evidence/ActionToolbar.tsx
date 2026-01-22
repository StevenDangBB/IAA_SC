
import React from 'react';
import { Icon, SparkleLoader } from '../../UI';
import { AuditProcess } from '../../../types';

interface ActionToolbarProps {
    toggleListening: () => void;
    isListening: boolean;
    triggerFileUpload: () => void;
    onAnalyze: () => void;
    isReadyForAnalysis: boolean;
    isAnalyzeLoading: boolean;
    // Process Props
    processes: AuditProcess[];
    activeProcessId: string | null;
    setActiveProcessId: (id: string) => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
    toggleListening, isListening, triggerFileUpload,
    onAnalyze, isReadyForAnalysis, isAnalyzeLoading,
    processes, activeProcessId, setActiveProcessId
}) => {
    return (
        <div className="flex-shrink-0 flex items-center gap-3 min-h-[52px]">
            
            {/* 1. PROCESS SELECTOR */}
            <div className="relative group min-w-[180px] max-w-[240px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                    <Icon name="Session11_GridAdd" size={16}/>
                </div>
                <select 
                    value={activeProcessId || ""} 
                    onChange={(e) => setActiveProcessId(e.target.value)}
                    className="w-full h-[48px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl pl-9 pr-8 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none shadow-sm hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    title="Switch active process"
                >
                    {processes.length === 0 && <option value="">No Processes</option>}
                    {processes.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Icon name="ChevronDown" size={12}/>
                </div>
            </div>

            {/* 2. RIGHT ACTIONS */}
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
