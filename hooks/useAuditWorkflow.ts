
import { useState, useCallback, useRef } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { useUI } from '../contexts/UIContext';
import { generateAnalysis } from '../services/geminiService';
import { AnalysisResult } from '../types';
import { generateContentHash, runWithConcurrency } from '../utils';

// Cache structure: { [clauseId_processId_evidenceHash]: AnalysisResult }
const ANALYSIS_CACHE = new Map<string, AnalysisResult>();

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
    
    // Ref to track progress for UI
    const processedCount = useRef(0);

    const handleAnalyze = useCallback(async () => {
        if (!standardKey || !activeProcessId) return;
        
        setIsAnalyzeLoading(true);
        processedCount.current = 0;
        showToast("AI Auditor: Optimizing workload...");

        try {
            const currentStd = standards[standardKey];
            const activeKeyProfile = apiKeys.find(k => k.id === activeKeyId);
            
            // 1. IDENTIFY WORKLOAD
            const clausesToAnalyze = new Set<string>();
            
            // Logic: Only analyze clauses that have data entered in the matrix OR explicit selection
            Object.keys(matrixData).forEach(cid => {
                if (matrixData[cid].some(r => r.status === 'supplied')) clausesToAnalyze.add(cid);
            });
            // If general evidence exists, we might want to analyze all selected, but for optimization,
            // let's prioritize explicit matrix entries or current selection if matrix is empty
            if (evidence && evidence.trim().length > 20 && clausesToAnalyze.size === 0) {
                selectedClauses.forEach(cid => clausesToAnalyze.add(cid));
            }

            if (clausesToAnalyze.size === 0) throw new Error("No evidence found to analyze.");

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

            const queue = Array.from(clausesToAnalyze).map(cid => ({
                cid,
                clause: findClauseData(cid)
            })).filter(item => item.clause);

            const total = queue.length;

            // 2. DEFINE WORKER FUNCTION (runs in parallel)
            const processClause = async ({ cid, clause }: { cid: string, clause: any }) => {
                if (!clause) return null;

                setCurrentAnalyzingClause(`${clause.code} ${clause.title}`);

                // OPTIMIZATION 1: DATA SLICING & PRESERVATION
                const matrixRows = matrixData[cid] || [];
                
                // Construct specific evidence for AI Context
                const specificEvidenceForAI = matrixRows
                    .filter(r => r.status === 'supplied')
                    .map(r => `[Requirement]: ${r.requirement}\n[Evidence]: ${r.evidenceInput}`)
                    .join("\n\n");
                
                // CRITICAL: Capture RAW input to inject back into result (Bypass AI Summarization)
                // This ensures bullets, newlines, and formatting are preserved 100%
                const rawUserEvidence = matrixRows
                    .filter(r => r.status === 'supplied')
                    .map(r => r.evidenceInput)
                    .join("\n\n");

                // General evidence is sent as context
                const safeGeneralEvidence = evidence.length > 8000 ? evidence.substring(0, 8000) + "...(truncated)" : evidence;

                const combinedEvidence = `
                ${specificEvidenceForAI ? `### MATRIX EVIDENCE (Specific to ${clause.code}):\n${specificEvidenceForAI}` : ''}
                ${safeGeneralEvidence ? `### GENERAL PROCESS EVIDENCE:\n${safeGeneralEvidence}` : ''}
                `.trim();

                const tagsText = evidenceTags
                    .filter(t => t.clauseId === cid)
                    .map(t => `Tagged Excerpt: "${t.text}"`)
                    .join("\n");

                const fullInput = combinedEvidence + tagsText;

                // OPTIMIZATION 2: CACHING
                const cacheKey = generateContentHash(`${cid}_${activeProcessId}_${fullInput}_${activeKeyProfile?.activeModel}`);
                
                if (ANALYSIS_CACHE.has(cacheKey)) {
                    console.log(`[Cache Hit] Clause ${cid}`);
                    processedCount.current++;
                    return ANALYSIS_CACHE.get(cacheKey)!;
                }

                // If not cached, call API
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
                    parsed.processId = activeProcessId;
                    const procName = processes.find(p => p.id === activeProcessId)?.name;
                    parsed.processName = procName;
                    
                    // FORCE OVERRIDE EVIDENCE WITH RAW INPUT
                    // If user provided specific matrix input, use that EXACTLY.
                    // If not, fall back to what AI extracted from general context.
                    const finalEvidence = rawUserEvidence.trim().length > 0 
                        ? rawUserEvidence 
                        : (parsed.evidence || "No specific evidence cited.");

                    const result: AnalysisResult = {
                        clauseId: parsed.clauseId || clause.code,
                        status: parsed.status || "N_A",
                        reason: parsed.reason || "Analysis completed.",
                        suggestion: parsed.suggestion || "",
                        evidence: finalEvidence, // <--- PRESERVED FORMATTING
                        conclusion_report: parsed.conclusion_report || parsed.reason,
                        crossRefs: parsed.crossRefs || [],
                        processId: activeProcessId || undefined,
                        processName: procName
                    };

                    // Save to Cache
                    ANALYSIS_CACHE.set(cacheKey, result);
                    processedCount.current++;
                    
                    // Update UI Progress
                    if (processedCount.current % 2 === 0) {
                        showToast(`Analyzing... ${Math.round((processedCount.current / total) * 100)}%`);
                    }

                    return result;

                } catch (e) {
                    console.error(`Error analyzing ${cid}`, e);
                    return null;
                }
            };

            // OPTIMIZATION 3: CONCURRENCY
            showToast(`Batch processing ${total} clauses...`);
            const results = await runWithConcurrency(queue, processClause, 3);

            // 4. BATCH STATE UPDATE
            const validResults = results.filter(r => r !== null) as AnalysisResult[];
            
            if (validResults.length > 0) {
                setAnalysisResult(prev => {
                    const existing = prev ? [...prev] : [];
                    validResults.forEach(newResult => {
                        const idx = existing.findIndex(e => e.clauseId === newResult.clauseId && e.processId === newResult.processId);
                        if (idx >= 0) existing[idx] = newResult;
                        else existing.push(newResult);
                    });
                    return existing.sort((a, b) => a.clauseId.localeCompare(b.clauseId, undefined, { numeric: true }));
                });
                showToast(`Analysis Completed. ${validResults.length} findings updated.`);
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
    }, [standardKey, activeProcessId, matrixData, evidence, selectedClauses, evidenceTags, apiKeys, activeKeyId, processes, privacySettings, standards]);

    return { 
        handleAnalyze, 
        isAnalyzeLoading, 
        currentAnalyzingClause 
    };
};
