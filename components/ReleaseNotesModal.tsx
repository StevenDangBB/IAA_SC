import { Icon } from './UI';
import { APP_VERSION, RELEASE_NOTES, KEY_CAPABILITIES } from '../constants';

const ReleaseNotesModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const currentBuildTime = new Date().toISOString().substring(0, 19).replace('T', ' ');

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 fade-in backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col h-[85vh] border border-gray-100 dark:border-slate-800 transform transition-all scale-100 overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
                {/* --- Author Header Section --- */}
                <div className="flex-shrink-0 relative overflow-hidden group">
                    {/* Background Decorative Elements */}
                    <div className="absolute inset-0 bg-slate-900">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    </div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-50 p-2 bg-slate-800/50 rounded-full hover:bg-red-500/20 transition-all border border-transparent hover:border-red-500/30"><Icon name="X" size={20}/></button>

                    <div className="relative px-8 py-8 flex items-center gap-8 z-10">
                        {/* Author Image with Glow Effect */}
                        <div className="relative flex-shrink-0">
                            <div className="absolute -inset-1 bg-gradient-to-br from-amber-300 via-orange-500 to-indigo-600 rounded-full opacity-70 blur-sm animate-pulse-slow"></div>
                            <div className="relative w-24 h-24 rounded-full p-1 bg-slate-900 ring-1 ring-white/10">
                                <img 
                                    src="./author.png" 
                                    alt="Trung DANGHOANG" 
                                    className="w-full h-full rounded-full object-cover bg-slate-800"
                                    onError={(e) => {
                                        // Fallback if image not found
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <div className="hidden w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-400">
                                    <Icon name="User" size={32}/>
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full border-4 border-slate-900 shadow-sm" title="Verified Creator">
                                <Icon name="CheckLineart" size={12}/> 
                                {/* Fallback icon since CheckLineart is component, using generic check */}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                        </div>

                        {/* Author Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[0.6rem] font-bold text-amber-500 uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    Solution Architect
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-[0.6rem] font-bold text-indigo-400 uppercase tracking-widest">
                                    AI Core Lead
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-1 drop-shadow-md">
                                Trung DANGHOANG
                            </h2>
                            <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                                Creator of <span className="text-white font-semibold">ISO Audit Pro</span>
                            </p>
                            <p className="text-slate-500 text-xs mt-2 italic max-w-lg">
                                "Pioneering the intersection of International Standards and Artificial Intelligence to empower the next generation of auditors."
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* --- Content Body --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gray-50 dark:bg-slate-950">
                    
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Icon name="Cpu" size={14}/> System Core
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 dark:text-slate-300">Application Version</span>
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">v{APP_VERSION}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 dark:text-slate-300">Build Timestamp</span>
                                    <span className="font-mono text-xs text-slate-500">{currentBuildTime}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 dark:text-slate-300">AI Engine</span>
                                    <span className="font-mono text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">Gemini 1.5 Pro Vision</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Icon name="Sparkle" size={14}/> Capabilities
                            </h4>
                            <ul className="space-y-2">
                                {KEY_CAPABILITIES.map((cap, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                        <strong className="text-slate-800 dark:text-white">{cap.title}:</strong> {cap.desc}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Icon name="Info" size={14}/> Workflow Process
                        </h4>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                                {['1. Select Standard', '2. Input Evidence', '3. AI Analysis', '4. Report Synthesis'].map((step, idx) => {
                                    const icons = ['Book', 'Keyboard', 'Wand2', 'FileText'];
                                    const colors = ['blue', 'purple', 'pink', 'emerald'];
                                    return (
                                        <div key={idx} className="flex flex-col items-center text-center z-10 w-full sm:w-1/4 group/step">
                                            <div className={`w-10 h-10 rounded-full bg-${colors[idx]}-50 dark:bg-${colors[idx]}-900/20 text-${colors[idx]}-600 dark:text-${colors[idx]}-400 flex items-center justify-center mb-2 shadow-sm border border-${colors[idx]}-100 dark:border-${colors[idx]}-800 ring-2 ring-white dark:ring-slate-900`}>
                                                <Icon name={icons[idx]} size={18}/>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{step}</div>
                                        </div>
                                    );
                                })}
                                {/* Connector Line */}
                                <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-100 dark:bg-slate-800 -z-0 hidden sm:block"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Release History</h4>
                        {RELEASE_NOTES.map((release, index) => (
                            <div key={index} className="mb-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 relative">
                                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-gray-50 dark:ring-slate-950"></div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">v{release.version}</h4>
                                    <span className="text-[0.625rem] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{release.date}</span>
                                </div>
                                <ul className="space-y-1">
                                    {release.features.map((feature, idx) => (
                                        <li key={idx} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                                            <span className="text-indigo-400">•</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
                        <p className="text-[10px] text-slate-400">
                            © {new Date().getFullYear()} Trung DANGHOANG. All rights reserved. <br/>
                            Designed for high-performance ISO Compliance Auditing.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReleaseNotesModal;