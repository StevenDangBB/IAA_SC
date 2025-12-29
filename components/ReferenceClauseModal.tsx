
import React, { useState, useEffect } from 'react';
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
    
    // EFFECT FOR "AI TYPING" SIMULATION
    useEffect(() => {
        if (!isOpen) { // Reset when modal is closed
            setStreamedText("");
            return;
        }

        if (isLoading || !textToDisplay) {
            setStreamedText(""); // Clear previous text on new load or language switch
            return;
        }

        const lines = textToDisplay.split('\n');
        let currentIndex = 0;
        let currentText = "";
        
        // Start streaming after a short delay to let the UI update
        const startTimeout = setTimeout(() => {
            const interval = setInterval(() => {
                if (currentIndex < lines.length) {
                    currentText += (lines[currentIndex] || '') + '\n';
                    setStreamedText(currentText);
                    currentIndex++;
                } else {
                    clearInterval(interval);
                }
            }, 50); // Adjust speed of typing here (milliseconds per line)

            return () => clearInterval(interval);
        }, 100);

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
            <div className="space-y-4">
                {clause && (
                    <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">{clause.code}</span>
                             <h4 className="text-md font-bold text-slate-800 dark:text-slate-100">{clause.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{standardName}</p>
                    </div>
                )}
                
                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-2 border-indigo-200 dark:border-indigo-800 rounded-full"></div>
                            <div className="absolute inset-0 border-t-2 border-indigo-600 rounded-full animate-spin"></div>
                        </div>
                        <span className="text-sm font-medium">Fetching full clause text from Gemini...</span>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <div className="lang-pill-container">
                                <button onClick={() => setLang('en')} className={`lang-pill-btn ${lang === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>EN</button>
                                <button onClick={() => setLang('vi')} className={`lang-pill-btn ${lang === 'vi' ? 'lang-pill-active' : 'lang-pill-inactive'}`}>VI</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleCopy} 
                                    disabled={isCopied}
                                    className={`px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg font-bold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 ${isCopied ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                >
                                    <Icon name={isCopied ? "CheckThick" : "Copy"} size={14}/>
                                    {isCopied ? "Copied!" : "Copy Text"}
                                </button>
                                <button onClick={handleInsert} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-500/20">
                                    <Icon name="Quote" size={14}/>
                                    Insert at Cursor
                                </button>
                            </div>
                        </div>

                        <div className="p-4 h-80 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 relative">
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                                {streamedText}
                                {/* Blinking cursor effect at the end of streaming text */}
                                {!isLoading && streamedText !== textToDisplay && (
                                    <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1" style={{ verticalAlign: 'text-bottom' }}></span>
                                )}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ReferenceClauseModal;
