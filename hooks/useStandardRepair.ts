
import { useState } from 'react';
import { useAudit } from '../contexts/AuditContext';
import { generateMissingDescriptions } from '../services/geminiService';
import { cleanAndParseJSON } from '../utils';

export const useStandardRepair = () => {
    const { standards, standardKey, updateStandard } = useAudit();
    const [isRepairing, setIsRepairing] = useState(false);
    const [repairStats, setRepairStats] = useState<{ fixed: number, cleaned: number } | null>(null);
    const [repairedIds, setRepairedIds] = useState<string[]>([]);

    const handleAutoRepair = async () => {
        if (!standardKey || !standards[standardKey]) return;
        
        setIsRepairing(true);
        setRepairStats(null);
        
        try {
            const currentStandard = JSON.parse(JSON.stringify(standards[standardKey])); 
            const missingClauses: any[] = [];
            const fixedIds: string[] = [];
            let duplicateRemovedCount = 0;

            const findMissing = (list: any[]) => {
                list.forEach(c => {
                    if (!c.description || c.description.trim().length < 5) {
                        missingClauses.push({ ref: c, code: c.code, title: c.title });
                    }
                    if (c.subClauses) findMissing(c.subClauses);
                });
            };
            currentStandard.groups.forEach((g: any) => findMissing(g.clauses));

            if (missingClauses.length > 0) {
                const targets = missingClauses.map(i => ({ code: i.code, title: i.title }));
                const jsonStr = await generateMissingDescriptions(targets);
                const descriptions = cleanAndParseJSON(jsonStr);
                
                if (Array.isArray(descriptions)) {
                    const descMap = descriptions.reduce((acc: any, item: any) => {
                        if(item.code && item.description) acc[item.code] = item.description;
                        return acc;
                    }, {});
                    missingClauses.forEach(item => {
                        if (descMap[item.code]) {
                            item.ref.description = descMap[item.code];
                            fixedIds.push(item.ref.id);
                        }
                    });
                }
            }
            updateStandard(currentStandard);
            setRepairedIds(fixedIds);
            setRepairStats({ fixed: fixedIds.length, cleaned: duplicateRemovedCount });
        } catch (e) {
            console.error("Repair failed", e);
            alert("Failed to repair automatically. Check API Key.");
        } finally {
            setIsRepairing(false);
        }
    };

    return { handleAutoRepair, isRepairing, repairStats, repairedIds };
};
