
import React, { useEffect, useState, useMemo, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { Icon } from '../UI';
import { Clause, Standard, MatrixRow } from '../../types';
import { copyToClipboard, serializeMatrixData } from '../../utils';
import { useAudit } from '../../contexts/AuditContext'; // Sync Context

// --- TYPES ---
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
}

// --- SUB-COMPONENT: MATRIX ROW ---
interface MatrixRowItemProps {
    row: MatrixRow;
    clauseId: string;
    isActive: boolean;
    isProcessing: boolean;
    splitRatio: number;
    domId: string;
    onInputChange: (clauseId: string, rowId: string, value: string) => void;
    onFocus: (clauseId: string, rowId: string) => void;
    onPaste: (e: React.ClipboardEvent, clauseId: string, rowId: string) => void;
    onKeyDown: (e: React.KeyboardEvent, clauseId: string, rowId: string) => void;
}

const MatrixRowItem = React.memo(({ row, clauseId, isActive, isProcessing, splitRatio, domId, onInputChange, onFocus, onPaste, onKeyDown }: MatrixRowItemProps) => {
    return (
        <div 
            className="grid gap-4 items-start p-3 hover:bg-gray-50 dark:hover:bg-slate-800/30 rounded-lg transition-colors group relative border border-transparent hover:border-gray-100 dark:hover:border-slate-800"
            style={{ gridTemplateColumns: `${splitRatio}% minmax(0, 1fr)` }}
        >
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed pt-2 select-none break-words">
                {row.requirement}
            </div>
            
            <div className="relative min-w-0">
                <textarea
                    id={domId}
                    rows={3}
                    placeholder="Type evidence or paste files here..."
                    className={`w-full bg-gray-50 dark:bg-slate-950 border rounded-lg p-2 text-xs text-slate-800 dark:text-white outline-none transition-all resize-y min-h-[70px] shadow-sm 
                        ${isProcessing ? 'opacity-50 pointer-events-none' : ''} 
                        ${isActive 
                            ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-white dark:bg-slate-900' 
                            : 'border-gray-200 dark:border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10'
                        }`}
                    value={row.evidenceInput}
                    onChange={(e) => onInputChange(clauseId, row.id, e.target.value)}
                    onFocus={() => onFocus(clauseId, row.id)}
                    onPaste={(e) => onPaste(e, clauseId, row.id)}
                    onKeyDown={(e) => onKeyDown(e, clauseId, row.id)}
                />
                
                <div className="absolute top-2 right-2 pointer-events-none transition-opacity duration-300">
                     {row.status === 'supplied' && !isProcessing && (
                        <div className="bg-emerald-500/10 p-0.5 rounded-full">
                            <Icon name="CheckThick" size={10} className="text-emerald-600"/>
                        </div>
                     )}
                </div>

                {isProcessing && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-2 px-2 py-1 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-indigo-100 dark:border-slate-600 z-10 animate-in fade-in zoom-in">
                        <Icon name="Loader" className="animate-spin text-indigo-500" size={12}/>
                        <span className="text-[9px] font-bold text-indigo-500">Processing...</span>
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.row.evidenceInput === next.row.evidenceInput &&
        prev.row.status === next.row.status &&
        prev.isActive === next.isActive &&
        prev.isProcessing === next.isProcessing &&
        prev.splitRatio === next.splitRatio
    );
});

// --- MAIN COMPONENT ---
export const EvidenceMatrix = forwardRef<EvidenceMatrixHandle, EvidenceMatrixProps>(({
    standard, selectedClauses, matrixData, setMatrixData, onPasteFiles
}, ref) => {
    const { setSelectedClauses } = useAudit(); // Hook to sync back to planning
    const [expandedClauses, setExpandedClauses] = useState<string[]>([]);
    
    // Resize State
    const [splitRatio, setSplitRatio] = useState(40);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Track focused row
    const [activeRow, setActiveRow] = useState<{ clauseId: string, rowId: string } | null>(null);
    const [processingRowId, setProcessingRowId] = useState<string | null>(null);

    // 1. Flatten Clauses
    const flatClauses = useMemo(() => {
        const all: Clause[] = [];
        const traverse = (list: Clause[]) => {
            list.forEach(c => {
                all.push(c);
                if(c.subClauses) traverse(c.subClauses);
            });
        };
        standard.groups.forEach(g => traverse(g.clauses));
        return all;
    }, [standard]);

    // 2. Initialize Matrix State
    useEffect(() => {
        setMatrixData(currentMatrix => {
            const newMatrix = { ...currentMatrix };
            let updated = false;

            selectedClauses.forEach(clauseId => {
                if (!newMatrix[clauseId]) {
                    const clause = flatClauses.find(c => c.id === clauseId);
                    if (clause) {
                        const desc = clause.description || "";
                        const reqs = desc.length > 60 
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
            });

            if (updated) {
                if(selectedClauses.length > 0 && expandedClauses.length === 0) {
                    setExpandedClauses([selectedClauses[0]]);
                }
                return newMatrix;
            }
            return currentMatrix;
        });
    }, [selectedClauses, flatClauses, setMatrixData]);

    // Sync Back: Remove Clause
    const removeClause = useCallback((e: React.MouseEvent, clauseId: string) => {
        e.stopPropagation(); // Stop expansion toggle
        if(confirm("Remove this clause from plan?")) {
            setSelectedClauses(prev => prev.filter(id => id !== clauseId));
        }
    }, [setSelectedClauses]);

    // --- RESIZE HANDLERS ---
    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const relativeX = moveEvent.clientX - rect.left;
                const percentage = (relativeX / rect.width) * 100;
                setSplitRatio(Math.min(80, Math.max(20, percentage)));
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    // --- INPUT HANDLERS ---
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

    const handleNavigation = useCallback((e: React.KeyboardEvent, currentClauseId: string, currentRowId: string) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const direction = e.shiftKey ? -1 : 1;
            const allRows: { clauseId: string, row: MatrixRow }[] = [];
            selectedClauses.forEach(cId => {
                if (matrixData[cId]) {
                    matrixData[cId].forEach(row => {
                        allRows.push({ clauseId: cId, row });
                    });
                }
            });
            const currentIndex = allRows.findIndex(item => item.clauseId === currentClauseId && item.row.id === currentRowId);
            if (currentIndex === -1) return;
            const nextIndex = currentIndex + direction;
            if (nextIndex >= 0 && nextIndex < allRows.length) {
                const target = allRows[nextIndex];
                setExpandedClauses(prev => {
                    if (!prev.includes(target.clauseId)) {
                        return [...prev, target.clauseId];
                    }
                    return prev;
                });
                setTimeout(() => {
                    const domId = `matrix_input_${target.clauseId}_${target.row.id}`;
                    const el = document.getElementById(domId);
                    if (el) {
                        el.focus();
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 50);
            }
        }
    }, [selectedClauses, matrixData]);

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

    const handleFocus = useCallback((clauseId: string, rowId: string) => {
        setActiveRow({ clauseId, rowId });
    }, []);

    useImperativeHandle(ref, () => ({
        insertEvidence: (clauseId, rowId, text) => {
            updateRowData(clauseId, rowId, text);
        },
        handleExternalDictation: (text: string) => {
            if (activeRow) {
                updateRowData(activeRow.clauseId, activeRow.rowId, text);
            }
        },
        getActiveRow: () => activeRow
    }));
    
    const handleCopyMatrixToClipboard = () => {
        const text = serializeMatrixData(matrixData, selectedClauses);
        if(text) {
            copyToClipboard(text);
            alert("Matrix data copied to clipboard as Table!"); 
        } else {
            alert("Matrix is empty.");
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedClauses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    if (selectedClauses.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                <Icon name="LayoutList" size={48} className="mb-4 opacity-50"/>
                <p className="text-sm font-medium">Select clauses from the Planning Tab or Sidebar to start mapping evidence.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative animate-fade-in-up" ref={containerRef}>
            <div className="flex-shrink-0 flex justify-end mb-2 px-1">
                 <button 
                    onClick={handleCopyMatrixToClipboard}
                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-gray-100 dark:border-slate-700 hover:border-indigo-200 transition-colors"
                    title="Export to Clipboard"
                 >
                    <Icon name="Copy" size={12}/> Copy Matrix Table
                 </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 p-1 pb-10">
                {selectedClauses.map(clauseId => {
                    const clause = flatClauses.find(c => c.id === clauseId);
                    const rows = matrixData[clauseId] || [];
                    const isExpanded = expandedClauses.includes(clauseId);
                    if (!clause) return null;

                    const filledCount = rows.filter(r => r.status === 'supplied').length;
                    const progress = Math.round((filledCount / (rows.length || 1)) * 100);

                    return (
                        <div key={clauseId} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
                            {/* Header */}
                            <div 
                                className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-slate-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors select-none group/header"
                                onClick={() => toggleExpand(clauseId)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800/50 shrink-0">
                                        {clause.code}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{clause.title}</h4>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ease-out ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    
                                    {/* DELETE BUTTON - SYNC BACK TO PLAN */}
                                    <button 
                                        onClick={(e) => removeClause(e, clauseId)}
                                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover/header:opacity-100 transition-all"
                                        title="Remove Clause from Scope"
                                    >
                                        <Icon name="X" size={14}/>
                                    </button>

                                    <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-slate-400"/>
                                </div>
                            </div>

                            {/* Body */}
                            {isExpanded && (
                                <div className="p-3 border-t border-gray-100 dark:border-slate-800 animate-accordion-down">
                                    <div 
                                        className="grid gap-4 mb-2 px-3 relative"
                                        style={{ gridTemplateColumns: `${splitRatio}% minmax(0, 1fr)` }}
                                    >
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">Requirement Breakdown</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">Verified Evidence (Use TAB to navigate)</span>
                                        <div 
                                            className="absolute top-0 bottom-0 w-4 cursor-col-resize flex justify-center group z-10 hover:z-20"
                                            style={{ left: `calc(${splitRatio}% + 0.5rem - 8px)` }}
                                            onMouseDown={startResizing}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className={`w-1 h-full rounded-full transition-colors duration-200 ${isResizing ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800'}`}></div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        {rows.map((row) => (
                                            <MatrixRowItem
                                                key={row.id}
                                                row={row}
                                                clauseId={clauseId}
                                                domId={`matrix_input_${clauseId}_${row.id}`}
                                                isActive={activeRow?.rowId === row.id}
                                                isProcessing={processingRowId === row.id}
                                                splitRatio={splitRatio}
                                                onInputChange={handleInputChange}
                                                onFocus={handleFocus}
                                                onPaste={handlePaste}
                                                onKeyDown={handleNavigation}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
