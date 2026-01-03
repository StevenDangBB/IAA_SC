
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, Modal } from './UI';
import { Clause } from '../types';
import { copyToClipboard } from '../utils';

interface ReferenceClauseModalProps {
    isOpen: boolean;
    onClose: () => void;
    clause: Clause | null;
    standardName: string;
    fullText: { en: string; vi: string };
    isLoading: boolean;
    onInsert: (text: string) => void;
}

const ReferenceClauseModal = ({ isOpen, onClose, clause, standardName, fullText, isLoading, onInsert }: ReferenceClauseModalProps) => {
    const [lang, setLang] = useState<'en' | 'vi'>('en');
    const [isCopied, setIsCopied] = useState(false);
    const [streamedText, setStreamedText] = useState("");

    const textToDisplay = lang === 'en' ? fullText.en : fullText.vi;
    
    // Logic to derive badge style similar to App.tsx
    const badgeData = useMemo(() => {
        if (!standardName) return { text: "ISO", colorClass: "bg-gray-100 text-gray-600" };
        
        const match = standardName.match(/\((.*?)\)/);
        const shortName = match ? match[1] : (standardName.split(' ')[0] || 'ISO');
        const textUpper = shortName.toUpperCase();
        
        let colorClass = "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50";
        if (textUpper.includes('EMS') || textUpper.includes('14001')) colorClass = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50";
        else if (textUpper.includes('QMS') || textUpper.includes('9001')) colorClass = "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50";
        else if (textUpper.includes('ISMS') || textUpper.includes('27001')) colorClass = "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/50";

        return { text: shortName, colorClass };
    }, [standardName]);

    useEffect(() => {
        if (!isOpen) { 
            setStreamedText("");
            return;
        }

        if (isLoading || !textToDisplay) {
            setStreamedText(""); 
            return;
        }

        // Split by explicit newline for cleaner streaming effect
        const lines = textToDisplay.split('\n');
        let currentIndex = 0;
        let currentText = "";
        
        const startTimeout = setTimeout(() => {
            const interval = setInterval(() => {
                if (currentIndex < lines.length) {
                    // Re-append the newline that was removed by split
                    currentText += (lines[currentIndex] || '') + '\n';
                    setStreamedText(currentText);
                    currentIndex++;
                } else {
                    clearInterval(interval);
                }
            }, 20); // Faster streaming for better UX

            return () => clearInterval(interval);
        }, 50);

        return () => clearTimeout(startTimeout);
    }, [isOpen, textToDisplay, isLoading]);


    const handleInsert = () => {
        onInsert(textToDisplay);
    };

    const handleCopy = () => {
        copyToClipboard(textToDisplay);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} title="Clause Reference" onClose={onClose}>
            <div className="flex flex-col h-full gap-3">
                {/* Header: Title & Code */}
                {clause && (
                    <div className="flex items-start gap-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                         <span className="text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 shrink-0">{clause.code}</span>
                         <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight mt-1">{clause.title}</h4>
                    </div>
                )}
                
                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-2 border-indigo-200 dark:border-indigo-800 rounded-full opacity-20"></div>
                            <div className="absolute inset-0 border-t-2 border-indigo-600 rounded-full animate-spin"></div>
                        </div>
                        <span className="text-sm font-bold animate-pulse">Consulting Gemini AI Auditor...</span>
                    </div>
                ) : (
                    <>
                        {/* Compact Toolbar: Badge | Language | Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {/* Standard Badge */}
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shadow-sm uppercase tracking-wider ${badgeData.colorClass}`}>
                                    {badgeData.text}
                                </span>
                                
                                {/* Compact Language Toggle */}
                                <div className="lang-pill-container shadow-sm border-gray-200 dark:border-slate-700">
                                    <span onClick={() => setLang('en')} className={`lang-pill-btn ${lang === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</span>
                                    <span onClick={() => setLang('vi')} className={`lang-pill-btn ${lang === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                <button 
                                    onClick={handleCopy} 
                                    disabled={isCopied}
                                    className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-95 disabled:opacity-70 border shadow-sm ${isCopied ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600'}`}
                                    title={isCopied ? "Copied!" : "Copy to Clipboard"}
                                >
                                    <Icon name={isCopied ? "CheckThick" : "Copy"} size={16}/>
                                </button>
                                <button 
                                    onClick={handleInsert} 
                                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-110 active:scale-95"
                                    title="Insert Reference into Evidence"
                                >
                                    <Icon name="Quote" size={16}/>
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-slate-950/50 rounded-2xl border border-gray-100 dark:border-slate-800 relative shadow-inner text-left">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="text-xs md:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-7 font-medium tracking-wide">
                                    {streamedText}
                                    {!isLoading && streamedText !== textToDisplay && (
                                        <span className="inline-block w-1.5 h-4 bg-indigo-500 animate-pulse ml-1 align-middle"></span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ReferenceClauseModal;
