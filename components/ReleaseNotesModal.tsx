
import { useState, useEffect } from 'react';
import { Icon } from './UI';
import { APP_VERSION, RELEASE_NOTES, KEY_CAPABILITIES, BUILD_TIMESTAMP } from '../constants';

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
        { id: 'guide', label: 'User Guide', icon: 'BookOpen' },
        { id: 'tech', label: 'System Blueprint', icon: 'Cpu' },
        { id: 'changelog', label: 'Releases', icon: 'History' },
    ];

    const techStackData = [
        { layer: "Architecture", tech: "React + Vite + Modal Manager", role: "Modular Component System", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
        { layer: "Styling", tech: "Tailwind CSS", role: "Utility-first styling, Dark mode adaptive", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
        { layer: "AI Engine", tech: "Google Gemini 3.0 Pro", role: "Reasoning, Analysis, Vision OCR", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
        { layer: "State", tech: "Context API + Refs", role: "High-Performance Reactive State", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
        { layer: "Processing", tech: "Dual-Stream Synthesis", role: "Matrix + Unstructured Data Merging", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" }
    ];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 fade-in backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] md:h-[85vh] border border-gray-100 dark:border-slate-800 transform transition-all scale-100 overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
                {/* --- HEADER --- */}
                <div className="flex-shrink-0 relative overflow-hidden group border-b border-gray-100 dark:border-slate-800">
                    {/* Background - Quantum Mesh Effect */}
                    <div className="absolute inset-0 bg-slate-950">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e51a_1px,transparent_1px),linear-gradient(to_bottom,#4f46e51a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse-slow"></div>
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                    </div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-50 p-2 bg-slate-800/50 rounded-full hover:bg-red-500/20 transition-all border border-transparent hover:border-red-500/30"><Icon name="X" size={20}/></button>

                    <div className="relative px-6 py-6 md:px-8 md:py-8 flex flex-col md:flex-row items-center md:items-start gap-6 z-10">
                        {/* Avatar / Logo */}
                        <div className="relative flex-shrink-0 mb-4 md:mb-0 group/logo">
                            <div className="relative w-24 h-24 rounded-2xl p-1 bg-gradient-to-br from-slate-800 to-slate-950 ring-1 ring-white/10 z-10 overflow-hidden shadow-2xl mx-auto md:mx-0 flex items-center justify-center backdrop-blur-xl">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-700"></div>
                                <div className="transform scale-150 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                    <Icon name="TDLogo" size={64} />
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-cyan-200 tracking-tight leading-none mb-2 drop-shadow-sm">
                                ISO Audit Pro
                            </h2>
                            <p className="text-indigo-200/70 text-sm font-medium mb-6 tracking-wide uppercase">
                                Next-Gen Compliance Intelligence
                            </p>
                            
                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                {tabs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t.id as any)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 ${activeTab === t.id ? 'bg-white text-indigo-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white border border-white/5'}`}
                                    >
                                        <Icon name={t.icon} size={16}/> {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* --- BODY --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-gray-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
                    
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">System Status</h4>
                                <div className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr] gap-y-3 gap-x-4 items-center">
                                    <span className="text-sm font-medium text-slate-500 text-right">Version</span>
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">v{APP_VERSION}</span>
                                    <span className="text-sm font-medium text-slate-500 text-right">Build</span>
                                    <span className="font-mono text-[10px] text-slate-500 break-words">{BUILD_TIMESTAMP}</span>
                                    <span className="text-sm font-medium text-slate-500 text-right">Engine</span>
                                    <span className="font-mono text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded w-fit border border-amber-100 dark:border-amber-800">Gemini 3.0 Pro</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {KEY_CAPABILITIES.map((cap, idx) => (
                                    <div key={idx} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 flex items-start gap-3 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400"><Icon name={cap.icon} size={20}/></div>
                                        <div>
                                            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">{cap.title}</h5>
                                            <p className="text-xs text-slate-500 mt-1">{cap.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GUIDE TAB */}
                    {activeTab === 'guide' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                            <section>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Audit Workflow</h3>
                                <ol className="list-decimal list-inside space-y-4 text-sm text-slate-600 dark:text-slate-300 marker:text-indigo-500 marker:font-bold">
                                    <li className="pl-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">Planning Phase:</span>
                                        <p className="mt-1 ml-1 text-slate-500 text-xs leading-relaxed">
                                            Define processes in the Sidebar. Use the <strong>Planning View</strong> (Matrix) to map which ISO clauses apply to which process. This creates the scope for your audit.
                                        </p>
                                    </li>
                                    <li className="pl-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">Execution Phase:</span>
                                        <p className="mt-1 ml-1 text-slate-500 text-xs leading-relaxed">
                                            Switch to <strong>Audit View</strong>. Select a process and input evidence. You can type, dictate voice notes, or drag-and-drop files directly into specific clause rows.
                                        </p>
                                    </li>
                                    <li className="pl-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">Analysis & Findings:</span>
                                        <p className="mt-1 ml-1 text-slate-500 text-xs leading-relaxed">
                                            Click "Analyze". The AI synthesizes your matrix data and uploaded files to determine compliance. Review findings in the <strong>Findings View</strong>.
                                        </p>
                                    </li>
                                    <li className="pl-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">Reporting:</span>
                                        <p className="mt-1 ml-1 text-slate-500 text-xs leading-relaxed">
                                            Generate a final executive summary. Export structured data for your ERP or QMS software.
                                        </p>
                                    </li>
                                </ol>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Pro Tips</h3>
                                <div className="grid gap-3">
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                                        <strong>Offline Mode:</strong> If internet is lost, the app switches to "Local Intelligence" (Heuristic Analysis) automatically.
                                    </div>
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                                        <strong>Privacy Shield:</strong> Toggle the Shield icon in the header to auto-redact emails/phones before sending data to AI.
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* TECH / SYSTEM BLUEPRINT TAB */}
                    {activeTab === 'tech' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8 pb-10">
                            
                            {/* Section 1: Business Logic */}
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <Icon name="Session7_Compass" size={24}/>
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Business Logic & Workflow</h3>
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm">
                                        <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wide">1. Evidence Aggregation</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                                            The system employs a unique <strong>"Dual-Stream Synthesis"</strong> engine.
                                            <br/><br/>
                                            <span className="block mb-2">🔹 <strong>Unstructured Stream:</strong> Captures raw text, OCR data from images/PDFs, and voice dictation logs. Ideal for messy, real-world audit trails.</span>
                                            <span className="block">🔹 <strong>Structured Stream (Matrix):</strong> A tabular interface mapping specific evidence directly to ISO clauses. Ideal for GAP analysis and strict compliance checks.</span>
                                            <br/>
                                            <span className="block mt-2 text-xs italic opacity-75">During analysis, both streams are merged to provide the AI with a complete context.</span>
                                        </p>
                                    </div>

                                    <div className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm">
                                        <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wide">2. Compliance Intelligence</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                                            Compliance is determined not just by matching keywords, but by <strong>Contextual Reasoning</strong>.
                                            <br/><br/>
                                            <span className="block mb-2">🔸 <strong>RAG (Retrieval-Augmented Generation):</strong> If a source PDF is uploaded, the system vectorizes it locally (IndexedDB) to ground the AI's answers in the specific standard's text.</span>
                                            <span className="block">🔸 <strong>Heuristic Fallback:</strong> In offline mode, the system switches to "Local Intelligence", using regex and keyword scoring to estimate compliance without Cloud APIs.</span>
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Section 2: Functional Modules */}
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 pl-2 border-l-4 border-purple-500">Core Functional Modules</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { title: "Smart OCR Engine", desc: "Extracts text from images and scanned PDFs using Google Vision (Cloud) or fallback methods." },
                                        { title: "Privacy Shield", desc: "Client-side PII redaction (Emails, Phones) before data leaves the browser." },
                                        { title: "Report Synthesizer", desc: "Generates final audit reports in Markdown or Plain Text for system integration." },
                                        { title: "Vector Store", desc: "Client-side vector database (IndexedDB) for semantic search of large standards." },
                                        { title: "Neural Pool", desc: "Multi-key management system with smart failover and quota handling." },
                                        { title: "Modal Manager", desc: "Centralized overlay system for handling dialogs and alerts efficiently." }
                                    ].map((feature, i) => (
                                        <div key={i} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">{feature.title}</h5>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{feature.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Section 3: Technical Architecture (Responsive Table) */}
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 pl-2 border-l-4 border-blue-500">Technical Architecture</h3>
                                
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs">
                                            <tr>
                                                <th className="px-6 py-4 font-extrabold">Layer</th>
                                                <th className="px-6 py-4 font-extrabold">Technology</th>
                                                <th className="px-6 py-4 font-extrabold">Role</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900">
                                            {techStackData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{row.layer}</td>
                                                    <td className={`px-6 py-4 font-bold ${row.color}`}>{row.tech}</td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{row.role}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-3">
                                    {techStackData.map((row, idx) => (
                                        <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col gap-2">
                                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.layer}</span>
                                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.bg} ${row.color}`}>
                                                    {row.tech}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                <strong className="text-slate-700 dark:text-slate-300">Role:</strong> {row.role}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </div>
                    )}

                    {/* CHANGELOG TAB */}
                    {activeTab === 'changelog' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="border-l-2 border-slate-200 dark:border-slate-800 space-y-8 pl-6 relative ml-2">
                                {RELEASE_NOTES.map((release, index) => (
                                    <div key={index} className="relative group">
                                        <div className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 transition-colors ${index === 0 ? 'bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                        <div className="flex justify-between mb-2">
                                            <h4 className={`text-sm font-bold ${index === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>v{release.version}</h4>
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{release.date}</span>
                                        </div>
                                        <ul className="space-y-1.5">
                                            {release.features.map((feature, idx) => (
                                                <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                                                    <span className="w-1 h-1 bg-slate-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* FORMAL FOOTER */}
                    <div className="mt-10 pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col items-center">
                        <div className="flex items-center gap-3 mb-2 opacity-80">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-indigo-400 dark:to-indigo-500"></div>
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Architected By</span>
                            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-indigo-400 dark:to-indigo-500"></div>
                        </div>
                        <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white tracking-tight mb-1">
                            Trung Dang Hoang <span className="text-slate-400 dark:text-slate-500 font-serif italic font-normal ml-1">(Steven)</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                            © 2026 All Rights Reserved. Built for ISO Audit Professional Compliance.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectInfoModal;
