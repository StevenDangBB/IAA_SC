
import React, { useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext'; // Need Key for indexing
import { useUI } from '../contexts/UIContext';
import { processSourceFile } from '../utils';
import { KnowledgeStore } from '../services/knowledgeStore';
import { LocalIntelligence } from '../services/localIntelligence';
import { mapStandardStructure } from '../services/geminiService'; // Import AI Mapper

export const useKnowledgeManager = () => {
    const { 
        standardKey, setKnowledgeData, standards 
    } = useAudit();
    const { getActiveKey } = useKeyPool();
    const { showToast } = useUI();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        setIsProcessing(true);
        try {
            showToast("Reading document...");
            const text = await processSourceFile(file);
            
            if (text.length < 100) {
                showToast("Warning: Document text is very short.");
            }

            if (standardKey) {
                // 1. Save Raw File to DB (Backup)
                await KnowledgeStore.saveDocument(standardKey, file.name, text);
                
                // 2. ATTEMPT LOCAL PARSING FIRST (Fast & Free)
                let structuredClauses = LocalIntelligence.parseStandardToStructuralData(text);
                
                // 3. AI-ASSISTED INDEXING (One-Time Cost, High Accuracy)
                // If local parsing yielded poor results (e.g. missed 7.5 because it was a header), 
                // OR if the user provided an API key, we should enhance the index using AI.
                const keyProfile = getActiveKey();
                const stdName = standards[standardKey]?.name || "ISO Standard";

                if (keyProfile && keyProfile.key) {
                    showToast("⚡ Smart Indexing: Using AI to map document structure (One-time)...");
                    try {
                        // Ask AI only for the MAP (Code/Titles), not the full text content. 
                        // This uses very few output tokens.
                        const aiMap = await mapStandardStructure(text, stdName, keyProfile.key);
                        
                        if (aiMap && aiMap.length > 0) {
                            // Use the AI Map to precisely slice the text locally
                            const hybridClauses = LocalIntelligence.performHybridSegmentation(text, aiMap);
                            if (hybridClauses.length > structuredClauses.length) {
                                structuredClauses = hybridClauses; // Upgrade to the better list
                                console.log("Upgraded to AI-Assisted Indexing", structuredClauses.length);
                            }
                        }
                    } catch (aiError) {
                        console.warn("AI Indexing skipped/failed, using local regex only.", aiError);
                    }
                }
                
                if (structuredClauses.length > 0) {
                    await KnowledgeStore.bulkSaveClauses(standardKey, structuredClauses);
                    showToast(`Success! Indexed ${structuredClauses.length} clauses for offline lookup.`);
                } else {
                    showToast("Document saved. (Note: Auto-indexing found few matches, lookups might be limited).");
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
