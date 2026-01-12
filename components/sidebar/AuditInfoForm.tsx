
import React, { useRef, useState, useMemo } from 'react';
import { Icon, IconSelect, IconInput } from '../UI';
import { AUDIT_TYPES } from '../../constants';
import { useUI } from '../../contexts/UIContext';
import { useAudit } from '../../contexts/AuditContext';

interface AuditInfoFormProps {
    onAddNewStandard: () => void;
    onOpenIntegrity: () => void;
    onKnowledgeUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    health: { isHealthy: boolean; score: number };
    auditFieldIconColor: string;
    standardOptions: { value: string; label: string }[];
}

// Internal Helper for TextAreas to match IconInput style
const IconTextArea = ({ icon, iconColor, placeholder, value, onChange, className = "", rows = 2 }: any) => (
    <div className={`relative group ${className}`}>
        <div className="absolute left-3 top-3 pointer-events-none transition-colors duration-300">
            <div className={iconColor}><Icon name={icon} size={16} /></div>
        </div>
        <textarea 
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            rows={rows}
            className="w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm hover:border-indigo-200 dark:hover:border-slate-600 hover:shadow-md dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] resize-y min-h-[44px]"
        />
    </div>
);

export const AuditInfoForm: React.FC<AuditInfoFormProps> = ({
    onAddNewStandard, onOpenIntegrity, onKnowledgeUpload, 
    health, auditFieldIconColor, standardOptions
}) => {
    // Consume Context Directly
    const { 
        standardKey, setStandardKey, auditInfo, setAuditInfo, standards,
        knowledgeFileName, clearKnowledge,
        processes, activeProcessId, setActiveProcessId,
        addProcess, renameProcess, deleteProcess
    } = useAudit();

    const { showToast } = useUI();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const processInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null); 
    const skipBlurRef = useRef(false);
    
    const [inputValue, setInputValue] = useState(""); 
    const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [isProcessMenuOpen, setIsProcessMenuOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Computed Logic
    const hasSource = !!knowledgeFileName;
    const isStandardSelected = !!standardKey && standardKey !== "ADD_NEW";
    const sourceIcon = hasSource ? "BookOpen" : "Book";
    
    const is27001 = useMemo(() => standardKey && standards[standardKey]?.name.includes("27001"), [standardKey, standards]);
    
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
                    setActiveProcessId(existing.id);
                    showToast(`Switched to: ${existing.name}`);
                    setIsCreating(false); 
                    setInputValue("");
                    setIsProcessMenuOpen(false); 
                } else {
                    skipBlurRef.current = true;
                    addProcess(trimmed);
                    setInputValue(""); 
                    
                    setIsCreating(true); 
                    setIsProcessMenuOpen(true); 
                    
                    setTimeout(() => {
                        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
                        if (processInputRef.current) processInputRef.current.focus();
                        skipBlurRef.current = false;
                    }, 50);
                }
            } else {
                setIsCreating(false);
            }
        } else if (e.key === 'Escape') {
            setIsCreating(false);
            setInputValue("");
        }
    };

    const handleInputBlur = () => {
        if (skipBlurRef.current) return;
        if (!inputValue.trim()) {
            setIsCreating(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation(); 
        e.preventDefault();

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
                deleteProcess(id);
                showToast(`Deleted: ${name}`);
            }
        }
    };

    const triggerRename = (p: any) => {
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

    const displayProcesses = useMemo(() => processes.filter(s => s.name && s.name.trim() !== ""), [processes]);
    const activeProcessName = displayProcesses.find(p => p.id === activeProcessId)?.name || "Select Process";

    return (
        <div className="bg-gray-50/80 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-3 space-y-4 w-full">
            <input type="file" ref={fileInputRef} accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileChange} />

            {/* SECTION 1: STANDARD */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Audit Standard</label>
                <div className="relative group/source">
                    <IconSelect 
                        id="sidebar-standard-select"
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
                            onClick={(e) => { e.stopPropagation(); clearKnowledge(); }}
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
                
                {/* NEW: Address Field with MapPin */}
                <IconTextArea 
                    icon="MapPin" 
                    iconColor={auditFieldIconColor} 
                    placeholder="Site Address / Locations..." 
                    value={auditInfo.address || ""} 
                    onChange={(e: any) => setAuditInfo({...auditInfo, address: e.target.value})}
                    rows={2}
                />

                {/* NEW: Scope Field with Target */}
                <IconTextArea 
                    icon="Target" 
                    iconColor={auditFieldIconColor} 
                    placeholder="Audit Scope Description..." 
                    value={auditInfo.scope || ""} 
                    onChange={(e: any) => setAuditInfo({...auditInfo, scope: e.target.value})}
                    rows={3}
                />

                {/* NEW: SoA Field (Conditional for 27001) */}
                {is27001 && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <IconInput 
                            icon="FileShield" 
                            iconColor="text-purple-600 dark:text-purple-400" 
                            placeholder="SoA Version / Reference (e.g. v2.0 2024)" 
                            value={auditInfo.soa || ""} 
                            onChange={(e: any) => setAuditInfo({...auditInfo, soa: e.target.value})} 
                        />
                    </div>
                )}
                
                {/* PROCESS MANAGEMENT DROPDOWN */}
                <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">Process Management</label>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">{displayProcesses.length} Items</span>
                    </div>
                    
                    {displayProcesses.length === 0 ? (
                        <>
                            <div className="relative group w-full">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600 dark:text-indigo-400 group-focus-within:text-indigo-500">
                                    <Icon name="Plus" size={16} />
                                </div>
                                <input
                                    ref={processInputRef}
                                    type="text"
                                    value={inputValue}
                                    placeholder="Enter Process/Department..."
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleAddKeyDown}
                                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-indigo-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 placeholder-indigo-300 dark:placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="text-center py-4 text-[10px] text-red-400 font-bold bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 animate-pulse">
                                ! ACTION REQUIRED <br/> <span className="font-normal text-slate-500">Create a Process to Start</span>
                            </div>
                        </>
                    ) : (
                        <div className="relative">
                            <div 
                                onClick={() => { if(!isCreating) setIsProcessMenuOpen(!isProcessMenuOpen); }}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                    isProcessMenuOpen || isCreating 
                                        ? 'border-indigo-500 ring-1 ring-indigo-500 bg-white dark:bg-slate-900 shadow-md z-20' 
                                        : 'bg-white dark:bg-slate-950 border-gray-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <Icon name="Session11_GridAdd" size={16} className="text-indigo-600 dark:text-indigo-400" />
                                    {isCreating ? (
                                        <input
                                            ref={processInputRef}
                                            autoFocus
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={handleAddKeyDown}
                                            onBlur={handleInputBlur}
                                            placeholder="Type Name & Enter to Add..."
                                            className="bg-transparent border-none outline-none text-xs font-bold text-slate-800 dark:text-white placeholder-slate-400 w-full"
                                            onClick={(e) => e.stopPropagation()}
                                            autoComplete="off"
                                        />
                                    ) : (
                                        <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-300">
                                            {activeProcessName}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {!isCreating && (
                                        <div 
                                            className={`p-1 rounded-full ${isProcessMenuOpen ? 'bg-indigo-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-400'}`} 
                                            title="Add New Process"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsProcessMenuOpen(true);
                                                setIsCreating(true);
                                                setInputValue("");
                                                setTimeout(() => processInputRef.current?.focus(), 50);
                                            }}
                                        >
                                            <Icon name="Plus" size={14} />
                                        </div>
                                    )}
                                    {isCreating && (
                                        <div 
                                            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500" 
                                            title="Cancel / Close"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsCreating(false);
                                                setInputValue("");
                                            }}
                                        >
                                            <Icon name="X" size={14} />
                                        </div>
                                    )}
                                    <Icon name="ChevronDown" size={14} className={`transition-transform duration-300 text-slate-400 ${isProcessMenuOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isProcessMenuOpen ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                <div className="p-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl space-y-1">
                                    <div ref={listRef} className="max-h-[200px] overflow-y-auto custom-scrollbar px-1 space-y-1 pb-1 pt-1 scroll-smooth">
                                        {displayProcesses.map(p => {
                                            const isActive = activeProcessId === p.id;
                                            const isEditing = editingProcessId === p.id;

                                            return (
                                                <div 
                                                    key={p.id}
                                                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent'}`}
                                                    onClick={() => {
                                                        if(!isEditing) {
                                                            setActiveProcessId(p.id);
                                                            if (!isCreating) setIsProcessMenuOpen(false); 
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                                        
                                                        {isEditing ? (
                                                            <input 
                                                                autoFocus
                                                                className="w-full min-w-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold px-1 py-0.5 rounded outline-none border border-indigo-300"
                                                                value={editName}
                                                                onChange={e => setEditName(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && saveEditing()}
                                                                onBlur={saveEditing}
                                                                onClick={e => e.stopPropagation()} 
                                                            />
                                                        ) : (
                                                            <span className={`text-xs truncate font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                {p.name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {!isEditing && (
                                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); triggerRename(p); }}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md"
                                                                title="Rename"
                                                            >
                                                                <Icon name="FileEdit" size={12}/>
                                                            </button>
                                                            
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => handleDeleteClick(e, p.id, p.name)}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                                                title="Delete"
                                                            >
                                                                <Icon name="Trash2" size={12}/>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
