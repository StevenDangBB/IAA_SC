
import React, { useRef, useEffect } from 'react';
import { Icon } from '../UI';
import { AnalysisResult, FindingStatus, FindingsViewMode } from '../../types';

interface FindingsViewProps {
    analysisResult: AnalysisResult[] | null;
    setAnalysisResult: React.Dispatch<React.SetStateAction<AnalysisResult[] | null>>;
    selectedFindings: Record<string, boolean>;
    setSelectedFindings: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    isAnalyzeLoading: boolean;
    loadingMessage: string;
    currentAnalyzingClause: string;
    viewMode: FindingsViewMode;
    setViewMode: (mode: FindingsViewMode) => void;
    focusedFindingIndex: number;
    setFocusedFindingIndex: (index: number) => void;
    onExport: (type: 'notes', lang: 'en' | 'vi') => void;
    notesLanguage: 'en' | 'vi';
    setNotesLanguage: (lang: 'en' | 'vi') => void;
}

export const FindingsView: React.FC<FindingsViewProps> = ({
    analysisResult, setAnalysisResult, selectedFindings, setSelectedFindings,
    isAnalyzeLoading, loadingMessage, currentAnalyzingClause,
    viewMode, setViewMode, focusedFindingIndex, setFocusedFindingIndex,
    onExport, notesLanguage, setNotesLanguage
}) => {
    const findingsContainerRef = useRef<HTMLDivElement>(null);
    const findingRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (viewMode === 'list' && findingsContainerRef.current) {
            findingsContainerRef.current.scrollTop = findingsContainerRef.current.scrollHeight;
        }
    }, [analysisResult?.length, viewMode]);

    const handleUpdateFinding = (index: number, field: keyof AnalysisResult, value: string) => {
        setAnalysisResult(prev => {
            if (!prev) return null;
            const newArr = [...prev];
            newArr[index] = { ...newArr[index], [field]: value };
            return newArr;
        });
        if (field === 'status' && analysisResult) {
            const nextIndex = index + 1;
            if (nextIndex < analysisResult.length && findingRefs.current[nextIndex]) {
                setTimeout(() => findingRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
        }
    };

    const getFindingColorStyles = (status: FindingStatus) => {
        switch (status) {
            case 'COMPLIANT': return { bg: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', pill: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500', headerText: 'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400' };
            case 'NC_MAJOR': return { bg: 'bg-red-600', text: 'text-red-700 dark:text-red-300', pill: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300', border: 'border-red-600', headerText: 'text-red-600 dark:text-red-400 border-red-600 dark:border-red-400' };
            case 'NC_MINOR': return { bg: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', pill: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300', border: 'border-orange-500', headerText: 'text-orange-500 dark:text-orange-400 border-orange-500 dark:border-orange-400' };
            case 'OFI': return { bg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', border: 'border-blue-500', headerText: 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400' };
            default: return { bg: 'bg-slate-500', text: 'text-slate-600', pill: 'bg-slate-100 text-slate-500', border: 'border-slate-300', headerText: 'text-slate-500 border-slate-300' };
        }
    };

    const renderFindingCard = (res: AnalysisResult, idx: number, isCondensed = false) => {
        const styles = getFindingColorStyles(res.status as FindingStatus);

        return (
            <div
                key={idx}
                ref={!isCondensed ? el => { findingRefs.current[idx] = el; } : null}
                className={`group relative bg-white dark:bg-slate-900 rounded-lg p-3 border-y border-r border-l-[6px] transition-all duration-300 hover:shadow-md dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05)] ${styles.border} ${selectedFindings[res.clauseId] ? 'border-r-indigo-500 ring-1 ring-indigo-500/20' : 'border-r-gray-100 dark:border-r-transparent'} animate-in slide-in-from-bottom-2 fade-in fill-mode-backwards`}
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => setSelectedFindings(prev => ({ ...prev, [res.clauseId]: !prev[res.clauseId] }))}
            >
                <div className="absolute top-3 right-3 z-10">
                    {selectedFindings[res.clauseId] ? (
                        <div className="animate-in zoom-in spin-in-180 duration-300">
                            <Icon name="CheckThick" size={22} className="text-emerald-500 drop-shadow-sm" />
                        </div>
                    ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-slate-700 group-hover:border-indigo-300 transition-colors"></div>
                    )}
                </div>

                <div className="pr-8">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{res.clauseId}</span>
                        <div className="relative group/badge" onClick={e => e.stopPropagation()}>
                            <select
                                value={res.status}
                                onChange={(e) => handleUpdateFinding(idx, 'status', e.target.value)}
                                className={`appearance-none cursor-pointer text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${styles.pill} border-none outline-none hover:brightness-95 text-center transition-all`}
                            >
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="COMPLIANT">COMPLIANT</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="NC_MINOR">MINOR</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="NC_MAJOR">MAJOR</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="OFI">OFI</option>
                            </select>
                        </div>
                        {res.crossRefs && res.crossRefs.length > 0 && (
                            <div className="flex gap-1">
                                {res.crossRefs.map((ref, rIdx) => (
                                    <span key={rIdx} className="text-[8px] border border-indigo-200 dark:border-indigo-800 text-indigo-500 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-mono bg-indigo-50 dark:bg-indigo-900/10">
                                        {ref}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mb-3">
                        <div className="bg-gray-50 dark:bg-slate-950/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                            <strong className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Evidence:</strong>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                {res.evidence}
                            </p>
                        </div>
                    </div>

                    <div className="mb-3">
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors group-focus-within:border-indigo-500 shadow-sm" onClick={e => e.stopPropagation()}>
                            <strong className="block text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Conclusion:</strong>
                            <textarea
                                value={res.reason}
                                onChange={(e) => handleUpdateFinding(idx, 'reason', e.target.value)}
                                className="w-full bg-transparent outline-none text-xs text-slate-800 dark:text-slate-200 leading-relaxed resize-none h-auto min-h-[60px]"
                                placeholder="Enter conclusion..."
                            />
                        </div>
                    </div>

                    {res.suggestion && (
                        <div className="flex gap-1.5 items-start">
                            <Icon name="Lightbulb" size={12} className="text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-tight">{res.suggestion}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-2 md:gap-4 animate-fade-in-up">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1" ref={findingsContainerRef}>
                {!analysisResult && !isAnalyzeLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <Icon name="Wand2" size={48} className="mb-4 text-gray-200 dark:text-slate-700" />
                        <p>No analysis results yet.</p>
                    </div>
                )}
                {isAnalyzeLoading && (
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full opacity-50"></div>
                            <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-4 border-r-4 border-purple-500 rounded-full animate-spin-reverse opacity-70"></div>
                        </div>
                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse mb-2">
                            AI Analysis In Progress
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">{loadingMessage}</p>
                        <p className="text-xs text-slate-400 font-mono">
                            {currentAnalyzingClause && `Processing: [${currentAnalyzingClause}]`}
                        </p>
                    </div>
                )}
                {analysisResult && (
                    viewMode === 'list' ? (
                        <div className="space-y-3">
                            {analysisResult.map((res, idx) => renderFindingCard(res, idx))}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-4">
                            <div className="flex-shrink-0 flex flex-col bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden max-h-[40vh]">
                                <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr] gap-1 p-2 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Clause</div>
                                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">Major</div>
                                    <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest text-center">Minor</div>
                                    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest text-center">OFI</div>
                                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">Comp</div>
                                </div>

                                <div className="overflow-y-auto custom-scrollbar">
                                    {analysisResult.map((item, idx) => {
                                        const isSelected = focusedFindingIndex === idx;
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setFocusedFindingIndex(idx)}
                                                className={`grid grid-cols-[60px_1fr_1fr_1fr_1fr] gap-1 py-1.5 border-b border-gray-100 dark:border-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-white dark:hover:bg-slate-800'}`}
                                            >
                                                <div className={`flex items-center justify-center h-full w-full text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {item.clauseId}
                                                </div>
                                                <div className="flex items-center justify-center h-full w-full">
                                                    {item.status === 'NC_MAJOR' && <div className="w-3 h-3 rounded bg-red-500 shadow-sm ring-1 ring-red-300 dark:ring-red-900"></div>}
                                                </div>
                                                <div className="flex items-center justify-center h-full w-full">
                                                    {item.status === 'NC_MINOR' && <div className="w-3 h-3 rounded bg-orange-500 shadow-sm ring-1 ring-orange-300 dark:ring-orange-900"></div>}
                                                </div>
                                                <div className="flex items-center justify-center h-full w-full">
                                                    {item.status === 'OFI' && <div className="w-3 h-3 rounded bg-blue-500 shadow-sm ring-1 ring-blue-300 dark:ring-blue-900"></div>}
                                                </div>
                                                <div className="flex items-center justify-center h-full w-full">
                                                    {item.status === 'COMPLIANT' && <div className="w-3 h-3 rounded bg-emerald-500 shadow-sm ring-1 ring-emerald-300 dark:ring-emerald-900"></div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-2 shadow-inner">
                                {analysisResult[focusedFindingIndex] ? (
                                    renderFindingCard(analysisResult[focusedFindingIndex], focusedFindingIndex, true)
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Select a row above to view details</div>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>
            <div className="flex-shrink-0 flex flex-row items-center md:justify-end gap-2 md:gap-3 w-full pt-2">
                <div className="flex-1 md:flex-none md:w-auto h-[52px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-1 flex items-center shadow-sm min-w-0 dark:shadow-md">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex-1 md:flex-none md:w-auto h-full px-3 rounded-lg flex items-center justify-center gap-2 transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700 shadow-sm dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                        title="List View"
                    >
                        <Icon name="LayoutList" size={18} />
                        <span className="hidden md:inline text-xs font-bold">List</span>
                    </button>
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`flex-1 md:flex-none md:w-auto h-full px-3 rounded-lg flex items-center justify-center gap-2 transition-all whitespace-nowrap ${viewMode === 'matrix' ? 'bg-indigo-100 text-indigo-700 shadow-sm dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                        title="Matrix View"
                    >
                        <Icon name="Grid" size={18} />
                        <span className="hidden md:inline text-xs font-bold">Matrix</span>
                    </button>
                </div>

                <button onClick={() => onExport('notes', notesLanguage)} disabled={!analysisResult} className="flex-none md:w-auto px-3 md:px-4 h-[52px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50 whitespace-nowrap dark:shadow-md">
                    <Icon name="Download" />
                    <span className="hidden md:inline">Export</span>
                    <div className="lang-pill-container">
                        <span onClick={(e) => { e.stopPropagation(); setNotesLanguage('en'); }} className={`lang-pill-btn ${notesLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                        <span onClick={(e) => { e.stopPropagation(); setNotesLanguage('vi'); }} className={`lang-pill-btn ${notesLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
