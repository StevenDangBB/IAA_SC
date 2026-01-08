
import { useAudit } from '../contexts/AuditContext';
import { fetchFullClauseText } from '../services/geminiService';
import { LocalIntelligence } from '../services/localIntelligence';
import { Clause } from '../types';

export const useReferenceLookup = () => {
    const { knowledgeBase, standards, standardKey } = useAudit();

    const handleLookup = async (clause: Clause) => {
        // 1. Dispatch Open Event (shows modal with loading state)
        const openEvent = new CustomEvent('OPEN_REFERENCE', { detail: clause });
        window.dispatchEvent(openEvent);

        // 2. STRATEGY: LOCAL INTELLIGENCE FIRST
        // This dramatically reduces API costs and dependency by using the loaded document.
        if (knowledgeBase) {
            // Attempt smart extraction
            const localText = LocalIntelligence.extractClauseContent(knowledgeBase, clause.code, clause.title);
            
            if (localText && localText.length > 20) { // Threshold to ensure we didn't just match a header
                // Simulate a short network delay for UI fluidity, then display
                setTimeout(() => {
                    const updateEvent = new CustomEvent('UPDATE_REFERENCE_CONTENT', { 
                        detail: { 
                            en: localText, 
                            vi: `[SOURCE DOCUMENT EXTRACT]\n\n${localText}\n\n(Auto-translated view not available in Offline Mode)` 
                        } 
                    });
                    window.dispatchEvent(updateEvent);
                }, 300);
                return; // STOP HERE. Do not call AI.
            } else {
                console.warn(`[Local Lookup] Could not find clause ${clause.code} in source document. Falling back to AI.`);
            }
        }

        // 3. FALLBACK: GENERATIVE AI
        // Only reached if knowledgeBase is missing OR extraction failed.
        try {
            const stdName = standards[standardKey]?.name || "";
            // We pass knowledgeBase to AI if available, so it can try extraction if our regex failed
            const result = await fetchFullClauseText(clause, stdName, knowledgeBase);
            const updateEvent = new CustomEvent('UPDATE_REFERENCE_CONTENT', { detail: result });
            window.dispatchEvent(updateEvent);
        } catch (e) {
            console.error("Reference Fetch Failed", e);
            const errorEvent = new CustomEvent('UPDATE_REFERENCE_CONTENT', { 
                detail: { en: "Failed to load content. Ensure API Key is valid or source document is attached.", vi: "" } 
            });
            window.dispatchEvent(errorEvent);
        }
    };

    return handleLookup;
};
