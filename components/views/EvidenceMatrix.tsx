
import React, { useEffect, useState, useMemo, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { Icon } from '../UI';
import { Standard, MatrixRow, UploadedFile, Clause } from '../../types';
import { copyToClipboard, serializeMatrixData } from '../../utils';
import { useStandardUtils } from '../../hooks/useStandardUtils';

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
    
    // Tracking active row
    const [activeRow, setActiveRow] = useState<{ clauseId: string, rowId: string } | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Optimized utility hook
    const { getClauseById } = useStandardUtils(standard);

    // Initialization Logic
    useEffect(() => {
        setMatrixData(currentMatrix => {
            const newMatrix = { ...currentMatrix };
            let updated = false;
            let firstRowFound: { clauseId: string, rowId: string } | null = null;

            selectedClauses.forEach(clauseId => {
                // Initialize missing rows
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
                // Determine default active row if none
                if (!firstRowFound && newMatrix[clauseId] && newMatrix[clauseId].length > 0) {
                    firstRowFound = { clauseId, rowId: newMatrix[clauseId][0].id };
                }
            });

            if (!activeRow && firstRowFound) {
                setActiveRow(firstRowFound);
            }

            return updated ? newMatrix : currentMatrix;
        });
    }, [selectedClauses, getClauseById, setMatrixData]); // Depend only on stable props

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

    // OPTIMIZED: Direct state update for typing to avoid lag
    const handleInputChange = useCallback((clauseId: string, rowId: string, value: string) => {
        setMatrixData(prev => {
            const currentRows = prev[clauseId];
            if (!currentRows) return prev;
            
            // Optimization: Only create new object if value actually changed
            const rowIndex = currentRows.findIndex(r => r.id === rowId);
            if (rowIndex === -1 || currentRows[rowIndex].evidenceInput === value) return prev;

            const newRows = [...currentRows];
            newRows[rowIndex] = { 
                ...newRows[rowIndex], 
                evidenceInput: value, 
                status: value.trim() ? 'supplied' : 'pending' 
            };

            return { ...prev, [clauseId]: newRows };
        });
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

    const renderFilePreview = (fileEntry: UploadedFile) => {
        const isImage = fileEntry.file.type.startsWith('image/');
        const isPdf = fileEntry.file.type.includes('pdf');
        
        return (
            <div key={fileEntry.id} className="relative group w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
                {isImage ? (
                    <img src={URL.createObjectURL(fileEntry.file)} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <div className="flex flex-col items-center p-2 text-center">
                        <Icon name={isPdf ? "BookOpen" : "FileText"} size={24} className="text-slate-400 mb-1"/>
                        <span className="text-[9px] text-slate-500 line-clamp-2 leading-tight break-all">{fileEntry.file.name}</span>
                    </div>
                )}
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-1">
                    {fileEntry.status === 'processing' && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-black/50 flex items-center justify-center">
                            <Icon name="Loader" size={16} className="animate-spin text-indigo-600"/>
                        </div>
                    )}
                    {fileEntry.status === 'success' && <div className="bg-emerald-500 rounded-full p-0.5 shadow-sm"><Icon name="CheckThick" size={10} className="text-white"/></div>}
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemoveFile && onRemoveFile(fileEntry.id); }}
                        className="bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-sm"
                        title="Remove File"
                    >
                        <Icon name="X" size={10}/>
                    </button>
                </div>
            </div>
        );
    };

    if (selectedClauses.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50/30 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 m-4">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-full shadow-depth mb-4">
                    <Icon name="LayoutList" size={48} className="text-indigo-200 dark:text-slate-700"/>
                </div>
                <p className="text-sm font-bold text-slate-500">Select clauses to start mapping evidence.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative animate-fade-in-up">
            {/* CONTENT AREA */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-white/60 dark:border-slate-800 shadow-depth overflow-hidden flex">
                
                {/* LIST COLUMN */}
                <div className="w-1/3 min-w-[260px] max-w-[350px] border-r border-gray-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/30 backdrop-blur-sm">
                    <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requirement Checklist</span>
                        <button 
                            onClick={() => { const t = serializeMatrixData(matrixData, selectedClauses); if(t) copyToClipboard(t); }}
                            className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1 transition-colors"
                        >
                            <Icon name="Copy" size={10}/> Copy All
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
                        {selectedClauses.map(clauseId => {
                            const clause = getClauseById(clauseId);
                            const rows = matrixData[clauseId] || [];
                            if(!clause) return null;

                            return (
                                <div key={clauseId} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 group/header rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded flex-shrink-0 border border-indigo-100 dark:border-indigo-800/50">{clause.code}</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={clause.title}>{clause.title}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onLookup && onLookup(clause); }}
                                            className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded opacity-0 group-hover/header:opacity-100 transition-all scale-90 hover:scale-100"
                                            title="Read Clause Content"
                                        >
                                            <Icon name="BookOpen" size={12}/>
                                        </button>
                                    </div>
                                    <div className="pl-2 space-y-1">
                                        {rows.map((row) => {
                                            const isActive = activeRow?.rowId === row.id;
                                            const isDone = row.status === 'supplied';
                                            return (
                                                <div 
                                                    key={row.id}
                                                    onClick={() => setActiveRow({ clauseId, rowId: row.id })}
                                                    className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${isActive ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-600 shadow-sm ring-1 ring-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'}`}
                                                >
                                                    <div className="flex items-start gap-2.5">
                                                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 transition-all shadow-sm ${isDone ? 'bg-emerald-500 scale-110' : isActive ? 'bg-indigo-500 scale-110' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                                        <p className={`text-[11px] leading-relaxed line-clamp-3 ${isActive ? 'text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
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
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0 relative">
                    {activeData ? (
                        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                            {/* Requirement Context Header */}
                            <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-0.5 rounded shadow-sm">{activeData.clause.code}</span>
                                        <span className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">{activeData.clause.title}</span>
                                    </div>
                                    <button 
                                        onClick={() => onLookup && onLookup(activeData.clause)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition-all shadow-sm active:scale-95"
                                    >
                                        <Icon name="BookOpen" size={14}/>
                                        Ref
                                    </button>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border-l-4 border-indigo-400 dark:border-indigo-600 shadow-sm">
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                        {activeData.row.requirement}
                                    </p>
                                </div>
                            </div>

                            {/* FILES GRID */}
                            {uploadedFiles.length > 0 && (
                                <div className="px-6 pt-4 pb-2 bg-slate-50/30 dark:bg-black/10">
                                    <div className="flex flex-wrap gap-3">
                                        {uploadedFiles.map(renderFilePreview)}
                                    </div>
                                </div>
                            )}

                            {/* Large Editor Area */}
                            <div className="flex-1 relative group">
                                <textarea
                                    ref={textAreaRef}
                                    className="w-full h-full p-6 text-sm text-slate-800 dark:text-slate-200 bg-transparent outline-none resize-none leading-7 placeholder-slate-300 dark:placeholder-slate-600 font-medium"
                                    placeholder="Type verified evidence here... (Drag & Drop files supported)"
                                    value={activeData.row.evidenceInput}
                                    onChange={(e) => handleInputChange(activeData.clause.id, activeData.row.id, e.target.value)}
                                    onPaste={(e) => handlePaste(e, activeData.clause.id, activeData.row.id)}
                                    autoFocus
                                />
                                
                                {/* Floating Actions */}
                                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {activeData.row.status === 'supplied' && (
                                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm border border-emerald-200 dark:border-emerald-800">
                                            <Icon name="CheckThick" size={12}/> Saved
                                        </span>
                                    )}
                                    <button 
                                        onClick={() => handleInputChange(activeData.clause.id, activeData.row.id, "")}
                                        className="p-2 bg-white dark:bg-slate-800 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-slate-700"
                                        title="Clear Text"
                                    >
                                        <Icon name="Trash2" size={16}/>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Footer Info */}
                            <div className="px-6 py-2 border-t border-gray-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between bg-gray-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
                                <span className="font-mono">Ln {activeData.row.evidenceInput.split('\n').length}, Col {activeData.row.evidenceInput.length}</span>
                                <span>{uploadedFiles.length} Attachment(s)</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                            <Icon name="ArrowLeft" size={32} className="mb-2 opacity-50"/>
                            <p className="text-sm">Select a requirement from the checklist</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
