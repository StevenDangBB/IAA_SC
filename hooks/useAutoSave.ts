
import { useEffect, useRef, useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { SessionSnapshot } from '../types';

export const useAutoSave = () => {
    const { 
        standardKey, auditInfo, selectedClauses, activeProcessId, processes, 
        analysisResult, selectedFindings, finalReportText, restoreSession,
        customStandards
    } = useAudit();

    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const isRestoring = useRef(false);

    // Load on Mount
    useEffect(() => {
        try {
            const session = localStorage.getItem("iso_session_data");
            const customStds = localStorage.getItem("iso_custom_standards");
            
            if (customStds) {
                // Should be restored via context if possible
            }

            if (session) {
                isRestoring.current = true;
                const data = JSON.parse(session);
                restoreSession(data);
                setLastSavedTime(new Date().toLocaleTimeString());
                setTimeout(() => isRestoring.current = false, 1000);
            }
        } catch (e) { console.error("Load failed", e); }
    }, []); // Run once

    // Save Effect
    useEffect(() => {
        if (isRestoring.current) return;
        
        const handler = setTimeout(() => {
            setIsSaving(true);
            const sessionData = { 
                standardKey, auditInfo, selectedClauses, activeProcessId, processes, 
                analysisResult, selectedFindings, finalReportText 
            };
            
            localStorage.setItem("iso_session_data", JSON.stringify(sessionData));
            localStorage.setItem("iso_custom_standards", JSON.stringify(customStandards));
            
            setLastSavedTime(new Date().toLocaleTimeString());
            setTimeout(() => setIsSaving(false), 500);
        }, 1000);
        
        return () => clearTimeout(handler);
    }, [standardKey, auditInfo, selectedClauses, activeProcessId, processes, analysisResult, selectedFindings, finalReportText, customStandards]);

    const createManualBackup = () => {
        try {
            const currentData = { standardKey, auditInfo, selectedClauses, activeProcessId, processes, analysisResult, selectedFindings, finalReportText };
            const snapshot: SessionSnapshot = {
                id: `backup_${Date.now()}`,
                timestamp: Date.now(),
                label: "Manual Backup",
                triggerType: "MANUAL_BACKUP",
                data: currentData as any
            };
            const historyRaw = localStorage.getItem("iso_session_history");
            const history = historyRaw ? JSON.parse(historyRaw) : [];
            const newHistory = [snapshot, ...history].slice(0, 5);
            localStorage.setItem("iso_session_history", JSON.stringify(newHistory));
            return true;
        } catch (e) { return false; }
    };

    return { lastSavedTime, isSaving, createManualBackup };
};
