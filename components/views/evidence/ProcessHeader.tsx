
import React, { useState } from 'react';
import { Icon } from '../../UI';
import { AuditProcess } from '../../../types';

interface ProcessHeaderProps {
    processes: AuditProcess[];
    activeProcessId: string | null;
    activeProcess: AuditProcess | undefined;
    setActiveProcessId: (id: string) => void;
    addInterviewee: (name: string) => void;
    removeInterviewee: (name: string) => void;
}

export const ProcessHeader: React.FC<ProcessHeaderProps> = React.memo(({
    processes, activeProcessId, activeProcess, setActiveProcessId, addInterviewee, removeInterviewee
}) => {
    const [newInterviewee, setNewInterviewee] = useState("");

    const handleAddInterviewee = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newInterviewee.trim()) {
            addInterviewee(newInterviewee.trim());
            setNewInterviewee("");
        }
    };

    return (
        <div className="flex flex-col md:flex-row items-center gap-3 shrink-0 transition-colors py-1">
            {/* Process Select - Styled as a Prominent Primary Button */}
            <div className="relative group w-full md:w-auto min-w-[240px] bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center transition-all transform active:scale-95 z-20">
                <div className="absolute left-3 text-indigo-100 pointer-events-none">
                    <Icon name="Session11_GridAdd" size={16}/>
                </div>
                <select 
                    value={activeProcessId || ""} 
                    onChange={(e) => setActiveProcessId(e.target.value)}
                    className="w-full bg-transparent appearance-none pl-9 pr-8 py-2.5 text-sm font-bold text-white outline-none cursor-pointer"
                    title="Switch active process context"
                >
                    {processes.map(p => (
                        <option key={p.id} value={p.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900 font-medium">
                            {p.name}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 pointer-events-none text-indigo-200">
                    <Icon name="ChevronDown" size={14}/>
                </div>
            </div>

            {/* Interviewee Input - Floating minimal style */}
            <div className="flex-1 flex items-center gap-2 w-full overflow-x-auto custom-scrollbar px-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-xl border border-white/50 dark:border-slate-800/50 p-1.5 min-h-[44px]">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap pl-1">
                    <Icon name="Users" size={14}/> Auditees:
                </div>
                
                {activeProcess?.interviewees?.map((name, idx) => (
                    <span key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap animate-in zoom-in-95">
                        {name}
                        <button onClick={() => removeInterviewee(name)} className="hover:text-red-500 transition-colors ml-1"><Icon name="X" size={10}/></button>
                    </span>
                ))}
                
                <input 
                    className="bg-transparent border-none text-xs py-1 px-2 outline-none min-w-[120px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:placeholder-indigo-400 transition-all" 
                    placeholder="+ Type Name & Enter..." 
                    value={newInterviewee}
                    onChange={e => setNewInterviewee(e.target.value)}
                    onKeyDown={handleAddInterviewee}
                />
            </div>
        </div>
    );
});
