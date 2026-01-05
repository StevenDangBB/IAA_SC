
import React from 'react';
import { Icon, AINeuralLoader } from '../UI';

interface ReportViewProps {
    finalReportText: string | null;
    setFinalReportText: (text: string) => void;
    isReportLoading: boolean;
    loadingMessage: string;
    templateFileName: string;
    handleTemplateUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleGenerateReport: () => void;
    isReadyToSynthesize: boolean;
    onExport: (type: 'report', lang: 'en' | 'vi') => void;
    exportLanguage: 'en' | 'vi';
    setExportLanguage: (lang: 'en' | 'vi') => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
    finalReportText, setFinalReportText, isReportLoading, loadingMessage,
    templateFileName, handleTemplateUpload, handleGenerateReport,
    isReadyToSynthesize, onExport, exportLanguage, setExportLanguage
}) => {
    return (
        <div className="h-full flex flex-col gap-2 md:gap-4 animate-fade-in-up">
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-transparent overflow-hidden flex flex-col dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_4px_6px_-1px_rgba(0,0,0,0.5)]">
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
                    {isReportLoading && <AINeuralLoader message={loadingMessage} />}
                </div>
            </div>
            <div className="flex-shrink-0 flex flex-row items-center md:justify-end gap-2 md:gap-3 w-full pt-2">
                <label className="flex-none w-[52px] md:w-auto px-0 md:px-4 h-[52px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-95 shadow-sm group whitespace-nowrap dark:shadow-md" title={templateFileName || "Upload Template"}>
                    <Icon name="UploadCloud" size={20} className={templateFileName ? "text-emerald-500" : ""} />
                    <span className="hidden lg:inline">{templateFileName ? "Template Loaded" : "Upload Template"}</span>
                    <input type="file" accept=".txt,.docx" className="hidden" onChange={handleTemplateUpload} />
                </label>

                <button onClick={handleGenerateReport} disabled={!isReadyToSynthesize} className={`flex-1 md:flex-none md:w-auto md:px-6 h-[52px] rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg whitespace-nowrap ${isReadyToSynthesize ? "btn-shrimp text-white active:scale-95 border-indigo-700" : "bg-gray-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 opacity-70 cursor-not-allowed border-transparent"}`} title="Synthesize Report">
                    {isReportLoading ? <Icon name="Loader" className="animate-spin text-white" size={20} /> : <Icon name="Wand2" size={20} className="hidden md:block" />}
                    <span className="inline text-xs uppercase tracking-wider">Synthesize</span>
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
