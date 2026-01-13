
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Icon } from '../UI';
import { AnalysisResult, FindingStatus, FindingsViewMode } from '../../types';
import { TABS_CONFIG } from '../../constants';
import { performShadowReview, generateAnalysis, translateChunk } from '../../services/geminiService';
import { useKeyPool } from '../../contexts/KeyPoolContext';
import { useUI } from '../../contexts/UIContext';
import { useAudit } from '../../contexts/AuditContext';

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
    progressPercent?: number; // Added
    analysisLogs?: string[]; // Added
}

export const FindingsView: React.FC<FindingsViewProps> = ({
    analysisResult, setAnalysisResult, selectedFindings, setSelectedFindings,
    isAnalyzeLoading, loadingMessage, currentAnalyzingClause,
    viewMode, setViewMode, focusedFindingIndex, setFocusedFindingIndex,
    onExport, notesLanguage, setNotesLanguage, progressPercent = 0, analysisLogs = []
}) => {
    const findingsContainerRef = useRef<HTMLDivElement>(null);
    const findingRefs = useRef<(HTMLDivElement | null)[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    
    // Contexts
    const { getActiveKey } = useKeyPool();
    const { showToast } = useUI();
    const { standards, standardKey, privacySettings } = useAudit();
    
    // Local state for Shadow Review
    const [reviewLoading, setReviewLoading] = useState<string | null>(null); // Clause ID
    const [reviews, setReviews] = useState<Record<string, string>>({});
    
    // Local state for Re-Analysis (Single Clause)
    const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
    const [translatingId, setTranslatingId] = useState<string | null>(null);

    // Grouping State
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    // UI State for Evidence Expansion
    const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
    
    // Matrix Visibility State
    const [isMatrixCollapsed, setIsMatrixCollapsed] = useState(false);

    const themeConfig = TABS_CONFIG.find(t => t.id === 'findings')!;

    useEffect(() => {
        if (viewMode === 'list' && findingsContainerRef.current) {
            findingsContainerRef.current.scrollTop = findingsContainerRef.current.scrollHeight;
        }
    }, [analysisResult?.length, viewMode]);

    // Auto-scroll logs
    useEffect(() => {
        if (isAnalyzeLoading && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [analysisLogs, isAnalyzeLoading]);

    // Computed: Are all visible items selected?
    const isAllSelected = useMemo(() => {
        if (!analysisResult || analysisResult.length === 0) return false;
        return analysisResult.every(res => selectedFindings[res.clauseId]);
    }, [analysisResult, selectedFindings]);

    // Computed: Group Findings by Process
    const groupedFindings = useMemo((): Record<string, { finding: AnalysisResult, originalIndex: number }[]> => {
        if (!analysisResult) return {};
        const groups: Record<string, { finding: AnalysisResult, originalIndex: number }[]> = {};
        
        analysisResult.forEach((finding, index) => {
            const processName = finding.processName || "General Audit";
            if (!groups[processName]) {
                groups[processName] = [];
            }
            groups[processName].push({ finding, originalIndex: index });
        });
        
        // Sort keys to ensure consistent order
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as typeof groups);
    }, [analysisResult]);

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) next.delete(groupName);
            else next.add(groupName);
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (!analysisResult) return;
        const newSelection: Record<string, boolean> = {};
        const targetState = !isAllSelected;
        
        analysisResult.forEach(res => {
            newSelection[res.clauseId] = targetState;
        });
        
        setSelectedFindings(prev => ({ ...prev, ...newSelection }));
        showToast(targetState ? "All Findings Selected" : "All Findings Deselected");
    };

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

    // --- RE-EVALUATION LOGIC ---
    const handleReAnalyze = async (index: number, finding: AnalysisResult) => {
        const keyProfile = getActiveKey();
        if (!keyProfile) return showToast("API Key Required");
        if (!standardKey || !standards[standardKey]) return showToast("Standard context missing");

        setReanalyzingId(finding.clauseId);
        
        try {
            // 1. Find Clause Data
            const currentStd = standards[standardKey];
            const findClauseData = (id: string) => {
                const traverse = (list: any[]): any => {
                    for (const c of list) {
                        if (c.id === id || c.code === id) return c;
                        if (c.subClauses) {
                            const found = traverse(c.subClauses);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                for (const g of currentStd.groups) {
                    const found = traverse(g.clauses);
                    if (found) return found;
                }
                return null;
            };

            const clauseData = findClauseData(finding.clauseId);
            if (!clauseData) throw new Error("Clause definition not found");

            // 2. Call AI with Updated Evidence
            const resultJson = await generateAnalysis(
                { code: clauseData.code, title: clauseData.title, description: clauseData.description },
                currentStd.name,
                finding.evidence, // Use the potentially EDITED evidence
                "", // No tags context needed for re-eval, user input is truth
                keyProfile.key,
                keyProfile.activeModel,
                privacySettings.maskCompany
            );

            const parsed = JSON.parse(resultJson);

            // 3. Update State (Merge Result)
            setAnalysisResult(prev => {
                if (!prev) return null;
                const newArr = [...prev];
                // Keep the edited evidence, update status/reason/suggestion
                newArr[index] = { 
                    ...newArr[index], 
                    status: parsed.status,
                    reason: parsed.reason,
                    reason_en: parsed.reason_en,
                    reason_vi: parsed.reason_vi,
                    suggestion: parsed.suggestion,
                    conclusion_report: parsed.conclusion_report
                };
                return newArr;
            });
            showToast("Finding Re-evaluated Successfully");

        } catch (error: any) {
            console.error(error);
            showToast("Re-evaluation Failed: " + error.message);
        } finally {
            setReanalyzingId(null);
        }
    };

    // --- INSTANT TRANSLATION LOGIC ---
    const handleTranslateReason = async (index: number, finding: AnalysisResult) => {
        const keyProfile = getActiveKey();
        if (!keyProfile) return showToast("API Key Required");
        
        setTranslatingId(finding.clauseId);
        try {
            const targetLang = notesLanguage;
            const textToTranslate = finding.reason || "";
            if(!textToTranslate) return;

            const translated = await translateChunk(textToTranslate, targetLang, keyProfile.key);
            
            setAnalysisResult(prev => {
                if (!prev) return null;
                const newArr = [...prev];
                // Save to the appropriate field
                if(targetLang === 'vi') newArr[index] = { ...newArr[index], reason_vi: translated };
                else newArr[index] = { ...newArr[index], reason_en: translated };
                return newArr;
            });
            showToast("Translation complete.");
        } catch(e) {
            showToast("Translation failed.");
        } finally {
            setTranslatingId(null);
        }
    };

    const getFindingColorStyles = (status: FindingStatus) => {
        switch (status) {
            case 'COMPLIANT': return { bg: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', pill: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500' };
            case 'NC_MAJOR': return { bg: 'bg-red-600', text: 'text-red-700 dark:text-red-300', pill: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300', border: 'border-red-600' };
            case 'NC_MINOR': return { bg: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', pill: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400', border: 'border-orange-500' };
            case 'OFI': return { bg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', pill: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', border: 'border-blue-500' };
            default: return { bg: 'bg-slate-500', text: 'text-slate-600', pill: 'bg-slate-100 text-slate-500', border: 'border-slate-300' };
        }
    };

    const renderFindingCard = (res: AnalysisResult, idx: number, isCondensed = false) => {
        const styles = getFindingColorStyles(res.status as FindingStatus);
        const reviewText = reviews[res.clauseId];
        const isReviewing = reviewLoading === res.clauseId;
        const isReanalyzing = reanalyzingId === res.clauseId;
        const isTranslating = translatingId === res.clauseId;
        const isEvidenceExpanded = expandedEvidence[res.clauseId] || false;

        // Determine displayed reason text based on language preference
        let displayReason = res.reason;
        const hasVi = !!res.reason_vi;
        const hasEn = !!res.reason_en;
        
        if (notesLanguage === 'vi') {
            displayReason = res.reason_vi || res.reason; 
        } else {
            displayReason = res.reason_en || res.reason;
        }

        // Check if we need to offer translation (e.g. user wants VI but we only have default/EN)
        const showTranslateBtn = (notesLanguage === 'vi' && !hasVi) || (notesLanguage === 'en' && !hasEn && !res.reason.match(/^[A-Za-z]/)); 

        return (
            <div
                key={idx}
                ref={!isCondensed ? el => { findingRefs.current[idx] = el; } : null}
                className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-5 border-l-[6px] transition-all duration-300 hover:shadow-depth-lg dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05)] ${styles.border} ${selectedFindings[res.clauseId] ? 'ring-2 ring-indigo-500/20 translate-x-2' : 'hover:translate-x-1 opacity-95 hover:opacity-100'} animate-in slide-in-from-bottom-2 fade-in fill-mode-backwards`}
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
                        {res.processName && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
                                <Icon name="Session11_GridAdd" size={10} /> {res.processName}
                            </span>
                        )}
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

                    {/* COLLAPSIBLE EVIDENCE SECTION */}
                    <div className="mb-4 group/evidence relative">
                        {isReanalyzing && (
                            <div className="absolute inset-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
                                <div className="flex flex-col items-center">
                                    <Icon name="Loader" className="animate-spin text-indigo-500 mb-2" size={24}/>
                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">Re-evaluating based on updates...</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative transition-colors focus-within:border-indigo-300 dark:focus-within:border-indigo-700 focus-within:ring-1 focus-within:ring-indigo-500/20" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-2">
                                <div 
                                    className="flex items-center gap-2 cursor-pointer select-none" 
                                    onClick={() => setExpandedEvidence(prev => ({...prev, [res.clauseId]: !prev[res.clauseId]}))}
                                >
                                    <Icon name={isEvidenceExpanded ? "ChevronDown" : "ChevronRight"} size={12} className="text-indigo-500"/>
                                    <strong className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Verified Evidence</strong>
                                    {!isEvidenceExpanded && <span className="text-[9px] text-slate-400 font-mono">({res.evidence.length} chars)</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleReAnalyze(idx, res); }}
                                        className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded text-[9px] font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors flex items-center gap-1 opacity-0 group-hover/evidence:opacity-100 focus:opacity-100"
                                        title="Re-run AI Analysis for ONLY this clause based on updated evidence"
                                    >
                                        <Icon name="RefreshCw" size={10}/> Re-evaluate
                                    </button>
                                </div>
                            </div>
                            
                            {isEvidenceExpanded ? (
                                <textarea
                                    value={res.evidence}
                                    onChange={(e) => handleUpdateFinding(idx, 'evidence', e.target.value)}
                                    className="w-full bg-transparent outline-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium resize-y min-h-[150px] whitespace-pre-wrap font-mono custom-scrollbar border-l-2 border-transparent focus:border-indigo-400 pl-2 transition-all"
                                    placeholder="Evidence content..."
                                    spellCheck={false}
                                    disabled={isReanalyzing}
                                />
                            ) : (
                                <div 
                                    className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 cursor-pointer font-mono opacity-80 hover:opacity-100"
                                    onClick={() => setExpandedEvidence(prev => ({...prev, [res.clauseId]: true}))}
                                >
                                    {res.evidence || "No evidence recorded."}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-colors group-focus-within:border-indigo-500 shadow-sm relative" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-1">
                                <strong className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Auditor Conclusion ({notesLanguage.toUpperCase()})</strong>
                                {showTranslateBtn && (
                                    <button 
                                        onClick={() => handleTranslateReason(idx, res)}
                                        disabled={isTranslating}
                                        className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded transition-all active:scale-95"
                                    >
                                        {isTranslating ? <Icon name="Loader" className="animate-spin" size={10}/> : <Icon name="Globe" size={10}/>}
                                        Translate to {notesLanguage.toUpperCase()}
                                    </button>
                                )}
                            </div>
                            
                            {isReanalyzing || isTranslating ? (
                                <div className="h-[60px] w-full bg-slate-50 dark:bg-slate-800 animate-pulse rounded"></div>
                            ) : (
                                <textarea
                                    value={displayReason}
                                    onChange={(e) => {
                                        // When editing, update the field corresponding to CURRENT view language
                                        const field = notesLanguage === 'vi' ? 'reason_vi' : 'reason_en';
                                        handleUpdateFinding(idx, field, e.target.value);
                                        // Also update main 'reason' if it's the first edit to keep sync or just keep them separate?
                                        if (notesLanguage === 'en') handleUpdateFinding(idx, 'reason', e.target.value);
                                    }}
                                    className="w-full bg-transparent outline-none text-base text-slate-800 dark:text-slate-200 leading-relaxed resize-none h-auto min-h-[60px]"
                                    placeholder={`Enter conclusion in ${notesLanguage === 'vi' ? 'Vietnamese' : 'English'}...`}
                                />
                            )}
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
        <div className="h-full flex flex-col gap-2 md:gap-4 animate-fade-in-up relative">
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
                
                {/* --- NEURAL DASHBOARD OVERLAY (Matches ReportView Style) --- */}
                {isAnalyzeLoading && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 rounded-3xl border border-white/20 dark:border-slate-800">
                        <div className="w-full max-w-lg space-y-6">
                            {/* Header */}
                            <div className="flex flex-col items-center">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 border-4 border-indigo-100 dark:border-slate-700 rounded-full"></div>
                                    <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
                                    <Icon name="Wand2" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={24}/>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white animate-pulse">{loadingMessage || "AI Auditor Analysis"}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">{progressPercent}% Complete</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out" 
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>

                            {/* Console Log */}
                            <div className="w-full h-40 bg-black/5 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-slate-800 p-4 font-mono text-xs overflow-y-auto custom-scrollbar shadow-inner">
                                {analysisLogs.map((log, idx) => (
                                    <div key={idx} className="mb-1 text-slate-600 dark:text-slate-400 flex gap-2">
                                        <span className="text-indigo-400 select-none">&gt;</span>
                                        <span>{log}</span>
                                    </div>
                                ))}
                                {/* Anchor specifically for logs */}
                                <div ref={logsEndRef} />
                            </div>
                            
                            {/* Context Indicator */}
                            {currentAnalyzingClause && (
                                <p className="text-xs text-center text-slate-400 font-mono mt-2 opacity-80 border-t border-slate-200 dark:border-slate-800 pt-2 w-full">
                                    Analyzing: {currentAnalyzingClause}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {analysisResult && (
                    viewMode === 'list' ? (
                        <div className="space-y-4 pb-10">
                            {analysisResult.map((res, idx) => renderFindingCard(res, idx))}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-4">
                            {/* Matrix Header Container - Collapsible */}
                            <div className={`flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border ${themeConfig.borderClass.replace('border-', 'border-opacity-30 border-')} border-t-4 border-t-${themeConfig.borderClass.replace('border-', '')} dark:border-slate-800 overflow-hidden shadow-depth transition-all duration-300 ease-in-out ${isMatrixCollapsed ? 'h-11 min-h-[44px]' : 'h-auto max-h-[45vh]'}`}>
                                
                                {/* Control Bar */}
                                <div className="flex items-center justify-between px-3 py-2 bg-white/50 dark:bg-slate-900/50 border-b border-gray-50 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800" onClick={() => setIsMatrixCollapsed(!isMatrixCollapsed)}>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Icon name="Grid" size={12}/> Findings Matrix ({Object.keys(groupedFindings).length} Processes)
                                    </span>
                                    <div className="text-slate-400 hover:text-indigo-500 transition-colors">
                                        <Icon name={isMatrixCollapsed ? "ChevronDown" : "ChevronUp"} size={16} />
                                    </div>
                                </div>

                                {/* Matrix Content - Only rendered fully when not collapsed to save DOM/Layout calc, or hidden via CSS for animation */}
                                <div className={`flex flex-col transition-opacity duration-200 ${isMatrixCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    {/* UPDATED GRID: [Clause] | [Major] | [Minor] | [OFI] | [Comp] */}
                                    <div className={`grid grid-cols-[80px_1fr_1fr_1fr_1fr] gap-1 p-3 border-b border-gray-100 dark:border-slate-800 ${themeConfig.bgSoft} sticky top-0 z-10 transition-colors duration-500 ease-fluid`}>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Clause</div>
                                        <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">Major</div>
                                        <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest text-center">Minor</div>
                                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest text-center">OFI</div>
                                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">Comp</div>
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar max-h-[40vh] p-2">
                                        {Object.entries(groupedFindings).map(([processName, items]) => {
                                            const isCollapsed = collapsedGroups.has(processName);
                                            const typedItems = items as { finding: AnalysisResult, originalIndex: number }[];
                                            const countNC = typedItems.filter(i => i.finding.status === 'NC_MAJOR' || i.finding.status === 'NC_MINOR').length;
                                            
                                            return (
                                                <div key={processName} className="flex flex-col mb-2 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 overflow-hidden">
                                                    {/* Group Header */}
                                                    <div 
                                                        className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                                        onClick={() => toggleGroup(processName)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Icon name="ChevronDown" size={14} className={`text-slate-400 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}/>
                                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wide truncate max-w-[200px]" title={processName}>
                                                                {processName} 
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-normal">({typedItems.length})</span>
                                                        </div>
                                                        {countNC > 0 && <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded shadow-sm">{countNC} NCs</span>}
                                                    </div>

                                                    {/* Group Items with AUTO HEIGHT (No inner scroll) */}
                                                    {!isCollapsed && (
                                                        <div className="divide-y divide-gray-100 dark:divide-slate-800/50 border-t border-gray-100 dark:border-slate-800">
                                                            {typedItems.map(({ finding: item, originalIndex: idx }) => {
                                                                const isSelected = focusedFindingIndex === idx;
                                                                return (
                                                                    <div key={idx} onClick={() => setFocusedFindingIndex(idx)} className={`grid grid-cols-[80px_1fr_1fr_1fr_1fr] gap-1 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'}`}>
                                                                        <div className={`flex items-center justify-center h-full w-full text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>{item.clauseId}</div>
                                                                        <div className="flex items-center justify-center h-full w-full">{item.status === 'NC_MAJOR' && <div className="w-4 h-4 rounded bg-red-500 shadow-md ring-2 ring-white dark:ring-slate-900" title="Major NC"></div>}</div>
                                                                        <div className="flex items-center justify-center h-full w-full">{item.status === 'NC_MINOR' && <div className="w-4 h-4 rounded bg-orange-500 shadow-md ring-2 ring-white dark:ring-slate-900" title="Minor NC"></div>}</div>
                                                                        <div className="flex items-center justify-center h-full w-full">{item.status === 'OFI' && <div className="w-4 h-4 rounded bg-blue-500 shadow-md ring-2 ring-white dark:ring-slate-900" title="Opportunity for Improvement"></div>}</div>
                                                                        <div className="flex items-center justify-center h-full w-full">{item.status === 'COMPLIANT' && <div className="w-4 h-4 rounded bg-emerald-500 shadow-md ring-2 ring-white dark:ring-slate-900" title="Compliant"></div>}</div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
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
                
                {analysisResult && (
                    <button 
                        onClick={handleToggleSelectAll}
                        className={`flex-none md:w-auto px-4 h-[52px] border rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-sm whitespace-nowrap dark:shadow-md ${isAllSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-50'}`}
                    >
                        <Icon name={isAllSelected ? "CheckSquare" : "Square"} size={18}/>
                        <span className="hidden lg:inline">{isAllSelected ? "Deselect All" : "Select All"}</span>
                    </button>
                )}

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
