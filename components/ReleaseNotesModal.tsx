import React from 'react';
import { Icon } from './UI';
import { APP_VERSION, RELEASE_NOTES, KEY_CAPABILITIES } from '../constants';

const ReleaseNotesModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const currentBuildTime = new Date().toISOString().substring(0, 19).replace('T', ' ');

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 fade-in backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col h-[85vh] border border-gray-100 dark:border-slate-800 transform transition-all scale-100 overflow-hidden" onClick={e => e.stopPropagation()}>
                
                <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-50 p-2 bg-slate-800/50 rounded-full hover:bg-red-500/20 transition-all"><Icon name="X" size={20}/></button>
                    
                    <div className="flex items-center gap-6 border-b border-slate-700/50">
                        <div className="w-16 h-16 flex-shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 p-0.5 shadow-lg shadow-amber-500/20">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-amber-500">
                                <Icon name="Wand2" size={32}/>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-[10px] font-bold text-amber-500 tracking-widest uppercase border border-amber-500/30 px-2 py-0.5 rounded-full bg-amber-500/10">Solution Architect / AI Core</h4>
                                <span className="text-xs text-slate-400">v{APP_VERSION}</span>
                            </div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">ISO Audit Assistant</h2>
                            <p className="text-slate-400 text-xs mt-1 max-w-md line-clamp-1">Empowering auditors with AI-driven intelligence.</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50 dark:bg-slate-950">
                    <div className="mb-8 p-4 rounded-xl bg-indigo-50 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Application Description</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            The ISO Audit Assistant is a tool designed to support Lead Auditors during the preparation and execution of audits. The application integrates Gemini AI to perform compliance analysis, identify non-conformities (NC/OFI) from audit notes/evidence, and generate the final report using a professional standard format.
                        </p>
                        <div className="mt-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                            Version: <strong className="text-indigo-600 dark:text-indigo-400">v{APP_VERSION}</strong> | Build Time: <strong className="text-indigo-600 dark:text-indigo-400">{currentBuildTime}</strong>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Icon name="Info" size={14}/> Workflow Process
                        </h4>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                                {['1. Select', '2. Input', '3. Analyze', '4. Report'].map((step, idx) => {
                                    const icons = ['Book', 'Keyboard', 'Wand2', 'FileText'];
                                    const colors = ['blue', 'purple', 'pink', 'emerald'];
                                    return (
                                        <div key={idx} className="flex flex-col items-center text-center z-10 step-connector w-full sm:w-1/4 group/step">
                                            <div className={`w-12 h-12 rounded-xl bg-${colors[idx]}-50 dark:bg-${colors[idx]}-900/20 text-${colors[idx]}-600 dark:text-${colors[idx]}-400 flex items-center justify-center mb-2 shadow-sm border border-${colors[idx]}-100 dark:border-${colors[idx]}-800`}>
                                                <Icon name={icons[idx]} size={20}/>
                                            </div>
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{step}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Key Capabilities</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {KEY_CAPABILITIES.map((cap, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                                    <div className="mt-0.5 text-indigo-500 dark:text-indigo-400"><Icon name={cap.icon} size={16}/></div>
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{cap.title}</h5>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{cap.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Release History</h4>
                        {RELEASE_NOTES.map((release, index) => (
                            <div key={index} className="mb-4 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">v{release.version}</h4>
                                    <span className="text-[10px] text-slate-400 font-mono">{release.date}</span>
                                </div>
                                <ul className="space-y-1">
                                    {release.features.map((feature, idx) => (
                                        <li key={idx} className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                                            <span className="mt-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"></span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReleaseNotesModal;