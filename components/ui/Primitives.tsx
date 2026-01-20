
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

export const Icon = ({ name, size = 18, className = "", onClick }: { name: string, size?: number, className?: string, onClick?: (e: any) => void }) => {
    const iconNode = Icons[name] || Icons['AlertCircle']; // Fallback
    
    if (React.isValidElement(iconNode)) {
        const element = iconNode as React.ReactElement<any>;
         return React.cloneElement(element, {
            width: size,
            height: size,
            className: `${className} ${element.props.className || ''}`,
            onClick
        });
    }
    return <span className={className} onClick={onClick}>{iconNode}</span>;
};

export const IconSelect = ({ icon, iconColor, value, onChange, options, defaultText, onIconClick, iconTitle, id }: any) => (
    <div className="relative group">
        <div 
            className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-300 z-10 flex items-center justify-center ${onIconClick ? 'cursor-pointer pointer-events-auto hover:scale-110 active:scale-95' : 'pointer-events-none'}`}
            onClick={(e) => { if(onIconClick) { e.stopPropagation(); onIconClick(e); } }}
            title={iconTitle}
        >
            <div className={iconColor}><Icon name={icon} size={16} /></div>
        </div>
        <select 
            id={id}
            value={value} 
            onChange={onChange}
            className={`w-full appearance-none pl-10 pr-8 h-11 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer shadow-sm hover:border-indigo-200 dark:hover:border-slate-600 hover:shadow-md dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] ${value ? 'text-slate-700 dark:text-slate-300' : 'text-gray-400'}`}
        >
            <option value="" disabled>{defaultText}</option>
            {options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors duration-300">
            <Icon name="ChevronDown" size={14} />
        </div>
    </div>
);

export const IconInput = ({ icon, iconColor, placeholder, value, onChange, className = "" }: any) => (
    <div className={`relative group ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300">
            <div className={iconColor}><Icon name={icon} size={16} /></div>
        </div>
        <input 
            type="text" 
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full pl-10 pr-3 h-11 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs font-normal text-slate-700 dark:text-slate-300 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm hover:border-indigo-200 dark:hover:border-slate-600 hover:shadow-md dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
        />
    </div>
);

export const Modal = ({ isOpen, title, onClose, children }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 transform transition-all animate-zoom-in-spring duration-300 overflow-hidden dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_10px_15px_-3px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all duration-300 text-slate-400 hover:rotate-90">
                        <Icon name="X" size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(), 400); 
    };
    
    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(handleClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    // POSITION: Bottom Center
    const positionClasses = "bottom-10 left-1/2 -translate-x-1/2";
    
    // ANIMATIONS: Slide up from bottom
    const activeClasses = "opacity-100 scale-100 translate-y-0";
    const exitClasses = "opacity-0 scale-95 translate-y-8"; // Slide down to exit
    const enterClasses = "opacity-0 scale-95 translate-y-8"; // Slide up to enter

    return (
        <div className={`fixed z-[9999] w-[90vw] max-w-sm md:w-auto md:max-w-md ${positionClasses} transition-all duration-500 ease-spring ${!isMounted ? enterClasses : isExiting ? exitClasses : activeClasses}`}>
            <div className="bg-slate-900/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-slate-900 px-4 py-3 md:px-5 md:py-4 rounded-2xl shadow-2xl flex items-start gap-3 md:gap-4 border border-slate-700/50 dark:border-slate-200/50">
                <div className="flex-shrink-0 p-1.5 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/30 mt-0.5">
                    <Icon name="CheckLineart" size={14}/>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">System Notification</span>
                    <span className="text-xs md:text-sm font-bold leading-snug break-words">{message}</span>
                </div>
                <button onClick={handleClose} className="flex-shrink-0 -mr-2 -mt-2 p-2 text-slate-500 hover:text-white dark:hover:text-slate-900 transition-colors rounded-full hover:bg-white/10 dark:hover:bg-black/5">
                    <Icon name="X" size={16}/>
                </button>
            </div>
        </div>
    );
};
