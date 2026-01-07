
import React, { useRef, useState } from 'react';
import { Icon, IconSelect, IconInput } from '../UI';
import { StandardsData, AuditInfo, AuditProcess } from '../../types';
import { AUDIT_TYPES } from '../../constants';
import { useUI } from '../../contexts/UIContext';

interface AuditInfoFormProps {
    standards: StandardsData;
    standardKey: string;
    setStandardKey: (k: string) => void;
    auditInfo: AuditInfo;
    setAuditInfo: (info: AuditInfo) => void;
    onAddNewStandard: () => void;
    onOpenIntegrity: () => void;
    knowledgeFileName: string | null;
    onKnowledgeUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearKnowledge: () => void;
    health: { isHealthy: boolean; score: number };
    auditFieldIconColor: string;
    standardOptions: { value: string; label: string }[];
    
    scopes: AuditProcess[];
    activeScopeId: string | null;
    onAddScope: (name: string) => void;
    onChangeScope: (id: string) => void;
    onRenameScope: (id: string, name: string) => void;
    onDeleteScope: (id: string) => void;
}

export const AuditInfoForm: React.FC<AuditInfoFormProps> = ({
    standards, standardKey, setStandardKey, auditInfo, setAuditInfo,
    onAddNewStandard, onOpenIntegrity,
    knowledgeFileName, onKnowledgeUpload, onClearKnowledge, health, auditFieldIconColor, standardOptions,
    scopes: processes, activeScopeId: activeProcessId, onAddScope: addProcess, onChangeScope: changeProcess, onRenameScope: renameProcess, onDeleteScope: deleteProcess
}) => {
    const { showToast } = useUI();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [inputValue, setInputValue] = useState(""); 
    const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    // Logic icon
    const hasSource = !!knowledgeFileName;
    const isStandardSelected = !!standardKey && standardKey !== "ADD_NEW";
    const sourceIcon = hasSource ? "BookOpen" : "Book";
    
    let sourceColor = "text-gray-300 dark:text-slate-600"; 
    let sourceTooltip = "Please select an ISO Standard first to enable document upload.";
    let cursorClass = "cursor-not-allowed";

    if (hasSource) {
        sourceColor = "text-emerald-500 drop-shadow-sm";
        sourceTooltip = `Source Attached: ${knowledgeFileName}. Click to Replace.`;
        cursorClass = "cursor-pointer";
    } else if (isStandardSelected) {
        sourceColor = `${auditFieldIconColor} hover:text-indigo-600 dark:hover:text-indigo-300`;
        sourceTooltip = "Click to upload Source PDF or Word (DOCX) for better accuracy";
        cursorClass = "cursor-pointer hover:scale-110 active:scale-95";
    }

    const handleIconClick = () => {
        if (!isStandardSelected) return;
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onKnowledgeUpload(e);
            e.target.value = '';
        }
    };

    // --- INPUT HANDLER ---
    const handleAddKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed) {
                const existing = processes.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
                if (existing) {
                    changeProcess(existing.id);
                    showToast(`Switched to: ${existing.name}`);
                } else {
                    addProcess(trimmed);
                    setInputValue(""); 
                }
            }
        }
    };

    // --- SMART DELETE HANDLER ---
    const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation(); 
        e.preventDefault();

        // Check if process has valuable data
        const process = processes.find(p => p.id === id);
        if (process) {
            const hasEvidence = process.evidence && process.evidence.trim().length > 0;
            const hasMatrix = Object.keys(process.matrixData).some(k => 
                process.matrixData[k].some(r => r.evidenceInput && r.evidenceInput.trim().length > 0)
            );
            const hasFiles = process.uploadedFiles && process.uploadedFiles.length > 0;

            if (hasEvidence || hasMatrix || hasFiles) {
                if (window.confirm(`Delete process "${name}"? \n\n⚠️ WARNING: This process contains evidence/files that will be permanently lost.`)) {
                    deleteProcess(id);
                    showToast(`Deleted: ${name}`);
                }
            } else {
                // Empty process - DELETE IMMEDIATELY
                deleteProcess(id);
                showToast(`Deleted: ${name}`);
            }
        }
    };

    const triggerRename = (p: AuditProcess) => {
        setEditingProcessId(p.id);
        setEditName(p.name);
    };

    const saveEditing = () => {
        if (editingProcessId && editName.trim()) {
            renameProcess(editingProcessId, editName.trim());
            showToast("Renamed successfully");
        }
        setEditingProcessId(null);
    };

    const displayProcesses = processes.filter(s => s.name && s.name.trim() !== "");

    return (
        <div className="bg-gray-50/80 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-3 space-y-4">
            <input type="file" ref={fileInputRef} accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileChange} />

            {/* SECTION 1: STANDARD */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Audit Standard</label>
                <div className="relative group/source">
                    <IconSelect 
                        icon={sourceIcon}
                        iconColor={`${sourceColor} transition-all duration-300 ${cursorClass}`}
                        value={standardKey} 
                        onChange={(e: any) => { if (e.target.value === "ADD_NEW") onAddNewStandard(); else setStandardKey(e.target.value); }} 
                        options={standardOptions} 
                        defaultText="Select ISO Standard"
                        onIconClick={handleIconClick}
                        iconTitle={sourceTooltip}
                    />
                    
                    {hasSource && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClearKnowledge(); }}
                            className="absolute right-9 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-20 active:scale-95"
                            title="Remove Source File"
                        >
                            <Icon name="Trash2" size={14} />
                        </button>
                    )}

                    {standardKey && (
                        <button onClick={onOpenIntegrity} className={`absolute -top-1.5 -right-1.5 p-1 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 text-white ring-2 ring-white dark:ring-slate-900 ${health.isHealthy ? 'bg-emerald-500' : 'bg-orange-500'}`} title="Integrity Check">
                            <Icon name={health.isHealthy ? "CheckCircle2" : "AlertCircle"} size={10}/>
                        </button>
                    )}
                </div>
                
                <IconSelect icon="FileEdit" iconColor={auditFieldIconColor} value={auditInfo.type} onChange={(e: any) => setAuditInfo({...auditInfo, type: e.target.value})} options={Object.keys(AUDIT_TYPES).map(key => ({ value: key, label: key }))} defaultText="Select Audit Type" />
            </div>

            <div className="h-px bg-gray-200 dark:bg-slate-700/50"></div>

            {/* SECTION 2: ENTITY & CONTEXT */}
            <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Organization Context</label>
                <div className="grid grid-cols-[1.5fr_1fr] gap-2">
                    <IconInput icon="Building" iconColor={auditFieldIconColor} placeholder="Company Name" value={auditInfo.company} onChange={(e: any) => setAuditInfo({...auditInfo, company: e.target.value})} />
                    <IconInput icon="Tag" iconColor={auditFieldIconColor} placeholder="SMO/ID" value={auditInfo.smo} onChange={(e: any) => setAuditInfo({...auditInfo, smo: e.target.value})} />
                </div>
                
                {/* --- PROCESS MANAGEMENT --- */}
                <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">Process Management</label>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">{displayProcesses.length} Items</span>
                    </div>
                    
                    {/* Creation Input */}
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600 dark:text-indigo-400 group-focus-within:text-indigo-500">
                            <Icon name="Plus" size={16} />
                        </div>
                        <input
                            type="text"
                            value={inputValue}
                            placeholder="Type Name & Enter..."
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleAddKeyDown}
                            className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-indigo-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 placeholder-indigo-300 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                        />
                    </div>

                    {/* List of Processes */}
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar px-0.5 pt-1">
                        {displayProcesses.length > 0 ? displayProcesses.map(p => {
                            const isActive = activeProcessId === p.id;
                            const isEditing = editingProcessId === p.id;

                            return (
                                <div 
                                    key={p.id}
                                    className={`grid grid-cols-[1fr_auto] rounded-lg border transition-all duration-200 overflow-hidden ${isActive ? 'bg-indigo-600 border-indigo-600 shadow-md scale-[1.01]' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-600'}`}
                                >
                                    {/* 1. SELECTION ZONE */}
                                    <div 
                                        className="flex items-center gap-2 px-3 py-2 cursor-pointer min-w-0"
                                        onClick={() => !isEditing && changeProcess(p.id)}
                                    >
                                        <div className={`flex-shrink-0 w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                        
                                        {isEditing ? (
                                            <input 
                                                autoFocus
                                                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-1.5 py-0.5 rounded outline-none border border-indigo-300"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && saveEditing()}
                                                onBlur={saveEditing}
                                                onClick={e => e.stopPropagation()} 
                                            />
                                        ) : (
                                            <span className={`text-xs truncate font-bold ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {p.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* 2. ACTION ZONE */}
                                    {!isEditing && (
                                        <div className={`flex items-center gap-0.5 px-1 border-l ${isActive ? 'border-indigo-500 bg-indigo-700' : 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50'}`}>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); triggerRename(p); }}
                                                className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${isActive ? 'text-indigo-200 hover:text-white hover:bg-indigo-500' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                                                title="Rename Process"
                                            >
                                                <Icon name="FileEdit" size={12}/>
                                            </button>
                                            
                                            <button 
                                                type="button"
                                                onClick={(e) => handleDeleteClick(e, p.id, p.name)}
                                                className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center ${isActive ? 'text-indigo-200 hover:text-white hover:bg-red-500' : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                                                title="Delete Process (Hold Shift to force delete)"
                                            >
                                                <Icon name="Trash2" size={12}/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="text-center py-4 text-[10px] text-red-400 font-bold bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 animate-pulse">
                                ! ACTION REQUIRED <br/> <span className="font-normal text-slate-500">Create a Process to Start</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-slate-700/50"></div>

            {/* SECTION 3: PERSONNEL */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Auditor</label>
                <div className="grid grid-cols-1 gap-2">
                     <IconInput icon="AuditUser" iconColor={auditFieldIconColor} placeholder="Lead Auditor Name" value={auditInfo.auditor} onChange={(e: any) => setAuditInfo({...auditInfo, auditor: e.target.value})} />
                </div>
            </div>
        </div>
    );
};
