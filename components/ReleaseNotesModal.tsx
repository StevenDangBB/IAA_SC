
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
        { id: 'tech', label: 'Architecture', icon: 'Cpu' },
        { id: 'changelog', label: 'Releases', icon: 'History' },
    ];

    const techStackData = [
        { layer: "Frontend", tech: "React 19 + Vite", role: "Component Lifecycle, State Management", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
        { layer: "Styling", tech: "Tailwind CSS", role: "Utility-first, Dark mode adaptive, Glassmorphism", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
        { layer: "AI Engine", tech: "Google Gemini 3.0", role: "Reasoning, Analysis, Vision OCR", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
        { layer: "Storage", tech: "IndexedDB + LocalStorage", role: "Vector Store, Session Persistence", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] md:h-[85vh] border border-white/20 dark:border-slate-700/50 transform transition-all scale-100 overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
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
                                ISO Audit <span className="font-light opacity-80">Pro</span>
                            </h2>
                            <p className="text-slate-300 text-sm font-medium mb-6 max-w-lg mx-auto md:mx-0 leading-relaxed opacity-90">
                                The AI-Powered Compliance Assistant leveraging Gemini 3.0 for intelligent, automated ISO auditing.
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
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">System Status</h4>
                                <div className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-6 items-center relative z-10">
                                    <span className="text-sm font-medium text-slate-500 text-right">Version</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">v{APP_VERSION}</span>
                                        <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded font-bold uppercase">Stable</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-500 text-right">Build</span>
                                    <span className="font-mono text-[10px] text-slate-500 break-words">{BUILD_TIMESTAMP}</span>
                                    <span className="text-sm font-medium text-slate-500 text-right">Engine</span>
                                    <span className="font-mono text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded w-fit">Gemini 3.0 Pro / Flash</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {KEY_CAPABILITIES.map((cap, idx) => (
                                    <div key={idx} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-start gap-4 hover:shadow-md transition-shadow">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm"><Icon name={cap.icon} size={20}/></div>
                                        <div>
                                            <h5 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{cap.title}</h5>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{cap.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GUIDE TAB */}
                    {activeTab === 'guide' && (
                        <div className="animate-fade-in-up space-y-8 max-w-3xl mx-auto">
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span> Workflow
                                </h3>
                                <div className="space-y-4 relative pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                                    {[
                                        { title: "Context Setup", desc: "Select a Standard (ISO 9001/27001) via Sidebar. Upload a source PDF to enable Retrieval-Augmented Generation (RAG)." },
                                        { title: "Evidence Collection", desc: "Use the 'Audit' tab. Toggle between Document Mode (Unstructured) and Matrix Mode (Structured). Drop files directly onto matrix rows." },
                                        { title: "AI Analysis", desc: "Select clauses and click 'Analyze'. The engine uses a Dual-Stream approach to verify compliance against the standard." },
                                        { title: "Reporting", desc: "Review findings, refine conclusions, and generate the final report in Markdown or Plain Text." }
                                    ].map((step, idx) => (
                                        <div key={idx} className="relative">
                                            <span className="absolute -left-[25px] top-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">{idx+1}</span>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{step.title}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
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
                        <p className="text-[10px] text-slate-400 mt-1">© 2026 ISO Audit Pro. All Rights Reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectInfoModal;
