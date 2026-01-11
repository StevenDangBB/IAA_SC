
import { useState, useEffect } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { useUI } from '../contexts/UIContext';
import { translateChunk } from '../services/geminiService';
import { cleanFileName as utilsCleanFileName } from '../utils'; // Use utils version
import { ExportState } from '../components/modals/ExportProgressModal';

export const useExportManager = () => {
    const { evidence, matrixData, analysisResult, finalReportText, standards, standardKey, auditInfo, processes, activeProcessId } = useAudit();
    const { apiKeys, activeKeyId, addKey } = useKeyPool();
    const { showToast } = useUI();

    const [exportState, setExportState] = useState<ExportState>({
        isOpen: false, isPaused: false, isFinished: false,
        totalChunks: 0, processedChunksCount: 0,
        chunks: [], results: [], error: null,
        currentType: 'report', targetLang: 'en'
    });
    
    const [rescueKey, setRescueKey] = useState("");
    const [isRescuing, setIsRescuing] = useState(false);

    const handleExport = (type: 'evidence' | 'notes' | 'report', lang: 'en' | 'vi') => {
        let content = "";
        
        if (type === 'evidence') {
            content = `EVIDENCE DUMP\nDate: ${new Date().toLocaleString()}\n\n`;
            content += `--- GENERAL EVIDENCE ---\n${evidence}\n\n`;
            content += `--- MATRIX EVIDENCE ---\n`;
            Object.keys(matrixData).forEach(k => {
                const rows = matrixData[k];
                rows.forEach(r => {
                    if (r.status === 'supplied') {
                        content += `[Clause ${k}] ${r.requirement}\nEVIDENCE: ${r.evidenceInput}\n---\n`;
                    }
                });
            });
        } else if (type === 'notes') {
            if (!analysisResult) return showToast("No findings.");
            content = analysisResult.map(f => 
                `[${f.clauseId}] ${f.status}\nObservation: ${f.reason}\nEvidence: ${f.evidence}\n`
            ).join("\n----------------------------------------\n\n");
        } else if (type === 'report') {
            if (!finalReportText) return showToast("No report text.");
            content = finalReportText;
        }

        if (!content.trim()) return showToast("Nothing to export.");

        const chunks = content.match(/[\s\S]{1,3000}/g) || [];
        
        setExportState({
            isOpen: true, isPaused: false, isFinished: false,
            totalChunks: chunks.length, processedChunksCount: 0,
            chunks, results: [], error: null,
            currentType: type, targetLang: lang
        });
    };

    // Processor Effect
    useEffect(() => {
        const processExport = async () => {
            if (exportState.isOpen && !exportState.isPaused && !exportState.isFinished) {
                const index = exportState.processedChunksCount;
                
                // FINISH CONDITION
                if (index >= exportState.totalChunks) {
                    const finalContent = exportState.results.join("");
                    
                    const currentStdName = standards[standardKey]?.name || "ISO";
                    let stdShort = "ISO";
                    if (currentStdName.includes("27001")) stdShort = "27k";
                    else if (currentStdName.includes("9001")) stdShort = "9k";
                    else if (currentStdName.includes("14001")) stdShort = "14k";

                    const activeProc = processes.find(p => p.id === activeProcessId);
                    const procName = activeProc ? activeProc.name : "General";

                    let typeLabel = "Document";
                    if (exportState.currentType === 'notes') typeLabel = "Audit_Note";
                    else if (exportState.currentType === 'evidence') typeLabel = "Evidence";
                    else if (exportState.currentType === 'report') typeLabel = "Report";

                    const now = new Date();
                    const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

                    const filenameParts = [
                        stdShort,
                        utilsCleanFileName(auditInfo.company || "Company"),
                        utilsCleanFileName(procName),
                        typeLabel,
                        timeStr
                    ];

                    const filename = `${filenameParts.filter(p => p && p !== 'N_A').join('_')}_${exportState.targetLang}.txt`;
                    
                    const blob = new Blob([finalContent], { type: 'text/plain' });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setExportState(prev => ({ ...prev, isFinished: true }));
                    return;
                }

                // PROCESS CHUNK
                const chunk = exportState.chunks[index];
                try {
                    const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
                    await new Promise(r => setTimeout(r, 200)); // UX throttle
                    const keyToUse = rescueKey || activeKeyProfile?.key;
                    
                    // Import translateChunk locally to avoid loop if possible, or use geminiService
                    // (Assuming translateChunk is exported from geminiService)
                    const { translateChunk } = await import('../services/geminiService');
                    const translated = await translateChunk(chunk, exportState.targetLang, keyToUse);

                    setExportState(prev => ({
                        ...prev,
                        results: [...prev.results, translated],
                        processedChunksCount: prev.processedChunksCount + 1
                    }));
                } catch (err: any) {
                    setExportState(prev => ({
                        ...prev,
                        isPaused: true,
                        error: err.message || "Translation failed."
                    }));
                }
            }
        };
        processExport();
    }, [exportState, activeKeyId, rescueKey, apiKeys]);

    const handleResumeExport = async () => {
        setIsRescuing(true);
        const { validateApiKey } = await import('../services/geminiService');
        const check = await validateApiKey(rescueKey);
        
        if (check.isValid) {
            await addKey(rescueKey, "Rescue Key");
            setExportState(prev => ({ ...prev, isPaused: false, error: null }));
            setRescueKey("");
        } else {
            showToast("Rescue Key Invalid.");
        }
        setIsRescuing(false);
    };

    const handleSkipExportChunk = () => {
         setExportState(prev => ({
            ...prev,
            results: [...prev.results, prev.chunks[prev.processedChunksCount]], 
            processedChunksCount: prev.processedChunksCount + 1,
            isPaused: false,
            error: null
        }));
    };

    return { 
        handleExport, exportState, setExportState, 
        rescueKey, setRescueKey, handleResumeExport, isRescuing, handleSkipExportChunk 
    };
};
