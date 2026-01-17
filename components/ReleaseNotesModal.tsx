
import { useState, useEffect } from 'react';
import { Icon } from './UI';
import { APP_VERSION, RELEASE_NOTES, BUILD_TIMESTAMP } from '../constants';

const ProjectInfoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [imgError, setImgError] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'guide' | 'tech' | 'changelog'>('overview');

    useEffect(() => {
        if (isOpen) {
            setImgError(false);
            setActiveTab('overview');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: 'Session1_SparklePlus' },
        { id: 'guide', label: 'User Manual', icon: 'BookOpen' },
        { id: 'tech', label: 'Data Topology', icon: 'Cpu' },
        { id: 'changelog', label: 'Releases', icon: 'History' },
    ];

    const techStackData = [
        { layer: "Presentation", tech: "React 19 + Tailwind", role: "Atomic UI Components, Glassmorphism", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
        { layer: "Intelligence", tech: "Gemini 3.0 Pro", role: "Reasoning Engine, Multi-Modal Analysis", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
        { layer: "Storage", tech: "IndexedDB + LocalStorage", role: "Vector Embeddings, Session Persistence", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
        { layer: "Security", tech: "Client-Side Redaction", role: "PII Masking (Regex/Heuristic)", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col h-[90vh] md:h-[85vh] border border-white/20 dark:border-slate-700/50 transform transition-all scale-100 overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
                {/* --- HEADER --- */}
                <div className="flex-shrink-0 relative overflow-hidden group border-b border-gray-100 dark:border-slate-800">
                    {/* Artistic Background */}
                    <div className="absolute inset-0 bg-slate-900">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
                    </div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm"><Icon name="X" size={20}/></button>

                    <div className="relative px-6 py-8 md:px-10 flex flex-col md:flex-row items-center md:items-start gap-8 z-10">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-glow mx-auto md:mx-0">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 relative">
                                    {!imgError ? (
                                        <img src="./author.png" alt="Author" className="w-full h-full object-cover" onError={() => setImgError(true)} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-950">
                                            <Icon name="TDLogo" size={48} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-md">
                                ISO AUDIT PRO <span className="bg-white text-slate-900 px-2 py-0.5 rounded ml-2 text-xl shadow-lg align-middle border border-slate-200">v4.0</span>
                            </h2>
                            <p className="text-slate-300 text-sm font-medium mb-6 max-w-2xl mx-auto md:mx-0 leading-relaxed opacity-90">
                                The AI-Powered Compliance Assistant leveraging Gemini 3.0. Designed for Auditors, by Auditors.
                            </p>
                            
                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                {tabs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t.id as any)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 backdrop-blur-md border ${activeTab === t.id ? 'bg-white/20 border-white/30 text-white shadow-lg' : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
                                    >
                                        <Icon name={t.icon} size={14}/> {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* --- BODY --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-gray-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
                    
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="animate-fade-in-up space-y-8">
                            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Icon name="Session10_Pulse" size={100}/></div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">Production Status</h4>
                                <div className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-6 items-center relative z-10">
                                    <span className="text-sm font-medium text-slate-500 text-right">Version</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">v{APP_VERSION}</span>
                                        <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded font-bold uppercase">Stable / PRD</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-500 text-right">Build</span>
                                    <span className="font-mono text-[10px] text-slate-500 break-words">{BUILD_TIMESTAMP}</span>
                                    <span className="text-sm font-medium text-slate-500 text-right">Engine</span>
                                    <span className="font-mono text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded w-fit">Gemini 3.0 Pro</span>
                                </div>
                            </div>

                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <h3>Welcome to Project Onyx</h3>
                                <p>
                                    This application is designed to streamline the ISO audit lifecycle. It acts as an intelligent co-pilot, 
                                    helping you map evidence to clauses, verify compliance, and draft professional reports in seconds.
                                </p>
                                <p>
                                    <strong>Philosophy:</strong> We believe in "Augmented Intelligence" — the AI does not replace the auditor; 
                                    it handles the drudgery (mapping, typing, formatting) so the auditor can focus on judgment and interviewing.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* GUIDE TAB */}
                    {activeTab === 'guide' && (
                        <div className="animate-fade-in-up space-y-8 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Auditor's Field Manual</h3>
                                <div className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">Recommended Workflow</div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* STEP 1 */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">1</div>
                                        <h4 className="font-bold text-lg">Initialize Session</h4>
                                    </div>
                                    <div className="pl-11 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                                        <p>Start in the <strong>Sidebar</strong>. Enter the audit context (Client Name, Auditor Name).</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Select a Standard (e.g., ISO 9001:2015).</li>
                                            <li>(Optional) Upload a PDF of the standard for "Ground Truth" RAG lookup.</li>
                                            <li>Configure <strong>Privacy Shield</strong> if dealing with sensitive client data.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* STEP 2 */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">2</div>
                                        <h4 className="font-bold text-lg">Define Processes</h4>
                                    </div>
                                    <div className="pl-11 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                                        <p>The system is <strong>Process-Centric</strong>. In the Sidebar, create processes (e.g., "HR", "Sales", "IT").</p>
                                        <p className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-100 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs">
                                            <strong>Tip:</strong> An audit finding is always tied to a Process + Clause combination.
                                        </p>
                                    </div>
                                </div>

                                {/* STEP 3 */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">3</div>
                                        <h4 className="font-bold text-lg">Plan & Map Clauses</h4>
                                    </div>
                                    <div className="pl-11 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                                        <p>Go to <strong>Tab 1: Planning</strong>. Use the Matrix View to assign clauses to processes.</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Click cells to toggle applicability.</li>
                                            <li>Use the "Resources" sub-tab to generate an automated Audit Agenda/Schedule using AI.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* STEP 4 */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold">4</div>
                                        <h4 className="font-bold text-lg">Collect Evidence</h4>
                                    </div>
                                    <div className="pl-11 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                                        <p>Go to <strong>Tab 2: Audit</strong>. This is your execution screen.</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Select a Process from the top bar.</li>
                                            <li>Select a Clause in the sidebar checklist.</li>
                                            <li>Type evidence or <strong>Drop Files</strong> (Images/PDF) directly into the text editor.</li>
                                            <li>The AI handles OCR automatically for images.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* STEP 5 */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">5</div>
                                        <h4 className="font-bold text-lg">Analyze & Report</h4>
                                    </div>
                                    <div className="pl-11 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                                        <p>Click "Analyze" in the Audit tab. Move to <strong>Tab 3: Findings</strong>.</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Review AI judgments (Compliant/NC). Use "Shadow Review" to critique the finding.</li>
                                            <li>Finally, go to <strong>Tab 4: Report</strong> to generate the Executive Summary and full report.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TECH TAB */}
                    {activeTab === 'tech' && (
                        <div className="animate-fade-in-up space-y-8">
                            <div className="grid md:grid-cols-2 gap-6">
                                {techStackData.map((row, idx) => (
                                    <div key={idx} className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col gap-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-slate-800/50">
                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{row.layer}</span>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.bg} ${row.color}`}>{row.tech}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            <strong className="text-slate-700 dark:text-slate-300">Role:</strong> {row.role}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Data Topology & Flow</h4>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="min-w-[120px] text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 text-right mt-1">AuditProcess</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            The root container. Contains <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">matrixData</code> (Process x Clause mapping) and <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">evidence</code> (Unstructured text).
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="min-w-[120px] text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 text-right mt-1">AnalysisResult</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            Generated by AI. It is <strong>stateless</strong> relative to the source evidence (snapshot in time). If you edit evidence, you must re-run analysis.
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="min-w-[120px] text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 text-right mt-1">Dual-Stream Engine</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            The AI prompt receives two distinct streams:
                                            <ol className="list-decimal pl-4 mt-1 space-y-1">
                                                <li><strong>Direct Evidence:</strong> Specific text typed into the matrix row for that exact clause.</li>
                                                <li><strong>Contextual Evidence:</strong> General process notes + evidence from "Sibling Clauses" (e.g., verifying Clause 6 checks 6.1 and 6.2 automatically).</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CHANGELOG TAB */}
                    {activeTab === 'changelog' && (
                        <div className="animate-fade-in-up">
                            <div className="space-y-8 pl-4 relative">
                                <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-indigo-500 via-slate-200 to-transparent dark:via-slate-800"></div>
                                {RELEASE_NOTES.map((release, index) => (
                                    <div key={index} className="relative pl-6">
                                        <div className={`absolute left-[-4px] top-1.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 transition-all ${index === 0 ? 'bg-indigo-500 scale-125 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className={`text-sm font-bold ${index === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>v{release.version}</h4>
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{release.date}</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {release.features.map((feature, idx) => (
                                                <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                                                    <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mt-1.5 flex-shrink-0"></span>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* FOOTER */}
                    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col items-center opacity-70">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Architected By</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                            Trung Dang Hoang <span className="text-slate-400 font-normal italic">(Steven)</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">© 2026 ISO AUDIT PRO. All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectInfoModal;
