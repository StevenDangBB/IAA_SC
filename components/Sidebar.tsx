
import React, { useState, useEffect, useRef } from 'react';
import { Icon, IconSelect, IconInput, Modal } from './UI';
import { StandardsData, AuditInfo, Clause, Group, Standard } from '../types';
import { useDebounce, copyToClipboard, cleanAndParseJSON } from '../utils';
import { AUDIT_TYPES, STANDARDS_DATA } from '../constants';
import { generateMissingDescriptions } from '../services/geminiService';

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
    onUpdateStandard: (std: Standard) => void;
    onResetStandard: (key: string) => void;
    onReferenceClause: (clause: Clause) => void;
    showIntegrityModal: boolean;
    setShowIntegrityModal: (show: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, width, setWidth, standards, standardKey, setStandardKey, auditInfo, setAuditInfo, selectedClauses, setSelectedClauses, onAddNewStandard, onUpdateStandard, onResetStandard, onReferenceClause, showIntegrityModal, setShowIntegrityModal }) => {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null); 
    const [isResizing, setIsResizing] = useState(false);
    const [searchQueryRaw, setSearchQueryRaw] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [expandedClauses, setExpandedClauses] = useState<string[]>([]);
    
    // UI State: Scroll-aware Header Visibility
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    // UI State: Manual Toggle for Audit Mission
    const [isMissionExpanded, setIsMissionExpanded] = useState(true);

    // Auto-repair states
    const [isRepairing, setIsRepairing] = useState(false);
    const [copiedClauseId, setCopiedClauseId] = useState<string | null>(null);
    const [repairStats, setRepairStats] = useState<{ fixed: number, cleaned: number } | null>(null);
    const [repairedIds, setRepairedIds] = useState<string[]>([]);

    const searchQuery = useDebounce(searchQueryRaw, 300);

    const startResizing = (e: React.MouseEvent) => {
        if ((e.target as Element).classList.contains('resize-handle')) {
            e.preventDefault();
            setIsResizing(true);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; 
        }
    };

    useEffect(() => {
        const stopResizing = () => {
            if (isResizing) {
                setIsResizing(false);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                if (sidebarRef.current) {
                    const finalWidth = parseInt(sidebarRef.current.style.width, 10);
                    if (!isNaN(finalWidth)) {
                        setWidth(finalWidth);
                    }
                }
            }
        };

        const resize = (e: MouseEvent) => {
            if (isResizing && sidebarRef.current) {
                const MIN_SIDEBAR_WIDTH = 390; 
                const MIN_MAIN_CONTENT_WIDTH = 375; 
                const MAX_SIDEBAR_LIMIT = 800;

                const maxSidebarWidth = Math.min(MAX_SIDEBAR_LIMIT, window.innerWidth - MIN_MAIN_CONTENT_WIDTH);
                const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(e.clientX, maxSidebarWidth));
                
                sidebarRef.current.style.width = `${newWidth}px`;
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

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isResizing) return;
        const target = e.currentTarget;
        const scrollTop = target.scrollTop;
        const SCROLL_THRESHOLD = 50; 
        
        if (scrollTop > SCROLL_THRESHOLD && isHeaderVisible) {
            setIsHeaderVisible(false);
        } else if (scrollTop <= SCROLL_THRESHOLD && !isHeaderVisible) {
            setIsHeaderVisible(true);
        }
    };

    useEffect(() => {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }, [standardKey]);

    const runHealthCheck = () => {
        if (!standardKey || !standards[standardKey]) return { isHealthy: false, score: 0, integrity: [], completeness: [] };
        const data = standards[standardKey];
        const integrity: { label: string, status: 'pass' | 'fail', detail: string }[] = [];
        const completeness: { label: string, status: 'pass' | 'fail', detail: string }[] = [];
        
        const allClauses = data.groups.flatMap(g => g.clauses);
        const flatten = (list: Clause[]): Clause[] => {
            return list.reduce((acc, c) => {
                acc.push(c);
                if (c.subClauses) acc.push(...flatten(c.subClauses));
                return acc;
            }, [] as Clause[]);
        };
        const flatList = flatten(allClauses);

        const missingDesc = flatList.filter(c => !c.description || c.description.trim().length < 2).length;
        integrity.push({ 
            label: 'Content Quality', 
            status: missingDesc === 0 ? 'pass' : 'fail', 
            detail: missingDesc === 0 ? 'Descriptions OK' : `${missingDesc} incomplete` 
        });
        
        const uniqueCodes = new Set(flatList.map(c => c.code));
        const duplicateCount = flatList.length - uniqueCodes.size;
        integrity.push({ 
            label: 'Data Cleanliness', 
            status: duplicateCount === 0 ? 'pass' : 'fail', 
            detail: duplicateCount === 0 ? 'Clean' : `${duplicateCount} Duplicates` 
        });

        if (standardKey.includes("9001")) {
            const crucial = ['8.4', '8.6', '8.7', '7.1.4'];
            crucial.forEach(code => {
                const found = flatList.some(c => c.code === code);
                completeness.push({ 
                    label: `Clause ${code}`, 
                    status: found ? 'pass' : 'fail', 
                    detail: found ? 'Present' : 'Missing (Required)' 
                });
            });
        }
        
        if (standardKey.includes("27001")) {
            const annexItems = flatList.filter(c => c.code.startsWith("A."));
            const isFullSet = annexItems.length >= 90; 
            completeness.push({ 
                label: 'Annex A Controls', 
                status: isFullSet ? 'pass' : 'fail', 
                detail: isFullSet ? `${annexItems.length} Controls (OK)` : `${annexItems.length}/93 (Incomplete)` 
            });
        }

        const integrityPass = integrity.every(i => i.status === 'pass');
        const completenessPass = completeness.every(i => i.status === 'pass');
        const isHealthy = integrityPass && completenessPass;

        const totalItems = integrity.length + completeness.length;
        const passItems = integrity.filter(i => i.status === 'pass').length + completeness.filter(i => i.status === 'pass').length;
        const score = Math.round((passItems / (totalItems || 1)) * 100);

        return { isHealthy, score, integrity, completeness };
    };

    const handleAutoRepair = async () => {
        if (!standardKey || !standards[standardKey]) return;
        setIsRepairing(true);
        setRepairStats(null);
        try {
            const currentStandard = JSON.parse(JSON.stringify(standards[standardKey])) as Standard; 
            const missingClauses: {ref: Clause, code: string, title: string}[] = [];
            const fixedIds: string[] = [];
            let duplicateRemovedCount = 0;

            const findMissing = (list: Clause[]) => {
                list.forEach(c => {
                    if (!c.description || c.description.trim().length < 5) {
                        missingClauses.push({ ref: c, code: c.code, title: c.title });
                    }
                    if (c.subClauses) findMissing(c.subClauses);
                });
            };
            currentStandard.groups.forEach((g: Group) => findMissing(g.clauses));

            if (missingClauses.length > 0) {
                const targets = missingClauses.map(i => ({ code: i.code, title: i.title }));
                const jsonStr = await generateMissingDescriptions(targets);
                const descriptions = cleanAndParseJSON(jsonStr);
                
                if (Array.isArray(descriptions)) {
                    const descMap = descriptions.reduce((acc: any, item: any) => {
                        if(item.code && item.description) acc[item.code] = item.description;
                        return acc;
                    }, {});

                    missingClauses.forEach(item => {
                        if (descMap[item.code]) {
                            item.ref.description = descMap[item.code];
                            fixedIds.push(item.ref.id);
                        }
                    });
                } else if (descriptions && typeof descriptions === 'object') {
                    missingClauses.forEach(item => {
                        if (descriptions[item.code]) {
                            item.ref.description = descriptions[item.code];
                            fixedIds.push(item.ref.id);
                        }
                    });
                }
            }

            const cleanClauses = (clauses: Clause[]): Clause[] => {
                const seenCodes = new Set<string>();
                const unique: Clause[] = [];
                for (const c of clauses) {
                    if (!seenCodes.has(c.code)) {
                        seenCodes.add(c.code);
                        if (c.subClauses) {
                            c.subClauses = cleanClauses(c.subClauses);
                        }
                        unique.push(c);
                    } else {
                        duplicateRemovedCount++;
                    }
                }
                return unique;
            };

            currentStandard.groups.forEach(g => {
                g.clauses = cleanClauses(g.clauses);
            });

            onUpdateStandard(currentStandard);
            setRepairedIds(fixedIds);
            setRepairStats({ fixed: fixedIds.length, cleaned: duplicateRemovedCount });
            
        } catch (e) {
            console.error("Repair failed", e);
            alert("Failed to repair automatically.");
        } finally {
            setIsRepairing(false);
        }
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
        const allClauses = standards[standardKey].groups.flatMap(g => g.clauses);
        const selectedData = selectedClauses
            .map(id => findClause(id, allClauses))
            .filter((c): c is Clause => !!c)
            .map(c => `[${c.code}] ${c.title}`)
            .join('\n');
        copyToClipboard(selectedData);
    };

    const handleSingleClauseCopy = (e: React.MouseEvent, c: Clause) => {
        e.stopPropagation();
        copyToClipboard(`[${c.code}] ${c.title}`);
        setCopiedClauseId(c.id);
        setTimeout(() => setCopiedClauseId(null), 1500);
    };

    const toggleClauseSelection = (clause: Clause) => {
        const getAllIds = (c: Clause): string[] => {
            let ids = [c.id];
            if (c.subClauses) c.subClauses.forEach(sub => ids.push(...getAllIds(sub)));
            return ids;
        };
        const targetIds = getAllIds(clause);
        const allSelected = targetIds.every(id => selectedClauses.includes(id));
        setSelectedClauses(prev => allSelected ? prev.filter(id => !targetIds.includes(id)) : Array.from(new Set([...prev, ...targetIds])));
    };

    const toggleGroupSelection = (group: Group) => {
        const getAllIds = (list: Clause[]): string[] => {
            let ids: string[] = [];
            list.forEach(c => {
                ids.push(c.id);
                if (c.subClauses) ids.push(...getAllIds(c.subClauses));
            });
            return ids;
        };
        const groupIds = getAllIds(group.clauses);
        const allSelected = groupIds.every(id => selectedClauses.includes(id));
        
        if (allSelected) {
            setSelectedClauses(prev => prev.filter(id => !groupIds.includes(id)));
        } else {
            setSelectedClauses(prev => [...new Set([...prev, ...groupIds])]);
        }
    };

    const allGroupIds = standards[standardKey]?.groups.map(g => g.id) || [];
    const areAllGroupsExpanded = allGroupIds.length > 0 && expandedGroups.length === allGroupIds.length;

    const toggleExpandAll = () => {
        if (areAllGroupsExpanded) {
            setExpandedGroups([]);
        } else {
            setExpandedGroups(allGroupIds);
        }
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
        const isCopied = copiedClauseId === c.id;
        const isRepaired = repairedIds.includes(c.id);

        return (
            <div key={c.id} className={`flex flex-col transition-all duration-300 ${level > 0 ? 'ml-4 border-l-2 dark:border-slate-800' : ''}`}>
                <div className={`group flex items-start gap-3 p-2 rounded-xl transition-all duration-200 ease-soft cursor-pointer ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-900/30 translate-x-1' : isRepaired ? 'bg-emerald-50/80 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30' : 'hover:bg-gray-100/50 dark:hover:bg-slate-800/50 hover:translate-x-1 hover:shadow-sm'}`}>
                    <button onClick={(e) => { e.stopPropagation(); toggleClauseSelection(c); }} className={`mt-1 flex-shrink-0 transition-colors duration-200 ${selection.some ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-gray-300 dark:text-slate-600 hover:text-gray-400'}`}>
                        {selection.all ? <Icon name="CheckSquare" size={16}/> : selection.some ? <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center"><div className="w-2.5 h-0.5 bg-white"></div></div> : <Icon name="Square" size={16}/>}
                    </button>
                    <div 
                        className="flex-1 min-w-0" 
                        onClick={() => hasSubs ? toggleClauseExpand(c.id) : toggleClauseSelection(c)}
                    >
                        <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase shrink-0 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded">{c.code}</span>
                                <span className="text-sm text-slate-900 dark:text-slate-100 font-medium tracking-tight leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.title}</span>
                                {isRepaired && <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md animate-pulse">UPDATED</span>}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onReferenceClause(c); }} className="p-1 transition-all transform duration-300 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:scale-110" title="Reference original text">
                                    <Icon name="BookOpen" size={14} />
                                </button>
                                <button
                                    onClick={(e) => handleSingleClauseCopy(e, c)}
                                    className={`p-1 transition-all transform duration-300 ${isCopied ? 'text-emerald-500 scale-125 opacity-100' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110'}`}
                                    title={isCopied ? "Copied!" : "Copy Clause"}
                                >
                                    <Icon name={isCopied ? "CheckThick" : "Copy"} size={isCopied ? 20 : 14} />
                                </button>
                                {hasSubs && <Icon name="ChevronDown" size={12} className={`text-gray-400 mt-0.5 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}/>}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-1.5 leading-relaxed block w-full whitespace-normal border-t border-gray-100 dark:border-slate-800 pt-1">
                            {c.description}
                        </div>
                    </div>
                </div>
                {/* Smooth Accordion Animation using Grid */}
                <div className={`grid transition-all duration-300 ease-in-out ${hasSubs && isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        {hasSubs && <div className="mt-1 flex flex-col">{c.subClauses!.map(sub => renderClauseItem(sub, level + 1))}</div>}
                    </div>
                </div>
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

        return data.groups.map(g => {
            const isGroupExpanded = expandedGroups.includes(g.id) || !!searchQuery;
            const matchesSearch = (c: Clause): boolean => {
                const term = searchQuery.toLowerCase();
                return c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term) || (c.subClauses ? c.subClauses.some(matchesSearch) : false);
            };
            const filteredClauses = searchQuery ? g.clauses.filter(matchesSearch) : g.clauses;
            if (filteredClauses.length === 0) return null;

            return (
                <div key={g.id} className="mb-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-transparent dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-slate-800/30 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors" onClick={() => toggleGroupExpand(g.id)}>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleGroupSelection(g); }}
                                className={`p-2 rounded-xl shadow-lg text-white ${getGroupColorClass(g.title)} hover:scale-110 active:scale-95 transition-transform duration-300`}
                                title="Click to Select/Deselect All in Group"
                            >
                                <Icon name={g.icon} size={14}/>
                            </button>
                            <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-widest">{g.title}</h4>
                        </div>
                        <Icon name="ChevronDown" size={12} className={`text-slate-400 transition-transform duration-300 ${isGroupExpanded ? 'rotate-180' : ''}`}/>
                    </div>
                    <div className={`grid transition-all duration-300 ease-in-out ${isGroupExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden bg-white dark:bg-slate-900">
                             <div className="p-2 space-y-1">{filteredClauses.map(c => renderClauseItem(c))}</div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    const auditFieldIconColor = "text-indigo-700 dark:text-indigo-400";
    const health = runHealthCheck();
    const isCustomStandard = !STANDARDS_DATA[standardKey] || (standards[standardKey] && standards[standardKey] !== STANDARDS_DATA[standardKey]);

    const standardOptions = (() => {
        const rawOptions = Object.keys(standards).map(k => ({ value: k, label: standards[k].name }));
        const seen = new Set();
        const unique = rawOptions.filter(item => {
            const duplicate = seen.has(item.label);
            seen.add(item.label);
            return !duplicate;
        });
        return [...unique, {value: "ADD_NEW", label: "+ Add New Standard..."}];
    })();

    // Workflow Completion Calculation
    const infoCompletion = (() => {
        let score = 0;
        if (standardKey) score++;
        if (auditInfo.type) score++;
        if (auditInfo.company) score++;
        if (auditInfo.auditor) score++;
        return Math.min(4, score); // Max 4 items tracked for progress bar
    })();

    return (
        <div 
            ref={sidebarRef}
            className={`${isOpen ? 'border-r' : 'w-0 border-0 overflow-hidden'} flex flex-col bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xl z-50 relative shrink-0 ${isResizing ? 'transition-none' : 'transition-[width] duration-300 ease-soft'} h-full dark:shadow-[5px_0_15px_-3px_rgba(0,0,0,0.5)]`} 
            style={{ width: isOpen ? (window.innerWidth < 768 ? '100%' : width) : 0 }}
        >
             {isOpen && <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500 transition-colors z-50 group resize-handle hidden md:block" onMouseDown={startResizing} />}
            
            {/* --- REFACTORED: AUDIT MISSION CHARTER --- */}
            <div className={`flex-shrink-0 bg-white dark:bg-slate-900 w-full md:min-w-[390px] flex flex-col transition-all duration-400 ease-soft overflow-hidden will-change-auto ${isHeaderVisible ? 'max-h-[1000px] opacity-100 p-5 border-b border-gray-100 dark:border-slate-800' : 'max-h-0 opacity-0 p-0 border-none'}`}>
                
                {/* Header: Audit Mission - TOGGLEABLE */}
                <div 
                    className="flex items-center justify-between mb-3 cursor-pointer group select-none"
                    onClick={() => setIsMissionExpanded(!isMissionExpanded)}
                    title={isMissionExpanded ? "Collapse Mission Charter" : "Expand Mission Charter"}
                >
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
                        <Icon name="Session8_Flag" size={14} className="text-indigo-500"/>
                        Audit Mission Charter
                        <Icon name="ChevronDown" size={12} className={`transition-transform duration-300 text-slate-300 group-hover:text-indigo-400 ${isMissionExpanded ? 'rotate-180' : ''}`}/>
                    </h3>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-0.5 items-center">
                            {[1, 2, 3, 4].map(step => (
                                <div key={step} className={`w-3 h-1 rounded-full ${step <= infoCompletion ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-slate-700'}`}></div>
                            ))}
                        </div>
                        {/* RESET BUTTON REMOVED HERE */}
                    </div>
                </div>

                {/* Setup Card - COLLAPSIBLE CONTENT */}
                <div className={`grid transition-all duration-300 ease-in-out ${isMissionExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        <div className="bg-gray-50/80 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-3 space-y-4">
                            
                            {/* SECTION 1: SCOPE */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase px-1">Scope Definition</label>
                                <div className="relative">
                                    <IconSelect 
                                        icon="Book" 
                                        iconColor={auditFieldIconColor} 
                                        value={standardKey} 
                                        onChange={(e: any) => { if (e.target.value === "ADD_NEW") onAddNewStandard(); else setStandardKey(e.target.value); }} 
                                        options={standardOptions} 
                                        defaultText="Select ISO Standard" 
                                    />
                                    {standardKey && (
                                        <button onClick={() => setShowIntegrityModal(true)} className={`absolute -top-1.5 -right-1.5 p-1 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 text-white ring-2 ring-white dark:ring-slate-900 ${health.isHealthy ? 'bg-emerald-500' : 'bg-orange-500'}`} title="Integrity Check">
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
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-gray-50/40 dark:bg-slate-950/40 w-full md:min-w-[390px]">
                <div className={`p-3 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 sticky top-0 transition-all duration-500 ${!isHeaderVisible ? 'shadow-md border-indigo-100 dark:border-indigo-900/50' : ''}`}>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 flex items-center gap-1 bg-gray-100 dark:bg-slate-950 rounded-xl px-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                            <span className="text-blue-700 dark:text-blue-400 font-bold pl-1"><Icon name="Search" size={14}/></span>
                            <input className="w-full bg-transparent py-2 px-1 text-xs font-medium outline-none text-slate-800 dark:text-slate-200 placeholder-gray-400" placeholder="Search clauses..." value={searchQueryRaw} onChange={e => setSearchQueryRaw(e.target.value)}/>
                            
                            <button 
                                onClick={toggleExpandAll} 
                                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title={areAllGroupsExpanded ? "Collapse All Groups" : "Expand All Groups"}
                            >
                                <Icon name={areAllGroupsExpanded ? "CollapsePanel" : "ExpandPanel"} size={14}/>
                            </button>
                        </div>

                        {selectedClauses.length > 0 && (
                            <div className="flex gap-2 animate-in fade-in slide-in-from-right-5 duration-300">
                                <button onClick={handleCopySelectedClauses} className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 transition-colors relative shadow-sm border border-indigo-100 dark:border-indigo-900/30 hover:scale-105" title="Copy Selected Clauses">
                                    <Icon name="Copy" size={16} />
                                </button>
                                <button onClick={() => setSelectedClauses([])} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors relative shadow-sm border border-red-100 dark:border-red-900/30 hover:scale-105" title="Clear All">
                                    <Icon name="Trash2" size={16} />
                                    <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-bounce">{selectedClauses.length}</div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto custom-scrollbar p-3 scroll-smooth"
                    onScroll={handleScroll}
                >
                    <div className="min-h-[150vh] flex flex-col">
                        {renderClauses()}
                        <div className="flex-1"></div> {/* Spacer to fill remaining height */}
                    </div>
                </div>
            </div>

            <Modal isOpen={showIntegrityModal} title="Standard Health Index" onClose={() => setShowIntegrityModal(false)}>
                 <div className="space-y-6">
                    <div className="flex items-center gap-5 p-5 rounded-3xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-inner dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-xl ring-4 ring-white dark:ring-slate-700 ${health.score > 90 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}>
                            {health.score}%
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Data Health</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-1">{health.isHealthy ? 'Excellent! Data is accurate, clean, and complete for professional use.' : 'Standard data is incomplete or contains errors. Please review.'}</p>
                        </div>
                    </div>
                     <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Integrity Checklist</h5>
                        {health.integrity.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-md">
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
                        {health.completeness.map((item, idx) => (
                            <div key={`comp-${idx}`} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-md">
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

                     <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                     {isCustomStandard && (
                        <button 
                            onClick={() => {
                                if(confirm("Are you sure? This will remove all AI repairs and revert to the original static data.")) {
                                    onResetStandard(standardKey);
                                    setShowIntegrityModal(false);
                                    setRepairStats(null);
                                    setRepairedIds([]);
                                }
                            }} 
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border border-red-200 dark:border-red-800"
                        >
                            <Icon name="Trash2" size={14}/>
                            Reset to Default
                        </button>
                     )}
                     
                     {repairStats ? (
                         <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-5">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Repair Complete</p>
                                <p className="text-xs text-slate-500">Added {repairStats.fixed} items, Cleaned {repairStats.cleaned} dupes.</p>
                            </div>
                            <button onClick={() => setShowIntegrityModal(false)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/30">
                                Close & Continue
                            </button>
                         </div>
                     ) : !health.isHealthy && (
                         <button 
                            onClick={handleAutoRepair} 
                            disabled={isRepairing}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                        >
                            {isRepairing ? <Icon name="Loader" className="animate-spin"/> : <Icon name="Wand2"/>}
                            {isRepairing ? "AI is Fixing..." : "Auto-Repair Issues with AI"}
                        </button>
                     )}
                 </div>
                 </div>
            </Modal>
        </div>
    );
};
export default Sidebar;