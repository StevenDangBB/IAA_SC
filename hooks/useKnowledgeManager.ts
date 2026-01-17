
import React, { useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { useUI } from '../contexts/UIContext';
import { processSourceFile } from '../utils';
import { KnowledgeStore } from '../services/knowledgeStore';
import { LocalIntelligence } from '../services/localIntelligence';

export const useKnowledgeManager = () => {
    const { 
        standardKey, setKnowledgeData 
    } = useAudit();
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
                
                // 2. INTELLIGENT INDEXING (The "Fundamental Solution")
                showToast("Indexing ISO clauses for offline use...");
                
                // Use the new parser to split text into structured clauses
                const structuredClauses = LocalIntelligence.parseStandardToStructuralData(text);
                
                if (structuredClauses.length > 0) {
                    await KnowledgeStore.bulkSaveClauses(standardKey, structuredClauses);
                    showToast(`Success! Indexed ${structuredClauses.length} clauses for high-speed lookup.`);
                } else {
                    console.warn("Parser could not find structured clauses.");
                    showToast("Document saved, but clause auto-indexing found no matches.");
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
