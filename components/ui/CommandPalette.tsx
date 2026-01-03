
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Primitives';

export const CommandPaletteModal = ({ isOpen, onClose, actions, onSelectAction }: any) => {
    const [search, setSearch] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSearch("");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const filteredActions = actions.filter((a: any) => 
        a.label.toLowerCase().includes(search.toLowerCase()) || 
        (a.desc && a.desc.toLowerCase().includes(search.toLowerCase()))
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4 md:px-0 animate-in fade-in duration-200" onClick={onClose}>
            <div 
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col animate-zoom-in-spring duration-300 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_10px_15px_-3px_rgba(0,0,0,0.5)]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center px-3 py-3 md:px-4 border-b border-gray-100 dark:border-slate-800">
                    <Icon name="Session6_Zap" className="text-indigo-500 mr-2 md:mr-3 flex-shrink-0" size={20} />
                    <input 
                        ref={inputRef}
                        type="text" 
                        className="flex-1 bg-transparent text-sm md:text-lg outline-none text-slate-800 dark:text-white placeholder-slate-400 min-w-0"
                        placeholder="Type a command or search clauses..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && filteredActions.length > 0) {
                                onSelectAction(filteredActions[0]);
                            } else if (e.key === 'Escape') {
                                onClose();
                            }
                        }}
                    />
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all duration-300 text-slate-400 hover:rotate-90">
                            <Icon name="X" size={20}/>
                        </button>
                    </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                    {filteredActions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No results found.</div>
                    ) : (
                        filteredActions.map((action: any, idx: number) => (
                            <div 
                                key={idx}
                                onClick={() => onSelectAction(action)}
                                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors group ${idx === 0 ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                            >
                                <div className={`p-2 rounded-lg ${action.type === 'clause' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    <Icon name={action.icon || "Session6_Zap"} size={18}/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {action.label}
                                    </h4>
                                    {action.desc && <p className="text-xs text-slate-500 truncate">{action.desc}</p>}
                                </div>
                                
                                {action.type === 'clause' && (
                                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={action.onReference} 
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all"
                                            title="Reference/Lookup"
                                        >
                                            <Icon name="BookOpen" size={16}/>
                                        </button>
                                    </div>
                                )}
                                
                                {action.shortcut && <span className="text-xs text-slate-400">{action.shortcut}</span>}
                            </div>
                        ))
                    )}
                </div>
                <div className="px-4 py-2 bg-gray-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between">
                     <span><strong>Tip:</strong> Search for clauses like "9.2" or actions like "Export".</span>
                     <span>ISO Audit Pro</span>
                </div>
            </div>
        </div>
    );
};
