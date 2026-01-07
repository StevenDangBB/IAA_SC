
import React, { useEffect, useState } from 'react';
import { Icon } from './UI';
import { SessionSnapshot, AuditInfo } from '../types';
import { cleanFileName } from '../utils';

interface RecallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRestore: (snapshot: SessionSnapshot) => void;
}

const RecallModal = ({ isOpen, onClose, onRestore }: RecallModalProps) => {
    const [history, setHistory] = useState<SessionSnapshot[]>([]);
    const [currentAutoSave, setCurrentAutoSave] = useState<SessionSnapshot | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadSnapshots();
        }
    }, [isOpen]);

    const loadSnapshots = () => {
        try {
            // 1. Load the "Current Tip" (Auto-save state)
            const autoSaveRaw = localStorage.getItem("iso_session_data");
            if (autoSaveRaw) {
                const data = JSON.parse(autoSaveRaw);
                // Validate if it has meaningful data
                const hasData = data.evidence?.trim() || data.selectedClauses?.length > 0 || data.auditInfo?.company;
                if (hasData) {
                    setCurrentAutoSave({
                        id: 'current_autosave',
                        timestamp: Date.now(), // Approximate
                        label: 'Latest Auto-Save',
                        triggerType: 'AUTO_SAVE',
                        data: data
                    });
                } else {
                    setCurrentAutoSave(null);
                }
            } else {
                setCurrentAutoSave(null);
            }

            // 2. Load the "History Vault" (Backups from New Session clicks)
            const historyRaw = localStorage.getItem("iso_session_history");
            if (historyRaw) {
                const list = JSON.parse(historyRaw);
                // Sort by new to old
                setHistory(list.sort((a: SessionSnapshot, b: SessionSnapshot) => b.timestamp - a.timestamp));
            } else {
                setHistory([]);
            }
        } catch (e) {
            console.error("Failed to load session history", e);
        }
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleString();
    };

    const getSnapshotStats = (snap: SessionSnapshot) => {
        let evidenceLen = 0;
        // Check processes (New Format)
        if (snap.data.processes && snap.data.processes.length > 0) {
            evidenceLen = snap.data.processes.reduce((acc, p) => acc + (p.evidence ? p.evidence.length : 0), 0);
        } else if ((snap.data as any).scopes && (snap.data as any).scopes.length > 0) {
             // Check scopes (Legacy/Migration Format via cast)
             evidenceLen = (snap.data as any).scopes.reduce((acc: any, scope: any) => acc + (scope.evidence ? scope.evidence.length : 0), 0);
        } else if ((snap.data as any).evidence) {
            // Check legacy (Old Format)
            evidenceLen = (snap.data as any).evidence.length;
        }
        
        const clausesCount = snap.data.selectedClauses ? snap.data.selectedClauses.length : 0;
        const findingsCount = snap.data.analysisResult ? snap.data.analysisResult.length : 0;
        
        return (
            <div className="flex gap-3 mt-2 text-[10px] text-slate-500 font-mono">
                <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    <Icon name="FileText" size={10}/> {evidenceLen > 0 ? `${(evidenceLen / 1024).toFixed(1)}KB Evid` : 'No Evid'}
                </span>
                <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    <Icon name="CheckSquare" size={10}/> {clausesCount} Clauses
                </span>
                <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    <Icon name="Wand2" size={10}/> {findingsCount} Findings
                </span>
            </div>
        );
    };

    const renderSnapshotCard = (snap: SessionSnapshot, isCurrent: boolean) => (
        <div 
            key={snap.id} 
            onClick={() => onRestore(snap)}
            className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${isCurrent ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg'}`}
        >
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isCurrent ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {isCurrent ? 'ACTIVE STATE' : 'BACKUP ARCHIVE'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{formatDate(snap.timestamp)}</span>
                </div>
            </div>
            
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                {snap.data.auditInfo.company || "Untitled Company"} 
                <span className="font-normal text-slate-400 mx-1">|</span> 
                {snap.data.auditInfo.type || "Untitled Audit"}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">
                Standard: {cleanFileName(snap.data.standardKey).replace(/_/g, ' ')}
            </p>

            {getSnapshotStats(snap)}

            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-indigo-600 text-white p-2 rounded-full shadow-xl">
                    <Icon name="History" size={20}/>
                </div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-zoom-in-spring" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Icon name="History" className="text-indigo-500"/>
                            Session Time Machine
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Select a restoration point. This will overwrite your current workspace.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                        <Icon name="X" size={20}/>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-gray-50/30 dark:bg-slate-950">
                    
                    {/* Current Auto-Save Section */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Available Auto-Save
                        </h4>
                        {currentAutoSave ? renderSnapshotCard(currentAutoSave, true) : (
                            <div className="p-4 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-center text-slate-400 text-xs italic">
                                No active auto-save data found.
                            </div>
                        )}
                    </div>

                    {/* History Vault Section */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Icon name="Lock" size={12}/>
                            Backup Vault (Last 5 Resets)
                        </h4>
                        <div className="space-y-3">
                            {history.length > 0 ? history.map(snap => renderSnapshotCard(snap, false)) : (
                                <div className="p-8 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-center">
                                    <Icon name="Archive" className="mx-auto mb-2 text-slate-300" size={24}/>
                                    <p className="text-slate-500 text-sm">Vault is empty.</p>
                                    <p className="text-slate-400 text-xs">Backups are created automatically when you start a New Session.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
                
                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] text-slate-400">
                        <span className="font-bold text-indigo-500">Pro Tip:</span> Backups are stored locally in your browser. Clearing cache will delete them.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RecallModal;
