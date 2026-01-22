
import { useState, useEffect } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { useUI } from '../contexts/UIContext';
import { translateChunk } from '../services/geminiService';
import { cleanFileName as utilsCleanFileName, stripMetadataTags } from '../utils'; // Import strip function
import { ExportState } from '../components/modals/ExportProgressModal';

export const useExportManager = () => {
    const { 
        evidence, matrixData, analysisResult, finalReportText, 
        standards, standardKey, auditInfo, processes, activeProcessId,
        auditSchedule // Access Schedule
    } = useAudit();
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
    const [exportFormat, setExportFormat] = useState<'txt' | 'docx'>('txt');

    const handleExport = (type: 'evidence' | 'notes' | 'report' | 'schedule', lang: 'en' | 'vi', format: 'txt' | 'docx' = 'txt', extraData?: any) => {
        let content = "";
        
        if (type === 'evidence') {
            content = `EVIDENCE DUMP\nDate: ${new Date().toLocaleString()}\n\n`;
            // CLEAN Metadata
            content += `--- GENERAL EVIDENCE ---\n${stripMetadataTags(evidence)}\n\n`;
            content += `--- MATRIX EVIDENCE ---\n`;
            Object.keys(matrixData).forEach(k => {
                const rows = matrixData[k];
                rows.forEach(r => {
                    if (r.status === 'supplied') {
                        // CLEAN Metadata from rows
                        content += `[Clause ${k}] ${r.requirement}\nEVIDENCE: ${stripMetadataTags(r.evidenceInput)}\n---\n`;
                    }
                });
            });
        } else if (type === 'notes') {
            if (!analysisResult) return showToast("No findings.");
            content = analysisResult.map(f => 
                // CLEAN Metadata from finding evidence
                `[${f.clauseId}] ${f.status}\nObservation: ${f.reason}\nEvidence: ${stripMetadataTags(f.evidence)}\n`
            ).join("\n----------------------------------------\n\n");
        } else if (type === 'report') {
            if (!finalReportText) return showToast("No report text.");
            content = finalReportText; // Report is already cleaned during generation
        } else if (type === 'schedule') {
            if (!auditSchedule || auditSchedule.length === 0) return showToast("No schedule generated.");
            
            // IF DOCX: GENERATE HTML TABLE STRUCTURE
            if (format === 'docx') {
                const columns = extraData?.columns || ['timeSlot', 'siteName', 'processName', 'activity', 'auditorName', 'clauseRefs'];
                const COLUMN_LABELS: Record<string, string> = {
                    timeSlot: "Time", siteName: "Site", auditorName: "Auditor",
                    clauseRefs: "Clauses", activity: "Activity", processName: "Process / Auditee"
                };

                content = `
                    <h2 style="color:#2e74b5; font-family:Arial;">AUDIT PLAN / SCHEDULE</h2>
                    <p><strong>Company:</strong> ${auditInfo.company}<br/>
                    <strong>Standard:</strong> ${standards[standardKey]?.name}<br/>
                    <strong>Date Exported:</strong> ${new Date().toLocaleDateString()}</p>
                `;

                // Group by Day
                const days = Array.from(new Set(auditSchedule.map(s => s.day))).sort();
                
                days.forEach(day => {
                    const dayItems = auditSchedule.filter(s => s.day === day);
                    const dateLabel = dayItems[0]?.date || `Day ${day}`;
                    
                    // Sorting logic to match view (Basic Sort based on first col)
                    const sortedItems = [...dayItems].sort((a,b) => {
                       const valA = (a as any)[columns[0]] || "";
                       const valB = (b as any)[columns[0]] || "";
                       return valA.toString().localeCompare(valB.toString(), undefined, { numeric: true });
                    });

                    content += `<h3>--- DAY ${day}: ${dateLabel} ---</h3>`;
                    content += `<table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd; font-family: Arial; font-size: 10pt;">`;
                    
                    // Header
                    content += `<tr style="background-color:#f3f4f6;">`;
                    columns.forEach((col: string) => {
                        content += `<th style="padding: 8px; border: 1px solid #ccc; text-align: left;">${COLUMN_LABELS[col]}</th>`;
                    });
                    content += `</tr>`;

                    // Body
                    sortedItems.forEach((item: any) => {
                        content += `<tr>`;
                        columns.forEach((col: string) => {
                            let val = item[col];
                            if (col === 'clauseRefs' && Array.isArray(val)) val = val.join(", ");
                            if (col === 'auditorName' && item.isRemote) val += " (Remote)";
                            if (col === 'processName' && !val) val = "General";
                            if (!val) val = "-";
                            content += `<td style="padding: 8px; border: 1px solid #ccc;">${val}</td>`;
                        });
                        content += `</tr>`;
                    });
                    content += `</table><br/>`;
                });
            } else {
                // TXT Fallback
                content = `AUDIT PLAN / SCHEDULE\n`;
                content += `Company: ${auditInfo.company}\nStandard: ${standards[standardKey]?.name}\n\n`;
                const days = Array.from(new Set(auditSchedule.map(s => s.day))).sort();
                days.forEach(day => {
                    const dayItems = auditSchedule.filter(s => s.day === day).sort((a,b) => a.timeSlot.localeCompare(b.timeSlot));
                    const dateLabel = dayItems[0]?.date || `Day ${day}`;
                    content += `--- DAY ${day}: ${dateLabel} ---\n`;
                    dayItems.forEach(item => {
                        const activityFull = item.processName ? `[${item.processName}] ${item.activity}` : item.activity;
                        const clauses = item.clauseRefs?.join(", ") || "-";
                        const auditor = item.auditorName + (item.isRemote ? " (Remote)" : "");
                        content += `[${item.timeSlot}] ${activityFull}\n   Site: ${item.siteName} | Auditor: ${auditor}\n   Ref: ${clauses}\n\n`;
                    });
                });
            }
        }

        if (!content.trim()) return showToast("Nothing to export.");

        const chunks = content.match(/[\s\S]{1,3000}/g) || [];
        
        setExportFormat(format);
        setExportState({
            isOpen: true, isPaused: false, isFinished: false,
            totalChunks: chunks.length, processedChunksCount: 0,
            chunks, results: [], error: null,
            currentType: type as any, targetLang: lang
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
                    else if (exportState.currentType === 'schedule' as any) typeLabel = "Schedule";

                    const now = new Date();
                    const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

                    const filenameParts = [
                        stdShort,
                        utilsCleanFileName(auditInfo.company || "Company"),
                        utilsCleanFileName(procName),
                        typeLabel,
                        timeStr
                    ];

                    const extension = exportFormat === 'docx' ? 'doc' : 'txt'; // Use .doc for HTML-compatible Word files
                    const filename = `${filenameParts.filter(p => p && p !== 'N_A').join('_')}_${exportState.targetLang}.${extension}`;
                    
                    let blob: Blob;
                    
                    if (exportFormat === 'docx') {
                        // Create basic HTML structure for Word
                        // If type is schedule, finalContent is ALREADY HTML table strings.
                        // If type is report/notes, it's text needing formatting.
                        
                        let processedHtml = "";
                        
                        if (exportState.currentType === 'schedule' as any) {
                            processedHtml = finalContent; // Already formatted as HTML table in handleExport
                        } else {
                            // Text to HTML conversion
                            processedHtml = finalContent.replace(/\n/g, '<br/>').replace(/\[(.*?)\]/g, '<strong>[$1]</strong>');
                            
                            // Legacy Hack: Handle pseudo-tables if present in text
                            processedHtml = processedHtml.replace(/\[TABLE_START\]<br\/>(.*?)\[TABLE_END\]/gs, (match, tableContent) => {
                                const rows = tableContent.split('<br/>').filter((r:string) => r.trim());
                                let tableHtml = '<table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">';
                                rows.forEach((row: string, i: number) => {
                                    const cols = row.split('|');
                                    tableHtml += '<tr>';
                                    cols.forEach((col: string) => {
                                        tableHtml += `<td style="padding: 8px; ${i===0 ? 'background-color:#f3f4f6; font-weight:bold;' : ''}">${col.trim()}</td>`;
                                    });
                                    tableHtml += '</tr>';
                                });
                                tableHtml += '</table>';
                                return tableHtml;
                            });
                        }

                        const htmlContent = `
                            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                            <head><meta charset='utf-8'><title>Export</title>
                            <style>
                                body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; }
                                h1 { font-size: 16pt; color: #2e74b5; }
                                h2 { font-size: 14pt; color: #2e74b5; }
                                h3 { font-size: 12pt; color: #e36a00; background-color: #fff3e0; padding: 5px; }
                                strong { color: #333; }
                                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                                td, th { border: 1px solid #ccc; padding: 5px; font-size: 10pt; vertical-align: top; }
                            </style>
                            </head><body>
                            ${processedHtml}
                            </body></html>
                        `;
                        blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
                    } else {
                        blob = new Blob([finalContent], { type: 'text/plain' });
                    }

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
                
                // --- TRANSLATION LOGIC ---
                // For HTML content (Schedule DOCX), naive translation might break tags.
                // Simplification: We SKIP translation for DOCX Schedule export to preserve HTML structure complexity.
                // Or user can use "Skip" button in modal.
                const shouldTranslate = exportState.targetLang !== 'en' && exportState.currentType !== 'schedule' as any;

                if (!shouldTranslate) {
                     setExportState(prev => ({
                        ...prev,
                        results: [...prev.results, chunk],
                        processedChunksCount: prev.processedChunksCount + 1
                    }));
                } else {
                    try {
                        const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
                        await new Promise(r => setTimeout(r, 200)); // UX throttle
                        const keyToUse = rescueKey || activeKeyProfile?.key;
                        
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
