
import { useState, useEffect } from 'react';
import { Icon } from './UI';
import { APP_VERSION, RELEASE_NOTES, KEY_CAPABILITIES, BUILD_TIMESTAMP } from '../constants';

const ReleaseNotesModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setImgError(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 fade-in backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col h-[90vh] md:h-[85vh] border border-gray-100 dark:border-slate-800 transform transition-all scale-100 overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
                {/* --- Author Header Section --- */}
                <div className="flex-shrink-0 relative overflow-hidden group">
                    {/* Background Decorative Elements */}
                    <div className="absolute inset-0 bg-slate-900">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    </div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-50 p-2 bg-slate-800/50 rounded-full hover:bg-red-500/20 transition-all border border-transparent hover:border-red-500/30"><Icon name="X" size={20}/></button>

                    <div className="relative px-6 py-6 md:px-8 md:py-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 z-10">
                        {/* Author Image */}
                        <div className="relative flex-shrink-0">
                            <div className="absolute -inset-10 bg-indigo-600/30 rounded-full blur-3xl"></div>
                            <div className="absolute -inset-[6px] rounded-full bg-[conic-gradient(from_0deg,transparent_0_deg,#f472b6_100deg,#8b5cf6_200deg,#06b6d4_300deg,transparent_360deg)] opacity-100 blur-md animate-[spin_4s_linear_infinite]"></div>
                            <div className="absolute -inset-1 bg-gradient-to-br from-amber-400 via-pink-500 to-cyan-500 rounded-full opacity-60 blur-lg animate-pulse"></div>

                            <div className="relative w-24 h-24 rounded-full p-0.5 bg-slate-900 ring-1 ring-white/10 z-10 overflow-hidden shadow-2xl">
                                {!imgError ? (
                                    <img 
                                        src="./author.png"
                                        alt="Trung DANGHOANG" 
                                        className="w-full h-full rounded-full object-cover bg-slate-800 border-2 border-slate-800"
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full flex items-center justify-center bg-black relative overflow-hidden border-2 border-slate-800/50">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#000000_100%)]"></div>
                                        <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                                        <div className="absolute inset-[-100%] bg-gradient-to-tr from-transparent via-cyan-400/30 to-transparent rotate-45 animate-[spinReverse_6s_linear_infinite]"></div>
                                        <div className="relative z-10 transform scale-110 drop-shadow-[0_0_25px_rgba(0,242,195,0.8)]">
                                            <Icon name="TDLogo" size={56} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 z-20 bg-blue-500 text-white p-1 rounded-full border-4 border-slate-900 shadow-sm" title="Verified Creator">
                                <Icon name="CheckLineart" size={12}/> 
                            </div>
                        </div>

                        {/* Author Info */}
                        <div className="flex-1 min-w-0 text-center md:text-left relative z-10">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[0.6rem] font-bold text-amber-500 uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                    Solution Architect
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-[0.6rem] font-bold text-indigo-400 uppercase tracking-widest">
                                    AI Core Lead
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                Trung DANGHOANG
                            </h2>
                            <p className="text-slate-400 text-sm font-medium flex items-center justify-center md:justify-start gap-2">
                                Creator of <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 font-bold">ISO Audit Pro</span>
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* --- Content Body --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-gray-50 dark:bg-slate-950">
                    
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* System Core - ALIGNED GRID */}
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                                <Icon name="Cpu" size={14}/> System Core
                            </h4>
                            <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 items-center">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 text-right">App Version</span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm tabular-nums">v{APP_VERSION}</span>
                                
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 text-right">Build Time</span>
                                <span className="font-mono text-[10px] text-slate-500 tabular-nums leading-tight">{BUILD_TIMESTAMP}</span>
                                
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 text-right">Engine</span>
                                <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded inline-block w-fit">Gemini 3.0 Pro</span>
                            </div>
                        </div>

                        {/* Capabilities - ALIGNED LIST */}
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                                <Icon name="Sparkle" size={14}/> Capabilities
                            </h4>
                            <div className="space-y-3">
                                {KEY_CAPABILITIES.map((cap, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></div>
                                        <div className="flex-1">
                                            <span className="text-xs font-bold text-slate-800 dark:text-white block mb-0.5">{cap.title}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight block">{cap.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Release History - STRICT TIMELINE ALIGNMENT */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Icon name="History" size={14}/> Release History
                        </h4>
                        
                        <div className="ml-2 border-l-2 border-slate-200 dark:border-slate-800 space-y-8 pl-6 relative">
                            {RELEASE_NOTES.map((release, index) => (
                                <div key={index} className="relative group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 transition-colors duration-300 ${index === 0 ? 'bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                    
                                    {/* Header Row: Version and Date perfectly aligned */}
                                    <div className="flex flex-row items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`text-sm font-bold tabular-nums ${index === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                v{release.version}
                                            </h4>
                                            {index === 0 && <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded uppercase">Latest</span>}
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded tabular-nums">
                                            {release.date}
                                        </span>
                                    </div>
                                    
                                    {/* Content Features */}
                                    <ul className="space-y-1.5">
                                        {release.features.map((feature, idx) => {
                                            const [tag, ...rest] = feature.split(':');
                                            const hasTag = rest.length > 0;
                                            return (
                                                <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                                                    {hasTag ? (
                                                        <>
                                                            <span className="font-bold text-[9px] min-w-[50px] text-right uppercase text-slate-400 dark:text-slate-500 mt-0.5">{tag}</span>
                                                            <span className="text-slate-300 dark:text-slate-600">|</span>
                                                            <span>{rest.join(':')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="w-1 h-1 bg-slate-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                                            <span>{feature}</span>
                                                        </>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-10 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
                        <p className="text-[10px] text-slate-400">
                            © 2025 Trung DANGHOANG. All rights reserved. <br/>
                            Built for ISO Audit Professional Compliance.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReleaseNotesModal;
