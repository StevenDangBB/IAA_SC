
import React, { useRef } from 'react';
import { Icon, IconSelect, IconInput } from '../UI';
import { StandardsData, AuditInfo } from '../../types';
import { AUDIT_TYPES } from '../../constants';

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
}

export const AuditInfoForm: React.FC<AuditInfoFormProps> = ({
    standards, standardKey, setStandardKey, auditInfo, setAuditInfo,
    onAddNewStandard, onOpenIntegrity,
    knowledgeFileName, onKnowledgeUpload, onClearKnowledge, health, auditFieldIconColor, standardOptions
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Logic to determine icon state
    const hasSource = !!knowledgeFileName;
    const isStandardSelected = !!standardKey && standardKey !== "ADD_NEW";
    
    const sourceIcon = hasSource ? "BookOpen" : "Book";
    
    // Dynamic styling based on state
    let sourceColor = "text-gray-300 dark:text-slate-600"; // Default disabled state
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
        if (!isStandardSelected) {
            // Optional: You could trigger a small shake animation or toast here via a parent callback if desired
            return;
        }
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Wrapper handler to reset input value
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // Pass the event to the parent handler
            onKnowledgeUpload(e);
            
            // Critical: Reset the input value so the same file can be selected again
            // if the user deletes it and tries to re-upload.
            e.target.value = '';
        }
    };

    return (
        <div className="bg-gray-50/80 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-3 space-y-4">
            {/* Updated accept attribute to include .doc and .docx */}
            <input type="file" ref={fileInputRef} accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleFileChange} />

            {/* SECTION 1: SCOPE */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Scope Definition</label>
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

            {/* SEPARATOR */}
            <div className="h-px bg-gray-200 dark:bg-slate-700/50"></div>

            {/* SECTION 2: ENTITY DETAILS */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Target Entity</label>
                <div className="grid grid-cols-[1.5fr_1fr] gap-2">
                    <IconInput icon="Building" iconColor={auditFieldIconColor} placeholder="Company Name" value={auditInfo.company} onChange={(e: any) => setAuditInfo({...auditInfo, company: e.target.value})} />
                    <IconInput icon="Tag" iconColor={auditFieldIconColor} placeholder="SMO/ID" value={auditInfo.smo} onChange={(e: any) => setAuditInfo({...auditInfo, smo: e.target.value})} />
                </div>
                <IconInput icon="Users" iconColor={auditFieldIconColor} placeholder="Department / Site" value={auditInfo.department} onChange={(e: any) => setAuditInfo({...auditInfo, department: e.target.value})} />
            </div>

            {/* SEPARATOR */}
            <div className="h-px bg-gray-200 dark:bg-slate-700/50"></div>

            {/* SECTION 3: PERSONNEL */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Personnel</label>
                <div className="grid grid-cols-2 gap-2">
                     <IconInput icon="AuditUser" iconColor={auditFieldIconColor} placeholder="Lead Auditor" value={auditInfo.auditor} onChange={(e: any) => setAuditInfo({...auditInfo, auditor: e.target.value})} />
                     <IconInput icon="User" iconColor={auditFieldIconColor} placeholder="Interviewee" value={auditInfo.interviewee} onChange={(e: any) => setAuditInfo({...auditInfo, interviewee: e.target.value})} />
                </div>
            </div>
        </div>
    );
};
