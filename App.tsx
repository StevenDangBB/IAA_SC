            <Modal isOpen={showSettingsModal} title="Settings & Neural Network" onClose={() => setShowSettingsModal(false)}>
                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">API Key Pool Management</h4>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="password" 
                                placeholder="Enter Google Gemini API Key..." 
                                className="flex-1 p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-gray-400 placeholder-gray-400"
                                value={newKeyInput}
                                onChange={(e) => setNewKeyInput(e.target.value)}
                            />
                            <button onClick={handleAddKey} disabled={isCheckingKey} className="p-2 bg-indigo-600 text-white rounded-xl font-bold text-xs disabled:opacity-50">
                                {isCheckingKey ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Plus"/>}
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {apiKeys.map(k => (
                                <div key={k.id} className={`flex items-center justify-between p-2 rounded-xl border ${k.id === activeKeyId ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800'}`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-2 h-2 rounded-full ${k.status === 'valid' ? 'bg-emerald-500' : k.status === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <div className="flex flex-col min-w-0">
                                            {editingKeyId === k.id ? (
                                                <input autoFocus className="text-xs bg-transparent border-b border-indigo-500 outline-none w-20" value={editLabelInput} onChange={e => setEditLabelInput(e.target.value)} onBlur={handleSaveLabel} onKeyDown={e => e.key === 'Enter' && handleSaveLabel()} />
                                            ) : (
                                                <span onClick={() => handleStartEdit(k)} className="text-xs font-bold truncate cursor-pointer hover:text-indigo-500">{k.label}</span>
                                            )}
                                            <span className="text-[10px] text-slate-400 font-mono truncate">{k.key.substr(0, 8)}...</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {k.activeModel && <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-500">{k.activeModel.split('-')[1]}</span>}
                                        <button onClick={() => handleRefreshStatus(k.id)} className="p-1.5 text-slate-400 hover:text-indigo-500"><Icon name="RefreshCw" size={14}/></button>
                                        <button onClick={() => handleDeleteKey(k.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Icon name="Trash2" size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><Icon name="Session10_Pulse" size={18}/></div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Auto Health Check</h4>
                                <p className="text-xs text-slate-500">Periodically validate API keys in background</p>
                            </div>
                        </div>
                        <button onClick={() => toggleAutoCheck(!isAutoCheckEnabled)} className={`w-10 h-5 rounded-full transition-colors relative ${isAutoCheckEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isAutoCheckEnabled ? 'left-6' : 'left-1'}`}></div>
                        </button>
                    </div>
                </div>
            </Modal>