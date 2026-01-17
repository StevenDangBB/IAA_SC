import React, { useEffect } from 'react';
import { Clause } from '../types';

interface GlobalEventsProps {
    setReferenceState: React.Dispatch<React.SetStateAction<any>>;
    setLayoutMode: React.Dispatch<React.SetStateAction<string>>;
}

export const useGlobalEvents = ({ setReferenceState, setLayoutMode }: GlobalEventsProps) => {
    useEffect(() => {
        const handleRef = (e: CustomEvent) => {
            setReferenceState({ 
                isOpen: true, 
                clause: e.detail, 
                fullText: { en: "", vi: "" }, 
                isLoading: true 
            });
        };

        const handleRefUpdate = (e: CustomEvent) => {
            setReferenceState((prev: any) => ({ 
                ...prev, 
                fullText: e.detail, 
                isLoading: false 
            }));
        };

        const handleSwitch = (e: CustomEvent) => { 
            if (e.detail) setLayoutMode(e.detail); 
        };
        
        window.addEventListener('OPEN_REFERENCE', handleRef as any);
        window.addEventListener('UPDATE_REFERENCE_CONTENT', handleRefUpdate as any);
        window.addEventListener('SWITCH_LAYOUT', handleSwitch as any);
        
        return () => {
            window.removeEventListener('OPEN_REFERENCE', handleRef as any);
            window.removeEventListener('UPDATE_REFERENCE_CONTENT', handleRefUpdate as any);
            window.removeEventListener('SWITCH_LAYOUT', handleSwitch as any);
        };
    }, [setReferenceState, setLayoutMode]);
};