
import React, { useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { useUI } from '../contexts/UIContext';
import { generateExecutiveSummary, formatFindingReportSection } from '../services/geminiService';
import { processSourceFile } from '../utils';

export const useReportGenerator = (exportLanguage: string) => {
    const { analysisResult, auditInfo, standards, standardKey, setFinalReportText } = useAudit();
    const { apiKeys, activeKeyId } = useKeyPool();
    const { showToast } = useUI();

    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportLoadingMessage, setReportLoadingMessage] = useState("");
    
    // Detailed Progress State
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
            if(Date.now() - start < 500) await new Promise(r => setTimeout(r, 500)); // UX delay

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
            setGenerationLogs(prev => [...prev, "Analysing global compliance posture..."]);
            
            const summary = await generateExecutiveSummary({
                company: auditInfo.company || "N/A",
                type: auditInfo.type || "Internal Audit",
                auditor: auditInfo.auditor || "N/A",
                standard: standardName,
                findings: analysisResult,
                lang: exportLanguage
            }, apiKey, model);
            
            finalSections.push(`# AUDIT REPORT: ${auditInfo.company}\n\n## EXECUTIVE SUMMARY\n${summary}\n`);
            setGenerationLogs(prev => [...prev, "Executive Summary: Completed"]);
            setProgressPercent(10);

            // 2. DETAILED FINDINGS LOOP (Clause by Clause)
            const total = analysisResult.length;
            finalSections.push(`## DETAILED FINDINGS`);

            for (let i = 0; i < total; i++) {
                const finding = analysisResult[i];
                const currentClause = `Clause ${finding.clauseId}`;
                
                setReportLoadingMessage(`Processing ${currentClause}...`);
                setGenerationLogs(prev => [...prev, `Formatting ${currentClause} (${finding.status})...`]);
                
                // Real Processing Call
                const sectionText = await formatFindingReportSection(finding, exportLanguage as 'en'|'vi', apiKey, model);
                finalSections.push(sectionText);
                
                // Update Progress
                const percent = 10 + Math.round(((i + 1) / total) * 90);
                setProgressPercent(percent);
                
                // Small UX delay to make the log readable if API is too fast
                if (i % 3 === 0) await new Promise(r => setTimeout(r, 200));
            }

            // 3. FINALIZE
            setReportLoadingMessage("Finalizing document...");
            setGenerationLogs(prev => [...prev, "Stitching report sections..."]);
            
            const fullReport = finalSections.join("\n\n" + "=".repeat(30) + "\n\n");
            
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
        // New exports for UI
        generationLogs,
        progressPercent
    };
};
