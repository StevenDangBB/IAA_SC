
import React, { useState } from 'react';
import { Modal, Icon } from '../UI';
import { AuditProcess } from '../../types';

interface ManageProcessesModalProps {
    isOpen: boolean;
    onClose: () => void;
    processes: AuditProcess[];
    activeProcessId: string | null;
    onChangeScope: (id: string) => void;
    onRenameScope: (id: string, name: string) => void;
    onDeleteScope: (id: string) => void;
    onAddScope: (name: string) => void;
}

export const ManageProcessesModal: React.FC<ManageProcessesModalProps> = ({
    isOpen, onClose, processes, activeProcessId, onChangeScope, onRenameScope, onDeleteScope, onAddScope
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [newName, setNewName] = useState("");

    const handleStartEdit = (p: AuditProcess) => {
        setEditingId(p.id);
        setEditName(p.name);
    };

    const handleSaveEdit = () => {
        if (editingId && editName.trim()) {
            onRenameScope(editingId, editName.trim());
        }
        setEditingId(null);
    };

    const handleAdd = () => {
        if(newName.trim()) {
            onAddScope(newName.trim());
            setNewName("");
        }
    };

    const handleDelete = (id: string, name: string) => {
        if(confirm(`Are you sure you want to permanently delete process "${name}" and all its evidence?`)) {
            onDeleteScope(id);
        }
    };

    return (
        <Modal isOpen={isOpen} title="Manage Processes" onClose={onClose}>
            <div className="space-y-6">
                
                {/* Add New Section */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase block mb-2">Create New Process</label>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                            placeholder="e.g. Sales, HR, IT..."
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        />
                        <button 
                            onClick={handleAdd}
                            disabled={!newName.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                        >
                            <Icon name="Plus" size={18}/>
                        </button>
                    </div>
                </div>

                {/* List Section */}
                <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-bold text-slate-500 uppercase">Existing Processes ({processes.length})</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                        {processes.map(p => {
                            const isActive = activeProcessId === p.id;
                            const isEditing = editingId === p.id;

                            return (
                                <div 
                                    key={p.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-600'}`}
                                >
                                    <div 
                                        className={`w-3 h-3 rounded-full flex-shrink-0 cursor-pointer ${isActive ? 'bg-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800' : 'bg-slate-300 dark:bg-slate-700 hover:bg-indigo-400'}`}
                                        onClick={() => onChangeScope(p.id)}
                                        title={isActive ? "Active Process" : "Switch to this Process"}
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <input 
                                                autoFocus
                                                className="w-full bg-white dark:bg-slate-800 border border-indigo-300 rounded px-2 py-1 text-sm font-bold"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onBlur={handleSaveEdit}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                            />
                                        ) : (
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold truncate ${isActive ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {p.name}
                                                </span>
                                                {isActive && <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">Current Active</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {!isEditing && (
                                            <button 
                                                onClick={() => handleStartEdit(p)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                title="Rename"
                                            >
                                                <Icon name="FileEdit" size={16}/>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(p.id, p.name)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Icon name="Trash2" size={16}/>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {processes.length === 0 && (
                            <div className="text-center py-8 text-slate-400 italic text-sm">
                                No processes defined yet. Create one above.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
