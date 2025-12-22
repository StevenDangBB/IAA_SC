import React, { useState, useEffect, useRef } from 'react';
import { APP_VERSION, STANDARDS_DATA, INITIAL_EVIDENCE, DEFAULT_GEMINI_MODEL } from './constants';
import { StandardsData, AuditInfo, AnalysisResult, FindingDetail } from './types';
import { Icon, Modal, IconInput, FontSizeController, SparkleLoader } from './components/UI';
import Sidebar from './components/Sidebar';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import { generateOcrContent, generateAnalysis, generateTextReport, generateJsonFromText } from './services/geminiService';
import { cleanAndParseJSON, fileToBase64, cleanFileName, copyToClipboard } from './utils';
import { CheckLineart } from './components/UI';

// Define layout modes
type LayoutMode = 'evidence' | 'findings' | 'report' | 'split';

function App() {
    // -- STATE --
    const [fontSizeScale, setFontSizeScale] = useState(1.0);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Data State
    const [customStandards, setCustomStandards] = useState<StandardsData>({});
    const [standardKey, setStandardKey] = useState<string>("");
    const [auditInfo, setAuditInfo] = useState<AuditInfo>({ company: "", smo: "", department: "", interviewee: "", auditor: "", type: "" });
    const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
    const [evidence, setEvidence] = useState(INITIAL_EVIDENCE);
    const [pastedImages, setPastedImages] = useState<File[]>([]);
    
    // Analysis State
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult[] | null>(null);
    const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, boolean>>({});
    const [findingDetails, setFindingDetails] = useState<Record<string, FindingDetail>>({});
    const [finalReportText, setFinalReportText] = useState<string | null>(null);
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('evidence');
    
    // UI Loading/Error State
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [isExportLoading, setIsExportLoading] = useState(false);
    const [isNotesExportLoading, setIsNotesExportLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [isAnalysisSuccess, setIsAnalysisSuccess] = useState<boolean | null>(null);
    
    // Import State
    const [importText, setImportText] = useState("");
    const [importImages, setImportImages] = useState<File[]>([]);
    const [importStatus, setImportStatus] = useState("");
    
    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const evidenceRef = useRef<HTMLTextAreaElement>(null);
    const [cursorPosition, setCursorPosition] = useState(0);
    
    // --- COMPUTED ---
    const allStandards = { ...STANDARDS_DATA, ...customStandards };
    const hasEvidence = evidence.trim().length > 0 || pastedImages.length > 0;
    const isAnalyzeDisabled = isAnalyzeLoading || selectedClauses.length === 0;

    // --- EFFECTS ---
    useEffect(() => {
        const storedScale = localStorage.getItem('iso_font_scale');
        if (storedScale) setFontSizeScale(parseFloat(storedScale));

        const savedAuditInfo = localStorage.getItem("iso_audit_info");
        const savedSelectedClauses = localStorage.getItem("iso_selected_clauses");
        const savedEvidence = localStorage.getItem("iso_evidence");
        const savedSidebarW = localStorage.getItem("iso_sidebar_width");
        const savedSidebarOpen = localStorage.getItem("iso_sidebar_open");
        const savedDarkMode = localStorage.getItem('iso_dark_mode');
        const savedCustomStandards = localStorage.getItem("iso_custom_standards");

        if (savedAuditInfo) setAuditInfo(JSON.parse(savedAuditInfo));
        if (savedSelectedClauses) setSelectedClauses(JSON.parse(savedSelectedClauses));
        if (savedEvidence && savedEvidence.trim() !== '') setEvidence(savedEvidence);
        if (savedSidebarW) setSidebarWidth(Math.max(360, parseInt(savedSidebarW)));
        if (savedSidebarOpen !== null) setIsSidebarOpen(savedSidebarOpen === 'true');
        if (savedDarkMode) setIsDarkMode(savedDarkMode === 'true');
        if (savedCustomStandards) setCustomStandards(JSON.parse(savedCustomStandards));
    }, []);

    useEffect(() => { document.documentElement.style.setProperty('--font-scale', fontSizeScale.toString()); }, [fontSizeScale]);
    
    useEffect(() => {
        localStorage.setItem('iso_dark_mode', String(isDarkMode));
        if (isDarkMode) document.body.classList.add('dark');
        else document.body.classList.remove('dark');
    }, [isDarkMode]);

    useEffect(() => { localStorage.setItem("iso_audit_info", JSON.stringify(auditInfo)); }, [auditInfo]);
    useEffect(() => { localStorage.setItem("iso_selected_clauses", JSON.stringify(selectedClauses)); }, [selectedClauses]);
    useEffect(() => { localStorage.setItem("iso_evidence", evidence); }, [evidence]);
    useEffect(() => { localStorage.setItem("iso_sidebar_width", String(sidebarWidth)); }, [sidebarWidth]);
    useEffect(() => { localStorage.setItem("iso_sidebar_open", String(isSidebarOpen)); }, [isSidebarOpen]);

    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            const newImages: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1 || items[i].type.indexOf("pdf") !== -1) {
                    const file = items[i].getAsFile();
                    if (file) newImages.push(file);
                }
            }
            if (newImages.length > 0) {
                e.preventDefault();
                setPastedImages(prev => [...prev, ...newImages]);
                setLayoutMode('evidence');
            }
        };
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, []);

    // --- ACTIONS ---

    const adjustFontSize = (dir: string) => {
        setFontSizeScale(prev => {
            let n = prev;
            if (dir === 'increase') n = Math.min(1.3, prev + 0.05);
            else if (dir === 'decrease') n = Math.max(0.85, prev - 0.05);
            n = Math.round(n * 100) / 100;
            localStorage.setItem('iso_font_scale', String(n));
            return n;
        });
    };

    const handleOcrUpload = async () => {
        if (pastedImages.length === 0) return;
        setIsOcrLoading(true);
        setLayoutMode('evidence');
        try {
            const promises = pastedImages.map(async (file) => {
                const b64 = await fileToBase64(file);
                // Enhanced prompt for specific extraction
                const prompt = `
                ACT AS AN ISO LEAD AUDITOR. ANALYZE THIS EVIDENCE (Image/File).

                OBJECTIVE: Extract specific metadata and provide a professional, condensed summary suitable for audit working papers.

                1.  **METADATA EXTRACTION** (If found, otherwise state "Not Visible"):
                    *   **Document Name (Tên tài liệu):** [Exact Name]
                    *   **Document Code (Mã tài liệu):** [Exact Code]
                    *   **Effective/Revision Date (Ngày hiệu lực):** [Date]

                2.  **CORE CONTENT SUMMARY (Tóm tắt trọng tâm):**
                    *   Summarize the *essential* purpose and content of the document.
                    *   Focus on process steps, criteria, or requirements defined.
                    *   Discard irrelevant boilerplate text.

                3.  **ADVANCED TABLE & VISUAL DATA INTERPRETATION (Diễn giải chi tiết bảng biểu):**
                    *   **Structure Recognition:** Carefully identify Column Headers and Row Labels. Treat the visual grid as structured data. Handle complex layouts with merged cells logically.
                    *   **Data Relationship Mapping:** Ensure every data point is correctly associated with its specific header/category.
                    *   **Narrative Synthesis:** Convert these relationships into clear, professional sentences describing the specific findings.
                        *   *Bad:* "Date: 01/01/2023. Name: John. Result: Pass."
                        *   *Good:* "The 'Training Record' table shows that on 2023-01-01, John Smith achieved a 'Pass' result for the Fire Safety module."
                    *   **Gap Analysis:** Explicitly highlight any missing data in mandatory fields (signatures, dates, check-boxes, approvals).

                4.  **AUDIT RELEVANCE:**
                    *   Briefly mention what ISO requirement this might support (e.g., "Evidence for Clause 7.5 Documented Information").

                OUTPUT FORMAT: Plain Text, separated by sections.
                `;
                return await generateOcrContent(prompt, b64, file.type);
            });
            const results = await Promise.all(promises);
            const newText = results.join('\n\n--------------------------------\n\n');
            
            setEvidence(prev => {
                const prefix = prev.substring(0, cursorPosition);
                const suffix = prev.substring(cursorPosition);
                const insertedText = (cursorPosition === 0 || prev[cursorPosition - 1] === '\n') ? newText : `\n\n${newText}`;
                return `${prefix}${insertedText}${suffix}`;
            });
            setPastedImages([]);
        } catch (error: any) {
            setAiError("OCR Failed: " + error.message);
        } finally {
            setIsOcrLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!hasEvidence || selectedClauses.length === 0) return;
        setIsAnalyzeLoading(true);
        setAnalysisResult(null);
        setAiError(null);
        setIsAnalysisSuccess(null);
        
        try {
            const scopeClauses = allStandards[standardKey].groups.flatMap(g => g.clauses).filter(c => selectedClauses.includes(c.id));
            const clausesTxt = scopeClauses.map(c => `- ${c.code} ${c.title}: ${c.description}`).join('\n');
            
            const prompt = `Act as an ISO Lead Auditor specializing in ${standardKey}. Evaluate compliance against:
${clausesTxt}

CONTEXT: ${auditInfo.type} for ${auditInfo.company}.
RAW EVIDENCE: """ ${evidence} """

For each clause, determine status (COMPLIANT, NON_COMPLIANT, WARNING), Reason (English), Suggestion (English), Evidence quote, and Conclusion_Report (Professional English Stage 2 Audit narrative).
Return JSON ARRAY.`;

            const systemInstruction = `You are an experienced ISO Certification Auditor. Output a JSON array only.`;
            const resultStr = await generateAnalysis(prompt, systemInstruction);
            const result = cleanAndParseJSON(resultStr);
            if (result) {
                setAnalysisResult(result);
                setIsAnalysisSuccess(true);
                setLayoutMode('findings');
            } else {
                throw new Error("Invalid JSON from AI");
            }
        } catch (e: any) {
            setAiError(e.message);
            setIsAnalysisSuccess(false);
        } finally {
            setIsAnalyzeLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult) return;
        setIsReportLoading(true);
        setFinalReportText(null);
        setLayoutMode('report');
        
        try {
             const scopeClauses = allStandards[standardKey].groups.flatMap(g => g.clauses).filter(c => selectedClauses.includes(c.id));
             const clauseMap = new Map(scopeClauses.map(c => [c.id, c.title]));
             
             let findingsSection = '';
             Object.keys(selectedSuggestions).forEach(clauseId => {
                 if (selectedSuggestions[clauseId]) {
                     const res = analysisResult.find(r => r.clauseId === clauseId);
                     if (res) findingsSection += `\nFINDING [${clauseId}]: ${res.conclusion_report}\n`;
                 }
             });

             const prompt = `Generate a Final Audit Report in English.
CONTEXT: ${JSON.stringify(auditInfo)}
RAW NOTES: ${evidence}
FINDINGS: ${findingsSection || "None"}
ALL CLAUSES STATUS: ${analysisResult.map(r => `${r.clauseId}: ${r.status}`).join(', ')}

Structure: Executive Summary, Raw Notes, Compliance Overview, Detailed Findings.`;

             const text = await generateTextReport(prompt, "You are an ISO Lead Auditor. Output professional English plain text report.");
             setFinalReportText(text);

        } catch (e: any) {
             setAiError(e.message);
        } finally {
            setIsReportLoading(false);
        }
    };
    
    const handleExport = async (text: string, type: 'notes' | 'report') => {
        if (!text) return;
        const setLoading = type === 'notes' ? setIsNotesExportLoading : setIsExportLoading;
        setLoading(true);
        try {
            const prompt = `Translate to professional English (if not already). Maintain format. Text: """${text}"""`;
            const trans = await generateTextReport(prompt, "Translator.");
            
            const fileName = `${cleanFileName(standardKey)}_${cleanFileName(auditInfo.type)}_${cleanFileName(auditInfo.company)}_${type}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.txt`;
            const element = document.createElement("a");
            const file = new Blob([trans], {type: 'text/plain;charset=utf-8'});
            element.href = URL.createObjectURL(file);
            element.download = fileName;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleImportStandard = async () => {
         if (!importText && importImages.length === 0) return;
         setImportStatus("Processing...");
         try {
             let content = importText;
             if (importImages.length > 0) {
                 const proms = importImages.map(async f => {
                     const b64 = await fileToBase64(f);
                     return await generateOcrContent("Extract text.", b64, f.type);
                 });
                 content += "\n" + (await Promise.all(proms)).join("\n");
             }
             const prompt = `Convert text to JSON schema: { "name": "Name", "groups": [ { "id": "ID", "title": "Title", "icon": "FileShield", "clauses": [ { "id": "ID", "code": "Code", "title": "Title", "description": "Desc" } ] } ] }. RAW TEXT: ${content.substring(0, 30000)}`;
             const res = await generateJsonFromText(prompt, "JSON Agent.");
             const parsed = cleanAndParseJSON(res);
             if (parsed && parsed.name) {
                 const nw = { ...customStandards, [parsed.name]: parsed };
                 setCustomStandards(nw);
                 localStorage.setItem("iso_custom_standards", JSON.stringify(nw));
                 setStandardKey(parsed.name);
                 setShowImportModal(false);
                 setImportText(""); setImportImages([]);
             }
         } catch (e: any) {
             setImportStatus("Failed: " + e.message);
         } finally {
             setImportStatus("");
         }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-gray-100 dark:bg-slate-900 transition-colors duration-200">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg z-20 flex justify-between items-center h-14">
                <div className="flex items-center gap-4">
                    <div className="relative flex items-center text-indigo-600 cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                         <div className={`text-orange-500 transition-transform duration-700 ${isSidebarOpen ? 'rotate-[360deg]' : 'rotate-0'}`}><Icon name="TDSolidLink" size={48}/></div>
                         <div className="absolute top-1 left-1 w-6 h-6 z-10 pointer-events-none"><Icon name="Sparkle" size={10} className="text-white animate-star-orbit"/></div>
                    </div>
                    <div>
                        <h1 className="font-extrabold text-2xl text-slate-800 dark:text-slate-100">ISO Audit Assistant</h1>
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><Icon name="AIIndicator" size={18} className="text-amber-400 animate-pulse"/> v{APP_VERSION} (AI Core)</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => window.location.reload()} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:text-red-500" title="Refresh"><Icon name="RefreshCw" size={18}/></button>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:text-amber-500" title="Theme"><Icon name={isDarkMode ? "Sun" : "Moon"} size={18}/></button>
                    <FontSizeController fontSizeScale={fontSizeScale} adjustFontSize={adjustFontSize} />
                    <button onClick={() => setShowAboutModal(true)} className="p-2 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 hover:text-indigo-700 font-semibold text-xs flex items-center gap-2">
                        <Icon name="Info" size={18}/> ABOUT
                    </button>
                </div>
            </div>

            {/* Layout */}
            <div className="flex flex-1 min-h-0 w-full">
                <Sidebar isOpen={isSidebarOpen} width={sidebarWidth} setWidth={setSidebarWidth} standards={allStandards} standardKey={standardKey} setStandardKey={setStandardKey} auditInfo={auditInfo} setAuditInfo={setAuditInfo} selectedClauses={selectedClauses} setSelectedClauses={setSelectedClauses} onAddNewStandard={() => setShowImportModal(true)}/>
                
                <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
                    {/* Block 1: Evidence */}
                    <div className={`flex flex-col bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-all duration-500 shadow-xl ${layoutMode === 'evidence' || layoutMode === 'split' ? 'block-grow' : 'block-shrink'}`}>
                        <div className="px-6 py-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center z-10">
                            <h3 className="font-semibold text-lg text-slate-500 dark:text-slate-400 flex items-center gap-3"><span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 w-8 h-8 flex items-center justify-center rounded-lg">1</span> Audit Notes & Evidence</h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleExport(evidence, 'notes')} disabled={isNotesExportLoading} className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center">{isNotesExportLoading ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Download"/>}</button>
                                <button onClick={() => setLayoutMode(layoutMode === 'evidence' ? 'split' : 'evidence')} className="w-10 h-10 text-gray-400 hover:text-indigo-600"><Icon name={layoutMode === 'evidence' ? "CollapsePanel" : "ExpandPanel"}/></button>
                            </div>
                        </div>
                        <div className="flex-1 p-5 flex flex-col min-h-0 relative bg-gray-50/30 dark:bg-slate-950">
                             <div className={`mb-4 p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center ${pastedImages.length ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-200 dark:border-slate-700'}`}>
                                <div className="w-full flex items-center justify-between gap-4">
                                    <div className="flex-1 flex gap-3 overflow-x-auto pb-2 custom-scrollbar p-1">
                                        {pastedImages.length > 0 ? pastedImages.map((f, i) => (
                                            <div key={i} className="relative group/img shrink-0">
                                                <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden border border-gray-300">
                                                    {f.type.includes('image') ? <img src={URL.createObjectURL(f)} className="h-full w-full object-cover"/> : 'PDF'}
                                                </div>
                                                <button onClick={() => setPastedImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center"><Icon name="X" size={10}/></button>
                                            </div>
                                        )) : <div className="text-center text-gray-400 flex-1"><p className="text-xs">Drag & Drop Image/PDF or Paste (Ctrl+V)</p></div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" onChange={(e) => { if (e.target.files) setPastedImages(p => [...p, ...Array.from(e.target.files!)]); }} className="hidden"/>
                                        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl bg-indigo-500 text-white"><Icon name="UploadCloud" size={20}/></button>
                                        {pastedImages.length > 0 && <button onClick={handleOcrUpload} disabled={isOcrLoading} className="p-2.5 rounded-xl bg-emerald-500 text-white">{isOcrLoading ? <SparkleLoader/> : <Icon name="ScanText" size={20}/></button>}
                                    </div>
                                </div>
                             </div>
                             <textarea ref={evidenceRef} className="structured-input-textarea w-full h-full p-5 text-adjustable-sm font-mono leading-relaxed outline-none shadow-sm dark:text-slate-200 placeholder-gray-300" placeholder="Enter notes..." value={evidence} onChange={e => { setEvidence(e.target.value); setCursorPosition(e.target.selectionStart); }} onSelect={e => setCursorPosition(e.currentTarget.selectionStart)}></textarea>
                        </div>
                    </div>

                     {/* Analyze Button */}
                     {hasEvidence && (layoutMode === 'evidence' || layoutMode === 'split') && (
                        <div className="flex justify-center -translate-y-7 z-[2] flex-shrink-0">
                            <button onClick={handleAnalyze} disabled={isAnalyzeDisabled} className={`w-14 h-14 rounded-full shadow-2xl btn-brain-wave text-white flex items-center justify-center transition-all ${isAnalyzeDisabled ? 'opacity-50' : 'hover:scale-110'}`}>
                                {isAnalyzeLoading ? <SparkleLoader size={24}/> : <Icon name="Wand2" size={24}/>}
                            </button>
                        </div>
                    )}

                    {/* Block 2: Findings */}
                    <div className={`flex flex-col bg-slate-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 transition-all duration-500 shadow-lg ${layoutMode === 'findings' || layoutMode === 'split' ? 'block-grow' : 'block-shrink'}`}>
                        <div className="px-6 py-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center z-10 justify-between">
                            <h3 className="font-semibold text-lg text-slate-500 dark:text-slate-400 flex items-center gap-3"><span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 w-8 h-8 flex items-center justify-center rounded-lg">2</span> AI Analysis</h3>
                            <div className="flex gap-2">
                                {analysisResult && <button onClick={handleGenerateReport} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><Icon name="Wand2" size={20}/></button>}
                                <button onClick={() => setLayoutMode(layoutMode === 'findings' ? 'split' : 'findings')} className="w-10 h-10 text-gray-400 hover:text-emerald-600"><Icon name={layoutMode === 'findings' ? "CollapsePanel" : "ExpandPanel"}/></button>
                            </div>
                        </div>
                        <div className="flex-1 p-6 flex flex-col gap-4 bg-gray-50/50 dark:bg-slate-950 min-h-0 overflow-y-auto">
                            {analysisResult ? analysisResult.map((res, i) => (
                                <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${res.status === 'COMPLIANT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{res.status}</span>
                                            <span className="font-bold text-sm dark:text-slate-200">{res.clauseId}</span>
                                        </div>
                                        <button onClick={() => setSelectedSuggestions(p => ({...p, [res.clauseId]: !p[res.clauseId]}))} className={`w-8 h-8 flex items-center justify-center rounded-full ${selectedSuggestions[res.clauseId] ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>{selectedSuggestions[res.clauseId] ? <Icon name="X"/> : <CheckLineart size={16} className="stroke-white"/>}</button>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{res.reason}</p>
                                    <textarea className="w-full text-xs p-2 bg-gray-50 dark:bg-slate-800 rounded border-none resize-y" value={res.conclusion_report} onChange={e => {
                                        const newArr = [...analysisResult]; newArr[i].conclusion_report = e.target.value; setAnalysisResult(newArr);
                                    }}/>
                                </div>
                            )) : <div className="text-center text-gray-400 mt-10">No Analysis Results.</div>}
                        </div>
                    </div>

                    {/* Block 3: Report */}
                    <div className={`flex flex-col bg-white dark:bg-slate-900 transition-all duration-500 ${layoutMode === 'report' || layoutMode === 'split' ? 'block-grow' : 'block-shrink'}`}>
                         <div className="px-6 py-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center z-10">
                            <h3 className="font-semibold text-lg text-slate-500 dark:text-slate-400 flex items-center gap-3"><span className="bg-blue-100 dark:bg-blue-900 text-blue-700 w-8 h-8 flex items-center justify-center rounded-lg">3</span> Report</h3>
                            <div className="flex gap-2">
                                {finalReportText && <button onClick={() => handleExport(finalReportText, 'report')} disabled={isExportLoading} className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center">{isExportLoading ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Download"/>}</button>}
                                <button onClick={() => setLayoutMode(layoutMode === 'report' ? 'split' : 'report')} className="w-10 h-10 text-gray-400 hover:text-blue-600"><Icon name={layoutMode === 'report' ? "CollapsePanel" : "ExpandPanel"}/></button>
                            </div>
                        </div>
                        <div className="flex-1 p-6 flex flex-col gap-4 bg-gray-50/50 dark:bg-slate-950 min-h-0 relative">
                             {isReportLoading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <SparkleLoader size={32}/>
                                    <p className="text-indigo-600 mt-4">Generating Report...</p>
                                </div>
                             ) : (
                                <textarea className="flex-1 w-full h-full p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono resize-none outline-none dark:text-slate-200" value={finalReportText || ""} onChange={e => setFinalReportText(e.target.value)} placeholder="Generate report to view..."/>
                             )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ReleaseNotesModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            
            <Modal isOpen={showImportModal} title="Import Standard" onClose={() => setShowImportModal(false)}>
                 <div className="space-y-4">
                    <textarea className="w-full h-32 p-3 bg-gray-50 dark:bg-slate-800 border rounded-xl text-xs font-mono" placeholder="Paste text..." value={importText} onChange={e => setImportText(e.target.value)}></textarea>
                    <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer" onPaste={(e) => {
                         const items = e.clipboardData.items; const files = [];
                         for(let i=0; i<items.length; i++) if (items[i].type.indexOf("image") !== -1) files.push(items[i].getAsFile());
                         if(files.length) setImportImages([...importImages, ...files as File[]]);
                    }}>
                        <p className="text-xs">Paste Images (Ctrl+V)</p>
                        <div className="flex gap-2 justify-center mt-2 flex-wrap">
                            {importImages.map((img, i) => <span key={i} className="text-[10px] bg-gray-200 px-2 py-1 rounded">{img.name}</span>)}
                        </div>
                    </div>
                    <button onClick={handleImportStandard} disabled={!!importStatus} className="w-full h-10 bg-indigo-600 text-white rounded-xl font-bold">{importStatus || "Process & Add"}</button>
                 </div>
            </Modal>
        </div>
    );
}

export default App;