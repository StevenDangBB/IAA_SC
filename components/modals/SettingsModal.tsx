
import React, { useState, useEffect } from 'react';
import { Icon, Modal } from '../UI';
import { ApiKeyProfile } from '../../types';
import { PromptRegistry } from '../../services/promptRegistry';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKeys: ApiKeyProfile[];
    newKeyInput: string;
    setNewKeyInput: (val: string) => void;
    isCheckingKey: boolean;
    handleAddKey: () => void;
    activeKeyId: string;
    editingKeyId: string | null;
    editLabelInput: string;
    setEditLabelInput: (val: string) => void;
    handleSaveLabel: () => void;
    handleStartEdit: (key: ApiKeyProfile) => void;
    handleRefreshStatus: (id: string) => void;
    handleDeleteKey: (id: string) => void;
    isAutoCheckEnabled: boolean;
    toggleAutoCheck: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen, onClose, apiKeys, newKeyInput, setNewKeyInput, isCheckingKey, handleAddKey,
    activeKeyId, editingKeyId, editLabelInput, setEditLabelInput, handleSaveLabel, handleStartEdit,
    handleRefreshStatus, handleDeleteKey, isAutoCheckEnabled, toggleAutoCheck
}) => {
    const [tab, setTab] = useState<'keys' | 'prompts'>('keys');
    const [promptType, setPromptType] = useState<'ANALYSIS' | 'REPORT'>('ANALYSIS');
    const [promptText, setPromptText] = useState("");

    useEffect(() => {
        if (isOpen && tab === 'prompts') {
            setPromptText(PromptRegistry.getPrompt(promptType).template);
        }
    }, [isOpen, tab, promptType]);

    const handleSavePrompt = () => {
        PromptRegistry.updatePrompt(promptType, promptText);
        const btn = document.getElementById('save-prompt-btn');
        if(btn) { btn.innerText = "Saved!"; setTimeout(() => btn.innerText = "Save Prompt", 1000); }
    };

    const handleResetPrompt = () => {
        PromptRegistry.resetToDefault(promptType);
        setPromptText(PromptRegistry.getPrompt(promptType).template);
    };

    return (
        <Modal isOpen={isOpen} title="Settings & Core Configuration" onClose={onClose}>
            <div className="flex gap-2 mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">
                <button onClick={() => setTab('keys')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'keys' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                    API Keys
                </button>
                <button onClick={() => setTab('prompts')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'prompts' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                    AI Prompts
                </button>
            </div>

            {tab === 'keys' && (
                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 dark:shadow-inner">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">API Key Pool Management</h4>
                        
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                name="search_query_custom" 
                                id="custom_search_input_x"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                                data-lpignore="true" 
                                placeholder="Paste Google Gemini API Key (starts with AIza...)"
                                className="flex-1 p-2.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                                value={newKeyInput}
                                onChange={(e) => setNewKeyInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                            />
                            <button onClick={handleAddKey} disabled={isCheckingKey} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs disabled:opacity-50 transition-colors shadow-sm min-w-[40px] flex items-center justify-center">
                                {isCheckingKey ? <Icon name="Loader" className="animate-spin" /> : <Icon name="Plus" />}
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {apiKeys.map(k => {
                                let statusColor = 'bg-slate-300';
                                let statusTitle = "Unknown Status";
                                if (k.status === 'valid') { statusColor = 'bg-emerald-500 shadow-emerald-500/50'; statusTitle = "Active & Working"; }
                                else if (k.status === 'checking') { statusColor = 'bg-yellow-500 animate-pulse'; statusTitle = "Validating..."; }
                                else if (k.status === 'invalid') { statusColor = 'bg-red-500 shadow-red-500/50'; statusTitle = "Invalid / Auth Failed"; }
                                else if (k.status === 'quota_exceeded') { statusColor = 'bg-orange-500'; statusTitle = "Quota Exceeded"; }
                                else if (k.status === 'referrer_error') { statusColor = 'bg-purple-500'; statusTitle = "Referrer Blocked"; }
                                else if (k.status === 'unknown') { statusColor = 'bg-slate-400 border border-slate-500'; statusTitle = "Network Error"; }

                                return (
                                    <div key={k.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${
                                        k.id === activeKeyId 
                                            ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/50 shadow-sm' 
                                            : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-500'
                                    }`}>
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="relative group/status" title={statusTitle}>
                                                <div className={`w-2.5 h-2.5 flex-shrink-0 rounded-full shadow-sm ring-1 ring-white/10 ${statusColor}`}></div>
                                            </div>
                                            
                                            <div className="flex flex-col min-w-0 flex-1">
                                                {editingKeyId === k.id ? (
                                                    <input 
                                                        autoFocus 
                                                        className="text-xs font-bold bg-white dark:bg-slate-950 text-slate-900 dark:text-white border-b-2 border-indigo-500 outline-none w-32 px-1 rounded-t" 
                                                        value={editLabelInput} 
                                                        onChange={e => setEditLabelInput(e.target.value)} 
                                                        onBlur={handleSaveLabel} 
                                                        onKeyDown={e => e.key === 'Enter' && handleSaveLabel()} 
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span 
                                                            onClick={() => handleStartEdit(k)} 
                                                            className={`text-xs font-bold truncate cursor-pointer transition-colors ${
                                                                k.id === activeKeyId ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400'
                                                            }`}
                                                        >
                                                            {k.label}
                                                        </span>
                                                        {k.activeModel && (
                                                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono">
                                                                {k.activeModel.replace('gemini-', '').replace('-preview', '')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{k.key.substr(0, 8)}...******</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleRefreshStatus(k.id)} 
                                                disabled={k.status === 'checking'}
                                                className={`p-1.5 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors ${k.status === 'checking' ? 'animate-spin' : ''}`}
                                                title="Force Check Quota"
                                            >
                                                <Icon name={k.status === 'checking' ? "Loader" : "RefreshCw"} size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteKey(k.id); }} 
                                                className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors" 
                                                title="Delete Key"
                                            >
                                                <Icon name="Trash2" size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {apiKeys.length === 0 && (
                                <div className="text-center p-4 text-slate-400 text-xs italic">
                                    No API Keys found. Add one above to start.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl"><Icon name="Session10_Pulse" size={18} /></div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Smart Quota Rotation</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Auto-check keys every 60s to restore high-tier models.</p>
                            </div>
                        </div>
                        <button onClick={() => toggleAutoCheck(!isAutoCheckEnabled)} className={`w-10 h-5 rounded-full transition-colors relative ${isAutoCheckEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isAutoCheckEnabled ? 'left-6' : 'left-1'}`}></div>
                        </button>
                    </div>
                </div>
            )}

            {tab === 'prompts' && (
                <div className="flex flex-col h-[60vh]">
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setPromptType('ANALYSIS')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${promptType === 'ANALYSIS' ? 'bg-indigo-100 border-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200' : 'border-gray-200 dark:border-slate-700 text-slate-500'}`}>Analysis Logic</button>
                        <button onClick={() => setPromptType('REPORT')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${promptType === 'REPORT' ? 'bg-indigo-100 border-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200' : 'border-gray-200 dark:border-slate-700 text-slate-500'}`}>Report Format</button>
                    </div>
                    
                    <div className="flex-1 relative border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <textarea 
                            className="w-full h-full p-4 bg-gray-50 dark:bg-slate-950 text-xs font-mono text-slate-700 dark:text-slate-300 resize-none outline-none leading-relaxed"
                            value={promptText}
                            onChange={e => setPromptText(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                        <button onClick={handleResetPrompt} className="text-xs text-slate-400 hover:text-red-500 underline">Reset to Default</button>
                        <button 
                            id="save-prompt-btn"
                            onClick={handleSavePrompt} 
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                        >
                            Save Prompt
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
