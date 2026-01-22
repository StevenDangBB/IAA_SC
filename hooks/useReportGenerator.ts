
import React, { useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { useUI } from '../contexts/UIContext';
import { generateExecutiveSummary, generateProcessBatchReport } from '../services/geminiService';
import { processSourceFile, stripMetadataTags } from '../utils'; // Import strip function
import { AnalysisResult } from '../types';

export const useReportGenerator = (exportLanguage: string) => {
    const { analysisResult, auditInfo, standards, standardKey, setFinalReportText, selectedFindings, processes } = useAudit();
    const { apiKeys, activeKeyId } = useKeyPool();
    const { showToast } = useUI();

    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportLoadingMessage, setReportLoadingMessage] = useState("");
    
    const [generationLogs, setGenerationLogs] = useState<string[]>([]);
    const [progressPercent, setProgressPercent] = useState(0);

    const [reportTemplate, setReportTemplate] = useState("");
    const [reportTemplateName, setReportTemplateName] = useState("");
    const [isTemplateProcessing, setIsTemplateProcessing] = useState(false);

    const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsTemplateProcessing(true);
        setReportLoadingMessage("Processing Template...");
        
        try {
            const start = Date.now();
            const text = await processSourceFile(file);
            if(Date.now() - start < 500) await new Promise(r => setTimeout(r, 500));

            setReportTemplate(text);
            setReportTemplateName(file.name);
            showToast(`Template "${file.name}" loaded.`);
        } catch (err: any) {
            showToast(`Template Error: ${err.message}`);
        } finally {
            setIsTemplateProcessing(false);
            setReportLoadingMessage("");
        }
    };

    const handleGenerateReport = async () => {
        if (!analysisResult || analysisResult.length === 0) {
            showToast("No findings to report.");
            return;
        }

        // FILTER & CLEAN: Only include selected findings and STRIP metadata
        const activeFindings = analysisResult
            .filter(f => selectedFindings[f.clauseId])
            .map(f => ({
                ...f,
                evidence: stripMetadataTags(f.evidence) // Clean the evidence
            }));

        if (activeFindings.length === 0) {
            showToast("No findings selected. Please select at least one finding.");
            return;
        }

        setIsReportLoading(true);
        setGenerationLogs([]);
        setProgressPercent(0);
        setReportLoadingMessage("Initializing Report Engine...");

        try {
            const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
            const standardName = standards[standardKey]?.name || "ISO Standard";
            const apiKey = activeKeyProfile?.key;
            const model = activeKeyProfile?.activeModel;

            const finalSections: string[] = [];

            // 1. EXECUTIVE SUMMARY
            setReportLoadingMessage("Drafting Executive Summary...");
            setGenerationLogs(prev => [...prev, `Analysing ${activeFindings.length} selected findings...`]);
            
            // Collect all unique interviewees across all processes for summary
            const allInterviewees = Array.from(new Set(processes.flatMap(p => p.interviewees || []))).filter(Boolean);

            const summary = await generateExecutiveSummary({
                company: auditInfo.company || "N/A",
                address: auditInfo.address || "N/A",
                scope: auditInfo.scope || "N/A",
                soa: auditInfo.soa || "N/A",
                type: auditInfo.type || "Internal Audit",
                auditor: auditInfo.auditor || "N/A",
                standard: standardName,
                findings: activeFindings,
                interviewees: allInterviewees,
                lang: exportLanguage
            }, apiKey, model);
            
            // Clean markdown chars (safety net)
            const cleanSummary = summary.replace(/[#*`]/g, '');

            finalSections.push(`AUDIT REPORT: ${auditInfo.company}\n\nEXECUTIVE SUMMARY\n${cleanSummary}\n`);
            
            // Explicitly add Auditee List if AI missed it (safety net) or reinforce it
            if(!cleanSummary.toLowerCase().includes('auditee')) {
                 finalSections.push(`Auditee list: ${allInterviewees.join(', ')}\n`);
            }

            setGenerationLogs(prev => [...prev, "Executive Summary: Completed"]);
            setProgressPercent(20);

            // 2. BATCH PROCESS REPORTING
            finalSections.push(`DETAILED FINDINGS`);

            // Group findings by Process Name
            const findingsByProcess: Record<string, AnalysisResult[]> = {};
            activeFindings.forEach(f => {
                const pName = f.processName || "General / Unassigned";
                if (!findingsByProcess[pName]) findingsByProcess[pName] = [];
                findingsByProcess[pName].push(f);
            });

            // Iterate through groups
            const processNames = Object.keys(findingsByProcess).sort();
            let processedCount = 0;
            const totalProcesses = processNames.length;

            for (const pName of processNames) {
                const processFindings = findingsByProcess[pName];
                
                // Find corresponding process object to get specific interviewees
                const representativeFinding = processFindings[0];
                const processObj = processes.find(p => p.id === representativeFinding.processId);
                const processInterviewees = processObj?.interviewees?.join(", ") || "N/A";
                const auditorName = auditInfo.auditor || "[Auditor Name]";

                setReportLoadingMessage(`Processing Section: ${pName}...`);
                setGenerationLogs(prev => [...prev, `Batch Processing ${pName} (${processFindings.length} findings)...`]);

                // BATCH CALL: Send all findings for this process at once
                // This saves massive tokens by sending the System Prompt only once per process
                const sectionText = await generateProcessBatchReport({
                    processName: pName,
                    auditor: auditorName,
                    interviewees: processInterviewees,
                    company: auditInfo.company,
                    standardName: standardName,
                    language: exportLanguage,
                    findings: processFindings
                }, apiKey, model);

                // Clean Markdown
                const cleanSection = sectionText.replace(/[#*`]/g, '');
                finalSections.push(cleanSection);
                finalSections.push("----------------------------------------"); 

                processedCount++;
                const percent = 20 + Math.round((processedCount / totalProcesses) * 80);
                setProgressPercent(percent);

                // Rate limit buffer
                await new Promise(r => setTimeout(r, 500));
            }

            // 3. FINALIZE
            setReportLoadingMessage("Finalizing document...");
            const fullReport = finalSections.join("\n\n");
            
            if (reportTemplate) {
                setFinalReportText(`TEMPLATE APPLIED:\n${reportTemplate}\n\nGENERATED CONTENT:\n${fullReport}`);
            } else {
                setFinalReportText(fullReport);
            }
            
            setGenerationLogs(prev => [...prev, "Done."]);
            setProgressPercent(100);
            showToast("Report Generated Successfully.");

        } catch (error: any) {
            console.error(error);
            setGenerationLogs(prev => [...prev, `ERROR: ${error.message}`]);
            showToast("Report Generation Failed.");
        } finally {
            setTimeout(() => {
                setIsReportLoading(false);
                setReportLoadingMessage("");
            }, 1000);
        }
    };

    return {
        isReportLoading,
        reportLoadingMessage,
        reportTemplateName,
        isTemplateProcessing,
        handleTemplateUpload,
        handleGenerateReport,
        generationLogs,
        progressPercent
    };
};
