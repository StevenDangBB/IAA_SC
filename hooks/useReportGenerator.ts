
import React, { useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { useUI } from '../contexts/UIContext';
import { generateTextReport } from '../services/geminiService';
import { processSourceFile } from '../utils';

export const useReportGenerator = (exportLanguage: string) => {
    const { analysisResult, auditInfo, standards, standardKey, setFinalReportText } = useAudit();
    const { apiKeys, activeKeyId } = useKeyPool();
    const { showToast } = useUI();

    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportLoadingMessage, setReportLoadingMessage] = useState("");
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
        setReportLoadingMessage("Synthesizing Final Report...");

        try {
            const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
            const standardName = standards[standardKey]?.name || "ISO Standard";

            const result = await generateTextReport(
                {
                    company: auditInfo.company || "N/A",
                    type: auditInfo.type || "Internal Audit",
                    auditor: auditInfo.auditor || "N/A",
                    standard: standardName,
                    findings: analysisResult,
                    lang: exportLanguage,
                    fullEvidenceContext: reportTemplate ? `USER PROVIDED TEMPLATE:\n${reportTemplate}` : undefined
                },
                activeKeyProfile?.key,
                activeKeyProfile?.activeModel
            );

            setFinalReportText(result);
            showToast("Report Generated.");
        } catch (error: any) {
            showToast("Report Failed: " + error.message);
        } finally {
            setIsReportLoading(false);
            setReportLoadingMessage("");
        }
    };

    return {
        isReportLoading,
        reportLoadingMessage,
        reportTemplateName,
        isTemplateProcessing,
        handleTemplateUpload,
        handleGenerateReport
    };
};
