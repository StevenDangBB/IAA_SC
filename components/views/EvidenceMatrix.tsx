
import React, { useEffect, useState, useMemo, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { Icon } from '../UI';
import { Standard, MatrixRow, UploadedFile, Clause } from '../../types';
import { copyToClipboard, serializeMatrixData } from '../../utils';
import { useStandardUtils } from '../../hooks/useStandardUtils';
import { FilePreviewGrid } from './evidence/FilePreviewGrid';

export interface EvidenceMatrixHandle {
    insertEvidence: (clauseId: string, rowId: string, text: string) => void;
    handleExternalDictation: (text: string) => void;
    getActiveRow: () => { clauseId: string, rowId: string } | null;
}

interface EvidenceMatrixProps {
    standard: Standard;
    selectedClauses: string[];
    matrixData: Record<string, MatrixRow[]>;
    setMatrixData: React.Dispatch<React.SetStateAction<Record<string, MatrixRow[]>>>;
    onPasteFiles?: (files: File[], target: { clauseId: string, rowId: string }) => void;
    uploadedFiles?: UploadedFile[];
    onRemoveFile?: (fileId: string) => void;
    onLookup?: (clause: Clause) => void;
}

// --- MAIN COMPONENT ---
export const EvidenceMatrix = forwardRef<EvidenceMatrixHandle, EvidenceMatrixProps>(({
    standard, selectedClauses, matrixData, setMatrixData, onPasteFiles, uploadedFiles = [], onRemoveFile, onLookup
}, ref) => {
    
    const [activeRow, setActiveRow] = useState<{ clauseId: string, rowId: string } | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { getClauseById } = useStandardUtils(standard);

    // Initialize/Sync Matrix State for Legacy selections
    useEffect(() => {
        setMatrixData(currentMatrix => {
            const newMatrix = { ...currentMatrix };
            let updated = false;
            let firstRowFound: { clauseId: string, rowId: string } | null = null;

            selectedClauses.forEach(clauseId => {
                if (!newMatrix[clauseId] || newMatrix[clauseId].length === 0) {
                    const clause = getClauseById(clauseId);
                    if (clause) {
                        const desc = clause.description || "Requirement";
                        const reqs = desc.length > 300 
                            ? desc.split(/(?:\. |\n)/).filter(s => s.trim().length > 5) 
                            : [desc];
                        
                        newMatrix[clauseId] = reqs.map((req, idx) => ({
                            id: `${clauseId}_req_${idx}`,
                            requirement: req.trim(),
                            evidenceInput: "",
                            status: 'pending'
                        }));
                        updated = true;
                    }
                }
                if (!firstRowFound && newMatrix[clauseId] && newMatrix[clauseId].length > 0) {
                    firstRowFound = { clauseId, rowId: newMatrix[clauseId][0].id };
                }
            });

            if (!activeRow && firstRowFound) {
                setActiveRow(firstRowFound);
            }

            return updated ? newMatrix : currentMatrix;
        });
    }, [selectedClauses, getClauseById, setMatrixData]);

    // --- HANDLERS ---
    const updateRowData = useCallback((clauseId: string, rowId: string, textToAppend: string) => {
        setMatrixData(prev => ({
            ...prev,
            [clauseId]: prev[clauseId].map(row => {
                if (row.id === rowId) {
                    const currentText = row.evidenceInput || "";
                    const separator = currentText && textToAppend ? "\n" : "";
                    const newText = currentText + separator + textToAppend;
                    return { ...row, evidenceInput: newText, status: newText.trim() ? 'supplied' : 'pending' };
                }
                return row;
            })
        }));
    }, [setMatrixData]);

    const handleInputChange = useCallback((clauseId: string, rowId: string, value: string) => {
        setMatrixData(prev => ({
            ...prev,
            [clauseId]: prev[clauseId].map(row => 
                row.id === rowId 
                ? { ...row, evidenceInput: value, status: value.trim() ? 'supplied' : 'pending' } 
                : row
            )
        }));
    }, [setMatrixData]);

    const handlePaste = useCallback((e: React.ClipboardEvent, clauseId: string, rowId: string) => {
        const items = e.clipboardData.items;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const f = items[i].getAsFile();
                if (f) files.push(f);
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            if (onPasteFiles) {
                onPasteFiles(files, { clauseId, rowId });
            }
        }
    }, [onPasteFiles]);

    // IMPERATIVE HANDLE
    useImperativeHandle(ref, () => ({
        insertEvidence: (clauseId, rowId, text) => updateRowData(clauseId, rowId, text),
        handleExternalDictation: (text) => { if (activeRow) updateRowData(activeRow.clauseId, activeRow.rowId, text); },
        getActiveRow: () => activeRow
    }));

    // --- DERIVED ACTIVE DATA ---
    const activeData = useMemo(() => {
        if (!activeRow) return null;
        const clause = getClauseById(activeRow.clauseId);
        const rows = matrixData[activeRow.clauseId];
        const row = rows?.find(r => r.id === activeRow.rowId);
        if (!clause || !row) return null;
        return { clause, row };
    }, [activeRow, matrixData, getClauseById]);

    if (selectedClauses.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                <Icon name="LayoutList" size={48} className="mb-4 opacity-50"/>
                <p className="text-sm font-medium">Select clauses to start mapping evidence.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative animate-fade-in-up">
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex">
                
                {/* LIST COLUMN */}
                <div className="w-1/3 min-w-[250px] max-w-[350px] border-r border-gray-100 dark:border-slate-800 flex flex-col bg-gray-50/50 dark:bg-slate-950/30">
                    <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checklist</span>
                        <button 
                            onClick={() => { const t = serializeMatrixData(matrixData, selectedClauses); if(t) copyToClipboard(t); }}
                            className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1"
                        >
                            <Icon name="Copy" size={10}/> Copy
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
                        {selectedClauses.map(clauseId => {
                            const clause = getClauseById(clauseId);
                            const rows = matrixData[clauseId] || [];
                            if(!clause) return null;

                            return (
                                <div key={clauseId} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2 px-2 py-1 group/header">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 rounded flex-shrink-0">{clause.code}</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={clause.title}>{clause.title}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onLookup && onLookup(clause); }}
                                            className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded opacity-0 group-hover/header:opacity-100 transition-opacity"
                                            title="Read Clause Content"
                                        >
                                            <Icon name="BookOpen" size={12}/>
                                        </button>
                                    </div>
                                    <div className="pl-2 space-y-1">
                                        {rows.map((row, idx) => {
                                            const isActive = activeRow?.rowId === row.id;
                                            const isDone = row.status === 'supplied';
                                            return (
                                                <div 
                                                    key={row.id}
                                                    onClick={() => setActiveRow({ clauseId, rowId: row.id })}
                                                    className={`group relative p-2.5 rounded-lg cursor-pointer transition-all border ${isActive ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 shadow-sm ring-1 ring-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-slate-800/50 hover:border-gray-200 dark:hover:border-slate-700'}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 transition-colors ${isDone ? 'bg-emerald-500' : isActive ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                                        <p className={`text-[11px] leading-snug line-clamp-2 ${isActive ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {row.requirement}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* EDITOR COLUMN */}
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
                    {activeData ? (
                        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                            {/* Requirement Context Header */}
                            <div className="p-4 md:p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-white bg-indigo-500 px-2 py-0.5 rounded shadow-sm shadow-indigo-500/30">{activeData.clause.code}</span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{activeData.clause.title}</span>
                                    </div>
                                    <button 
                                        onClick={() => onLookup && onLookup(activeData.clause)}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition-colors shadow-sm"
                                    >
                                        <Icon name="BookOpen" size={14}/>
                                        Lookup
                                    </button>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-serif italic border-l-4 border-indigo-200 dark:border-indigo-900 pl-3">
                                    {activeData.row.requirement}
                                </p>
                            </div>

                            {/* FILES GRID (Component) */}
                            <FilePreviewGrid files={uploadedFiles} onRemoveFile={onRemoveFile} />

                            {/* Large Editor Area */}
                            <div className="flex-1 relative group">
                                <textarea
                                    ref={textAreaRef}
                                    className="w-full h-full p-4 md:p-6 text-sm text-slate-800 dark:text-slate-200 bg-transparent outline-none resize-none leading-7 placeholder-gray-300 dark:placeholder-slate-700"
                                    placeholder="Type evidence here... (Or drop files to attach)"
                                    value={activeData.row.evidenceInput}
                                    onChange={(e) => handleInputChange(activeData.clause.id, activeData.row.id, e.target.value)}
                                    onPaste={(e) => handlePaste(e, activeData.clause.id, activeData.row.id)}
                                    autoFocus
                                />
                                
                                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {activeData.row.status === 'supplied' && (
                                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                                            <Icon name="CheckThick" size={12}/> Saved
                                        </span>
                                    )}
                                    <button 
                                        onClick={() => handleInputChange(activeData.clause.id, activeData.row.id, "")}
                                        className="p-2 bg-gray-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                        title="Clear Text"
                                    >
                                        <Icon name="Trash2" size={16}/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between bg-gray-50/50 dark:bg-slate-950/50">
                                <span>Characters: {activeData.row.evidenceInput.length}</span>
                                <span>Attachments: {uploadedFiles.length}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                            <Icon name="ArrowLeft" size={32} className="mb-2 opacity-50"/>
                            <p>Select a requirement to edit</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
