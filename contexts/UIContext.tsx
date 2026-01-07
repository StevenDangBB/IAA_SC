
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UIContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    fontSizeScale: number;
    setFontSizeScale: React.Dispatch<React.SetStateAction<number>>;
    isSidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
    
    // Modal State Managers
    modals: {
        settings: boolean;
        about: boolean;
        integrity: boolean;
        recall: boolean;
        addStandard: boolean;
        cmdPalette: boolean;
    };
    toggleModal: (modal: keyof UIContextType['modals'], state?: boolean) => void;
    
    // Toast
    toastMsg: string | null;
    showToast: (msg: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
    // Theme
    const [isDarkMode, setIsDarkMode] = useState(true);
    useEffect(() => {
        if (isDarkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDarkMode]);

    // Font
    const [fontSizeScale, setFontSizeScale] = useState(1.0);
    useEffect(() => {
        document.documentElement.style.setProperty('--font-scale', fontSizeScale.toString());
    }, [fontSizeScale]);

    // Layout
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(420);

    // Modals
    const [modals, setModals] = useState({
        settings: false,
        about: false,
        integrity: false,
        recall: false,
        addStandard: false,
        cmdPalette: false,
    });

    const toggleModal = (modal: keyof typeof modals, state?: boolean) => {
        setModals(prev => ({ ...prev, [modal]: state ?? !prev[modal] }));
    };

    // Toast
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const showToast = (msg: string) => setToastMsg(msg);

    return (
        <UIContext.Provider value={{
            isDarkMode,
            toggleDarkMode: () => setIsDarkMode(prev => !prev),
            fontSizeScale,
            setFontSizeScale,
            isSidebarOpen,
            setSidebarOpen,
            sidebarWidth,
            setSidebarWidth,
            modals,
            toggleModal,
            toastMsg,
            showToast
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within UIProvider");
    return context;
};
