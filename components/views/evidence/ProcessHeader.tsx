
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
        <div className="flex flex-col md:flex-row items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm shrink-0 transition-colors">
            {/* Process Select */}
            <div className="relative group w-full md:w-auto min-w-[200px] bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div className="absolute left-2 text-indigo-500 pointer-events-none">
                    <Icon name="Session11_GridAdd" size={14}/>
                </div>
                <select 
                    value={activeProcessId || ""} 
                    onChange={(e) => setActiveProcessId(e.target.value)}
                    className="w-full bg-transparent appearance-none pl-7 pr-6 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    title="Switch active process context"
                >
                    {processes.map(p => (
                        <option key={p.id} value={p.id} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                            {p.name}
                        </option>
                    ))}
                </select>
                <div className="absolute right-2 pointer-events-none text-slate-400">
                    <Icon name="ChevronDown" size={12}/>
                </div>
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 hidden md:block"></div>

            {/* Interviewee Input */}
            <div className="flex-1 flex items-center gap-2 w-full overflow-x-auto custom-scrollbar px-1">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                    <Icon name="User" size={12}/> Persons:
                </div>
                {activeProcess?.interviewees?.map((name, idx) => (
                    <span key={idx} className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800 whitespace-nowrap animate-in zoom-in-95">
                        {name}
                        <button onClick={() => removeInterviewee(name)} className="hover:text-red-500 transition-colors"><Icon name="X" size={10}/></button>
                    </span>
                ))}
                <input 
                    className="bg-transparent border-b border-dashed border-gray-300 dark:border-slate-700 text-xs py-0.5 px-1 outline-none focus:border-indigo-500 min-w-[100px] dark:text-slate-300 placeholder-slate-400 focus:placeholder-indigo-300 transition-all" 
                    placeholder="+ Name & Enter" 
                    value={newInterviewee}
                    onChange={e => setNewInterviewee(e.target.value)}
                    onKeyDown={handleAddInterviewee}
                />
            </div>
        </div>
    );
});
