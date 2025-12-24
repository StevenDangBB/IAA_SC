

import React, { useState, useEffect, useRef } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, Standard } from './types';
import { Icon, FontSizeController, SparkleLoader, CheckLineart, Modal, SnowOverlay } from './components/UI';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import { generateOcrContent, generateAnalysis, generateTextReport, generateJsonFromText } from './services/geminiService';
import { cleanAndParseJSON, fileToBase64, cleanFileName } from './utils';

declare var mammoth: any;

type LayoutMode = 'evidence' | 'findings' | 'report' | 'split';
type ExportLanguage = 'en' | 'vi';

function App() {
    // -- STATE --
    const [fontSizeScale, setFontSizeScale] = useState(1.0);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isSnowing, setIsSnowing] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [userApiKey, setUserApiKey] = useState("");
    const [exportLanguage, setExportLanguage] = useState<ExportLanguage>('en');
    const [notesLanguage, setNotesLanguage] = useState<ExportLanguage>('vi'); 
    const [isDragging, setIsDragging] = useState(false);
    
    const [reportTemplate, setReportTemplate] = useState<string>("");
    const [templateFileName, setTemplateFileName] = useState<string>("");
    
    const [customStandards, setCustomStandards] = useState<StandardsData>({});
    const [standardKey, setStandardKey] = useState<string>("ISO 9001:2015");
    const [auditInfo, setAuditInfo] = useState<AuditInfo>({ company: "", smo: "", department: "", interviewee: "", auditor: "", type: "" });
    const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
    const [evidence, setEvidence] = useState(INITIAL_EVIDENCE);
    const [pastedImages, setPastedImages] = useState<File[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult[] | null>(null);
    const [selectedFindings, setSelectedFindings] = useState<Record<string, boolean>>({});
    const [finalReportText, setFinalReportText] = useState<string | null>(null);
    const [layoutMode, setLayoutMode] = useState('evidence' as LayoutMode);
    
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [isExportLoading, setIsExportLoading] = useState(false);
    const [isNotesExportLoading, setIsNotesExportLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    
    const [importText, setImportText] = useState("");
    const [importStatus, setImportStatus] = useState("");
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const templateInputRef = useRef<HTMLInputElement>(null);

    const allStandards = { ...STANDARDS_DATA, ...customStandards };
    const hasEvidence = evidence.trim().length > 0 || pastedImages.length > 0;
    const isAnalyzeDisabled = isAnalyzeLoading || selectedClauses.length === 0;

    // --- EFFECTS ---
    useEffect(() => {
        const storedScale = localStorage.getItem('iso_font_scale');
        if (storedScale) setFontSizeScale(parseFloat(storedScale));
        
        const savedAuditInfo = localStorage.getItem("iso_audit_info");
        const savedEvidence = localStorage.getItem("iso_evidence");
        const savedDarkMode = localStorage.getItem('iso_dark_mode');
        const savedTemplate = localStorage.getItem('iso_report_template');
        const savedTemplateName = localStorage.getItem('iso_report_template_name');
        const savedApiKey = localStorage.getItem('iso_api_key');

        if (savedAuditInfo) setAuditInfo(JSON.parse(savedAuditInfo));
        if (savedEvidence && savedEvidence.trim() !== '') setEvidence(savedEvidence);
        
        if (savedDarkMode !== null) {
            setIsDarkMode(savedDarkMode === 'true');
        } else {
            setIsDarkMode(true); 
        }
        
        if (savedTemplate) setReportTemplate(savedTemplate);
        if (savedTemplateName) setTemplateFileName(savedTemplateName);
        if (savedApiKey) setUserApiKey(savedApiKey);
    }, []);

    useEffect(() => {
        if (isDarkMode) document.body.classList.add('dark');
        else {
            document.body.classList.remove('dark');
            setIsSnowing(false); // Turn off snow when not in dark mode
        }
        localStorage.setItem('iso_dark_mode', String(isDarkMode));
    }, [isDarkMode]);
    
    // Apply Font Scale Global
    useEffect(() => {
        document.documentElement.style.setProperty('--font-scale', fontSizeScale.toString());
        localStorage.setItem('iso_font_scale', fontSizeScale.toString());
    }, [fontSizeScale]);

    useEffect(() => { localStorage.setItem("iso_audit_info", JSON.stringify(auditInfo)); }, [auditInfo]);
    useEffect(() => { localStorage.setItem("iso_evidence", evidence); }, [evidence]);
    useEffect(() => {
        localStorage.setItem('iso_report_template', reportTemplate);
        localStorage.setItem('iso_report_template_name', templateFileName);
    }, [reportTemplate, templateFileName]);

    const handleNewSession = () => {
        if (window.confirm("Start new session? Current work will be cleared.")) {
            setAuditInfo({ company: "", smo: "", department: "", interviewee: "", auditor: "", type: "" });
            setSelectedClauses([]);
            setEvidence(INITIAL_EVIDENCE);
            setPastedImages([]);
            setAnalysisResult(null);
            setSelectedFindings({});
            setFinalReportText(null);
            setLayoutMode('evidence');
            setAiError(null);
        }
    };

    const handleRecall = () => {
        const savedAuditInfo = localStorage.getItem("iso_audit_info");
        const savedEvidence = localStorage.getItem("iso_evidence");
        if (savedAuditInfo) setAuditInfo(JSON.parse(savedAuditInfo));
        if (savedEvidence) setEvidence(savedEvidence);
        alert("Previous session recalled successfully.");
    };

    const handleSaveApiKey = () => {
        localStorage.setItem("iso_api_key", userApiKey);
        setShowSettingsModal(false);
    };

    const handleUpdateStandard = (updated: Standard) => {
        setCustomStandards(prev => ({ ...prev, [updated.name]: updated }));
    };

    const handleResetStandard = (key: string) => {
        setCustomStandards(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setTemplateFileName(file.name);
        if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            mammoth.extractRawText({ arrayBuffer })
                .then((result: any) => setReportTemplate(result.value))
                .catch((err: any) => console.error("Mammoth Error:", err));
        } else {
            const reader = new FileReader();
            reader.onload = (re) => setReportTemplate(re.target?.result as string);
            reader.readAsText(file);
        }
    };

    const handleAnalyze = async () => {
        if (!hasEvidence || selectedClauses.length === 0) return;
        setIsAnalyzeLoading(true); setAiError(null);
        try {
            const scopeClauses = allStandards[standardKey].groups.flatMap(g => g.clauses).filter(c => selectedClauses.includes(c.id));
            const clausesTxt = scopeClauses.map(c => `- ${c.code} ${c.title}: ${c.description}`).join('\n');
            const prompt = `Act as an ISO Lead Auditor. Evaluate compliance:
${clausesTxt}
CONTEXT: ${auditInfo.type} for ${auditInfo.company}.
RAW EVIDENCE: """ ${evidence} """
Return JSON array with clauseId, status (COMPLIANT, NC_MAJOR, NC_MINOR, OFI), reason, suggestion, evidence, conclusion_report.`;
            const resultStr = await generateAnalysis(prompt, `Output JSON array only.`);
            const result = cleanAndParseJSON(resultStr || "");
            if (result) { 
                setAnalysisResult(result); 
                const initialSelection: Record<string, boolean> = {};
                result.forEach((r: any) => initialSelection[r.clauseId] = true);
                setSelectedFindings(initialSelection);
                setLayoutMode('findings'); 
            }
        } catch (e: any) { setAiError(e.message); } finally { setIsAnalyzeLoading(false); }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult) return;
        setIsReportLoading(true); setLayoutMode('report');
        try {
             const acceptedFindings = analysisResult.filter(r => selectedFindings[r.clauseId]);
             const prompt = `GENERATE FINAL REPORT. TEMPLATE: ${reportTemplate || "Standard"}. DATA: ${JSON.stringify(auditInfo)}. FINDINGS: ${JSON.stringify(acceptedFindings)}.`;
             const text = await generateTextReport(prompt, "Expert ISO Report Compiler.");
             setFinalReportText(text || "");
        } catch (e: any) { setAiError(e.message); } finally { setIsReportLoading(false); }
    };

    const handleOcrUpload = async () => {
        if (pastedImages.length === 0) return;
        setIsOcrLoading(true);
        try {
            const promises = pastedImages.map(async (file) => {
                const b64 = await fileToBase64(file);
                return await generateOcrContent("Extract text accurately.", b64, file.type);
            });
            const results = await Promise.all(promises);
            setEvidence(prev => prev + "\n\n" + results.join('\n\n---\n\n'));
            setPastedImages([]);
        } catch (e: any) { setAiError(e.message); } finally { setIsOcrLoading(false); }
    };

    const handleExport = async (text: string, type: 'notes' | 'report', lang: ExportLanguage) => {
        if (!text) return;
        if (type === 'notes') setIsNotesExportLoading(true); else setIsExportLoading(true);
        try {
            const targetLang = lang === 'vi' ? 'Vietnamese' : 'English';
            const prompt = `Translate to ${targetLang}. Maintain formatting. Text: """${text}"""`;
            const trans = await generateTextReport(prompt, "Translator.");
            const blob = new Blob([trans || ""], {type: 'text/plain;charset=utf-8'});
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${cleanFileName(auditInfo.company)}_${type}_${lang}.txt`;
            link.click();
        } catch (e: any) { console.error(e); } finally { setIsNotesExportLoading(false); setIsExportLoading(false); }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setPastedImages(prev => [...prev, ...files]);
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
            <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-50 flex justify-between items-center h-14">
                <div className="flex items-center gap-5">
                    {/* Floating Logo Container with Halo Effect */}
                    <div className="relative group cursor-pointer animate-float" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <div className="absolute inset-0 bg-indigo-500/20 dark:bg-cyan-500/30 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className={`relative z-10 transition-transform duration-700 drop-shadow-lg ${isSidebarOpen ? 'rotate-[360deg]' : 'rotate-0'}`}>
                             <Icon name="TDSolidLink" size={48}/>
                        </div>
                    </div>
                    
                    {/* Enhanced Title Section */}
                    <div className="flex flex-col">
                        <h1 className="font-black text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-indigo-400 filter drop-shadow-sm leading-none">
                            ISO Audit Pro
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-widest shadow-sm">
                                AI Assistant
                            </span>
                            <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">v{APP_VERSION}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={handleNewSession} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all shadow-sm" title="New Session"><Icon name="FilePlus2" size={18}/></button>
                    <button onClick={handleRecall} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-all shadow-sm" title="Recall Session"><Icon name="RefreshCw" size={18}/></button>
                    {isDarkMode && (
                        <button onClick={() => setIsSnowing(!isSnowing)} className={`p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all shadow-sm ${isSnowing ? 'text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`} title="Let it snow!">
                            <Icon name="Snowflake" size={18}/>
                        </button>
                    )}
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-all shadow-sm"><Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/></button>
                    <FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={(dir) => setFontSizeScale(prev => dir === 'increase' ? Math.min(1.6, prev + 0.05) : Math.max(0.8, prev - 0.05))} />
                    <button onClick={() => setShowSettingsModal(true)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-all shadow-sm" title="Settings"><Icon name="Settings" size={18}/></button>
                    <button onClick={() => setShowAboutModal(true)} className="p-2 px-3 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold text-xs flex items-center gap-2 border border-indigo-100 dark:border-slate-700"><Icon name="Info" size={18}/> INFO</button>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 w-full relative overflow-hidden bg-white dark:bg-slate-900">
                <Sidebar 
                    isOpen={isSidebarOpen} 
                    width={sidebarWidth} 
                    setWidth={setSidebarWidth} 
                    standards={allStandards} 
                    standardKey={standardKey} 
                    setStandardKey={setStandardKey} 
                    auditInfo={auditInfo} 
                    setAuditInfo={setAuditInfo} 
                    selectedClauses={selectedClauses} 
                    setSelectedClauses={setSelectedClauses} 
                    onAddNewStandard={() => setShowImportModal(true)} 
                    onUpdateStandard={handleUpdateStandard}
                    onResetStandard={handleResetStandard}
                />
                
                <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
                    {/* Error Banner */}
                    {aiError && (
                        <div className="absolute top-4 left-4 right-4 z-[100] bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-xl flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <Icon name="AlertCircle" size={20}/>
                                <span className="text-sm font-bold">{aiError}</span>
                            </div>
                            <button onClick={() => setAiError(null)}><Icon name="X" size={18}/></button>
                        </div>
                    )}

                    {/* Block 1: Evidence */}
                    <div className={`flex flex-col bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-all duration-500 shadow-xl relative z-10 ${layoutMode === 'evidence' || layoutMode === 'split' ? 'block-grow' : 'block-shrink'}`}>
                        <div className="px-6 py-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center z-20">
                            <h3 className="font-bold text-lg text-indigo-950 dark:text-indigo-100 flex items-center gap-3">
                                <span className="bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-lg shadow-md shadow-indigo-500/20">
                                    <Icon name="FileText" size={16}/>
                                </span> 
                                Evidence & Notes
                            </h3>
                            <div className="flex gap-3 items-center">
                                <div className="flex items-center bg-indigo-50 dark:bg-slate-800 rounded-xl p-1 border border-indigo-100 dark:border-slate-700">
                                    <button onClick={() => setNotesLanguage('en')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${notesLanguage === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>EN</button>
                                    <button onClick={() => setNotesLanguage('vi')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${notesLanguage === 'vi' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>VI</button>
                                </div>
                                <button onClick={() => handleExport(evidence, 'notes', notesLanguage)} className="h-9 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20" title="Export Evidence">
                                    {isNotesExportLoading ? <Icon name="Loader" className="animate-spin text-white"/> : <><Icon name="Download" size={16} className="text-white"/> Export</>}
                                </button>
                                <button onClick={() => setLayoutMode(layoutMode === 'evidence' ? 'split' : 'evidence')} className="w-9 h-9 rounded-xl text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 transition-all" title="Switch View"><Icon name={layoutMode === 'evidence' ? "CollapsePanel" : "ExpandPanel"}/></button>
                            </div>
                        </div>
                        <div 
                            className="flex-1 p-5 flex flex-col min-h-0 relative bg-gray-50/10 dark:bg-slate-950/30"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {isDragging && (
                                <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm z-[60] flex items-center justify-center border-4 border-dashed border-indigo-500 rounded-xl pointer-events-none">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
                                        <Icon name="UploadCloud" size={48} className="text-indigo-500 animate-bounce" />
                                        <p className="font-bold text-indigo-600">Drop files to upload as evidence</p>
                                    </div>
                                </div>
                            )}

                             <div className={`mb-4 p-4 border-2 border-dashed rounded-xl flex items-center justify-between bg-white dark:bg-slate-900 group transition-all ${pastedImages.length ? 'border-emerald-400 bg-emerald-50/5' : 'border-slate-300 dark:border-slate-700'}`}>
                                <div className="flex-1 flex gap-3 overflow-x-auto custom-scrollbar p-1">
                                    {pastedImages.length > 0 ? pastedImages.map((f, i) => (
                                        <div key={i} className="relative shrink-0 pt-2 pr-2">
                                            <div className="h-14 w-14 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center border dark:border-slate-700 overflow-hidden shadow-sm">
                                                {f.type.includes('image') ? <img src={URL.createObjectURL(f)} className="h-full w-full object-cover" alt="Evidence"/> : <Icon name="FileText" size={16}/>}
                                            </div>
                                            <button onClick={() => setPastedImages(p => p.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg border border-white hover:bg-red-700"><Icon name="X" size={10}/></button>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col">
                                            <span className="text-adjustable-xs text-slate-400 font-medium uppercase tracking-tighter">Evidence Processing Queue</span>
                                            <span className="text-[10px] text-slate-400 italic">Drag images/PDFs here or use the upload button...</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" onChange={(e) => setPastedImages([...pastedImages, ...Array.from(e.target.files || [])])} className="hidden"/>
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl bg-indigo-500 text-white shadow-xl hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all" title="Upload Evidence (Images/PDF)">
                                        <Icon name="UploadCloud" size={20}/>
                                    </button>
                                    {pastedImages.length > 0 && (
                                        <button onClick={handleOcrUpload} disabled={isOcrLoading} className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xl hover:bg-emerald-600 animate-in fade-in slide-in-from-right-2" title="Convert to Text (OCR)">
                                            {isOcrLoading ? <SparkleLoader/> : <Icon name="ScanText" size={20}/>}
                                        </button>
                                    )}
                                </div>
                             </div>
                             
                             <div className="flex-1 relative pb-20 z-0">
                                <textarea 
                                    className="w-full h-full p-6 bg-white dark:bg-slate-950 caret-indigo-600 dark:caret-indigo-400 outline-none rounded-xl border-2 border-slate-200 dark:border-slate-800 font-sans text-adjustable-sm leading-relaxed text-slate-800 dark:text-slate-100 resize-none shadow-inner focus:border-indigo-300 dark:focus:border-indigo-900 transition-colors" 
                                    placeholder="Paste interview notes, audit evidence or case descriptions here..." 
                                    value={evidence} 
                                    onChange={e => setEvidence(e.target.value)}
                                ></textarea>

                                {hasEvidence && (layoutMode === 'evidence' || layoutMode === 'split') && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[40]">
                                        <button onClick={handleAnalyze} disabled={isAnalyzeDisabled} className={`w-16 h-16 rounded-full shadow-2xl btn-brain-wave text-white flex items-center justify-center transition-all ${isAnalyzeDisabled ? 'opacity-50 grayscale' : 'hover:scale-110 active:scale-90 ring-8 ring-indigo-50 dark:ring-indigo-900/10'}`} title="Start AI Analysis">
                                            {isAnalyzeLoading ? <SparkleLoader size={28}/> : <Icon name="Wand2" size={28}/>}
                                        </button>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>

                    {/* Block 2: Findings */}
                    <div className={`flex flex-col bg-slate-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 transition-all duration-500 shadow-lg relative ${layoutMode === 'findings' || layoutMode === 'split' ? 'block-grow' : 'block-shrink'}`}>
                        <div className="px-6 py-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center z-10 justify-between">
                            <h3 className="font-bold text-lg text-emerald-950 dark:text-emerald-100 flex items-center gap-3">
                                <span className="bg-emerald-600 text-white w-8 h-8 flex items-center justify-center rounded-lg shadow-md shadow-emerald-500/20"><Icon name="CheckCircle2" size={16}/></span> 
                                Validated Findings
                            </h3>
                            <div className="flex gap-2">
                                {analysisResult && <button onClick={handleGenerateReport} className="h-9 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20" title="Generate Final Report"><Icon name="Wand2" size={16}/> Generate Report</button>}
                                <button onClick={() => setLayoutMode(layoutMode === 'findings' ? 'split' : 'findings')} className="w-9 h-9 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all" title="Switch View"><Icon name={layoutMode === 'findings' ? "CollapsePanel" : "ExpandPanel"}/></button>
                            </div>
                        </div>
                        <div className="flex-1 p-6 flex flex-col gap-4 bg-gray-100/30 dark:bg-slate-950/40 min-h-0 overflow-y-auto custom-scrollbar">
                            {analysisResult ? analysisResult.map((res, i) => (
                                <div key={i} className={`p-4 bg-white dark:bg-slate-900 rounded-xl border-2 transition-all ${selectedFindings[res.clauseId] ? 'border-indigo-200 dark:border-indigo-900/50 shadow-md' : 'border-transparent opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{res.clauseId}</span>
                                                <select className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border-none cursor-pointer ${res.status === 'COMPLIANT' ? 'bg-green-100 text-green-700' : res.status === 'NC_MAJOR' ? 'bg-red-100 text-red-700' : res.status === 'NC_MINOR' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`} value={res.status} onChange={(e) => {
                                                    const newArr = [...analysisResult]; newArr[i].status = e.target.value as any; setAnalysisResult(newArr);
                                                }}>
                                                    <option value="COMPLIANT">Compliant</option>
                                                    <option value="NC_MAJOR">NC Major</option>
                                                    <option value="NC_MINOR">NC Minor</option>
                                                    <option value="OFI">OFI</option>
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-mono italic">AI Reason: {res.reason}</p>
                                        </div>
                                        <button onClick={() => setSelectedFindings(p => ({...p, [res.clauseId]: !p[res.clauseId]}))} className={`w-10 h-10 flex items-center justify-center rounded-xl ${selectedFindings[res.clauseId] ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-400'}`}>
                                            <CheckLineart size={18} className="stroke-current"/>
                                        </button>
                                    </div>
                                    <textarea className="w-full text-adjustable-xs p-4 bg-gray-50 dark:bg-slate-800/50 dark:text-slate-300 rounded-xl border border-transparent focus:border-indigo-200 outline-none resize-y min-h-[100px]" value={res.conclusion_report} onChange={e => {
                                        const newArr = [...analysisResult]; newArr[i].conclusion_report = e.target.value; setAnalysisResult(newArr);
                                    }}/>
                                </div>
                            )) : <div className="text-center text-gray-400 mt-10 italic">Analysis results will appear here...</div>}
                        </div>
                    </div>

                    {/* Block 3: Final Synthesis */}
                    <div className={`flex flex-col bg-white dark:bg-slate-900 transition-all duration-500 relative ${layoutMode === 'report' || layoutMode === 'split' ? 'block-grow' : 'block-shrink'}`}>
                         <div className="px-6 py-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center z-10">
                            <h3 className="font-bold text-lg text-blue-950 dark:text-blue-100 flex items-center gap-3">
                                <span className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-lg shadow-md shadow-blue-500/20"><Icon name="FileEdit" size={16}/></span> 
                                Final Synthesis
                            </h3>
                            <div className="flex gap-2 items-center">
                                <div className="flex items-center gap-2 mr-4">
                                    <input ref={templateInputRef} type="file" accept=".docx,.txt" onChange={handleTemplateUpload} className="hidden" />
                                    <button onClick={() => templateInputRef.current?.click()} className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${templateFileName ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-white border-blue-200 text-blue-700 hover:border-blue-400 dark:bg-slate-800 dark:border-slate-600 dark:text-blue-400'}`} title="Load Report Template">
                                        <Icon name="UploadCloud" size={14} className={templateFileName ? "text-emerald-500" : "text-blue-500"}/> {templateFileName ? `Template Loaded` : "Load Template"}
                                    </button>
                                </div>
                                <div className="flex items-center bg-blue-50 dark:bg-slate-800 rounded-xl p-1 border border-blue-100 dark:border-slate-700">
                                    <button onClick={() => setExportLanguage('en')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${exportLanguage === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}>EN</button>
                                    <button onClick={() => setExportLanguage('vi')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${exportLanguage === 'vi' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}>VI</button>
                                </div>
                                {finalReportText && <button onClick={() => handleExport(finalReportText, 'report', exportLanguage)} disabled={isExportLoading} className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 active:scale-95 transition-all" title="Download Report">{isExportLoading ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Download"/>}</button>}
                                <button onClick={() => setLayoutMode(layoutMode === 'report' ? 'split' : 'report')} className="w-9 h-9 text-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 rounded-xl transition-all" title="Switch View"><Icon name={layoutMode === 'report' ? "CollapsePanel" : "ExpandPanel"}/></button>
                            </div>
                        </div>
                        <div className="flex-1 p-6 flex flex-col gap-4 bg-gray-50/10 dark:bg-slate-950/20 min-h-0 relative">
                             {isReportLoading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <SparkleLoader size={64} className="mb-6"/>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg animate-pulse uppercase tracking-widest">Assembling Final Report...</p>
                                </div>
                             ) : (
                                <textarea className="flex-1 w-full h-full p-8 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl text-adjustable-sm font-mono leading-relaxed outline-none dark:text-slate-200 shadow-inner custom-scrollbar" value={finalReportText || ""} onChange={e => setFinalReportText(e.target.value)} placeholder="Final synthesized content will appear here..."/>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            <ReleaseNotesModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            
            <Modal isOpen={showImportModal} title="Import ISO Standard" onClose={() => setShowImportModal(false)}>
                 <div className="space-y-4">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Paste content from PDF/Docx to extract structure:</p>
                    <textarea className="w-full h-40 p-4 bg-white dark:bg-slate-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-2xl text-[10px] font-mono outline-none shadow-inner" placeholder="Paste clause data here..." value={importText} onChange={e => setImportText(e.target.value)}></textarea>
                    <button onClick={async () => {
                        setImportStatus("Extracting Structure...");
                        try {
                            const systemInst = `You are a professional ISO Document Architect. Convert the provided text into a structured JSON 'Standard' object.
Structure: { name: string, description: string, groups: Array<{ id: string, title: string, icon: string, clauses: Array<{ id: string, code: string, title: string, description: string, subClauses: [] }> }> }
Use icons like: Lock, FileShield, Cpu, Users, Building, LayoutList. Output valid JSON only.`;
                            const res = await generateJsonFromText(importText, systemInst);
                            const parsed = cleanAndParseJSON(res || "");
                            if (parsed) {
                                setCustomStandards({...customStandards, [parsed.name]: parsed});
                                setStandardKey(parsed.name);
                                setShowImportModal(false);
                            }
                        } catch(e: any) { 
                            console.error(e); 
                            setAiError(e.message || "Failed to extract standard structure.");
                        } finally { setImportStatus(""); }
                    }} disabled={!!importStatus} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3">
                        {importStatus ? <Icon name="Loader" className="animate-spin" /> : <Icon name="Cpu" />}
                        {importStatus || "Extract & Load Standard"}
                    </button>
                 </div>
            </Modal>

            <Modal isOpen={showSettingsModal} title="Settings" onClose={() => setShowSettingsModal(false)}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Gemini API Key</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 dark:focus:border-indigo-900 rounded-xl text-sm transition-all text-slate-900 dark:text-slate-100 font-normal placeholder-gray-400 focus:bg-white dark:focus:bg-slate-900 shadow-sm"
                                placeholder="Enter your Google Gemini API Key..."
                                value={userApiKey}
                                onChange={(e) => setUserApiKey(e.target.value)}
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <Icon name="Key" size={18} />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            The key is stored locally in your browser. Leave empty to use the environment variable (if configured).
                            <br/>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Get a key from AI Studio</a>
                        </p>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button onClick={handleSaveApiKey} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all">
                            Save Settings
                        </button>
                    </div>
                </div>
            </Modal>
            
            {isSnowing && <SnowOverlay />}
        </div>
    );
}

export default App;
