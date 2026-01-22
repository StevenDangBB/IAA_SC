
import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from './Primitives';

interface GlassDatePickerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDates: string[];
    onChange: (dates: string[]) => void;
}

export const GlassDatePicker: React.FC<GlassDatePickerProps> = ({
    isOpen, onClose, selectedDates, onChange
}) => {
    // Current view state (Year/Month)
    const [currentDate, setCurrentDate] = useState(new Date());
    // Selection logic
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
    
    // Initialize view to the first selected date if available, else today
    useEffect(() => {
        if (isOpen && selectedDates.length > 0) {
            const first = new Date(selectedDates[0]);
            if (!isNaN(first.getTime())) setCurrentDate(first);
        } else {
            setCurrentDate(new Date());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay(); // 0 = Sun

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // Generate calendar grid
    const days = [];
    // Padding for empty start days (adjust for Monday start if needed, currently Sunday start)
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    // FIXED: Use Local Time formatting to prevent Timezone/UTC off-by-one errors
    const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const toggleDate = (dateStr: string, mode: 'add' | 'remove' | 'toggle') => {
        const exists = selectedDates.includes(dateStr);
        let newDates = [...selectedDates];

        if (mode === 'toggle') {
            if (exists) newDates = newDates.filter(d => d !== dateStr);
            else newDates.push(dateStr);
        } else if (mode === 'add') {
            if (!exists) newDates.push(dateStr);
        } else if (mode === 'remove') {
            if (exists) newDates = newDates.filter(d => d !== dateStr);
        }
        
        // Sort dates chronologically
        newDates.sort();
        onChange(newDates);
    };

    const handleMouseDown = (dateStr: string) => {
        setIsDragging(true);
        const exists = selectedDates.includes(dateStr);
        // If clicking an unselected date, we start 'adding'. If clicking a selected, we start 'removing'.
        const mode = exists ? 'remove' : 'add';
        setDragMode(mode);
        toggleDate(dateStr, mode);
    };

    const handleMouseEnter = (dateStr: string) => {
        if (isDragging) {
            toggleDate(dateStr, dragMode);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    // Helper to check if today (using local time string comparison)
    const todayStr = formatDate(new Date());

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onMouseUp={handleMouseUp}
        >
            <div className="relative w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-zoom-in-spring" onClick={e => e.stopPropagation()}>
                
                {/* Decorative Glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-6 border-b border-white/10 flex justify-between items-center z-10">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                            <Icon name="Session7_Compass" className="text-orange-500" />
                            Smart Scheduler
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Drag to select multiple days</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                        <Icon name="X" size={20}/>
                    </button>
                </div>

                {/* Calendar Body */}
                <div className="p-6 relative z-10">
                    {/* Controls */}
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"><Icon name="ChevronLeft"/></button>
                        <span className="text-lg font-bold text-white select-none">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"><Icon name="ChevronRight"/></button>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <div key={d} className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider select-none">{d}</div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2" onMouseLeave={handleMouseUp}>
                        {days.map((date, idx) => {
                            if (!date) return <div key={idx} className="h-10 md:h-12"></div>;
                            
                            const dateStr = formatDate(date);
                            const isSelected = selectedDates.includes(dateStr);
                            const isToday = todayStr === dateStr;

                            return (
                                <button
                                    key={dateStr}
                                    onMouseDown={() => handleMouseDown(dateStr)}
                                    onMouseEnter={() => handleMouseEnter(dateStr)}
                                    className={`
                                        h-10 md:h-12 rounded-xl text-sm font-bold transition-all duration-200 select-none relative group
                                        ${isSelected 
                                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] scale-105 z-10' 
                                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                        }
                                        ${isToday && !isSelected ? 'border border-orange-500/50 text-orange-400' : 'border border-transparent'}
                                    `}
                                >
                                    {date.getDate()}
                                    {isSelected && <div className="absolute inset-0 rounded-xl ring-2 ring-white/20 animate-pulse"></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 border-t border-white/5 flex justify-between items-center relative z-10">
                    <span className="text-xs text-slate-400 font-medium">
                        {selectedDates.length} days selected
                    </span>
                    <div className="flex gap-3">
                        <button onClick={() => onChange([])} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                            Clear
                        </button>
                        <button onClick={onClose} className="px-6 py-2 rounded-xl bg-white text-black font-bold text-xs hover:scale-105 transition-transform shadow-lg">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
