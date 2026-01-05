
import React, { useEffect, useState, useMemo } from 'react';
import { Icon } from '../UI';
import { Clause, Standard, MatrixRow } from '../../types';
import { copyToClipboard, serializeMatrixData } from '../../utils';

interface EvidenceMatrixProps {
    standard: Standard;
    selectedClauses: string[];
    matrixData: Record<string, MatrixRow[]>;
    setMatrixData: React.Dispatch<React.SetStateAction<Record<string, MatrixRow[]>>>;
}

export const EvidenceMatrix: React.FC<EvidenceMatrixProps> = ({
    standard, selectedClauses, matrixData, setMatrixData
}) => {
    const [expandedClauses, setExpandedClauses] = useState<string[]>([]);

    // 1. Flatten Clauses for easy lookup
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

    // 2. Initialize Matrix State based on Selected Clauses (SAFE INIT)
    useEffect(() => {
        // We create a temporary copy to check against updates
        // Note: We use functional state update to ensure we have latest state
        setMatrixData(currentMatrix => {
            const newMatrix = { ...currentMatrix };
            let updated = false;

            selectedClauses.forEach(clauseId => {
                if (!newMatrix[clauseId]) {
                    const clause = flatClauses.find(c => c.id === clauseId);
                    if (clause) {
                        // Heuristic: Split description by sentences to create "Requirements"
                        // Or fallback to whole description if short
                        const desc = clause.description || "";
                        // Simple sentence splitting logic to create granular rows
                        const reqs = desc.length > 50 
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
                // Side effect: Default expand first one if none expanded
                if(selectedClauses.length > 0 && expandedClauses.length === 0) {
                    setExpandedClauses([selectedClauses[0]]);
                }
                return newMatrix;
            }
            return currentMatrix;
        });
    }, [selectedClauses, flatClauses, setMatrixData]);

    // 3. Update Matrix Cell
    const handleInputChange = (clauseId: string, rowId: string, value: string) => {
        setMatrixData(prev => ({
            ...prev,
            [clauseId]: prev[clauseId].map(row => 
                row.id === rowId 
                ? { ...row, evidenceInput: value, status: value.trim() ? 'supplied' : 'pending' } 
                : row
            )
        }));
    };

    // 4. Manual Copy Function (Instead of destructive sync)
    const handleCopyMatrixToClipboard = () => {
        const text = serializeMatrixData(matrixData, selectedClauses);
        if(text) {
            copyToClipboard(text);
            alert("Matrix data copied to clipboard in Markdown format!"); 
        } else {
            alert("Matrix is empty. Please fill in some evidence first.");
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedClauses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    if (selectedClauses.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gray-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                <Icon name="LayoutList" size={48} className="mb-4 opacity-50"/>
                <p className="text-sm font-medium">Select clauses from the sidebar to start mapping evidence.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative">
            <div className="flex-shrink-0 flex justify-end mb-2 px-1">
                 <button 
                    onClick={handleCopyMatrixToClipboard}
                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm border border-gray-100 dark:border-slate-700 hover:border-indigo-200 transition-colors"
                    title="Copy Matrix content as Markdown table"
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
                                className="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-slate-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                onClick={() => toggleExpand(clauseId)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800/50">
                                        {clause.code}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">{clause.title}</h4>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-slate-400"/>
                                </div>
                            </div>

                            {/* Body */}
                            {isExpanded && (
                                <div className="p-3 border-t border-gray-100 dark:border-slate-800">
                                    <div className="grid grid-cols-[1fr_1.5fr] gap-4 mb-2 px-2">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Requirement Breakdown</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Verified Evidence</span>
                                    </div>
                                    <div className="space-y-3">
                                        {rows.map((row) => (
                                            <div key={row.id} className="grid grid-cols-[1fr_1.5fr] gap-4 items-start p-2 hover:bg-gray-50 dark:hover:bg-slate-800/30 rounded-lg transition-colors group">
                                                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed pt-1">
                                                    {row.requirement}
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    placeholder="e.g. Reviewed Log #123, Interviewed Mr. A..."
                                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-y min-h-[50px] shadow-sm"
                                                    value={row.evidenceInput}
                                                    onChange={(e) => handleInputChange(clauseId, row.id, e.target.value)}
                                                />
                                            </div>
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
};
