
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
    isOpen, onClose, apiKeys, newKeyInput, setNewKeyInput, handleAddKey,
    activeKeyId, editingKeyId, editLabelInput, setEditLabelInput, handleSaveLabel, handleStartEdit,
    handleDeleteKey
}) => {
    const [tab, setTab] = useState<'keys' | 'prompts'>('keys');
    const [promptType, setPromptType] = useState<'ANALYSIS' | 'REPORT' | 'SCHEDULING'>('ANALYSIS');
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
        <Modal isOpen={isOpen} title="Settings & Configuration" onClose={onClose}>
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
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Google Gemini API Keys</h4>
                        
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
                                placeholder="Paste API Key (AIza...)"
                                className="flex-1 p-2.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                                value={newKeyInput}
                                onChange={(e) => setNewKeyInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                            />
                            <button onClick={handleAddKey} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm min-w-[60px] flex items-center justify-center">
                                Add
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {apiKeys.map(k => (
                                <div key={k.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${
                                    k.id === activeKeyId 
                                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/50 shadow-sm' 
                                        : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-500'
                                }`}>
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.id === activeKeyId ? 'bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-white' : 'bg-gray-100 text-gray-400 dark:bg-slate-800'}`}>
                                            <Icon name="Key" size={14}/>
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
                                                    {k.id === activeKeyId && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">Active</span>}
                                                </div>
                                            )}
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{k.key.substr(0, 8)}...******</span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteKey(k.id); }} 
                                        className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors" 
                                        title="Delete Key"
                                    >
                                        <Icon name="Trash2" size={14} />
                                    </button>
                                </div>
                            ))}
                            {apiKeys.length === 0 && (
                                <div className="text-center p-4 text-slate-400 text-xs italic">
                                    No API Keys found. Add one above to start.
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-800/30">
                        <p className="text-[10px] text-yellow-700 dark:text-yellow-500 flex items-center gap-2">
                            <Icon name="Info" size={12}/>
                            Keys are stored locally in your browser. We do not validate them until you run an analysis.
                        </p>
                    </div>
                </div>
            )}

            {tab === 'prompts' && (
                <div className="flex flex-col h-[60vh]">
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setPromptType('ANALYSIS')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${promptType === 'ANALYSIS' ? 'bg-indigo-100 border-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200' : 'border-gray-200 dark:border-slate-700 text-slate-500'}`}>Analysis Logic</button>
                        <button onClick={() => setPromptType('REPORT')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${promptType === 'REPORT' ? 'bg-indigo-100 border-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200' : 'border-gray-200 dark:border-slate-700 text-slate-500'}`}>Report Format</button>
                        <button onClick={() => setPromptType('SCHEDULING')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${promptType === 'SCHEDULING' ? 'bg-indigo-100 border-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200' : 'border-gray-200 dark:border-slate-700 text-slate-500'}`}>Scheduling Plan</button>
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
