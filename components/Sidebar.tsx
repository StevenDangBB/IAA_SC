import React, { useState, useEffect } from 'react';
import { Icon, IconSelect, IconInput, Modal } from './UI';
import { StandardsData, AuditInfo, Clause, Group } from '../types';
import { useDebounce, copyToClipboard } from '../utils';
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
    const [expandedClauses, setExpandedClauses] = useState<string[]>([]);
    const [showIntegrityModal, setShowIntegrityModal] = useState(false);
    
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

    const runHealthCheck = () => {
        if (!standardKey || !standards[standardKey]) return { score: 0, items: [] };
        const data = standards[standardKey];
        const items: { label: string, status: 'pass' | 'fail', detail: string }[] = [];
        
        const allClauses = data.groups.flatMap((g: Group) => g.clauses);
        const flatten = (list: Clause[]): Clause[] => {
            return list.reduce((acc, c) => {
                acc.push(c);
                if (c.subClauses) acc.push(...flatten(c.subClauses));
                return acc;
            }, [] as Clause[]);
        };
        const flatList = flatten(allClauses);

        if (standardKey.includes("9001")) {
            const crucial = ['8.4', '8.6', '8.7', '7.1.4'];
            crucial.forEach(code => {
                const found = flatList.some(c => c.code === code);
                items.push({ label: `Clause ${code}`, status: found ? 'pass' : 'fail', detail: found ? 'Verified' : 'Missing' });
            });
        }
        
        if (standardKey.includes("27001")) {
            const annexItems = flatList.filter(c => c.code.startsWith("A."));
            items.push({ label: 'Annex A Controls', status: annexItems.length >= 93 ? 'pass' : 'fail', detail: `${annexItems.length}/93 Controls` });
        }

        const missingDesc = flatList.filter(c => !c.description || c.description.length < 5).length;
        items.push({ label: 'Content Quality', status: missingDesc === 0 ? 'pass' : 'fail', detail: missingDesc === 0 ? 'Descriptions OK' : `${missingDesc} incomplete` });

        const score = Math.round((items.filter(i => i.status === 'pass').length / (items.length || 1)) * 100);
        return { score, items };
    };

    const handleCopySelectedClauses = () => {
        if (!standardKey || !standards[standardKey]) return;
        const findClause = (id: string, list: Clause[]): Clause | undefined => {
            for (let c of list) { 
                if (c.id === id) return c; 
                if (c.subClauses) { 
                    const f = findClause(id, c.subClauses); 
                    if (f) return f; 
                } 
            }
        };
        const allClauses = standards[standardKey].groups.flatMap((g: Group) => g.clauses);
        const selectedData = selectedClauses
            .map(id => findClause(id, allClauses))
            .filter((c): c is Clause => !!c)
            .map(c => `[${c.code}] ${c.title}`)
            .join('\n');
        copyToClipboard(selectedData);
    };

    const toggleClauseSelection = (clause: Clause) => {
        const getAllIds = (c: Clause): string[] => {
            let ids = [c.id];
            if (c.subClauses) c.subClauses.forEach((sub: Clause) => ids.push(...getAllIds(sub)));
            return ids;
        };
        const targetIds = getAllIds(clause);
        const allSelected = targetIds.every(id => selectedClauses.includes(id));
        setSelectedClauses(prev => allSelected ? prev.filter(id => !targetIds.includes(id)) : Array.from(new Set([...prev, ...targetIds])));
    };

    const toggleGroupExpand = (id: string) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleClauseExpand = (id: string) => setExpandedClauses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const renderClauseItem = (c: Clause, level: number = 0) => {
        const hasSubs = c.subClauses && c.subClauses.length > 0;
        const isExpanded = expandedClauses.includes(c.id) || !!searchQuery;
        const isSelected = selectedClauses.includes(c.id);
        const getChildSelectionStatus = (item: Clause): { all: boolean, some: boolean } => {
            if (!item.subClauses) return { all: selectedClauses.includes(item.id), some: selectedClauses.includes(item.id) };
            const subRes = item.subClauses.map(getChildSelectionStatus);
            const all = selectedClauses.includes(item.id) && subRes.every(r => r.all);
            const some = selectedClauses.includes(item.id) || subRes.some(r => r.some);
            return { all, some };
        };
        const selection = getChildSelectionStatus(c);

        return (
            <div key={c.id} className={`flex flex-col ${level > 0 ? 'ml-4 border-l-2 dark:border-slate-800' : ''}`}>
                <div className={`group flex items-start gap-3 p-2 rounded-xl transition-all cursor-pointer ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-900/20' : 'hover:bg-gray-100/50 dark:hover:bg-slate-800/50'}`}>
                    <button onClick={(e) => { e.stopPropagation(); toggleClauseSelection(c); }} className={`mt-1 flex-shrink-0 transition-colors ${selection.some ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-slate-600 hover:text-gray-400'}`}>
                        {selection.all ? <Icon name="CheckSquare" size={16}/> : selection.some ? <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center"><div className="w-2.5 h-0.5 bg-white"></div></div> : <Icon name="Square" size={16}/>}
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => hasSubs ? toggleClauseExpand(c.id) : toggleClauseSelection(c)}>
                        {/* Improvement: Clause Name and Code on line 1 */}
                        <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase shrink-0 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded">{c.code}</span>
                                <span className="text-[11px] text-slate-900 dark:text-slate-100 font-extrabold tracking-tight leading-tight">{c.title}</span>
                            </div>
                            {hasSubs && <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={12} className="text-gray-400 mt-0.5 shrink-0"/>}
                        </div>
                        {/* Improvement: Description on line 2 */}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-1.5 leading-relaxed block w-full whitespace-normal border-t border-gray-100 dark:border-slate-800 pt-1">
                            {c.description}
                        </div>
                    </div>
                </div>
                {hasSubs && isExpanded && <div className="mt-1 flex flex-col">{c.subClauses!.map(sub => renderClauseItem(sub, level + 1))}</div>}
            </div>
        );
    };

    const renderClauses = () => {
        if (!standardKey || !standards[standardKey]) return <div className="text-center text-gray-400 mt-20 italic text-xs uppercase tracking-widest opacity-50">Select a Standard</div>;
        const data = standards[standardKey];
        
        const getGroupColorClass = (title: string) => {
            const t = title.toUpperCase();
            if (t.includes('PLAN')) return 'bg-blue-600 dark:bg-blue-500 shadow-blue-500/20';
            if (t.includes('SUPPORT')) return 'bg-purple-600 dark:bg-purple-500 shadow-purple-500/20';
            if (t.includes('DO')) return 'bg-orange-600 dark:bg-orange-500 shadow-orange-500/20';
            if (t.includes('CHECK') || t.includes('ACT')) return 'bg-emerald-600 dark:bg-emerald-500 shadow-emerald-500/20';
            if (t.includes('ANNEX')) return 'bg-rose-600 dark:bg-rose-500 shadow-rose-500/20';
            return 'bg-slate-800 dark:bg-slate-700';
        };

        return data.groups.map((g: Group) => {
            const isGroupExpanded = expandedGroups.includes(g.id) || !!searchQuery;
            const matchesSearch = (c: Clause): boolean => {
                const term = searchQuery.toLowerCase();
                return c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term) || (c.subClauses ? c.subClauses.some(matchesSearch) : false);
            };
            const filteredClauses = searchQuery ? g.clauses.filter(matchesSearch) : g.clauses;
            if (filteredClauses.length === 0) return null;

            return (
                <div key={g.id} className="mb-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleGroupExpand(g.id)}>
                        <div className="flex items-center gap-3">
                            <button className={`p-2 rounded-xl shadow-lg text-white ${getGroupColorClass(g.title)}`}>
                                <Icon name={g.icon} size={14}/>
                            </button>
                            <h4 className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest">{g.title}</h4>
                        </div>
                        <Icon name={isGroupExpanded ? "ChevronUp" : "ChevronDown"} size={12} className="text-slate-400"/>
                    </div>
                    {isGroupExpanded && <div className="p-2 space-y-1 bg-white dark:bg-slate-900">{filteredClauses.map((c: Clause) => renderClauseItem(c))}</div>}
                </div>
            );
        });
    };

    const auditFieldIconColor = "text-indigo-700 dark:text-indigo-400 font-bold";
    const health = runHealthCheck();

    return (
        <div className={`${isOpen ? 'border-r' : 'w-0 border-0 overflow-hidden'} flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xl z-50 relative shrink-0 transition-[width] duration-300 ease-in-out`} style={{ width: isOpen ? width : 0 }}>
             {isOpen && <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-50 group resize-handle" onMouseDown={startResizing} />}
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 min-w-[360px] bg-white dark:bg-slate-900">
                <div className="space-y-3">
                    <div className="relative">
                        <IconSelect icon="Book" iconColor={auditFieldIconColor} value={standardKey} onChange={(e: any) => { if (e.target.value === "ADD_NEW") onAddNewStandard(); else setStandardKey(e.target.value); }} options={[...Object.keys(standards).map(k => ({ value: k, label: standards[k].name })), {value: "ADD_NEW", label: "+ Add New Standard..."}]} defaultText="Select ISO Standard" />
                        {standardKey && (
                            <button onClick={() => setShowIntegrityModal(true)} className={`absolute -top-2 -right-2 p-1.5 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 text-white ring-4 ring-white dark:ring-slate-900 ${health.score === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} title="Standard Integrity Status">
                                <Icon name={health.score === 100 ? "CheckCircle2" : "AlertCircle"} size={14}/>
                            </button>
                        )}
                    </div>
                    <IconSelect icon="FileEdit" iconColor={auditFieldIconColor} value={auditInfo.type} onChange={(e: any) => setAuditInfo({...auditInfo, type: e.target.value})} options={Object.keys(AUDIT_TYPES).map(key => ({ value: key, label: key }))} defaultText="Select Audit Type" />
                    <div className="grid grid-cols-2 gap-3">
                        <IconInput icon="Building" iconColor={auditFieldIconColor} placeholder="Company Name" value={auditInfo.company} onChange={(e: any) => setAuditInfo({...auditInfo, company: e.target.value})} />
                        <IconInput icon="Tag" iconColor={auditFieldIconColor} placeholder="Audit ID" value={auditInfo.smo} onChange={(e: any) => setAuditInfo({...auditInfo, smo: e.target.value})} />
                    </div>
                    {/* RESTORED: Department and Auditee/Interviewee fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <IconInput icon="Users" iconColor={auditFieldIconColor} placeholder="Department" value={auditInfo.department} onChange={(e: any) => setAuditInfo({...auditInfo, department: e.target.value})} />
                        <IconInput icon="User" iconColor={auditFieldIconColor} placeholder="Auditee/Auditor" value={auditInfo.interviewee} onChange={(e: any) => setAuditInfo({...auditInfo, interviewee: e.target.value})} />
                    </div>
                </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 bg-gray-50/40 dark:bg-slate-950/40 min-w-[360px]">
                <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
                    <IconInput icon="AuditUser" iconColor={auditFieldIconColor} placeholder="Lead Auditor Name" value={auditInfo.auditor} onChange={(e: any) => setAuditInfo({...auditInfo, auditor: e.target.value})} className="mb-3"/>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-blue-700 dark:text-blue-400 font-bold"><Icon name="Search" size={14}/></span>
                            <input className="w-full pl-9 pr-3 py-2 text-xs bg-gray-100 dark:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-slate-200 placeholder-gray-400 border border-transparent focus:border-indigo-100" placeholder="Search content..." value={searchQueryRaw} onChange={e => setSearchQueryRaw(e.target.value)}/>
                        </div>
                        {selectedClauses.length > 0 && (
                            <div className="flex gap-2">
                                {/* RESTORED: Copy Selected button */}
                                <button onClick={handleCopySelectedClauses} className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 transition-colors relative shadow-sm border border-indigo-100 dark:border-indigo-900/30" title="Copy Selected Clauses">
                                    <Icon name="Copy" size={16} />
                                </button>
                                {/* RESTORED: Trash/Clear button with badge */}
                                <button onClick={() => setSelectedClauses([])} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors relative shadow-sm border border-red-100 dark:border-red-900/30" title="Clear All">
                                    <Icon name="Trash2" size={16} />
                                    <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">{selectedClauses.length}</div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">{renderClauses()}</div>
            </div>

            <Modal isOpen={showIntegrityModal} title="Standard Health Index" onClose={() => setShowIntegrityModal(false)}>
                 <div className="space-y-6">
                    <div className="flex items-center gap-5 p-5 rounded-3xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-inner">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-xl ring-4 ring-white dark:ring-slate-700 ${health.score === 100 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}>
                            {health.score}%
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Data Health</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-1">{health.score === 100 ? 'Excellent! Data is complete and structured.' : 'Information might be incomplete for professional audit.'}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Integrity Checklist</h5>
                        {health.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`p-1.5 rounded-full shadow-sm ${item.status === 'pass' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                                        <Icon name={item.status === 'pass' ? "CheckCircle2" : "AlertCircle"} size={18}/>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                                </div>
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-sm uppercase ${item.status === 'pass' ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                                    {item.detail}
                                </span>
                            </div>
                        ))}
                    </div>
                 </div>
            </Modal>
        </div>
    );
};
export default Sidebar;