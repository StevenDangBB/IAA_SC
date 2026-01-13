
import { useState, useCallback, useRef } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { useUI } from '../contexts/UIContext';
import { generateAnalysis } from '../services/geminiService';
import { AnalysisResult, AuditProcess } from '../types';
import { generateContentHash, runWithConcurrency } from '../utils';

// Cache structure: { [clauseId_processId_evidenceHash]: AnalysisResult }
const ANALYSIS_CACHE = new Map<string, AnalysisResult>();

export const useAuditWorkflow = () => {
    const { 
        standards, standardKey, 
        setAnalysisResult, 
        processes, privacySettings 
    } = useAudit();
    
    const { apiKeys, activeKeyId } = useKeyPool();
    const { showToast } = useUI();

    const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
    const [currentAnalyzingClause, setCurrentAnalyzingClause] = useState("");
    
    const processedCount = useRef(0);

    const handleAnalyze = useCallback(async () => {
        if (!standardKey || processes.length === 0) {
            showToast("No processes or standard found to analyze.");
            return;
        }
        
        setIsAnalyzeLoading(true);
        processedCount.current = 0;
        showToast("AI Auditor: Scanning all processes...");

        try {
            const currentStd = standards[standardKey];
            const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
            
            // 1. IDENTIFY WORKLOAD ACROSS ALL PROCESSES
            const queue: { process: AuditProcess, cid: string, clause: any }[] = [];

            // Helper to find clause structure
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

            // Loop through ALL processes
            processes.forEach(proc => {
                const procMatrix = proc.matrixData || {};
                
                Object.keys(procMatrix).forEach(cid => {
                    // CHANGE: Analyze ALL clauses present in the matrix keys (Mapped Clauses).
                    // We no longer filter by `r.status === 'supplied'`.
                    // If empty, the AI will judge based on General Evidence or flag it.
                    const clauseData = findClauseData(cid);
                    if (clauseData) {
                        queue.push({
                            process: proc,
                            cid: cid,
                            clause: clauseData
                        });
                    }
                });
            });

            const total = queue.length;

            if (total === 0) {
                throw new Error("No clauses mapped in any process. Please go to Planning tab to select clauses.");
            }

            // 2. DEFINE WORKER FUNCTION (runs in parallel)
            const processItem = async ({ process, cid, clause }: { process: AuditProcess, cid: string, clause: any }) => {
                if (!clause) return null;

                const procName = process.name || "Unnamed Process";
                setCurrentAnalyzingClause(`[${procName}] ${clause.code}`);

                // Data Prep
                const matrixRows = process.matrixData[cid] || [];
                const hasSpecificInput = matrixRows.some(r => r.status === 'supplied');
                
                // Construct specific evidence for AI Context
                let specificEvidenceForAI = "";
                let rawUserEvidence = "";

                if (hasSpecificInput) {
                    specificEvidenceForAI = matrixRows
                        .filter(r => r.status === 'supplied')
                        .map(r => `[Requirement]: ${r.requirement}\n[Evidence]: ${r.evidenceInput}`)
                        .join("\n\n");
                    
                    rawUserEvidence = matrixRows
                        .filter(r => r.status === 'supplied')
                        .map(r => r.evidenceInput)
                        .join("\n\n");
                } else {
                    specificEvidenceForAI = "No specific evidence provided for this clause in the matrix.";
                    rawUserEvidence = ""; // Empty string for raw output
                }

                // General evidence from THIS SPECIFIC PROCESS
                const procEvidence = process.evidence || "";
                const safeGeneralEvidence = procEvidence.length > 8000 ? procEvidence.substring(0, 8000) + "...(truncated)" : procEvidence;

                const combinedEvidence = `
                ${specificEvidenceForAI ? `### MATRIX EVIDENCE (Specific to ${clause.code}):\n${specificEvidenceForAI}` : ''}
                
                ${safeGeneralEvidence ? `### GENERAL PROCESS EVIDENCE (${procName}):\n${safeGeneralEvidence}` : ''}
                
                NOTE: If Matrix Evidence is missing, evaluate compliance based on General Process Evidence. If neither is sufficient, mark as NC or OFI (Missing Evidence).
                `.trim();

                const tagsText = (process.evidenceTags || [])
                    .filter(t => t.clauseId === cid)
                    .map(t => `Tagged Excerpt: "${t.text}"`)
                    .join("\n");

                const fullInput = combinedEvidence + tagsText;

                // Cache Check
                const cacheKey = generateContentHash(`${cid}_${process.id}_${fullInput}_${activeKeyProfile?.activeModel}`);
                
                if (ANALYSIS_CACHE.has(cacheKey)) {
                    console.log(`[Cache Hit] ${procName} - Clause ${cid}`);
                    processedCount.current++;
                    return ANALYSIS_CACHE.get(cacheKey)!;
                }

                // Call API
                try {
                    const jsonResult = await generateAnalysis(
                        { code: clause.code, title: clause.title, description: clause.description },
                        currentStd.name,
                        combinedEvidence,
                        tagsText,
                        activeKeyProfile?.key,
                        activeKeyProfile?.activeModel,
                        privacySettings.maskCompany
                    );

                    const parsed = JSON.parse(jsonResult);
                    
                    // Logic: If user provided raw input, we prefer preserving it in the "evidence" field for the UI
                    // If not, we use what the AI summarized or deduced from General Evidence
                    const finalEvidence = rawUserEvidence.trim().length > 0 
                        ? rawUserEvidence 
                        : (parsed.evidence || "Analyzed based on general process context.");

                    const result: AnalysisResult = {
                        clauseId: parsed.clauseId || clause.code,
                        status: parsed.status || "N_A",
                        reason: parsed.reason || "Analysis completed.",
                        suggestion: parsed.suggestion || "",
                        evidence: finalEvidence, 
                        conclusion_report: parsed.conclusion_report || parsed.reason,
                        crossRefs: parsed.crossRefs || [],
                        processId: process.id,
                        processName: procName
                    };

                    // Save to Cache
                    ANALYSIS_CACHE.set(cacheKey, result);
                    processedCount.current++;
                    
                    if (processedCount.current % 3 === 0) {
                        showToast(`Analyzed ${processedCount.current}/${total} items...`);
                    }

                    return result;

                } catch (e) {
                    console.error(`Error analyzing ${cid} in ${procName}`, e);
                    return null;
                }
            };

            // Execution
            showToast(`Batch processing ${total} findings across ${processes.length} processes...`);
            const results = await runWithConcurrency(queue, processItem, 3);

            // Update State
            const validResults = results.filter(r => r !== null) as AnalysisResult[];
            
            if (validResults.length > 0) {
                setAnalysisResult(prev => {
                    const existing = prev ? [...prev] : [];
                    
                    validResults.forEach(newResult => {
                        const idx = existing.findIndex(e => e.clauseId === newResult.clauseId && e.processId === newResult.processId);
                        if (idx >= 0) {
                            existing[idx] = newResult;
                        } else {
                            existing.push(newResult);
                        }
                    });
                    
                    return existing.sort((a, b) => {
                        const clauseCompare = a.clauseId.localeCompare(b.clauseId, undefined, { numeric: true });
                        if (clauseCompare !== 0) return clauseCompare;
                        return (a.processName || "").localeCompare(b.processName || "");
                    });
                });
                showToast(`Success! Updated ${validResults.length} findings.`);
            } else {
                showToast("Analysis finished but returned no valid results.");
            }

        } catch (error: any) {
            console.error("Analysis Workflow Error", error);
            showToast("Failed: " + error.message);
        } finally {
            setIsAnalyzeLoading(false);
            setCurrentAnalyzingClause("");
        }
    }, [standardKey, processes, apiKeys, activeKeyId, privacySettings, standards]);

    return { 
        handleAnalyze, 
        isAnalyzeLoading, 
        currentAnalyzingClause 
    };
};
