
import { useState, useCallback } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { useUI } from '../contexts/UIContext';
import { generateAnalysis } from '../services/geminiService';
import { AnalysisResult } from '../types';

export const useAuditWorkflow = () => {
    const { 
        standards, standardKey, matrixData, evidence, 
        selectedClauses, evidenceTags, setAnalysisResult, 
        activeProcessId, processes, privacySettings 
    } = useAudit();
    
    const { apiKeys, activeKeyId } = useKeyPool();
    const { showToast } = useUI();

    const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
    const [currentAnalyzingClause, setCurrentAnalyzingClause] = useState("");

    const handleAnalyze = useCallback(async () => {
        if (!standardKey || !activeProcessId) return;
        
        setIsAnalyzeLoading(true);
        showToast("AI Auditor Analysis Started...");

        try {
            const currentStd = standards[standardKey];
            const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
            
            // Priority: Matrix Clauses > Selected Clauses
            const clausesToAnalyze = new Set<string>();
            Object.keys(matrixData).forEach(cid => {
                if (matrixData[cid].some(r => r.status === 'supplied')) clausesToAnalyze.add(cid);
            });
            if (evidence && evidence.trim().length > 20) {
                selectedClauses.forEach(cid => clausesToAnalyze.add(cid));
            }

            if (clausesToAnalyze.size === 0) throw new Error("No evidence found to analyze.");

            // Helper to find clause data
            const findClauseData = (id: string) => {
                const traverse = (list: any[]): any => {
                    for (const c of list) {
                        if (c.id === id) return c;
                        if (c.subClauses) {
                            const found = traverse(c.subClauses);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                for (const g of currentStd.groups) {
                    const found = traverse(g.clauses);
                    if (found) return found;
                }
                return null;
            };

            const clausesArray = Array.from(clausesToAnalyze);
            
            for (let i = 0; i < clausesArray.length; i++) {
                const cid = clausesArray[i];
                const clause = findClauseData(cid);
                if (!clause) continue;

                setCurrentAnalyzingClause(`${clause.code} ${clause.title}`);

                // Context Preparation
                const matrixRows = matrixData[cid] || [];
                const matrixText = matrixRows
                    .filter(r => r.status === 'supplied')
                    .map(r => `[Requirement]: ${r.requirement}\n[Evidence]: ${r.evidenceInput}`)
                    .join("\n\n");
                
                const combinedEvidence = `
                ${matrixText ? `### MATRIX EVIDENCE:\n${matrixText}` : ''}
                ${evidence ? `### GENERAL PROCESS EVIDENCE:\n${evidence}` : ''}
                `.trim();

                const tagsText = evidenceTags
                    .filter(t => t.clauseId === cid)
                    .map(t => `Tagged Excerpt: "${t.text}"`)
                    .join("\n");

                const jsonResult = await generateAnalysis(
                    { code: clause.code, title: clause.title, description: clause.description },
                    currentStd.name,
                    combinedEvidence,
                    tagsText,
                    activeKeyProfile?.key,
                    activeKeyProfile?.activeModel,
                    privacySettings.maskCompany
                );

                try {
                    const parsed = JSON.parse(jsonResult);
                    parsed.processId = activeProcessId;
                    const procName = processes.find(p => p.id === activeProcessId)?.name;
                    parsed.processName = procName;
                    
                    const normalizedResult: AnalysisResult = {
                        clauseId: parsed.clauseId || clause.code,
                        status: parsed.status || "N_A",
                        reason: parsed.reason || "Analysis completed.",
                        suggestion: parsed.suggestion || "",
                        evidence: parsed.evidence || "No specific evidence cited.",
                        conclusion_report: parsed.conclusion_report || parsed.reason,
                        crossRefs: parsed.crossRefs || [],
                        processId: activeProcessId || undefined,
                        processName: procName
                    };
                    
                    setAnalysisResult(prev => {
                        const existing = prev ? [...prev] : [];
                        const idx = existing.findIndex(e => e.clauseId === normalizedResult.clauseId && e.processId === normalizedResult.processId);
                        if (idx >= 0) existing[idx] = normalizedResult;
                        else existing.push(normalizedResult);
                        return existing;
                    });

                } catch (e) { console.error("JSON Error", e); }
                
                if (i < clausesArray.length - 1) await new Promise(r => setTimeout(r, 500));
            }
            showToast(`Analysis complete.`);
        } catch (error: any) {
            console.error("Analysis Error", error);
            showToast("Failed: " + error.message);
        } finally {
            setIsAnalyzeLoading(false);
            setCurrentAnalyzingClause("");
        }
    }, [standardKey, activeProcessId, matrixData, evidence, selectedClauses, evidenceTags, apiKeys, activeKeyId, processes, privacySettings, standards]);

    return { 
        handleAnalyze, 
        isAnalyzeLoading, 
        currentAnalyzingClause 
    };
};
