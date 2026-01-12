
import React, { useState } from 'react';
import { Icon, AINeuralLoader } from '../UI';
import { TABS_CONFIG } from '../../constants';
import { copyToClipboard } from '../../utils';
import { AnalysisResult } from '../../types';
import { useUI } from '../../contexts/UIContext';

interface ReportViewProps {
    finalReportText: string | null;
    setFinalReportText: (text: string) => void;
    isReportLoading: boolean;
    loadingMessage: string;
    templateFileName: string;
    isTemplateProcessing?: boolean;
    handleTemplateUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleGenerateReport: () => void;
    isReadyToSynthesize: boolean;
    onExport: (type: 'report', lang: 'en' | 'vi') => void;
    exportLanguage: 'en' | 'vi';
    setExportLanguage: (lang: 'en' | 'vi') => void;
    analysisResult?: AnalysisResult[] | null; // Passed for Smart Copy Dashboard
}

export const ReportView: React.FC<ReportViewProps> = ({
    finalReportText, setFinalReportText, isReportLoading, loadingMessage,
    templateFileName, isTemplateProcessing = false, handleTemplateUpload, handleGenerateReport,
    isReadyToSynthesize, onExport, exportLanguage, setExportLanguage,
    analysisResult
}) => {
    const themeConfig = TABS_CONFIG.find(t => t.id === 'report')!;
    const { showToast } = useUI();
    const [viewMode, setViewMode] = useState<'text' | 'smart_copy'>('smart_copy');

    const handleCopy = (text: string, label: string) => {
        copyToClipboard(text);
        showToast(`${label} copied!`);
    };

    return (
        <div className="h-full flex flex-col gap-2 md:gap-4 animate-fade-in-up">
            
            {/* Toggle Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('smart_copy')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'smart_copy' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500'}`}
                    >
                        Smart Copy Dashboard
                    </button>
                    <button 
                        onClick={() => setViewMode('text')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'text' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500'}`}
                    >
                        Raw Text Editor
                    </button>
                </div>
            </div>

            <div className={`flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border ${themeConfig.borderClass.replace('border-', 'border-opacity-30 border-')} border-t-4 border-t-${themeConfig.borderClass.replace('border-', '')} dark:border-transparent overflow-hidden flex flex-col dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_4px_6px_-1px_rgba(0,0,0,0.5)] transition-colors duration-500 ease-fluid`}>
                
                {isReportLoading && <AINeuralLoader message={loadingMessage} />}

                {viewMode === 'text' && (
                    <div className="flex-1 relative">
                        <textarea
                            className="w-full h-full p-4 resize-none bg-transparent focus:outline-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-mono"
                            value={finalReportText || ""}
                            onChange={(e) => setFinalReportText(e.target.value)}
                            placeholder="The final synthesized audit report will appear here..."
                        />
                        {!finalReportText && !isReportLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                                <Icon name="FileText" size={48} className="text-slate-300 dark:text-slate-600 mb-2" />
                                <p className="text-sm text-slate-400">Ready to generate report</p>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'smart_copy' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50/50 dark:bg-slate-950/50">
                        {!analysisResult || analysisResult.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <Icon name="LayoutList" size={48} className="text-slate-300 mb-2"/>
                                <p className="text-slate-400 text-sm">No findings available for staging.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {analysisResult.map((res, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                                            <span className="font-mono font-black text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{res.clauseId}</span>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${res.status === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{res.status}</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1 group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Evidence</span>
                                                    <button onClick={() => handleCopy(res.evidence, "Evidence")} className="p-1 rounded hover:bg-indigo-50 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="Copy" size={12}/></button>
                                                </div>
                                                <div className="p-2 bg-gray-50 dark:bg-slate-950 rounded text-xs text-slate-700 dark:text-slate-300 h-20 overflow-y-auto border border-transparent group-hover:border-indigo-200 transition-colors">
                                                    {res.evidence}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-1 group">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Conclusion / Finding</span>
                                                    <button onClick={() => handleCopy(res.reason, "Finding")} className="p-1 rounded hover:bg-indigo-50 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="Copy" size={12}/></button>
                                                </div>
                                                <div className="p-2 bg-gray-50 dark:bg-slate-950 rounded text-xs text-slate-700 dark:text-slate-300 h-20 overflow-y-auto border border-transparent group-hover:border-indigo-200 transition-colors">
                                                    {res.reason}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Bar */}
            <div className="flex-shrink-0 flex flex-row items-center md:justify-end gap-2 md:gap-3 w-full pt-2">
                <label className={`flex-none md:w-auto px-4 h-[52px] border rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 shadow-sm group whitespace-nowrap dark:shadow-md ${templateFileName ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200'}`} title={templateFileName || "Upload Template"}>
                    {isTemplateProcessing ? (
                        <Icon name="Loader" size={20} className="animate-spin text-indigo-500"/>
                    ) : (
                        <Icon name={templateFileName ? "CheckCircle2" : "UploadCloud"} size={20} className={templateFileName ? "text-emerald-500" : ""} />
                    )}
                    
                    <span className="hidden lg:inline">
                        {isTemplateProcessing ? "Processing..." : (templateFileName ? "Template Loaded" : "Upload Template")}
                    </span>
                    <input type="file" accept=".txt,.docx" className="hidden" onChange={handleTemplateUpload} disabled={isTemplateProcessing} />
                </label>

                <button onClick={handleGenerateReport} disabled={!isReadyToSynthesize || isReportLoading} className={`flex-1 md:flex-none md:w-auto md:px-6 h-[52px] rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg whitespace-nowrap ${isReadyToSynthesize && !isReportLoading ? "btn-shrimp text-white active:scale-95 border-indigo-700 hover:shadow-indigo-500/40" : "bg-gray-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-70 cursor-not-allowed border-transparent"}`} title="Synthesize Report">
                    {isReportLoading ? <Icon name="Loader" className="animate-spin text-white" size={20} /> : <Icon name="Wand2" size={20} className="hidden md:block" />}
                    <span className="inline text-xs uppercase tracking-wider">{isReportLoading ? "Synthesizing..." : "Synthesize"}</span>
                </button>

                <button onClick={() => onExport('report', exportLanguage)} disabled={!finalReportText} className="flex-none md:w-auto px-3 md:px-4 h-[52px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-950 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50 whitespace-nowrap dark:shadow-md">
                    <Icon name="Download" />
                    <span className="hidden md:inline">Export</span>
                    <div className="lang-pill-container">
                        <span onClick={(e) => { e.stopPropagation(); setExportLanguage('en'); }} className={`lang-pill-btn ${exportLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                        <span onClick={(e) => { e.stopPropagation(); setExportLanguage('vi'); }} className={`lang-pill-btn ${exportLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
