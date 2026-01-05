
import React from 'react';
import { Icon } from '../UI';

export interface ExportState {
    isOpen: boolean;
    isPaused: boolean;
    isFinished: boolean;
    totalChunks: number;
    processedChunksCount: number;
    chunks: string[];
    results: string[];
    error: string | null;
    currentType: 'notes' | 'report' | 'evidence';
    targetLang: 'en' | 'vi';
}

interface ExportProgressModalProps {
    exportState: ExportState;
    setExportState: React.Dispatch<React.SetStateAction<ExportState>>;
    rescueKey: string;
    setRescueKey: (val: string) => void;
    handleResumeExport: () => void;
    isRescuing: boolean;
    onClose: () => void; // Added onClose prop
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
    exportState, setExportState, rescueKey, setRescueKey, handleResumeExport, isRescuing, onClose
}) => {
    if (!exportState.isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 p-6 animate-zoom-in-spring">
                {/* Header */}
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                    {exportState.isFinished ? <Icon name="CheckCircle2" className="text-emerald-500" size={24} /> : <Icon name="Loader" className="animate-spin text-indigo-500" size={24} />}
                    {exportState.isFinished ? "Export Complete" : "Processing Export..."}
                </h3>

                {/* Error Handling State */}
                {exportState.error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 mb-4 animate-shake">
                        <p className="text-sm text-red-600 dark:text-red-400 font-bold mb-2 flex items-center gap-2">
                            <Icon name="AlertCircle" size={16} /> Process Paused: Limit Reached
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                            Your existing API keys have hit their quota limits. Add a backup key to resume immediately without losing progress.
                        </p>
                        <input
                            type="password"
                            placeholder="Paste Emergency Google AI Key..."
                            className="w-full p-2 text-xs rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-950 mb-3 outline-none focus:border-red-500"
                            value={rescueKey}
                            onChange={(e) => setRescueKey(e.target.value)}
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setExportState(prev => ({ ...prev, isOpen: false }))} className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleResumeExport} disabled={isRescuing || !rescueKey.trim()} className="px-3 py-2 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100">
                                {isRescuing ? <Icon name="Loader" className="animate-spin" size={12} /> : <Icon name="Zap" size={12} />}
                                Rescue & Resume
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Progress Bar State */
                    <div className="space-y-5">
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200 dark:text-indigo-200 dark:bg-indigo-900/50">
                                        {exportState.isFinished ? "Done" : "Translating"}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                                        {Math.round((exportState.processedChunksCount / Math.max(exportState.totalChunks, 1)) * 100)}%
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100 dark:bg-slate-800">
                                <div
                                    style={{ width: `${Math.round((exportState.processedChunksCount / Math.max(exportState.totalChunks, 1)) * 100)}%` }}
                                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ease-out ${exportState.isFinished ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                ></div>
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            {exportState.isFinished ? (
                                <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">
                                    File has been downloaded successfully.
                                </p>
                            ) : (
                                <>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                        Processing Chunk {Math.min(exportState.processedChunksCount + 1, exportState.totalChunks)} of {exportState.totalChunks}
                                    </p>
                                    <p className="text-[10px] text-slate-400 italic">
                                        Target Language: {exportState.targetLang === 'vi' ? 'Vietnamese' : 'English'}
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Close Button for Success State */}
                        {exportState.isFinished && (
                            <div className="flex justify-center pt-2">
                                <button 
                                    onClick={onClose}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <Icon name="X" size={16}/>
                                    Close Window
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
