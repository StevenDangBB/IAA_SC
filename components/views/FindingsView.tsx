
import React, { useRef, useEffect, useState } from 'react';
import { Icon } from '../UI';
import { AnalysisResult, FindingStatus, FindingsViewMode } from '../../types';
import { TABS_CONFIG } from '../../constants';
import { performShadowReview } from '../../services/geminiService';
import { useKeyPool } from '../../contexts/KeyPoolContext';
import { useUI } from '../../contexts/UIContext';

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
    const { getActiveKey } = useKeyPool();
    const { showToast } = useUI();
    
    // Local state for Shadow Review
    const [reviewLoading, setReviewLoading] = useState<string | null>(null); // Clause ID
    const [reviews, setReviews] = useState<Record<string, string>>({});

    const themeConfig = TABS_CONFIG.find(t => t.id === 'findings')!;

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
        // Auto-scroll only on status change, not text editing
        if (field === 'status' && analysisResult) {
            const nextIndex = index + 1;
            if (nextIndex < analysisResult.length && findingRefs.current[nextIndex]) {
                setTimeout(() => findingRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
        }
    };

    const handleShadowReview = async (e: React.MouseEvent, finding: AnalysisResult) => {
        e.stopPropagation();
        const keyProfile = getActiveKey();
        if (!keyProfile) return showToast("API Key Required for Review");
        
        setReviewLoading(finding.clauseId);
        try {
            const critique = await performShadowReview(finding, keyProfile.key, keyProfile.activeModel);
            setReviews(prev => ({ ...prev, [finding.clauseId]: critique }));
        } catch (err) {
            showToast("Review Failed");
        } finally {
            setReviewLoading(null);
        }
    };

    const getFindingColorStyles = (status: FindingStatus) => {
        switch (status) {
            case 'COMPLIANT': return { bg: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', pill: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500' };
            case 'NC_MAJOR': return { bg: 'bg-red-600', text: 'text-red-700 dark:text-red-300', pill: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300', border: 'border-red-600' };
            case 'NC_MINOR': return { bg: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', pill: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300', border: 'border-orange-500' };
            case 'OFI': return { bg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', border: 'border-blue-500' };
            default: return { bg: 'bg-slate-500', text: 'text-slate-600', pill: 'bg-slate-100 text-slate-500', border: 'border-slate-300' };
        }
    };

    const renderFindingCard = (res: AnalysisResult, idx: number, isCondensed = false) => {
        const styles = getFindingColorStyles(res.status as FindingStatus);
        const reviewText = reviews[res.clauseId];
        const isReviewing = reviewLoading === res.clauseId;

        return (
            <div
                key={idx}
                ref={!isCondensed ? el => { findingRefs.current[idx] = el; } : null}
                className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-5 border-l-[6px] transition-all duration-300 hover:shadow-depth-lg dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05)] ${styles.border} ${selectedFindings[res.clauseId] ? 'ring-2 ring-indigo-500/20 translate-x-2' : 'hover:translate-x-1'} animate-in slide-in-from-bottom-2 fade-in fill-mode-backwards`}
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => setSelectedFindings(prev => ({ ...prev, [res.clauseId]: !prev[res.clauseId] }))}
            >
                {/* Header Controls */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button 
                        onClick={(e) => handleShadowReview(e, res)}
                        disabled={isReviewing}
                        className={`p-1.5 rounded-full transition-all border ${reviewText ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-gray-100 text-slate-400 hover:text-purple-600 hover:bg-purple-50 border-transparent'}`}
                        title="AI Shadow Review (Critique Finding)"
                    >
                        {isReviewing ? <Icon name="Loader" className="animate-spin" size={14}/> : <Icon name="ShieldEye" size={14}/>}
                    </button>
                    {selectedFindings[res.clauseId] ? (
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full p-1 text-emerald-600 dark:text-emerald-400">
                            <Icon name="CheckThick" size={18} />
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-slate-700 group-hover:border-indigo-400 transition-colors"></div>
                    )}
                </div>

                <div className="pr-12">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700">{res.clauseId}</span>
                        <div className="relative group/badge" onClick={e => e.stopPropagation()}>
                            <select
                                value={res.status}
                                onChange={(e) => handleUpdateFinding(idx, 'status', e.target.value)}
                                className={`appearance-none cursor-pointer text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${styles.pill} border-none outline-none hover:brightness-95 text-center transition-all shadow-sm`}
                            >
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="COMPLIANT">COMPLIANT</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="NC_MINOR">MINOR NC</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="NC_MAJOR">MAJOR NC</option>
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="OFI">OFI</option>
                            </select>
                        </div>
                    </div>

                    {/* EDITABLE EVIDENCE SECTION */}
                    <div className="mb-4 group/evidence">
                        <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative transition-colors focus-within:border-indigo-300 dark:focus-within:border-indigo-700 focus-within:ring-1 focus-within:ring-indigo-500/20" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-2">
                                <strong className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Verified Evidence</strong>
                                <span className="text-[9px] text-slate-400 opacity-0 group-hover/evidence:opacity-100 transition-opacity flex items-center gap-1">
                                    <Icon name="FileEdit" size={10}/> Editable (Raw Data)
                                </span>
                            </div>
                            
                            <textarea
                                value={res.evidence}
                                onChange={(e) => handleUpdateFinding(idx, 'evidence', e.target.value)}
                                className="w-full bg-transparent outline-none text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium resize-y min-h-[80px] whitespace-pre-wrap font-mono custom-scrollbar border-l-2 border-transparent focus:border-indigo-400 pl-2 transition-all"
                                placeholder="Evidence content..."
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors group-focus-within:border-indigo-500 shadow-sm" onClick={e => e.stopPropagation()}>
                            <strong className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1 block">Auditor Conclusion</strong>
                            <textarea
                                value={res.reason}
                                onChange={(e) => handleUpdateFinding(idx, 'reason', e.target.value)}
                                className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed resize-none h-auto min-h-[60px]"
                                placeholder="Enter conclusion..."
                            />
                        </div>
                    </div>

                    {/* Shadow Review Result */}
                    {reviewText && (
                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 rounded-r-lg animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="ShieldEye" size={12} className="text-purple-600"/>
                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">AI Reviewer Note</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">"{reviewText}"</p>
                        </div>
                    )}

                    {res.suggestion && !reviewText && (
                        <div className="flex gap-2 items-start mt-3 opacity-80 group-hover:opacity-100 transition-opacity">
                            <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400 shrink-0">
                                <Icon name="Lightbulb" size={10} />
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-tight pt-0.5">{res.suggestion}</p>
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
                        <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-4 animate-pulse-slow">
                            <Icon name="Wand2" size={48} className="text-indigo-300 dark:text-indigo-600" />
                        </div>
                        <p className="font-bold">No analysis results yet.</p>
                        <p className="text-xs mt-2">Run analysis from the Audit tab to generate findings.</p>
                    </div>
                )}
                
                {isAnalyzeLoading && (
                    <div className="h-full flex flex-col items-center justify-center">
                        {/* Loading State UI kept same as before */}
                        <div className="relative w-28 h-28 mb-8">
                            <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full opacity-50"></div>
                            <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-4 border-r-4 border-purple-500 rounded-full animate-spin-reverse opacity-70"></div>
                            <div className="absolute inset-0 flex items-center justify-center"><Icon name="BrainCircuit" size={32} className="text-indigo-500 animate-pulse"/></div>
                        </div>
                        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse mb-3">AI Auditor Working</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1 bg-white/50 dark:bg-slate-800/50 px-4 py-1 rounded-full shadow-sm">{loadingMessage}</p>
                        <p className="text-xs text-slate-400 font-mono mt-2 opacity-80">{currentAnalyzingClause && `Analyzing Clause: [${currentAnalyzingClause}]`}</p>
                    </div>
                )}

                {analysisResult && (
                    viewMode === 'list' ? (
                        <div className="space-y-4 pb-10">
                            {analysisResult.map((res, idx) => renderFindingCard(res, idx))}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-4">
                            {/* Matrix Header - THEMED BORDER */}
                            <div className={`flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border ${themeConfig.borderClass.replace('border-', 'border-opacity-30 border-')} border-t-4 border-t-${themeConfig.borderClass.replace('border-', '')} dark:border-slate-800 overflow-hidden shadow-depth`}>
                                <div className={`grid grid-cols-[60px_1fr_1fr_1fr_1fr] gap-1 p-3 border-b border-gray-100 dark:border-slate-800 ${themeConfig.bgSoft} sticky top-0 z-10 transition-colors duration-500 ease-fluid`}>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Clause</div>
                                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">Major</div>
                                    <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest text-center">Minor</div>
                                    <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest text-center">OFI</div>
                                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">Comp</div>
                                </div>
                                <div className="overflow-y-auto custom-scrollbar max-h-[40vh]">
                                    {analysisResult.map((item, idx) => {
                                        const isSelected = focusedFindingIndex === idx;
                                        return (
                                            <div key={idx} onClick={() => setFocusedFindingIndex(idx)} className={`grid grid-cols-[60px_1fr_1fr_1fr_1fr] gap-1 py-2 border-b border-gray-50 dark:border-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                                <div className={`flex items-center justify-center h-full w-full text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{item.clauseId}</div>
                                                <div className="flex items-center justify-center h-full w-full">{item.status === 'NC_MAJOR' && <div className="w-4 h-4 rounded bg-red-500 shadow-md ring-2 ring-white dark:ring-slate-900"></div>}</div>
                                                <div className="flex items-center justify-center h-full w-full">{item.status === 'NC_MINOR' && <div className="w-4 h-4 rounded bg-orange-500 shadow-md ring-2 ring-white dark:ring-slate-900"></div>}</div>
                                                <div className="flex items-center justify-center h-full w-full">{item.status === 'OFI' && <div className="w-4 h-4 rounded bg-blue-500 shadow-md ring-2 ring-white dark:ring-slate-900"></div>}</div>
                                                <div className="flex items-center justify-center h-full w-full">{item.status === 'COMPLIANT' && <div className="w-4 h-4 rounded bg-emerald-500 shadow-md ring-2 ring-white dark:ring-slate-900"></div>}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* Detail Panel */}
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 p-2 shadow-inner">
                                {analysisResult[focusedFindingIndex] ? renderFindingCard(analysisResult[focusedFindingIndex], focusedFindingIndex, true) : <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Select a row above to view details</div>}
                            </div>
                        </div>
                    )
                )}
            </div>
            {/* Toolbar kept same as before */}
            <div className="flex-shrink-0 flex flex-row items-center md:justify-end gap-2 md:gap-3 w-full pt-2">
                <div className="flex-1 md:flex-none md:w-auto h-[52px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-1 flex items-center shadow-sm min-w-0 dark:shadow-md">
                    <button onClick={() => setViewMode('list')} className={`flex-1 md:flex-none md:w-auto h-full px-4 rounded-lg flex items-center justify-center gap-2 transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`} title="List View"><Icon name="LayoutList" size={18} /><span className="hidden md:inline text-xs font-bold">List</span></button>
                    <button onClick={() => setViewMode('matrix')} className={`flex-1 md:flex-none md:w-auto h-full px-4 rounded-lg flex items-center justify-center gap-2 transition-all whitespace-nowrap ${viewMode === 'matrix' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`} title="Matrix View"><Icon name="Grid" size={18} /><span className="hidden md:inline text-xs font-bold">Matrix</span></button>
                </div>
                <button onClick={() => onExport('notes', notesLanguage)} disabled={!analysisResult} className="flex-none md:w-auto px-6 h-[52px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm disabled:opacity-50 whitespace-nowrap dark:shadow-md hover:shadow-lg">
                    <Icon name="Download" />
                    <span className="hidden md:inline">Export Findings</span>
                    <div className="lang-pill-container">
                        <span onClick={(e) => { e.stopPropagation(); setNotesLanguage('en'); }} className={`lang-pill-btn ${notesLanguage === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                        <span onClick={(e) => { e.stopPropagation(); setNotesLanguage('vi'); }} className={`lang-pill-btn ${notesLanguage === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
