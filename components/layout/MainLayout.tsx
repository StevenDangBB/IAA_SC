
import React from 'react';
import { Header } from '../Header';
import Sidebar from '../Sidebar';
import { useUI } from '../../contexts/UIContext';
import { useAudit } from '../../contexts/AuditContext';
import { Toast } from '../UI';
import { SettingsModal } from '../modals/SettingsModal';
import { AddStandardModal } from '../modals/AddStandardModal';
import { IntegrityModal } from '../modals/IntegrityModal';
import RecallModal from '../RecallModal';
import ProjectInfoModal from '../ReleaseNotesModal';

interface MainLayoutProps {
    children: React.ReactNode;
    commandActions: any[];
    onRestoreSnapshot: (snap: any) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, commandActions, onRestoreSnapshot }) => {
    const { 
        isSidebarOpen, setSidebarOpen, sidebarWidth, setSidebarWidth,
        toastMsg, showToast, modals, toggleModal 
    } = useUI();
    
    const { privacySettings, setPrivacySettings } = useAudit();

    return (
        <div className="flex flex-col h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 transition-colors duration-500 ease-soft relative overflow-hidden">
            {toastMsg && <Toast message={toastMsg} onClose={() => showToast('')} />}

            <Header />

            <main className="flex-1 flex overflow-hidden relative shadow-inner">
                {/* Sidebar Container */}
                <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-16 bottom-0 left-0 z-[60] md:absolute md:inset-y-0 md:relative md:top-0 md:translate-x-0 md:transform-none transition-transform duration-300 ease-soft h-[calc(100%-4rem)] md:h-full shadow-2xl`}>
                    <Sidebar 
                        isOpen={isSidebarOpen} 
                        width={sidebarWidth} 
                        setWidth={setSidebarWidth} 
                    />
                </div>
                
                {/* Mobile Backdrop */}
                {isSidebarOpen && (
                    <div 
                        className="fixed top-16 bottom-0 inset-x-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" 
                        onClick={() => setSidebarOpen(false)} 
                    />
                )}
                
                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 relative w-full transition-all duration-300 ease-soft bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-inner-depth">
                    {children}
                </div>
            </main>

            {/* Modals Manager */}
            
            <ProjectInfoModal 
                isOpen={modals.about} 
                onClose={() => toggleModal('about', false)} 
            />
            
            <RecallModal
                isOpen={modals.recall}
                onClose={() => toggleModal('recall', false)}
                onRestore={onRestoreSnapshot}
            />
            
            {/* Privacy Modal removed - moved to Settings */}
        </div>
    );
};
