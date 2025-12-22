import React, { useState, useEffect, useRef } from 'react';
import { Icon, IconSelect, IconInput, CheckLineart } from './UI';
import { StandardsData, AuditInfo, Clause } from '../types';
import { copyToClipboard, useDebounce } from '../utils';
import { AUDIT_TYPES } from '../constants';

interface SidebarProps {
    isOpen: boolean;
    width: number;
    setWidth: (w: number) => void;
    standards: StandardsData;
    standardKey: string;
    setStandardKey: (k: string) => void;
    auditInfo: AuditInfo;
    setAuditInfo: (info: AuditInfo) => void;
    selectedClauses: string[];
    setSelectedClauses: React.Dispatch<React.SetStateAction<string[]>>;
    onAddNewStandard: () => void;
}

const Sidebar = ({ isOpen, width, setWidth, standards, standardKey, setStandardKey, auditInfo, setAuditInfo, selectedClauses, setSelectedClauses, onAddNewStandard }: SidebarProps) => {
    const [isResizing, setIsResizing] = useState(false);
    const [searchQueryRaw, setSearchQueryRaw] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    
    const searchQuery = useDebounce(searchQueryRaw, 300);

    const startResizing = (e: React.MouseEvent) => {
        if ((e.target as Element).classList.contains('resize-handle')) {
            e.preventDefault();
            setIsResizing(true);
        }
    };

    useEffect(() => {
        const stopResizing = () => setIsResizing(false);
        const resize = (e: MouseEvent) => {
            if (isResizing) {
                const newWidth = Math.max(360, Math.min(e.clientX, 800));
                setWidth(newWidth);
            }
        };

        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, setWidth]);

    const toggleClause = (id: string) => {
        setSelectedClauses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAllClausesInGroup = (groupId: string) => {
        const group = standards[standardKey].groups.find(g => g.id === groupId);
        if (!group) return;
        
        const allClauseIds = group.clauses.map(c => c.id);
        const allSelected = allClauseIds.every(id => selectedClauses.includes(id));
        
        setSelectedClauses(prev => {
            let newSelection = [...prev];
            if (allSelected) {
                newSelection = newSelection.filter(id => !allClauseIds.includes(id));
            } else {
                allClauseIds.forEach(id => {
                    if (!newSelection.includes(id)) newSelection.push(id);
                });
            }
            return newSelection;
        });
    };

    const handleCopySelectedClauses = () => {
        if (!standardKey || !standards[standardKey]) return;
        const textToCopy = standards[standardKey].groups.flatMap(g => g.clauses)
            .filter(c => selectedClauses.includes(c.id))
            .map(c => `[${c.code}] ${c.title}`)
            .join('\n');
        copyToClipboard(textToCopy);
    };

    const renderClauses = () => {
        const currentSearchQuery = searchQuery.toLowerCase();
        if (!standardKey || !standards[standardKey]) return <div className="text-center text-gray-400 mt-20 italic">Select a Standard</div>;
        
        const data = standards[standardKey];
        return data.groups.map(g => {
            const filtered = g.clauses.filter(c => 
                !currentSearchQuery || 
                c.code.toLowerCase().includes(currentSearchQuery) || 
                c.title.toLowerCase().includes(currentSearchQuery)
            );
            
            if (filtered.length === 0) return null;
            
            const isExpanded = expandedGroups.includes(g.id) || !!currentSearchQuery;
            const allClauseIdsInGroup = g.clauses.map(c => c.id);
            const isGroupSelected = allClauseIdsInGroup.every(id => selectedClauses.includes(id));
            const isGroupPartiallySelected = !isGroupSelected && allClauseIdsInGroup.some(id => selectedClauses.includes(id));
            
            const getGroupIconColor = (iconName: string) => {
                switch(iconName) {
                    case 'LayoutList': return 'text-blue-600 dark:text-blue-400'; 
                    case 'FileShield': return 'text-purple-600 dark:text-purple-400'; 
                    case 'Users': return 'text-emerald-600 dark:text-emerald-400'; 
                    case 'Lock': return 'text-rose-600 dark:text-rose-400'; 
                    case 'Cpu': return 'text-cyan-600 dark:text-cyan-400'; 
                    case 'CheckThick': return 'text-green-600 dark:text-green-400'; 
                    default: return 'text-gray-500 dark:text-slate-300';
                }
            };

            return (
                <div key={g.id} className="mb-3 border border-gray-100 dark:border-slate-700/60 rounded-lg p-3 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-slate-800/40 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleGroup(g.id)}>
                        <div className="flex items-center gap-3">
                            <button className={`p-1.5 rounded-lg shadow-sm group-select-icon transition-all border border-transparent ${isGroupSelected ? 'bg-emerald-600 text-white selected border-emerald-700' : 'bg-white dark:bg-slate-700'}`} onClick={(e) => { e.stopPropagation(); toggleAllClausesInGroup(g.id); }}>
                                {isGroupSelected ? <CheckLineart size={16} className="stroke-white"/> : <Icon name={g.icon} size={16} className={isGroupSelected ? '' : getGroupIconColor(g.icon)}/>}
                                {isGroupPartiallySelected && !isGroupSelected && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-white dark:border-slate-900"></span>}
                            </button>
                            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-100 uppercase tracking-wider">{g.title}</h4>
                        </div>
                        <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-gray-400 dark:text-slate-500"/>
                    </div>
                    {isExpanded && <div className="p-2 space-y-1 bg-white dark:bg-slate-900 border-t dark:border-slate-700/60">
                        {filtered.map(c => (
                            <div key={c.id} onClick={() => toggleClause(c.id)} className="group border border-gray-100 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all flex items-start gap-3 relative overflow-hidden cursor-pointer">
                                <div className={`mt-0.5 flex-shrink-0 transition-colors ${selectedClauses.includes(c.id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-slate-500 hover:text-gray-400 dark:hover:text-slate-400'}`}>
                                    {selectedClauses.includes(c.id) ? <Icon name="CheckSquare" size={18}/> : <Icon name="Square" size={18}/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-adjustable-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 select-none">{c.code} - {c.title}</div>
                                    <div className="text-adjustable-xs text-slate-500 dark:text-slate-400 description-text">
                                        {c.description}
                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(c.description); toggleClause(c.id); }} className="copy-icon-trigger text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="Copy"><Icon name="Copy" size={12}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>}
                </div>
            );
        });
    };

    return (
        <div className={`${isOpen ? 'border-r' : 'w-0 border-0 overflow-hidden'} flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-[10px_0_30px_-10px_rgba(0,0,0,0.1)] z-50 relative shrink-0 transition-[width] duration-300 ease-in-out`} style={{ width: isOpen ? width : 0 }}>
             {isOpen && (
                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-50 group resize-handle" onMouseDown={startResizing}>
                    <div className="w-0.5 h-full bg-transparent group-hover:bg-indigo-400/50"></div>
                </div>
            )}
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-[360px]">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 text-slate-400 select-none"><Icon name="LayoutList" size={20}/></div>
                </div>
                <div className="space-y-3">
                    <IconSelect icon="Book" value={standardKey} onChange={(e: any) => { if (e.target.value === "ADD_NEW") onAddNewStandard(); else setStandardKey(e.target.value); }} options={[...Object.keys(standards).map(k => ({ value: k, label: standards[k].name })), {value: "ADD_NEW", label: "+ Add New Standard..."}]} defaultText="Select ISO Standard" />
                    <div className="space-y-1">
                        <IconSelect icon="Tag" value={auditInfo.type} onChange={(e: any) => setAuditInfo({...auditInfo, type: e.target.value})} options={Object.keys(AUDIT_TYPES).map(key => ({ value: key, label: key }))} defaultText="Select Audit Type" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <IconInput icon="Building" placeholder="Company" value={auditInfo.company} onChange={(e: any) => setAuditInfo({...auditInfo, company: e.target.value})} />
                        <IconInput icon="Tag" placeholder="SMO (Audit ID)" value={auditInfo.smo} onChange={(e: any) => setAuditInfo({...auditInfo, smo: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <IconInput icon="Users" placeholder="Department" value={auditInfo.department} onChange={(e: any) => setAuditInfo({...auditInfo, department: e.target.value})} />
                        <IconInput icon="User" placeholder="Interviewee" value={auditInfo.interviewee} onChange={(e: any) => setAuditInfo({...auditInfo, interviewee: e.target.value})} />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-slate-950 min-w-[360px]">
                <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
                    <IconInput icon="AuditUser" placeholder="Auditor Name" value={auditInfo.auditor} onChange={(e: any) => setAuditInfo({...auditInfo, auditor: e.target.value})} className="mb-3"/>
                    <div className="relative flex-1 group flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-gray-400"><Icon name="Search" size={16}/></span>
                            <input className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-slate-200 placeholder-gray-400" placeholder="Search clauses..." value={searchQueryRaw} onChange={e => setSearchQueryRaw(e.target.value)} onFocus={(e) => e.target.select()}/>
                        </div>
                        {selectedClauses.length > 0 && <button onClick={handleCopySelectedClauses} className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100" title="Copy Selected Clauses"><Icon name="Copy" size={18} /></button>}
                        {selectedClauses.length > 0 && <button onClick={() => setSelectedClauses([])} className="relative p-2 rounded-xl bg-white text-red-500 hover:bg-red-50 border border-gray-200" title="Clear"><Icon name="Trash2" size={18} /><span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full">{selectedClauses.length}</span></button>}
                    </div>
                </div>
                <div className="clause-scroll-container p-3 custom-scrollbar">{renderClauses()}</div>
            </div>
        </div>
    );
};

export default Sidebar;