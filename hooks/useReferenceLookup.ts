
import { useAudit } from '../contexts/AuditContext';
import { useKeyPool } from '../contexts/KeyPoolContext';
import { fetchFullClauseText } from '../services/geminiService';
import { KnowledgeStore } from '../services/knowledgeStore'; // Import Store
import { Clause } from '../types';

export const useReferenceLookup = () => {
    const { knowledgeBase, standards, standardKey } = useAudit();
    const { getActiveKey } = useKeyPool();

    const handleLookup = async (clause: Clause) => {
        // 1. Dispatch Open Event (shows modal with loading state)
        const openEvent = new CustomEvent('OPEN_REFERENCE', { detail: clause });
        window.dispatchEvent(openEvent);

        // 2. STRATEGY: STRUCTURED LOCAL DB (FASTEST & ZERO TOKEN)
        if (standardKey) {
            const offlineContent = await KnowledgeStore.getClauseContent(standardKey, clause.code);
            if (offlineContent && offlineContent.length > 20) {
                // Simulate tiny delay for UX smoothness
                setTimeout(() => {
                    const updateEvent = new CustomEvent('UPDATE_REFERENCE_CONTENT', { 
                        detail: { 
                            en: offlineContent, 
                            vi: `[OFFLINE MODE - INSTANT LOAD]\n\n${offlineContent}\n\n(Translate feature requires online AI)` 
                        } 
                    });
                    window.dispatchEvent(updateEvent);
                }, 100);
                return; // DONE. No AI needed.
            }
        }

        // 3. FALLBACK: GENERATIVE AI (Online)
        try {
            const stdName = standards[standardKey]?.name || "";
            const activeKeyProfile = getActiveKey();
            const apiKey = activeKeyProfile?.key || "";

            // Pass knowledgeBase as raw context backup if DB failed
            const result = await fetchFullClauseText(clause, stdName, knowledgeBase, apiKey);
            const updateEvent = new CustomEvent('UPDATE_REFERENCE_CONTENT', { detail: result });
            window.dispatchEvent(updateEvent);
        } catch (e) {
            console.error("Reference Fetch Failed", e);
            const errorEvent = new CustomEvent('UPDATE_REFERENCE_CONTENT', { 
                detail: { en: "Content unavailable. Please upload a standard document to enable offline lookup.", vi: "" } 
            });
            window.dispatchEvent(errorEvent);
        }
    };

    return handleLookup;
};
