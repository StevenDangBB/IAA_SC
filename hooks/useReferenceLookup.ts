
import { useAudit } from '../contexts/AuditContext';
import { KnowledgeStore } from '../services/knowledgeStore'; // Import Store
import { LocalIntelligence } from '../services/localIntelligence'; // Import Local Intelligence
import { Clause } from '../types';

export const useReferenceLookup = () => {
    const { knowledgeBase, standardKey } = useAudit();

    const handleLookup = async (clause: Clause) => {
        // 1. Dispatch Open Event (shows modal with loading state)
        const openEvent = new CustomEvent('OPEN_REFERENCE', { detail: clause });
        window.dispatchEvent(openEvent);

        // 2. STRATEGY: STRUCTURED LOCAL DB (Primary & Fastest)
        let offlineContent = null;
        if (standardKey) {
            offlineContent = await KnowledgeStore.getClauseContent(standardKey, clause.code);
        }

        // 2.5 STRATEGY: RAW MEMORY LOOKUP (Safety Net)
        // If structured index missed it (e.g. rare parsing edge case), scan the raw text currently in memory
        if ((!offlineContent || offlineContent.length < 10) && knowledgeBase) {
            offlineContent = LocalIntelligence.extractClauseContent(knowledgeBase, clause.code, clause.title);
        }

        if (offlineContent && offlineContent.length > 20) {
            // Success - Return immediately
            setTimeout(() => {
                const updateEvent = new CustomEvent('UPDATE_REFERENCE_CONTENT', { 
                    detail: { 
                        en: offlineContent, 
                        vi: `[LOCAL DB]\n\n${offlineContent}\n\n(Use Translate tool if needed)` 
                    } 
                });
                window.dispatchEvent(updateEvent);
            }, 50);
        } else {
            // Failure - Do NOT call AI here (Too expensive/slow per click). 
            // The user must upload/index the document correctly first.
            setTimeout(() => {
                const errorEvent = new CustomEvent('UPDATE_REFERENCE_CONTENT', { 
                    detail: { 
                        en: "Content not found in Local Index.\nPlease ensure you have uploaded the Standard PDF/DOCX in the Sidebar.", 
                        vi: "" 
                    } 
                });
                window.dispatchEvent(errorEvent);
            }, 50);
        }
    };

    return handleLookup;
};
