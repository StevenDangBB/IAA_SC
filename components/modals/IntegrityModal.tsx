
import React from 'react';
import { Modal, Icon } from '../UI';

interface IntegrityModalProps {
    isOpen: boolean;
    onClose: () => void;
    health: { 
        isHealthy: boolean; 
        score: number; 
        integrity: { label: string, status: 'pass' | 'fail', detail: string }[];
        completeness: { label: string, status: 'pass' | 'fail', detail: string }[];
    };
    isCustomStandard: boolean;
    onResetStandard: () => void;
    onAutoRepair: () => void;
    isRepairing: boolean;
    repairStats: { fixed: number, cleaned: number } | null;
}

export const IntegrityModal: React.FC<IntegrityModalProps> = ({
    isOpen, onClose, health, isCustomStandard, onResetStandard,
    onAutoRepair, isRepairing, repairStats
}) => {
    return (
        <Modal isOpen={isOpen} title="Standard Health Index" onClose={onClose}>
            <div className="space-y-6">
                <div className="flex items-center gap-5 p-5 rounded-3xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-inner dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-xl ring-4 ring-white dark:ring-slate-700 ${health.score > 90 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}>
                        {health.score}%
                    </div>
                    <div className="flex-1">
                        <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Data Health</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-1">{health.isHealthy ? 'Excellent! Data is accurate, clean, and complete for professional use.' : 'Standard data is incomplete or missing Source verification.'}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Integrity Checklist</h5>
                    {[...health.integrity, ...health.completeness].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className={`p-1.5 rounded-full shadow-sm ${item.status === 'pass' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                                    <Icon name={item.status === 'pass' ? "CheckCircle2" : "AlertCircle"} size={18}/>
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                            </div>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-sm uppercase ${item.status === 'pass' ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                                {item.detail}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-center gap-3">
                    {isCustomStandard && (
                        <button 
                            onClick={onResetStandard} 
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border border-red-200 dark:border-red-800"
                        >
                            <Icon name="Trash2" size={14}/>
                            Reset to Default
                        </button>
                    )}
                    
                    {repairStats ? (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-5">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Repair Complete</p>
                                <p className="text-xs text-slate-500">Added {repairStats.fixed} items, Cleaned {repairStats.cleaned} dupes.</p>
                            </div>
                            <button onClick={onClose} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/30">
                                Close & Continue
                            </button>
                        </div>
                    ) : !health.isHealthy && (
                        <button 
                            onClick={onAutoRepair} 
                            disabled={isRepairing}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                        >
                            {isRepairing ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Wand2"/>}
                            {isRepairing ? "AI is Fixing..." : "Auto-Repair Issues with AI"}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
