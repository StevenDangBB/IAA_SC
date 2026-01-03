
import React, { useState, useRef } from 'react';
import { Icon, Modal } from '../UI';
import { cleanFileName } from '../../utils';

interface AddStandardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, file: File | null) => void;
}

export const AddStandardModal: React.FC<AddStandardModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onAdd(name.trim(), file);
        // Reset
        setName("");
        setFile(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            // Auto-suggest name if empty
            if (!name) {
                const fileName = e.target.files[0].name;
                setName(cleanFileName(fileName.replace(/\.[^/.]+$/, "")).replace(/_/g, " "));
            }
        }
    };

    return (
        <Modal isOpen={isOpen} title="Define New Standard" onClose={onClose}>
            <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                        Create a custom standard entry. For best results, <strong>attach a PDF/DOCX</strong> containing the full standard text. The AI will use this as the "Ground Truth" for citations.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Standard Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input 
                                type="text" 
                                autoFocus
                                className="w-full p-3 pl-10 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-white"
                                placeholder="e.g. ISO 45001:2018 (OH&S)"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            />
                            <div className="absolute left-3 top-3 text-slate-400">
                                <Icon name="Book" size={18}/>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Source Document (Optional)</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`group relative flex items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${file ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".pdf,.docx,.txt" 
                                onChange={handleFileChange}
                            />
                            
                            {file ? (
                                <div className="text-center">
                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                                        <Icon name="CheckThick" size={20}/>
                                    </div>
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[250px]">{file.name}</p>
                                    <p className="text-[10px] text-emerald-600/70">Click to change</p>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <Icon name="UploadCloud" size={28} className="mx-auto mb-2"/>
                                    <p className="text-xs font-bold">Click to Upload PDF / DOCX</p>
                                    <p className="text-[10px] opacity-70">Max 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleSubmit} 
                    disabled={!name.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Icon name="Plus" size={18}/>
                    Create Standard
                </button>
            </div>
        </Modal>
    );
};
