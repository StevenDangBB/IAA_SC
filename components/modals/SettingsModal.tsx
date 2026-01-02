
import React from 'react';
import { Icon, Modal } from '../UI';
import { ApiKeyProfile } from '../../types';

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
    return (
        <Modal isOpen={isOpen} title="Settings & Neural Network" onClose={onClose}>
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 dark:shadow-inner">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">API Key Pool Management</h4>
                    
                    {/* Add Key Input Section */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="password"
                            placeholder="Enter Google Gemini API Key..."
                            className="flex-1 p-2.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-600 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                            value={newKeyInput}
                            onChange={(e) => setNewKeyInput(e.target.value.trim())} // Auto-trim on input
                            onBlur={() => setNewKeyInput(newKeyInput.trim())} // Ensure trimmed on blur
                        />
                        <button onClick={handleAddKey} disabled={isCheckingKey} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs disabled:opacity-50 transition-colors shadow-sm">
                            {isCheckingKey ? <Icon name="Loader" className="animate-spin" /> : <Icon name="Plus" />}
                        </button>
                    </div>

                    {/* Key List Section */}
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {apiKeys.map(k => (
                            <div key={k.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${
                                k.id === activeKeyId 
                                    ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-500/20 dark:border-indigo-500/50 shadow-sm' 
                                    : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-500'
                            }`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Status Indicator */}
                                    <div className={`w-2.5 h-2.5 flex-shrink-0 rounded-full shadow-sm ring-1 ring-white/10 ${
                                        k.status === 'valid' ? 'bg-emerald-500 shadow-emerald-500/50' : 
                                        k.status === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 shadow-red-500/50'
                                    }`}></div>
                                    
                                    <div className="flex flex-col min-w-0">
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
                                            <span 
                                                onClick={() => handleStartEdit(k)} 
                                                className={`text-xs font-bold truncate cursor-pointer transition-colors ${
                                                    k.id === activeKeyId ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400'
                                                }`}
                                            >
                                                {k.label}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{k.key.substr(0, 8)}...</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    {k.activeModel && <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-medium">{k.activeModel.split('-')[1]}</span>}
                                    <button onClick={() => handleRefreshStatus(k.id)} className="p-1.5 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors"><Icon name="RefreshCw" size={14} /></button>
                                    <button onClick={() => handleDeleteKey(k.id)} className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"><Icon name="Trash2" size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl"><Icon name="Session10_Pulse" size={18} /></div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Auto Health Check</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Periodically validate API keys in background</p>
                        </div>
                    </div>
                    <button onClick={() => toggleAutoCheck(!isAutoCheckEnabled)} className={`w-10 h-5 rounded-full transition-colors relative ${isAutoCheckEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isAutoCheckEnabled ? 'left-6' : 'left-1'}`}></div>
                    </button>
                </div>
            </div>
        </Modal>
    );
};
