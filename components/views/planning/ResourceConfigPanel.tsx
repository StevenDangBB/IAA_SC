
import React, { useState } from 'react';
import { Icon, GlassDatePicker } from '../../UI';
import { AuditSite, AuditMember, AuditPlanConfig, AuditProcess } from '../../../types';

interface ResourceConfigPanelProps {
    auditPlanConfig: AuditPlanConfig;
    setAuditPlanConfig: (config: AuditPlanConfig) => void;
    auditSites: AuditSite[];
    setAuditSites: React.Dispatch<React.SetStateAction<AuditSite[]>>;
    auditTeam: AuditMember[];
    setAuditTeam: React.Dispatch<React.SetStateAction<AuditMember[]>>;
    processes: AuditProcess[];
    updateProcessCode: (id: string, code: string) => void;
    updateProcessSites: (id: string, siteIds: string[]) => void;
    handleGenerateSchedule: () => void;
    isGenerating: boolean;
    genProgress: number;
    genLogs: string[];
    logsEndRef: React.RefObject<HTMLDivElement | null>;
    handleRemoveDate: (date: string) => void;
    safeAuditDates: string[];
    isCalendarOpen: boolean;
    setIsCalendarOpen: (v: boolean) => void;
    handleUpdateDates: (dates: string[]) => void;
}

export const ResourceConfigPanel: React.FC<ResourceConfigPanelProps> = ({
    auditPlanConfig, setAuditPlanConfig,
    auditSites, setAuditSites,
    auditTeam, setAuditTeam,
    processes, updateProcessCode, updateProcessSites,
    handleGenerateSchedule, isGenerating, genProgress, genLogs, logsEndRef,
    handleRemoveDate, safeAuditDates, isCalendarOpen, setIsCalendarOpen, handleUpdateDates
}) => {
    const [activeSection, setActiveSection] = useState<'none' | 'logistics' | 'sites' | 'team'>('logistics');
    const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
    const [tempSite, setTempSite] = useState<AuditSite | null>(null);
    const [newSite, setNewSite] = useState<AuditSite>({ id: "", name: "", address: "", scope: "", isMain: false, employeeCount: 0 });
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [newMember, setNewMember] = useState<Partial<AuditMember>>({ 
        name: "", role: "Auditor", competencyCodes: "", manDays: 1, isRemote: false, availability: "", availabilityMatrix: {} 
    });

    const toggleSection = (sec: typeof activeSection) => {
        setActiveSection(prev => prev === sec ? 'none' : sec);
    };

    // --- SITE LOGIC ---
    const handleAddSite = () => {
        if (!newSite.name.trim()) return;
        const site: AuditSite = {
            id: `site_${Date.now()}`,
            name: newSite.name.trim(),
            address: newSite.address || "",
            scope: newSite.scope || "",
            isMain: newSite.isMain,
            employeeCount: newSite.employeeCount || 0
        };
        setAuditSites(prev => [...prev, site]);
        setNewSite({ id: "", name: "", address: "", scope: "", isMain: false, employeeCount: 0 });
    };

    const handleStartEditSite = (site: AuditSite) => {
        setEditingSiteId(site.id);
        setTempSite({ ...site });
    };

    const handleSaveSite = () => {
        if (tempSite && editingSiteId) {
            setAuditSites(prev => prev.map(s => s.id === editingSiteId ? tempSite : s));
            setEditingSiteId(null);
            setTempSite(null);
        }
    };

    const handleCancelEditSite = () => {
        setEditingSiteId(null);
        setTempSite(null);
    };

    // --- MEMBER LOGIC ---
    const handleSaveMember = () => {
        if (!newMember.name?.trim()) return;
        
        if (editingMemberId) {
            setAuditTeam(prev => prev.map(m => m.id === editingMemberId ? { ...m, ...newMember } as AuditMember : m));
            setEditingMemberId(null);
        } else {
            const member: AuditMember = {
                id: `mem_${Date.now()}`,
                name: newMember.name.trim(),
                role: newMember.role as any,
                competencyCodes: newMember.competencyCodes?.trim() || "",
                manDays: newMember.manDays || 1,
                isRemote: newMember.isRemote || false,
                availability: newMember.availability || "",
                availabilityMatrix: newMember.availabilityMatrix || {}
            };
            setAuditTeam(prev => [...prev, member]);
        }
        setNewMember({ name: "", role: "Auditor", competencyCodes: "", manDays: 1, isRemote: false, availability: "", availabilityMatrix: {} });
    };

    const handleEditMember = (m: AuditMember) => {
        setEditingMemberId(m.id);
        setNewMember({ ...m });
        setActiveSection('team');
    };

    const handleUpdateMatrix = (date: string, field: 'mode' | 'slot', value: any) => {
        setNewMember(prev => {
            const currentMatrix = prev.availabilityMatrix || {};
            // Default to Onsite, Full Day if creating new entry
            const currentEntry = currentMatrix[date] || { mode: 'onsite', allocation: 1.0, slot: 'FULL' };
            
            let newEntry = { ...currentEntry };

            if (field === 'mode') {
                newEntry.mode = value;
            } else if (field === 'slot') {
                newEntry.slot = value;
                // Auto-calculate Allocation based on Slot
                if (value === 'OFF') newEntry.allocation = 0.0;
                else if (value === 'FULL') newEntry.allocation = 1.0;
                else newEntry.allocation = 0.5; // AM or PM = 0.5 WD
            }
            
            const newMatrix = {
                ...currentMatrix,
                [date]: newEntry
            };

            const totalAllocation = (Object.values(newMatrix) as any[]).reduce((acc: number, val: any) => acc + (Number(val?.allocation) || 0), 0);

            return {
                ...prev,
                availabilityMatrix: newMatrix,
                manDays: totalAllocation 
            };
        });
    };

    return (
        <div className="w-[380px] min-w-[320px] border-r border-gray-100 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-950/20 flex flex-col p-4 overflow-y-auto custom-scrollbar gap-3 h-full">
            
            {/* 1. LOGISTICS ACCORDION */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm shrink-0">
                <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => toggleSection('logistics')}
                >
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Icon name="Session7_Compass" size={14}/> Logistics
                    </h4>
                    <Icon name="ChevronDown" size={12} className={`text-slate-400 transition-transform ${activeSection === 'logistics' ? 'rotate-180' : ''}`}/>
                </div>
                
                {activeSection !== 'logistics' && (
                    <div className="px-3 pb-3 pt-0 text-[10px] text-slate-500">
                        {safeAuditDates.length} Days • {auditPlanConfig.startTime} - {auditPlanConfig.endTime}
                    </div>
                )}

                {activeSection === 'logistics' && (
                    <div className="p-3 pt-0 space-y-3 animate-accordion-down mt-2 h-auto">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Audit Dates</label>
                            <button 
                                onClick={() => setIsCalendarOpen(true)}
                                className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 mb-2 group"
                            >
                                <Icon name="Calendar" size={16} className="group-hover:-rotate-12 transition-transform duration-500"/>
                                <span className="font-bold text-xs">Manage Dates ({safeAuditDates.length})</span>
                            </button>
                            <div className="flex flex-wrap gap-2">
                                {safeAuditDates.map((date, idx) => (
                                    <span key={idx} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 text-[9px] font-mono text-slate-700 dark:text-slate-300">
                                        {date}
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveDate(date); }} className="text-slate-400 hover:text-red-500 ml-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600"><Icon name="X" size={10}/></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Start</label>
                                <input type="time" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs outline-none focus:border-orange-500 text-slate-900 dark:text-white font-bold dark:[color-scheme:dark]" value={auditPlanConfig.startTime} onChange={e => setAuditPlanConfig({...auditPlanConfig, startTime: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">End</label>
                                <input type="time" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs outline-none focus:border-orange-500 text-slate-900 dark:text-white font-bold dark:[color-scheme:dark]" value={auditPlanConfig.endTime} onChange={e => setAuditPlanConfig({...auditPlanConfig, endTime: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Lunch Start</label>
                                <input type="time" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs outline-none focus:border-orange-500 text-slate-900 dark:text-white font-bold dark:[color-scheme:dark]" value={auditPlanConfig.lunchStartTime} onChange={e => setAuditPlanConfig({...auditPlanConfig, lunchStartTime: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Lunch End</label>
                                <input type="time" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs outline-none focus:border-orange-500 text-slate-900 dark:text-white font-bold dark:[color-scheme:dark]" value={auditPlanConfig.lunchEndTime} onChange={e => setAuditPlanConfig({...auditPlanConfig, lunchEndTime: e.target.value})} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. SITES ACCORDION */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm shrink-0">
                <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => toggleSection('sites')}
                >
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Icon name="MapPin" size={14}/> Sites ({auditSites.length})
                    </h4>
                    <Icon name="ChevronDown" size={12} className={`text-slate-400 transition-transform ${activeSection === 'sites' ? 'rotate-180' : ''}`}/>
                </div>

                {activeSection !== 'sites' && (
                    <div className="px-3 pb-3 pt-0 text-[10px] text-slate-500 truncate">
                        {auditSites.map(s => s.name).join(", ") || "No sites added"}
                    </div>
                )}

                {activeSection === 'sites' && (
                    <div className="p-3 pt-0 space-y-3 animate-accordion-down mt-2 h-auto">
                        <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                            {auditSites.map(s => {
                                const isEditing = editingSiteId === s.id;
                                return (
                                    <div 
                                        key={s.id} 
                                        className={`flex justify-between items-center p-2 rounded-lg group border cursor-pointer transition-all ${isEditing ? 'bg-slate-50 dark:bg-slate-800 border-orange-500 ring-1 ring-orange-500/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-orange-200 dark:hover:border-orange-800'}`}
                                        onClick={() => handleStartEditSite(s)}
                                    >
                                        <div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.name} {s.isMain && <span className="text-[9px] bg-orange-100 text-orange-600 px-1 rounded">HQ</span>}</div>
                                            <div className="text-[9px] text-slate-500 flex gap-1">
                                                <span>{s.employeeCount || 0} Staff</span>
                                                {s.address && <span className="truncate max-w-[120px] opacity-70">• {s.address}</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                            <button onClick={(e) => { e.stopPropagation(); setAuditSites(prev => prev.filter(x => x.id !== s.id)); }} className="text-slate-400 hover:text-red-500"><Icon name="X" size={12}/></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded-lg border border-gray-100 dark:border-slate-800 space-y-2">
                            <input className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-orange-500" placeholder="Site Name" value={editingSiteId ? tempSite?.name : newSite.name} onChange={e => editingSiteId ? setTempSite({...tempSite!, name: e.target.value}) : setNewSite({...newSite, name: e.target.value})} />
                            <input className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-orange-500" placeholder="Address" value={editingSiteId ? tempSite?.address : newSite.address} onChange={e => editingSiteId ? setTempSite({...tempSite!, address: e.target.value}) : setNewSite({...newSite, address: e.target.value})} />
                            <input className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-orange-500" placeholder="Scope (Optional)" value={editingSiteId ? tempSite?.scope : newSite.scope} onChange={e => editingSiteId ? setTempSite({...tempSite!, scope: e.target.value}) : setNewSite({...newSite, scope: e.target.value})} />
                            <div className="flex gap-2">
                                <input className="flex-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" placeholder="Staff Count" value={editingSiteId ? tempSite?.employeeCount : newSite.employeeCount || ""} onChange={e => editingSiteId ? setTempSite({...tempSite!, employeeCount: parseInt(e.target.value)}) : setNewSite({...newSite, employeeCount: parseInt(e.target.value)})} />
                                <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                    <input type="checkbox" checked={editingSiteId ? tempSite?.isMain : newSite.isMain} onChange={e => editingSiteId ? setTempSite({...tempSite!, isMain: e.target.checked}) : setNewSite({...newSite, isMain: e.target.checked})} className="accent-orange-500"/>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">HQ Site</span>
                                </label>
                            </div>
                            {editingSiteId ? (
                                <div className="flex gap-2">
                                    <button onClick={handleSaveSite} className="flex-1 bg-emerald-500 text-white rounded py-1 text-xs font-bold">Save</button>
                                    <button onClick={handleCancelEditSite} className="flex-1 bg-slate-200 text-slate-600 rounded py-1 text-xs font-bold">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={handleAddSite} className="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 rounded py-1 text-xs font-bold flex items-center justify-center gap-1"><Icon name="Plus" size={12}/> Add Site</button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 3. TEAM ACCORDION */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm shrink-0">
                <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => toggleSection('team')}
                >
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Icon name="Users" size={14}/> Audit Team ({auditTeam.length})
                    </h4>
                    <Icon name="ChevronDown" size={12} className={`text-slate-400 transition-transform ${activeSection === 'team' ? 'rotate-180' : ''}`}/>
                </div>

                {activeSection !== 'team' && (
                    <div className="px-3 pb-3 pt-0 text-[10px] text-slate-500 truncate">
                        {auditTeam.map(m => m.name).join(", ") || "No members added"}
                    </div>
                )}

                {activeSection === 'team' && (
                    <div className="p-3 pt-0 space-y-2 animate-accordion-down mt-2 h-auto">
                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar mb-3 p-1">
                            {auditTeam.map(m => {
                                const isEditing = editingMemberId === m.id;
                                return (
                                    <div 
                                        key={m.id} 
                                        className={`flex justify-between items-start p-3 bg-slate-50 dark:bg-slate-800 rounded-lg group border cursor-pointer transition-all ${isEditing ? 'border-orange-500 ring-1 ring-orange-500/20 z-10' : 'border-transparent hover:border-orange-200 dark:hover:border-orange-800'}`} 
                                        onClick={() => handleEditMember(m)}
                                    >
                                        <div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                {m.name}
                                                {m.role === 'Lead Auditor' && <Icon name="Award" size={12} className="text-amber-500" />}
                                                {m.isRemote && <span className="bg-purple-100 text-purple-600 px-1 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">Remote</span>}
                                            </div>
                                            <div className="text-[9px] text-slate-500 flex gap-1 mt-0.5">
                                                <span>{m.role}</span>
                                                <span className="font-mono text-slate-400">• {m.manDays?.toFixed(1) || 0} WD</span>
                                                {m.competencyCodes && <span className="font-mono text-teal-600 bg-teal-50 px-1 rounded">[{m.competencyCodes}]</span>}
                                            </div>
                                            {m.availability && (
                                                <div className="text-[9px] text-slate-400 italic mt-1 leading-snug border-l-2 border-slate-200 dark:border-slate-700 pl-1.5">
                                                    {m.availability}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setAuditTeam(prev => prev.filter(x => x.id !== m.id)); }} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="X" size={12}/></button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded-lg border border-gray-100 dark:border-slate-800 space-y-2 mt-4">
                            <input className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-orange-500" placeholder="Name" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                            <div className="flex gap-2 items-center">
                                <select 
                                    className="flex-[2] bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-medium outline-none text-slate-900 dark:text-white" 
                                    value={newMember.role} 
                                    onChange={e => setNewMember({...newMember, role: e.target.value as any})}
                                >
                                    <option className="bg-white dark:bg-slate-950" value="Auditor">Auditor</option>
                                    <option className="bg-white dark:bg-slate-950" value="Lead Auditor">Lead Auditor</option>
                                    <option className="bg-white dark:bg-slate-950" value="Technical Expert">Technical Expert</option>
                                    <option className="bg-white dark:bg-slate-950" value="Observer">Observer</option>
                                </select>
                                <input className="flex-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-orange-500 text-center min-w-0" placeholder="Code" value={newMember.competencyCodes} onChange={e => setNewMember({...newMember, competencyCodes: e.target.value})} />
                                <input className="flex-1 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 outline-none text-center cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0" type="number" placeholder="WD" value={newMember.manDays?.toFixed(1)} readOnly title="Auto-calculated from allocation below" />
                            </div>
                            
                            {/* NEW: HYBRID MATRIX UI - Updated for AM/PM/Full allocation */}
                            {safeAuditDates.length > 0 && (
                                <div className="bg-white dark:bg-slate-950 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Session & Mode Per Day</label>
                                    <div className="space-y-1">
                                        {safeAuditDates.map(date => {
                                            const current = newMember.availabilityMatrix?.[date] || { mode: newMember.isRemote ? 'remote' : 'onsite', allocation: 1.0, slot: 'FULL' };
                                            const isRemote = current.mode === 'remote';
                                            const isOff = current.slot === 'OFF';
                                            
                                            return (
                                                <div key={date} className={`flex items-center gap-2 text-[10px] transition-opacity ${isOff ? 'opacity-50' : 'opacity-100'}`}>
                                                    <span className="w-16 font-mono text-slate-600 dark:text-slate-400">{date}</span>
                                                    
                                                    {/* Toggle Mode */}
                                                    <div 
                                                        className={`flex-1 flex rounded border cursor-pointer select-none overflow-hidden ${isRemote ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}
                                                        onClick={() => !isOff && handleUpdateMatrix(date, 'mode', isRemote ? 'onsite' : 'remote')}
                                                        title={isOff ? "Mode irrelevant when Not Participating" : "Toggle Remote/Onsite"}
                                                    >
                                                        <div className={`flex-1 text-center py-0.5 ${!isRemote && !isOff ? 'bg-indigo-500 text-white font-bold' : 'text-slate-400'}`}>Onsite</div>
                                                        <div className={`flex-1 text-center py-0.5 ${isRemote && !isOff ? 'bg-purple-500 text-white font-bold' : 'text-slate-400'}`}>Remote</div>
                                                    </div>

                                                    {/* Slot Select (Replaces numeric allocation) */}
                                                    <select
                                                        className="w-20 border border-gray-200 dark:border-slate-700 bg-transparent rounded p-0.5 text-slate-800 dark:text-white outline-none cursor-pointer text-xs"
                                                        value={current.slot || 'FULL'}
                                                        onChange={(e) => handleUpdateMatrix(date, 'slot', e.target.value)}
                                                        title="Session Allocation"
                                                    >
                                                        <option className="bg-white dark:bg-slate-950" value="FULL">Full Day (1.0)</option>
                                                        <option className="bg-white dark:bg-slate-950" value="AM">Morning (0.5)</option>
                                                        <option className="bg-white dark:bg-slate-950" value="PM">Afternoon (0.5)</option>
                                                        <option className="bg-white dark:bg-slate-950" value="OFF">Off / Not Participating (0.0)</option>
                                                    </select>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <input className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-md p-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-orange-500" placeholder="Availability / Notes" value={newMember.availability} onChange={e => setNewMember({...newMember, availability: e.target.value})} />
                            
                            <button onClick={handleSaveMember} className="w-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 rounded py-1 text-xs font-bold flex items-center justify-center gap-1">
                                {editingMemberId ? "Update Member" : <><Icon name="Plus" size={12}/> Add Member</>}
                            </button>
                            {editingMemberId && <button onClick={() => { setEditingMemberId(null); setNewMember({name:"", role:"Auditor", competencyCodes:"", manDays:1, isRemote:false, availability:"", availabilityMatrix: {} }); }} className="w-full text-[9px] text-slate-400 underline">Cancel Edit</button>}
                        </div>
                    </div>
                )}
            </div>

            {/* 4. PROCESS MAPPING (FIXED LAYOUT) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col shrink-0">
                <div className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Icon name="Tag" size={14}/> Process Mapping
                    </h4>
                </div>

                <div className="p-3 pt-2 space-y-2">
                    {processes.map(p => (
                        <div key={p.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 text-xs">
                            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                                <span className="truncate flex-1">{p.name}</span>
                                <span className="text-[9px] font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">{Object.keys(p.matrixData).length} Clauses</span>
                            </div>
                            {/* GRID LAYOUT FIX */}
                            <div className="grid grid-cols-[60px_1fr] gap-2">
                                <input 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded p-1 text-[9px] font-mono font-bold text-center outline-none text-slate-900 dark:text-orange-400 focus:ring-1 focus:ring-orange-500 placeholder-slate-300 dark:placeholder-slate-600"
                                    placeholder="CODE"
                                    value={p.competencyCode || ""}
                                    onChange={(e) => updateProcessCode(p.id, e.target.value)}
                                />
                                <select 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded p-1 text-[9px] font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-orange-500"
                                    value={p.siteIds?.[0] || ""}
                                    onChange={(e) => updateProcessSites(p.id, e.target.value ? [e.target.value] : [])}
                                >
                                    <option value="">All Sites</option>
                                    {auditSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    ))}
                    {processes.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-xs italic">
                            No processes defined.
                        </div>
                    )}
                </div>
            </div>

            <button onClick={handleGenerateSchedule} disabled={isGenerating} className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-auto flex-shrink-0 ${!isGenerating ? "btn-shrimp text-white hover:shadow-indigo-500/40" : "bg-gray-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"}`}>
                {isGenerating ? <Icon name="Loader" className="animate-spin" size={14}/> : <Icon name="Wand2" size={14}/>}
                {isGenerating ? "AI Planning..." : "GENERATE SCHEDULE"}
            </button>

            {/* Glass Date Picker Modal */}
            <GlassDatePicker isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} selectedDates={safeAuditDates} onChange={handleUpdateDates} />
        </div>
    );
};