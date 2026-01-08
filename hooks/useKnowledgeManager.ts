
import React, { useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useUI } from '../contexts/UIContext';
import { processSourceFile } from '../utils';
import { KnowledgeStore } from '../services/knowledgeStore';
import { mapStandardRequirements } from '../services/geminiService';
import { Clause } from '../types';

export const useKnowledgeManager = () => {
    const { 
        standards, standardKey, addCustomStandard, setKnowledgeData 
    } = useAudit();
    const { showToast } = useUI();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        setIsProcessing(true);
        try {
            showToast("Processing document...");
            const text = await processSourceFile(file);
            
            if (text.length < 100) {
                showToast("Warning: Document text is very short.");
            }

            if (standardKey) {
                // 1. Save to DB
                await KnowledgeStore.saveDocument(standardKey, file.name, text);
                
                // 2. ENRICHMENT LOGIC
                const currentStd = standards[standardKey];
                if (currentStd) {
                    showToast("Analyzing document structure (this may take 30s)...");
                    
                    // Helper to flatten (using logic similar to useStandardUtils but inline here to avoid hook rules in callback)
                    const allClauses: Clause[] = [];
                    const traverse = (list: Clause[]) => list.forEach(c => { allClauses.push(c); if(c.subClauses) traverse(c.subClauses); });
                    currentStd.groups.forEach(g => traverse(g.clauses));
                    
                    const codes = allClauses.map(c => c.code);
                    
                    // Batch Processing
                    const BATCH_SIZE = 10;
                    let aggregatedMapping: Record<string, string> = {};
                    
                    for (let i = 0; i < codes.length; i += BATCH_SIZE) {
                        const batchCodes = codes.slice(i, i + BATCH_SIZE);
                        const progress = Math.round((i / codes.length) * 100);
                        if (progress > 0) showToast(`Mapping content: ${progress}%`);
                        
                        try {
                            const batchResult = await mapStandardRequirements(currentStd.name, batchCodes, text);
                            aggregatedMapping = { ...aggregatedMapping, ...batchResult };
                        } catch (batchErr) {
                            console.warn("Batch mapping failed", batchErr);
                        }
                    }
                    
                    if (Object.keys(aggregatedMapping).length > 0) {
                        const enrichedStd = JSON.parse(JSON.stringify(currentStd));
                        const updateRecursive = (list: any[]) => {
                            list.forEach(c => {
                                if (aggregatedMapping[c.code]) {
                                    c.description = aggregatedMapping[c.code];
                                }
                                if (c.subClauses) updateRecursive(c.subClauses);
                            });
                        };
                        enrichedStd.groups.forEach((g: any) => updateRecursive(g.clauses));
                        addCustomStandard(standardKey, enrichedStd);
                        showToast(`Success! Enriched ${Object.keys(aggregatedMapping).length} clauses.`);
                    } else {
                        showToast("Analysis complete, but no matching clauses found.");
                    }
                }
            }
            
            setKnowledgeData(text, file.name);
            e.target.value = ''; // Reset input
            
        } catch (err: any) {
            console.error("Knowledge Upload Error", err);
            showToast(`Upload Failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return { handleKnowledgeUpload, isProcessing };
};